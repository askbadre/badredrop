// src/lib/fileTransfer.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP FILE TRANSFER (Reliable + Parallel)
// Har chunk ka acknowledgment. Guaranteed delivery.
// ─────────────────────────────────────────────────────────────

import { getChunkSize, getTotalChunks, calculateProgress, formatBytes } from './webrtc';
import type { BadrePeer, FileMeta } from './webrtc';

// Parallel chunks
const PARALLEL_CHUNKS = 8;

// Chunk retry settings
const MAX_CHUNK_RETRIES = 5;
const ACK_TIMEOUT_MS = 10000;

// ─────────────────────────────────────────────
// MESSAGE PROTOCOL
// ─────────────────────────────────────────────
export type TransferMessage =
  | { t: 'meta'; meta: FileMeta }
  | { t: 'chunk-ack'; fileId: string; index: number }
  | { t: 'complete'; fileId: string }
  | { t: 'error'; fileId: string; message: string }
  | { t: 'cancel'; fileId: string };

// ─────────────────────────────────────────────
// SEND FILE (Reliable)
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

  // Track which chunks are acknowledged
  const ackedChunks = new Set<number>();
  let bytesAcked = 0;

  // Wait for ACKs (received via external handler — see setAckHandler)
  const ackWaiters = new Map<number, () => void>();

  const waitForAck = (index: number): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false;

      const onAck = () => {
        if (resolved) return;
        resolved = true;
        ackWaiters.delete(index);
        clearTimeout(timer);
        resolve(true);
      };

      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        ackWaiters.delete(index);
        resolve(false);
      }, ACK_TIMEOUT_MS);

      ackWaiters.set(index, onAck);
    });
  };

  // Register this session's ack handler
  registerAckHandler(fileId, (index: number) => {
    if (ackedChunks.has(index)) return;
    ackedChunks.add(index);
    ackWaiters.get(index)?.();
  });

  try {
    // 1. Send metadata
    const metaSent = await sendWithBackpressure(
      peer,
      JSON.stringify({ t: 'meta', meta }),
      signal
    );
    if (!metaSent) throw new Error('Failed to send metadata');

    // 2. Prepare all chunk packets
    const packets: ArrayBuffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = await file.slice(start, end).arrayBuffer();

      const header = `${fileId}|${i}|`;
      const headerBytes = new TextEncoder().encode(header);
      const packet = new Uint8Array(headerBytes.length + chunk.byteLength);
      packet.set(headerBytes, 0);
      packet.set(new Uint8Array(chunk), headerBytes.length);
      packets.push(packet.buffer);
    }

    // 3. Send chunks with retry until all acked
    let nextIndex = 0;
    const active = new Set<Promise<void>>();

    const sendOne = async (index: number): Promise<void> => {
      if (signal?.aborted) throw new Error('Cancelled');

      let retries = 0;
      let sent = false;

      while (retries < MAX_CHUNK_RETRIES && !sent) {
        if (signal?.aborted) throw new Error('Cancelled');

        const ok = await sendWithBackpressure(peer, packets[index], signal);
        if (!ok) {
          retries++;
          await sleep(100);
          continue;
        }

        const acked = await waitForAck(index);
        if (acked) {
          sent = true;
          bytesAcked += new Uint8Array(packets[index]).byteLength;
          onProgress?.(
            calculateProgress(bytesAcked, file.size),
            bytesAcked
          );
        } else {
          retries++;
        }
      }

      if (!sent) {
        throw new Error(`Chunk ${index} failed after ${MAX_CHUNK_RETRIES} retries`);
      }
    };

    // Pipeline
    while (nextIndex < totalChunks || active.size > 0) {
      while (nextIndex < totalChunks && active.size < PARALLEL_CHUNKS) {
        const idx = nextIndex++;
        const p = sendOne(idx).finally(() => {
          active.delete(p);
        });
        active.add(p);
      }

      if (active.size > 0) {
        await Promise.race(active);
      }
    }

    // 4. Send complete marker
    await sendWithBackpressure(
      peer,
      JSON.stringify({ t: 'complete', fileId }),
      signal
    );

    onComplete?.();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Transfer failed';
    onError?.(msg);
  } finally {
    unregisterAckHandler(fileId);
  }
}

// ─────────────────────────────────────────────
// ACK HANDLER REGISTRY (for sender side)
// ─────────────────────────────────────────────
const ackHandlers = new Map<string, (index: number) => void>();

export function registerAckHandler(
  fileId: string,
  handler: (index: number) => void
): void {
  ackHandlers.set(fileId, handler);
}

export function unregisterAckHandler(fileId: string): void {
  ackHandlers.delete(fileId);
}

export function handleAckMessage(fileId: string, index: number): boolean {
  const handler = ackHandlers.get(fileId);
  if (handler) {
    handler(index);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// SEND WITH BACKPRESSURE
// ─────────────────────────────────────────────
async function sendWithBackpressure(
  peer: BadrePeer,
  data: string | ArrayBuffer,
  signal?: AbortSignal
): Promise<boolean> {
  const MAX_BUFFER = 4 * 1024 * 1024;
  const MAX_WAIT = 60000;
  const startTime = Date.now();

  while (peer.getBufferedAmount() > MAX_BUFFER) {
    if (signal?.aborted) return false;
    if (Date.now() - startTime > MAX_WAIT) return false;
    await sleep(20);
  }

  let attempts = 0;
  while (attempts < 50) {
    const sent = peer.send(data);
    if (sent) return true;
    if (signal?.aborted) return false;
    await sleep(20);
    attempts++;
  }

  return false;
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
  sendAck?: (fileId: string, index: number) => void; // send ack back to sender
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

      if (msg.t === 'chunk-ack') {
        // This is handled by sender side; ignore here
        return handleAckMessage(msg.fileId, msg.index);
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

    // Already received? Still send ack, but don't double count
    if (session.chunks.has(index)) {
      this.callbacks.sendAck?.(fileId, index);
      return true;
    }

    const chunkData = bytes.slice(secondPipe + 1).buffer;
    session.chunks.set(index, chunkData);
    session.receivedBytes += chunkData.byteLength;

    // SEND ACK IMMEDIATELY
    this.callbacks.sendAck?.(fileId, index);

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
// DOWNLOAD
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

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

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