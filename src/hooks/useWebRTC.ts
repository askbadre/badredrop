// src/hooks/useWebRTC.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BadrePeer } from '@/lib/webrtc';
import type { ConnectionState, Signal } from '@/lib/webrtc';
import { FileReceiver, downloadBlob, sendFile } from '@/lib/fileTransfer';
import { SignalingClient } from '@/lib/signaling';
import type { SignalingMessage } from '@/lib/supabase';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import type { TransferState } from '@/components/TransferProgress';
import { isDeviceBlocked } from '@/lib/storage';


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

export function useWebRTC() {
  const peerRef = useRef<BadrePeer | null>(null);
  const receiverRef = useRef<FileReceiver | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const myIdRef = useRef<string>('');

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('idle');
  const [signalingReady, setSignalingReady] = useState(false);
  const [transfer, setTransfer] = useState<TransferInfo>(INITIAL_TRANSFER);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // ─────────────────────────────────────────────
  // ENSURE PEER EXISTS
  // ─────────────────────────────────────────────
  const ensurePeer = useCallback((): BadrePeer => {
    if (peerRef.current) return peerRef.current;

    const peer = new BadrePeer(
      (state) => setConnectionState(state),
      (data) => {
        receiverRef.current?.handleIncoming(data);
      }
    );

    peer.onIceCandidate = async (signal) => {
      if (peerIdRef.current && signalingRef.current) {
        await signalingRef.current.send('ice', peerIdRef.current, signal.data);
      }
    };

    peerRef.current = peer;

       receiverRef.current = new FileReceiver({
      sendAck: (fileId, index) => {
        // Send ACK back to sender
        peer.send(JSON.stringify({ t: 'chunk-ack', fileId, index }));
      },
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
  // HANDLE SIGNALING MESSAGE
  // ─────────────────────────────────────────────
  const handleSignal = useCallback(
    async (msg: SignalingMessage) => {
      // Auto-create peer on incoming signal
      const peer = ensurePeer();

            // Check if blocked
      if (isDeviceBlocked(msg.from)) {
        console.log('Blocked device signal ignored:', msg.from);
        return;
      }

      // Remember peer
      if (!peerIdRef.current) {
        peerIdRef.current = msg.from;
        // Save for UI so both sides show connected
        try {
          localStorage.setItem(
            'badredrop_last_peer',
            JSON.stringify({
              id: msg.from,
              name: 'Connected Device',
              type: 'laptop',
              ts: Date.now(),
            })
          );
        } catch {}
      }

            try {
        if (msg.type === 'offer') {
          // Ignore if we already sent an offer (we are the caller)
          if (peer.getConnectionState() === 'creating-offer') {
            console.log('Ignoring offer — we are caller');
            return;
          }

          // Only accept if we are in stable state
          const currentState = peer.getConnectionState();
          if (
            currentState !== 'idle' &&
            currentState !== 'disconnected' &&
            currentState !== 'failed'
          ) {
            console.log('Ignoring offer — wrong state:', currentState);
            return;
          }

          const answer = await peer.acceptOffer({
            type: 'offer',
            data: msg.data,
          });
          if (answer) {
            await signalingRef.current?.send('answer', msg.from, answer.data);
          }
        } else if (msg.type === 'answer') {
          await peer.applyAnswer({ type: 'answer', data: msg.data });
        } else if (msg.type === 'ice') {
          await peer.addIceCandidate({ type: 'ice', data: msg.data });
        } else if (msg.type === 'bye') {
          peer.close();
          peerRef.current = null;
          peerIdRef.current = null;
          setConnectionState('idle');
        }
      } catch (err) {
        console.error('Signal handling failed:', err);
      }
    },
    [ensurePeer]
  );

  // ─────────────────────────────────────────────
  // INIT SIGNALING (once)
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const myId = await getOrCreateDeviceId();
      if (cancelled) return;
      myIdRef.current = myId;

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
  // CONNECT TO PEER (caller side)
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

  const cancelTransfer = useCallback(() => {
    abortRef.current?.abort();
    setTransfer((prev) => ({
      ...prev,
      state: 'error',
      error: 'Cancelled by user',
    }));
  }, []);

  const closeTransfer = useCallback(() => {
    setIsTransferOpen(false);
    setTimeout(() => setTransfer(INITIAL_TRANSFER), 300);
  }, []);

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