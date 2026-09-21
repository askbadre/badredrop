// src/lib/webrtc.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP WEBRTC
// Peer-to-peer connection. Zero server. Zero storage.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// 1. CONFIG
// ─────────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

const DATA_CHANNEL_LABEL = 'badredrop-data';
const CHUNK_SIZE = 128 * 1024; // 128 KB

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
  data: string;
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
  private currentState: ConnectionState = 'idle';

  constructor(
    onStateChange?: (state: ConnectionState) => void,
    onMessage?: (data: ArrayBuffer | string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onMessage = onMessage;
  }

  // ─────────────────────────────────────────────
  // 4. CREATE OFFER
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
  // 5. ACCEPT OFFER
  // ─────────────────────────────────────────────
  async acceptOffer(offerSignal: Signal): Promise<Signal> {
    this.updateState('creating-answer');
    this.pc = this.createPeerConnection();

    const offer = this.decodeSDP(offerSignal.data);
    await this.pc.setRemoteDescription(offer);

    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
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
  // 6. APPLY ANSWER
  // ─────────────────────────────────────────────
  async applyAnswer(answerSignal: Signal): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');
    const answer = this.decodeSDP(answerSignal.data);
    await this.pc.setRemoteDescription(answer);

    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
    }
    this.pendingCandidates = [];
  }

  // ─────────────────────────────────────────────
  // 7. ADD ICE CANDIDATE
  // ─────────────────────────────────────────────
  async addIceCandidate(signal: Signal): Promise<void> {
    if (!this.pc) {
      this.pendingCandidates.push(
        JSON.parse(this.decodeFromBase64(signal.data))
      );
      return;
    }

    const candidate = JSON.parse(this.decodeFromBase64(signal.data));
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {}
  }

  // ─────────────────────────────────────────────
  // 8. SEND DATA
  // ─────────────────────────────────────────────
  send(data: ArrayBuffer | string): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return false;
    }
    if (this.dataChannel.bufferedAmount > 64 * 1024 * 1024) {
      return false;
    }
    try {
      this.dataChannel.send(data as any);
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // 9. GET BUFFERED AMOUNT
  // ─────────────────────────────────────────────
  getBufferedAmount(): number {
    return this.dataChannel?.bufferedAmount ?? 0;
  }

  // ─────────────────────────────────────────────
  // 10. GET STATE
  // ─────────────────────────────────────────────
  getConnectionState(): ConnectionState {
    return this.currentState;
  }

  // ─────────────────────────────────────────────
  // 11. IS CONNECTED
  // ─────────────────────────────────────────────
  isConnected(): boolean {
    return (
      this.dataChannel?.readyState === 'open' &&
      this.pc?.connectionState === 'connected'
    );
  }

  // ─────────────────────────────────────────────
  // 12. CLOSE
  // ─────────────────────────────────────────────
  close(): void {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
    this.pendingCandidates = [];
    this.updateState('disconnected');
  }

  // ─────────────────────────────────────────────
  // 13. PRIVATE: Create Peer Connection
  // ─────────────────────────────────────────────
  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
    });

    // SINGLE onicecandidate handler (was duplicated before)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(
          'ICE TYPE:',
          event.candidate.type,
          '| PROTOCOL:',
          event.candidate.protocol
        );
        if (this.onIceCandidate) {
          this.onIceCandidate({
            type: 'ice',
            data: this.encodeToBase64(JSON.stringify(event.candidate)),
          });
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') this.updateState('connected');
      else if (state === 'connecting') this.updateState('connecting');
      else if (state === 'disconnected') this.updateState('disconnected');
      else if (state === 'failed') this.updateState('failed');
    };

    pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelHandlers();
    };

    return pc;
  }

  // ─────────────────────────────────────────────
  // 14. PRIVATE: Setup Data Channel
  // ─────────────────────────────────────────────
  private setupDataChannel(): void {
    if (!this.pc) return;
    this.dataChannel = this.pc.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: true,
    });
    this.setupDataChannelHandlers();
  }

  // ─────────────────────────────────────────────
  // 15. PRIVATE: Data channel handlers
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
  // 16. PRIVATE: Encode/Decode
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
  // 17. PRIVATE: Update state
  // ─────────────────────────────────────────────
  private updateState(state: ConnectionState): void {
    this.currentState = state;
    this.onStateChange?.(state);
  }

  onIceCandidate?: (signal: Signal) => void;
}

// ─────────────────────────────────────────────
// 18. HELPERS
// ─────────────────────────────────────────────
export function getTotalChunks(fileSize: number): number {
  return Math.ceil(fileSize / CHUNK_SIZE);
}

export function getChunkSize(): number {
  return CHUNK_SIZE;
}

export function calculateProgress(
  bytesTransferred: number,
  totalBytes: number
): number {
  if (totalBytes === 0) return 0;
  return Math.min(100, Math.round((bytesTransferred / totalBytes) * 100));
}

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