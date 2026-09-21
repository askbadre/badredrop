// src/hooks/useWebRTC.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP WEBRTC HOOK (with Signaling)
// Signaling + WebRTC + File Transfer — sab connected.
// ─────────────────────────────────────────────────────────────

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BadrePeer } from '@/lib/webrtc';
import type { ConnectionState, Signal } from '@/lib/webrtc';
import { FileReceiver, downloadBlob, sendFile } from '@/lib/fileTransfer';
import { SignalingClient } from '@/lib/signaling';
import type { SignalingMessage } from '@/lib/supabase';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import type { TransferState } from '@/components/TransferProgress';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface TransferInfo {
  state: TransferState;
  fileName: string;
  fileSize: number;
  percent: number;
  bytesTransferred: number;
  speed: number;
  error?: string;
}

const INITIAL_TRANSFER: TransferInfo = {
  state: 'connecting',
  fileName: '',
  fileSize: 0,
  percent: 0,
  bytesTransferred: 0,
  speed: 0,
};

// ─────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────
export function useWebRTC() {
  const peerRef = useRef<BadrePeer | null>(null);
  const receiverRef = useRef<FileReceiver | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const peerIdRef = useRef<string | null>(null); // the other device's ID
  const myIdRef = useRef<string>('');

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('idle');
  const [signalingReady, setSignalingReady] = useState(false);
  const [transfer, setTransfer] = useState<TransferInfo>(INITIAL_TRANSFER);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // ─────────────────────────────────────────────
  // HANDLE INCOMING SIGNALING MESSAGE
  // ─────────────────────────────────────────────
  const handleSignal = useCallback(async (msg: SignalingMessage) => {
    const peer = peerRef.current;
    if (!peer) return;

    // Remember who we're talking to
    if (!peerIdRef.current) peerIdRef.current = msg.from;

    try {
           if (msg.type === 'offer') {
        const answer = await peer.acceptOffer({
          type: 'offer',
          data: msg.data,
        });

        if (answer) {
          await signalingRef.current?.send('answer', msg.from, answer.data);
        }
      } else if (msg.type === 'answer') {
        // We are caller: apply answer
        await peer.applyAnswer({ type: 'answer', data: msg.data });
      } else if (msg.type === 'ice') {
        // ICE candidate
        await peer.addIceCandidate({ type: 'ice', data: msg.data });
      } else if (msg.type === 'bye') {
        peer.close();
        peerRef.current = null;
        setConnectionState('idle');
      }
    } catch (err) {
      console.error('Signal handling failed:', err);
    }
  }, []);

  // ─────────────────────────────────────────────
  // INITIALIZE (once)
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const myId = await getOrCreateDeviceId();
      if (cancelled) return;
      myIdRef.current = myId;

      // Setup signaling
      const signaling = new SignalingClient(myId, handleSignal);
      const ok = await signaling.connect();

      if (cancelled) {
        await signaling.disconnect();
        return;
      }

      if (ok) {
        signalingRef.current = signaling;
        setSignalingReady(true);
      }
    })();

    return () => {
      cancelled = true;
      signalingRef.current?.disconnect();
      signalingRef.current = null;
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [handleSignal]);

  // ─────────────────────────────────────────────
  // CREATE PEER (lazy)
  // ─────────────────────────────────────────────
  const ensurePeer = useCallback((): BadrePeer => {
    if (peerRef.current) return peerRef.current;

    const peer = new BadrePeer(
      (state) => setConnectionState(state),
      (data) => {
        receiverRef.current?.handleIncoming(data);
      }
    );

    // Send ICE candidates via signaling
    peer.onIceCandidate = async (signal) => {
      if (peerIdRef.current && signalingRef.current) {
        await signalingRef.current.send(
          'ice',
          peerIdRef.current,
          signal.data
        );
      }
    };

    peerRef.current = peer;

    // Setup receiver
    receiverRef.current = new FileReceiver({
      onProgress: (percent, bytes, speed) => {
        setTransfer((prev) => ({
          ...prev,
          state: 'receiving',
          percent,
          bytesTransferred: bytes,
          speed,
        }));
        setIsTransferOpen(true);
      },
      onComplete: (blob, meta) => {
        setTransfer((prev) => ({
          ...prev,
          state: 'complete',
          percent: 100,
          bytesTransferred: meta.size,
        }));
        downloadBlob(blob, meta.name);
      },
      onError: (error) => {
        setTransfer((prev) => ({ ...prev, state: 'error', error }));
      },
    });

    return peer;
  }, []);

  // ─────────────────────────────────────────────
  // START CONNECTION (caller side)
  // Called when we scanned a QR (we know the peer)
  // ─────────────────────────────────────────────
  const connectToPeer = useCallback(
    async (peerDeviceId: string): Promise<boolean> => {
      if (!signalingRef.current?.isReady()) {
        console.warn('Signaling not ready');
        return false;
      }

      peerIdRef.current = peerDeviceId;

      const peer = ensurePeer();
      const offer = await peer.createOffer();

            if (!offer) return false;

      const sent = await signalingRef.current.send(
        'offer',
        peerDeviceId,
        offer.data
      );

      return sent;
    },
    [ensurePeer]
  );

  // ─────────────────────────────────────────────
  // SEND FILE
  // ─────────────────────────────────────────────
  const sendFileToPeer = useCallback(async (file: File): Promise<void> => {
    const peer = peerRef.current;
    if (!peer || !peer.isConnected()) {
      setTransfer({
        ...INITIAL_TRANSFER,
        state: 'error',
        error: 'Not connected to any device',
      });
      setIsTransferOpen(true);
      return;
    }

    abortRef.current = new AbortController();

    setTransfer({
      state: 'sending',
      fileName: file.name,
      fileSize: file.size,
      percent: 0,
      bytesTransferred: 0,
      speed: 0,
    });
    setIsTransferOpen(true);

    let lastBytes = 0;
    let lastTime = Date.now();

    await sendFile({
      peer,
      file,
      signal: abortRef.current.signal,
      onProgress: (percent, bytesSent) => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        const speed = elapsed > 0 ? (bytesSent - lastBytes) / elapsed : 0;
        lastBytes = bytesSent;
        lastTime = now;

        setTransfer((prev) => ({
          ...prev,
          state: 'sending',
          percent,
          bytesTransferred: bytesSent,
          speed: Math.max(speed, prev.speed * 0.7),
        }));
      },
      onComplete: () => {
        setTransfer((prev) => ({ ...prev, state: 'complete', percent: 100 }));
      },
      onError: (error) => {
        setTransfer((prev) => ({ ...prev, state: 'error', error }));
      },
    });
  }, []);

  // ─────────────────────────────────────────────
  // CANCEL TRANSFER
  // ─────────────────────────────────────────────
  const cancelTransfer = useCallback(() => {
    abortRef.current?.abort();
    setTransfer((prev) => ({
      ...prev,
      state: 'error',
      error: 'Cancelled by user',
    }));
  }, []);

  // ─────────────────────────────────────────────
  // CLOSE TRANSFER MODAL
  // ─────────────────────────────────────────────
  const closeTransfer = useCallback(() => {
    setIsTransferOpen(false);
    setTimeout(() => setTransfer(INITIAL_TRANSFER), 300);
  }, []);

  // ─────────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (peerIdRef.current && signalingRef.current) {
      signalingRef.current.send('bye', peerIdRef.current, '');
    }
    peerRef.current?.close();
    peerRef.current = null;
    receiverRef.current?.clear();
    peerIdRef.current = null;
    setConnectionState('idle');
  }, []);

  // ─────────────────────────────────────────────
  // RETURN API
  // ─────────────────────────────────────────────
  return {
    connectionState,
    signalingReady,
    transfer,
    isTransferOpen,
    connectToPeer,
    sendFileToPeer,
    cancelTransfer,
    closeTransfer,
    disconnect,
    isConnected: connectionState === 'connected',
  };
}