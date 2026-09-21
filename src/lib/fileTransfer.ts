// src/lib/fileTransfer.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP FILE TRANSFER
// Files ko chunks mein bhejta hai. Receive karta hai. Assemble karta hai.
// ─────────────────────────────────────────────────────────────

import { getChunkSize, getTotalChunks, calculateProgress, formatBytes } from './webrtc';
import type { BadrePeer, FileMeta } from './webrtc';

// ─────────────────────────────────────────────
// 1. MESSAGE PROTOCOL
// All messages are JSON with a "t" (type) field
// ─────────────────────────────────────────────
export type TransferMessage =
  | { t: 'meta'; meta: FileMeta }
  | { t: 'chunk-ack'; fileId: string; index: number }
  | { t: 'complete'; fileId: string }
  | { t: 'error'; fileId: string; message: string }
  | { t: 'cancel'; fileId: string };

// ─────────────────────────────────────────────
// 2. SENDER — Send a file
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
    // 1. Send metadata first
    const metaSent = await sendWithBackpressure(
      peer,
      JSON.stringify({ t: 'meta', meta }),
      signal
    );
    if (!metaSent) throw new Error('Failed to send metadata');

    // 2. Send chunks one by one
    let bytesSent = 0;

    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) throw new Error('Cancelled');

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = await file.slice(start, end).arrayBuffer();

      // Prefix with fileId + index for receiver parsing
      const header = `${fileId}|${i}|`;
      const headerBytes = new TextEncoder().encode(header);
      const packet = new Uint8Array(headerBytes.length + chunk.byteLength);
      packet.set(headerBytes, 0);
      packet.set(new Uint8Array(chunk), headerBytes.length);

      const sent = await sendWithBackpressure(peer, packet.buffer, signal);
      if (!sent) throw new Error('Failed to send chunk');

      bytesSent += chunk.byteLength;

      if (onProgress) {
        onProgress(calculateProgress(bytesSent, file.size), bytesSent);
      }
    }

    // 3. Send complete marker
    await sendWithBackpressure(
      peer,
      JSON.stringify({ t: 'complete', fileId }),
      signal
    );

    onComplete?.();
  } catch (err: any) {
    onError?.(err?.message || 'Transfer failed');
  }
}

// ─────────────────────────────────────────────
// 3. SEND WITH BACKPRESSURE
// Waits if the data channel is congested
// ─────────────────────────────────────────────
async function sendWithBackpressure(
  peer: BadrePeer,
  data: string | ArrayBuffer,
  signal?: AbortSignal
): Promise<boolean> {
  const MAX_BUFFER = 8 * 1024 * 1024; // 8 MB
  const MAX_WAIT = 10000; // 10 seconds
  const startTime = Date.now();

  while (peer.getBufferedAmount() > MAX_BUFFER) {
    if (signal?.aborted) return false;
    if (Date.now() - startTime > MAX_WAIT) return false;

    await sleep(50);
  }

  return peer.send(data);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// 4. RECEIVER — Assemble incoming file
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

  // ─────────────────────────────────────────────
  // 5. HANDLE INCOMING DATA
  // Returns true if handled as file data
  // ─────────────────────────────────────────────
  handleIncoming(data: ArrayBuffer | string): boolean {
    // String = JSON control message
    if (typeof data === 'string') {
      return this.handleControl(data);
    }

    // ArrayBuffer = chunk
    return this.handleChunk(data);
  }

  // ─────────────────────────────────────────────
  // 6. HANDLE CONTROL MESSAGE
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // 7. HANDLE CHUNK
  // Format: "fileId|index|<binary>"
  // ─────────────────────────────────────────────
  private handleChunk(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer);

    // Find the second "|" separator
    let firstPipe = -1;
    let secondPipe = -1;
    for (let i = 0; i < Math.min(bytes.length, 200); i++) {
      if (bytes[i] === 0x7c) {
        // '|'
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

    // Store chunk (skip header bytes)
    const chunkData = bytes.slice(secondPipe + 1).buffer;
    session.chunks.set(index, chunkData);
    session.receivedBytes += chunkData.byteLength;

    // Progress
    const elapsedSec = (Date.now() - session.startedAt) / 1000;
    const speed = elapsedSec > 0 ? session.receivedBytes / elapsedSec : 0;
    const percent = calculateProgress(
      session.receivedBytes,
      session.meta.size
    );

    this.callbacks.onProgress?.(
      percent,
      session.receivedBytes,
      speed
    );

    return true;
  }

  // ─────────────────────────────────────────────
  // 8. FINALIZE — Assemble chunks into a Blob
  // ─────────────────────────────────────────────
  private finalize(fileId: string): boolean {
    const session = this.sessions.get(fileId);
    if (!session) return false;

    // Check all chunks present
    if (session.chunks.size !== session.meta.totalChunks) {
      this.callbacks.onError?.(
        `Missing chunks: ${session.chunks.size}/${session.meta.totalChunks}`
      );
      this.sessions.delete(fileId);
      return false;
    }

    // Assemble in order
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

    const blob = new Blob(orderedChunks, {
      type: session.meta.type,
    });

    this.callbacks.onComplete?.(blob, session.meta);
    this.sessions.delete(fileId);
    return true;
  }

  // ─────────────────────────────────────────────
  // 9. CLEANUP
  // ─────────────────────────────────────────────
  clear(): void {
    this.sessions.clear();
  }

  hasActiveSessions(): boolean {
    return this.sessions.size > 0;
  }
}

// ─────────────────────────────────────────────
// 10. DOWNLOAD BLOB (save to device)
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

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────
// 11. GENERATE UNIQUE FILE ID
// ─────────────────────────────────────────────
function generateFileId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─────────────────────────────────────────────
// 12. HUMAN-READABLE HELPERS (re-export)
// ─────────────────────────────────────────────
export { formatBytes };

// ─────────────────────────────────────────────
// 13. SANITIZE FILENAME (prevent path traversal)
// ─────────────────────────────────────────────
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[<>:"|?*\x00-\x1F]/g, '_')
    .trim()
    .slice(0, 200) || 'file';
}

// ─────────────────────────────────────────────
// 14. VALIDATE FILE SIZE (max 500 MB for MVP)
// ─────────────────────────────────────────────
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

// ─────────────────────────────────────────────
// 15. GET FILE TYPE ICON
// ─────────────────────────────────────────────
export function getFileCategory(type: string): string {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('zip') || type.includes('rar')) return 'archive';
  if (type.startsWith('text/')) return 'text';
  return 'file';
}