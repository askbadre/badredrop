// src/hooks/useWebRTC.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP WEBRTC HOOK
// Sab kuch connect karta hai. UI ke liye simple API.
// ─────────────────────────────────────────────────────────────

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BadrePeer } from '@/lib/webrtc';
import type { ConnectionState, Signal, FileMeta } from '@/lib/webrtc';
import { FileReceiver, downloadBlob, sendFile } from '@/lib/fileTransfer';
import type { TransferState } from '@/components/TransferProgress';

// ─────────────────────────────────────────────
// HOOK TYPES
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
  const abortRef = useRef<AbortController | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('idle');
  const [transfer, setTransfer] = useState<TransferInfo>(INITIAL_TRANSFER);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // ─────────────────────────────────────────────
  // INITIALIZE PEER
  // ─────────────────────────────────────────────
  const initPeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    const peer = new BadrePeer(
      (state) => setConnectionState(state),
      (data) => {
        // Incoming data
        receiverRef.current?.handleIncoming(data);
      }
    );

    // ICE candidate handler (to be wired to signaling)
    peer.onIceCandidate = (signal) => {
      // In manual QR mode: candidate goes into QR or is ignored
      // For MVP, we'll rely on non-trickle ICE
      console.log('ICE candidate:', signal.type);
    };

    peerRef.current = peer;

    // Setup receiver callbacks
    receiverRef.current = new FileReceiver({
      onProgress: (percent, bytes, speed) => {
        setTransfer((prev) => ({
          ...prev,
          state: 'receiving',
          percent,
          bytesTransferred: bytes,
          speed,
        }));
      },
      onComplete: (blob, meta) => {
        setTransfer((prev) => ({
          ...prev,
          state: 'complete',
          percent: 100,
          bytesTransferred: meta.size,
        }));
        // Auto-download
        downloadBlob(blob, meta.name);
      },
      onError: (error) => {
        setTransfer((prev) => ({
          ...prev,
          state: 'error',
          error,
        }));
      },
    });

    return peer;
  }, []);

  // ─────────────────────────────────────────────
  // CREATE OFFER (Caller)
  // ─────────────────────────────────────────────
  const createOffer = useCallback(async (): Promise<Signal | null> => {
    try {
      const peer = initPeer();
      const offer = await peer.createOffer();
      return offer;
    } catch (err) {
      console.error('createOffer failed:', err);
      return null;
    }
  }, [initPeer]);

  // ─────────────────────────────────────────────
  // ACCEPT OFFER (Receiver)
  // ─────────────────────────────────────────────
  const acceptOffer = useCallback(
    async (offer: Signal): Promise<Signal | null> => {
      try {
        const peer = initPeer();
        const answer = await peer.acceptOffer(offer);
        return answer;
      } catch (err) {
        console.error('acceptOffer failed:', err);
        return null;
      }
    },
    [initPeer]
  );

  // ─────────────────────────────────────────────
  // APPLY ANSWER (Caller)
  // ─────────────────────────────────────────────
  const applyAnswer = useCallback(async (answer: Signal): Promise<void> => {
    try {
      await peerRef.current?.applyAnswer(answer);
    } catch (err) {
      console.error('applyAnswer failed:', err);
    }
  }, []);

  // ─────────────────────────────────────────────
  // ADD ICE CANDIDATE
  // ─────────────────────────────────────────────
  const addIceCandidate = useCallback(async (signal: Signal) => {
    try {
      await peerRef.current?.addIceCandidate(signal);
    } catch (err) {
      console.error('addIceCandidate failed:', err);
    }
  }, []);

  // ─────────────────────────────────────────────
  // SEND FILE
  // ─────────────────────────────────────────────
  const sendFileToPeer = useCallback(
    async (file: File): Promise<void> => {
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

      // Setup abort
      abortRef.current = new AbortController();

      // Reset transfer info
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
            speed: Math.max(speed, prev.speed * 0.7), // smooth
          }));
        },
        onComplete: () => {
          setTransfer((prev) => ({
            ...prev,
            state: 'complete',
            percent: 100,
          }));
        },
        onError: (error) => {
          setTransfer((prev) => ({
            ...prev,
            state: 'error',
            error,
          }));
        },
      });
    },
    []
  );

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
    peerRef.current?.close();
    peerRef.current = null;
    receiverRef.current?.clear();
    setConnectionState('idle');
  }, []);

  // ─────────────────────────────────────────────
  // CLEANUP ON UNMOUNT
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, []);

  // ─────────────────────────────────────────────
  // RETURN API
  // ─────────────────────────────────────────────
  return {
    // State
    connectionState,
    transfer,
    isTransferOpen,

    // Actions
    createOffer,
    acceptOffer,
    applyAnswer,
    addIceCandidate,
    sendFileToPeer,
    cancelTransfer,
    closeTransfer,
    disconnect,

    // Helpers
    isConnected: peerRef.current?.isConnected() ?? false,
  };
}