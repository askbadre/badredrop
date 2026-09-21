// src/lib/qr.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP QR CODE LOGIC
// QR code generate aur parse. Device pairing ke liye.
// Format: URL (production) — phone scan kar sake
// ─────────────────────────────────────────────────────────────

import type { DeviceType } from '@/types';

const QR_VERSION = 1;
const QR_PREFIX = 'BADREDROP';

// QR code always uses production URL (phone cannot access localhost)
const PRODUCTION_URL = 'https://badredrop.vercel.app';

// ─────────────────────────────────────────────
// 1. QR DATA SHAPE
// ─────────────────────────────────────────────
export interface QRPayload {
  v: number; // version
  id: string; // device ID
  name: string; // device name
  type: DeviceType; // device type
  ts: number; // timestamp
}

// ─────────────────────────────────────────────
// 2. BUILD QR PAYLOAD
// ─────────────────────────────────────────────
export function buildQRPayload(
  deviceId: string,
  deviceName: string,
  deviceType: DeviceType
): QRPayload {
  return {
    v: QR_VERSION,
    id: deviceId,
    name: deviceName.slice(0, 30),
    type: deviceType,
    ts: Date.now(),
  };
}

// ─────────────────────────────────────────────
// 3. ENCODE QR — URL format
// Format: https://badredrop.vercel.app/connect?id=...&name=...&type=...&ts=...&v=...
// ─────────────────────────────────────────────
export function encodeQR(payload: QRPayload): string {
  const params = new URLSearchParams({
    id: payload.id,
    name: payload.name,
    type: payload.type,
    ts: payload.ts.toString(),
    v: payload.v.toString(),
  });

  return `${PRODUCTION_URL}/connect?${params.toString()}`;
}

// ─────────────────────────────────────────────
// 4. DECODE QR — from URL or raw pipe format
// ─────────────────────────────────────────────
export function decodeQR(raw: string): QRPayload | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();

  // Try URL format first
  try {
    const url = new URL(trimmed);
    if (url.pathname === '/connect') {
      const id = url.searchParams.get('id');
      const name = url.searchParams.get('name');
      const type = url.searchParams.get('type') as DeviceType;
      const ts = parseInt(url.searchParams.get('ts') || '0', 10);
      const v = parseInt(url.searchParams.get('v') || '1', 10);

      if (!id || id.length < 8 || id.length > 32) return null;
      if (!name || name.length > 30) return null;
      if (!['phone', 'laptop', 'desktop', 'tablet'].includes(type)) return null;
      if (!ts || isNaN(ts)) return null;

      return { v, id, name, type, ts };
    }
  } catch {
    // Not a URL — try old pipe format below
  }

  // Fallback: old pipe format
  const parts = trimmed.split('|');
  if (parts.length !== 6) return null;
  if (parts[0] !== QR_PREFIX) return null;

  const version = parseInt(parts[1].replace('v', ''), 10);
  if (version !== QR_VERSION) return null;

  const id = parts[2];
  const name = parts[3];
  const type = parts[4] as DeviceType;
  const ts = parseInt(parts[5], 10);

  if (!id || id.length < 8 || id.length > 32) return null;
  if (!name || name.length > 30) return null;
  if (!['phone', 'laptop', 'desktop', 'tablet'].includes(type)) return null;
  if (!ts || isNaN(ts)) return null;

  return { v: version, id, name, type, ts };
}

// ─────────────────────────────────────────────
// 5. VALIDATE QR STRING (quick check)
// ─────────────────────────────────────────────
export function isValidQR(raw: string): boolean {
  return decodeQR(raw) !== null;
}

// ─────────────────────────────────────────────
// 6. QR EXPIRY CHECK (5 minutes)
// ─────────────────────────────────────────────
const QR_EXPIRY_MS = 5 * 60 * 1000;

export function isQRExpired(payload: QRPayload): boolean {
  return Date.now() - payload.ts > QR_EXPIRY_MS;
}