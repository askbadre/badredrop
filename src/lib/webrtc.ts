// src/lib/webrtc.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP WEBRTC
// Peer-to-peer connection. Zero server. Zero storage.
// File transfer ka dil.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// 1. CONFIG
// ─────────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const DATA_CHANNEL_LABEL = 'badredrop-data';
const CHUNK_SIZE = 16 * 1024; // 16 KB per chunk (safe for all browsers)

// ─────────────────────────────────────────────
// 2. TYPES
// ─────────────────────────────────────────────
export type ConnectionState =
  | 'idle'
  | 'creating-offer'
  | 'creating-answer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export type SignalType = 'offer' | 'answer' | 'ice';

export interface Signal {
  type: SignalType;
  data: string; // base64 encoded
}

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export interface FileChunk {
  fileId: string;
  index: number;
  data: ArrayBuffer;
}

// ─────────────────────────────────────────────
// 3. PEER CONNECTION WRAPPER
// ─────────────────────────────────────────────
export class BadrePeer {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onStateChange?: (state: ConnectionState) => void;
  private onMessage?: (data: ArrayBuffer | string) => void;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    onStateChange?: (state: ConnectionState) => void,
    onMessage?: (data: ArrayBuffer | string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onMessage = onMessage;
  }

  // ─────────────────────────────────────────────
  // 4. CREATE OFFER (Caller side)
  // ─────────────────────────────────────────────
  async createOffer(): Promise<Signal> {
    this.updateState('creating-offer');
    this.pc = this.createPeerConnection();
    this.setupDataChannel();

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    return {
      type: 'offer',
      data: this.encodeSDP(offer),
    };
  }

  // ─────────────────────────────────────────────
  // 5. ACCEPT OFFER + CREATE ANSWER (Receiver side)
  // ─────────────────────────────────────────────
  async acceptOffer(offerSignal: Signal): Promise<Signal> {
    this.updateState('creating-answer');
    this.pc = this.createPeerConnection();

    const offer = this.decodeSDP(offerSignal.data);
    await this.pc.setRemoteDescription(offer);

    // Add any pending candidates
    for (const candidate of this.pendingCandidates) {
      await this.pc.addIceCandidate(candidate);
    }
    this.pendingCandidates = [];

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return {
      type: 'answer',
      data: this.encodeSDP(answer),
    };
  }

  // ─────────────────────────────────────────────
  // 6. APPLY ANSWER (Caller side)
  // ─────────────────────────────────────────────
  async applyAnswer(answerSignal: Signal): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');
    const answer = this.decodeSDP(answerSignal.data);
    await this.pc.setRemoteDescription(answer);

