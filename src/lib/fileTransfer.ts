// src/lib/fileTransfer.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP FILE TRANSFER (Parallel + Fast)
// Chunks parallel bhejta hai. 10x fast.
// ─────────────────────────────────────────────────────────────

import { getChunkSize, getTotalChunks, calculateProgress, formatBytes } from './webrtc';
import type { BadrePeer, FileMeta } from './webrtc';

// Parallel chunks — kitne ek saath bhejne hain
const PARALLEL_CHUNKS = 16;

// ─────────────────────────────────────────────
// MESSAGE PROTOCOL
// ─────────────────────────────────────────────
export type TransferMessage =
  | { t: 'meta'; meta: FileMeta }
  | { t: 'complete'; fileId: string }
  | { t: 'error'; fileId: string; message: string }
  | { t: 'cancel'; fileId: string };

// ─────────────────────────────────────────────
// SEND FILE (PARALLEL)
// ─────────────────────────────────────────────
export interface SendOptions {
  peer: BadrePeer;
  file: File;
  onProgress?: (percent: number, bytesSent: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

export async function sendFile(options: SendOptions): Promise<void> {
  const { peer, file, onProgress, onComplete, onError, signal } = options;

  const fileId = generateFileId();
  const totalChunks = getTotalChunks(file.size);
  const chunkSize = getChunkSize();

  const meta: FileMeta = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    totalChunks,
  };

  try {
    // 1. Send metadata
    const metaSent = await sendWithBackpressure(
      peer,
      JSON.stringify({ t: 'meta', meta }),
      signal
    );
    if (!metaSent) throw new Error('Failed to send metadata');

    // 2. PARALLEL CHUNK SENDING
    let bytesSent = 0;
    let nextChunk = 0;
    const activeChunks = new Set<Promise<void>>();

    const sendChunk = async (index: number): Promise<void> => {
      if (signal?.aborted) throw new Error('Cancelled');

      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = await file.slice(start, end).arrayBuffer();

      // Header: fileId|index|
      const header = `${fileId}|${index}|`;
      const headerBytes = new TextEncoder().encode(header);
      const packet = new Uint8Array(headerBytes.length + chunk.byteLength);
      packet.set(headerBytes, 0);
      packet.set(new Uint8Array(chunk), headerBytes.length);

      await sendWithBackpressure(peer, packet.buffer, signal);

      bytesSent += chunk.byteLength;

      if (onProgress) {
        onProgress(calculateProgress(bytesSent, file.size), bytesSent);
      }
    };

    // Pipeline: PARALLEL_CHUNKS ek saath
    while (nextChunk < totalChunks || activeChunks.size > 0) {
      // Fill pipeline
      while (
        nextChunk < totalChunks &&
        activeChunks.size < PARALLEL_CHUNKS
      ) {
        const idx = nextChunk++;
        const p = sendChunk(idx).finally(() => {
          activeChunks.delete(p);
        });
        activeChunks.add(p);
      }

      // Wait for at least one to finish
      if (activeChunks.size > 0) {
        await Promise.race(activeChunks);
      }
    }

    // 3. Send complete marker
    await sendWithBackpressure(
      peer,
      JSON.stringify({ t: 'complete', fileId }),
      signal
    );

    onComplete?.();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Transfer failed';
    onError?.(msg);
  }
}

// ─────────────────────────────────────────────
// SEND WITH BACKPRESSURE
// ─────────────────────────────────────────────
async function sendWithBackpressure(
  peer: BadrePeer,
  data: string | ArrayBuffer,
  signal?: AbortSignal
): Promise<boolean> {
  const MAX_BUFFER = 64 * 1024 * 1024; // 64 MB — bigger for parallel
  const MAX_WAIT = 30000;
  const startTime = Date.now();

  while (peer.getBufferedAmount() > MAX_BUFFER) {
    if (signal?.aborted) return false;
    if (Date.now() - startTime > MAX_WAIT) return false;
    await sleep(5); // faster poll
  }

  return peer.send(data);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// RECEIVER
// ─────────────────────────────────────────────
export interface ReceiveSession {
  meta: FileMeta;
  chunks: Map<number, ArrayBuffer>;
  receivedBytes: number;
  startedAt: number;
}

export interface ReceiverCallbacks {
  onProgress?: (percent: number, bytesReceived: number, speed: number) => void;
  onComplete?: (blob: Blob, meta: FileMeta) => void;
  onError?: (error: string) => void;
}

export class FileReceiver {
  private sessions = new Map<string, ReceiveSession>();
  private callbacks: ReceiverCallbacks;

  constructor(callbacks: ReceiverCallbacks = {}) {
    this.callbacks = callbacks;
  }

  handleIncoming(data: ArrayBuffer | string): boolean {
    if (typeof data === 'string') {
      return this.handleControl(data);
    }
    return this.handleChunk(data);
  }

  private handleControl(raw: string): boolean {
    try {
      const msg: TransferMessage = JSON.parse(raw);

      if (msg.t === 'meta') {
        this.sessions.set(msg.meta.id, {
          meta: msg.meta,
          chunks: new Map(),
          receivedBytes: 0,
          startedAt: Date.now(),
        });
        return true;
      }

      if (msg.t === 'complete') {
        return this.finalize(msg.fileId);
      }

      if (msg.t === 'error') {
        this.callbacks.onError?.(msg.message);
        this.sessions.delete(msg.fileId);
        return true;
      }

      if (msg.t === 'cancel') {
        this.sessions.delete(msg.fileId);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private handleChunk(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer);

    let firstPipe = -1;
    let secondPipe = -1;
    for (let i = 0; i < Math.min(bytes.length, 200); i++) {
      if (bytes[i] === 0x7c) {
        if (firstPipe === -1) firstPipe = i;
        else {
          secondPipe = i;
          break;
        }
      }
    }

    if (firstPipe === -1 || secondPipe === -1) return false;

    const fileId = new TextDecoder().decode(bytes.slice(0, firstPipe));
    const indexStr = new TextDecoder().decode(
      bytes.slice(firstPipe + 1, secondPipe)
    );
    const index = parseInt(indexStr, 10);

    if (!fileId || isNaN(index)) return false;

    const session = this.sessions.get(fileId);
    if (!session) return false;

    const chunkData = bytes.slice(secondPipe + 1).buffer;
    session.chunks.set(index, chunkData);
    session.receivedBytes += chunkData.byteLength;

    const elapsedSec = (Date.now() - session.startedAt) / 1000;
    const speed = elapsedSec > 0 ? session.receivedBytes / elapsedSec : 0;
    const percent = calculateProgress(session.receivedBytes, session.meta.size);

    this.callbacks.onProgress?.(percent, session.receivedBytes, speed);
    return true;
  }

  private finalize(fileId: string): boolean {
    const session = this.sessions.get(fileId);
    if (!session) return false;

    if (session.chunks.size !== session.meta.totalChunks) {
      this.callbacks.onError?.(
        `Missing chunks: ${session.chunks.size}/${session.meta.totalChunks}`
      );
      this.sessions.delete(fileId);
      return false;
    }

    const orderedChunks: ArrayBuffer[] = [];
    for (let i = 0; i < session.meta.totalChunks; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) {
        this.callbacks.onError?.(`Missing chunk ${i}`);
        this.sessions.delete(fileId);
        return false;
      }
      orderedChunks.push(chunk);
    }

    const blob = new Blob(orderedChunks, { type: session.meta.type });
    this.callbacks.onComplete?.(blob, session.meta);
    this.sessions.delete(fileId);
    return true;
  }

  clear(): void {
    this.sessions.clear();
  }

  hasActiveSessions(): boolean {
    return this.sessions.size > 0;
  }
}

// ─────────────────────────────────────────────
// DOWNLOAD BLOB
// ─────────────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function generateFileId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export { formatBytes };

export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[<>:"|?*\x00-\x1F]/g, '_')
      .trim()
      .slice(0, 200) || 'file'
  );
}

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

export function getFileCategory(type: string): string {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('zip') || type.includes('rar')) return 'archive';
  if (type.startsWith('text/')) return 'text';
  return 'file';
}