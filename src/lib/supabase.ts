// src/lib/supabase.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP SUPABASE CLIENT
// Sirf signaling ke liye. File data kabhi Supabase nahi jaata.
// ─────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      'Supabase env vars missing. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    return null;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  });

  return client;
}

// ─────────────────────────────────────────────
// SIGNALING PROTOCOL TYPES
// ─────────────────────────────────────────────
export type SignalType = 'offer' | 'answer' | 'ice' | 'bye';

export interface SignalingMessage {
  type: SignalType;
  from: string; // sender device ID
  to: string; // receiver device ID
  data: string; // SDP or ICE candidate (JSON, base64)
  ts: number; // timestamp
}

// ─────────────────────────────────────────────
// CHANNEL HELPERS
// Each device gets its own channel: "device:<deviceId>"
// Messages are broadcast with a "to" field for filtering
// ─────────────────────────────────────────────
export function getDeviceChannel(deviceId: string): string {
  return `device:${deviceId}`;
}