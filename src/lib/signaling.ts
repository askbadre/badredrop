// src/lib/signaling.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP SIGNALING (Simplified)
// Shared channel pe sab devices. Filter by "to" field.
// Supabase sirf signal relay karta hai. Data nahi jaata.
// ─────────────────────────────────────────────────────────────

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import type { SignalingMessage, SignalType } from './supabase';

// Single shared channel for all BadreDrop signaling
const SHARED_CHANNEL = 'badredrop-signaling';

// ─────────────────────────────────────────────
// SIGNALING CLIENT
// ─────────────────────────────────────────────
export class SignalingClient {
  private channel: RealtimeChannel | null = null;
  private deviceId: string;
  private onMessage: (msg: SignalingMessage) => void;
  private connected: boolean = false;

  constructor(
    deviceId: string,
    onMessage: (msg: SignalingMessage) => void
  ) {
    this.deviceId = deviceId;
    this.onMessage = onMessage;
  }

  // ─────────────────────────────────────────────
  // CONNECT
  // ─────────────────────────────────────────────
  async connect(): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

    if (!this.deviceId) {
      console.warn('No device ID');
      return false;
    }

    try {
      this.channel = supabase.channel(SHARED_CHANNEL, {
        config: {
          broadcast: { self: false, ack: false },
        },
      });

      const ch = this.channel;
      if (!ch) {
        console.warn('Channel creation failed');
        return false;
      }

      // Listen for messages
      ch.on('broadcast', { event: 'signal' }, (payload) => {
        try {
          const msg = payload.payload as SignalingMessage;

          // Filter: only messages for us, not from us
          if (msg.to !== this.deviceId) return;
          if (msg.from === this.deviceId) return;

          this.onMessage(msg);
        } catch {
          // Ignore malformed
        }
      });

      // Subscribe
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Signaling timeout')),
          10000
        );

        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            this.connected = true;
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            reject(new Error(`Channel error: ${status}`));
          }
        });
      });

      return true;
    } catch (err) {
      console.error('Signaling connect failed:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // SEND
  // ─────────────────────────────────────────────
  async send(
    type: SignalType,
    toDeviceId: string,
    data: string
  ): Promise<boolean> {
    const ch = this.channel;
    if (!ch || !this.connected) {
      console.warn('Signaling not connected');
      return false;
    }

    const msg: SignalingMessage = {
      type,
      from: this.deviceId,
      to: toDeviceId,
      data,
      ts: Date.now(),
    };

    try {
      await ch.send({
        type: 'broadcast',
        event: 'signal',
        payload: msg,
      });
      return true;
    } catch (err) {
      console.error('Signal send failed:', err);
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────────
  async disconnect(): Promise<void> {
    if (this.channel) {
      try {
        const supabase = getSupabase();
        if (supabase) {
          await supabase.removeChannel(this.channel);
        }
      } catch {
        // silent
      }
      this.channel = null;
    }
    this.connected = false;
  }

  // ─────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────
  isReady(): boolean {
    return this.connected && this.channel !== null;
  }
}