    // Add any pending candidates
    for (const candidate of this.pendingCandidates) {
      await this.pc.addIceCandidate(candidate);
    }
    this.pendingCandidates = [];
  }

  // ─────────────────────────────────────────────
  // 7. ADD ICE CANDIDATE
  // ─────────────────────────────────────────────
  async addIceCandidate(signal: Signal): Promise<void> {
    if (!this.pc) {
      // Buffer candidate for later
      this.pendingCandidates.push(
        JSON.parse(this.decodeFromBase64(signal.data))
      );
      return;
    }

    const candidate = JSON.parse(this.decodeFromBase64(signal.data));
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      // Ignore late candidates
    }
  }

  // ─────────────────────────────────────────────
  // 8. SEND DATA
  // ─────────────────────────────────────────────
  send(data: ArrayBuffer | string): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return false;
    }

    if (this.dataChannel.bufferedAmount > 16 * 1024 * 1024) {
      // Backpressure — wait
      return false;
    }

    this.dataChannel.send(data as any);
    return true;
  }

  // ─────────────────────────────────────────────
  // 9. GET BUFFERED AMOUNT
  // ─────────────────────────────────────────────
  getBufferedAmount(): number {
    return this.dataChannel?.bufferedAmount ?? 0;
  }

    private currentState: ConnectionState = 'idle';

  getConnectionState(): ConnectionState {
    return this.currentState;
  }

  // ─────────────────────────────────────────────
  // 10. CHECK CONNECTION
  // ─────────────────────────────────────────────
  isConnected(): boolean {
    return (
      this.dataChannel?.readyState === 'open' &&
      this.pc?.connectionState === 'connected'
    );
  }

  // ─────────────────────────────────────────────
  // 11. CLOSE
  // ─────────────────────────────────────────────
  close(): void {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // silent
      }
      this.dataChannel = null;
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // silent
      }
      this.pc = null;
    }

    this.pendingCandidates = [];
    this.updateState('disconnected');
  }

  // ─────────────────────────────────────────────
  // 12. PRIVATE: Create Peer Connection
  // ─────────────────────────────────────────────
  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    // ICE candidate generated
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate({
          type: 'ice',
          data: this.encodeToBase64(JSON.stringify(event.candidate)),
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') this.updateState('connected');
      else if (state === 'connecting') this.updateState('connecting');
      else if (state === 'disconnected') this.updateState('disconnected');
      else if (state === 'failed') this.updateState('failed');
    };

    // Data channel received (receiver side)
    pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelHandlers();
    };

    return pc;
  }

  // ─────────────────────────────────────────────
  // 13. PRIVATE: Setup Data Channel (caller side)
  // ─────────────────────────────────────────────
  private setupDataChannel(): void {
    if (!this.pc) return;
    this.dataChannel = this.pc.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: true,
    });
    this.setupDataChannelHandlers();
  }

  // ─────────────────────────────────────────────
  // 14. PRIVATE: Data channel event handlers
  // ─────────────────────────────────────────────
  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      this.updateState('connected');
    };

    this.dataChannel.onclose = () => {
      this.updateState('disconnected');
    };

    this.dataChannel.onerror = () => {
      this.updateState('failed');
    };

    this.dataChannel.onmessage = (event) => {
      this.onMessage?.(event.data);
    };
  }

  // ─────────────────────────────────────────────
  // 15. PRIVATE: Encode/Decode SDP
  // ─────────────────────────────────────────────
  private encodeSDP(desc: RTCSessionDescriptionInit): string {
    return this.encodeToBase64(JSON.stringify(desc));
  }

  private decodeSDP(data: string): RTCSessionDescriptionInit {
    return JSON.parse(this.decodeFromBase64(data));
  }

  private encodeToBase64(str: string): string {
    if (typeof window === 'undefined') return '';
    return btoa(unescape(encodeURIComponent(str)));
  }

  private decodeFromBase64(b64: string): string {
    if (typeof window === 'undefined') return '';
    return decodeURIComponent(escape(atob(b64)));
  }

  // ─────────────────────────────────────────────
  // 16. PRIVATE: Update state
  // ─────────────────────────────────────────────
   private updateState(state: ConnectionState): void {
    this.currentState = state;
    this.onStateChange?.(state);
  }

  // ─────────────────────────────────────────────
  // 17. ICE CANDIDATE CALLBACK (set externally)
  // ─────────────────────────────────────────────
  onIceCandidate?: (signal: Signal) => void;
}

// ─────────────────────────────────────────────
// 18. FILE CHUNKING HELPERS
// ─────────────────────────────────────────────
export function getTotalChunks(fileSize: number): number {
  return Math.ceil(fileSize / CHUNK_SIZE);
}

export function getChunkSize(): number {
  return CHUNK_SIZE;
}

// ─────────────────────────────────────────────
// 19. PROGRESS CALCULATOR
// ─────────────────────────────────────────────
export function calculateProgress(
  bytesTransferred: number,
  totalBytes: number
): number {
  if (totalBytes === 0) return 0;
  return Math.min(100, Math.round((bytesTransferred / totalBytes) * 100));
}

// ─────────────────────────────────────────────
// 20. FORMAT HELPERS
// ─────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}