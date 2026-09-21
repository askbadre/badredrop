// src/lib/qr.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP QR CODE LOGIC
// QR code generate aur parse. Device pairing ke liye.
// ─────────────────────────────────────────────────────────────

import type { DeviceType } from '@/types';

const QR_VERSION = 1;
const QR_PREFIX = 'BADREDROP';

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
// 3. ENCODE QR STRING
// Format: BADREDROP|v1|id|name|type|ts
// ─────────────────────────────────────────────
export function encodeQR(payload: QRPayload): string {
  const safeName = payload.name.replace(/\|/g, '-');
  return [
    QR_PREFIX,
    `v${payload.v}`,
    payload.id,
    safeName,
    payload.type,
    payload.ts,
  ].join('|');
}

// ─────────────────────────────────────────────
// 4. DECODE QR STRING
// ─────────────────────────────────────────────
export function decodeQR(raw: string): QRPayload | null {
  if (!raw || typeof raw !== 'string') return null;

  const parts = raw.trim().split('|');
  if (parts.length !== 6) return null;
  if (parts[0] !== QR_PREFIX) return null;

  const version = parseInt(parts[1].replace('v', ''), 10);
  if (version !== QR_VERSION) return null;

  const id = parts[2];
  const name = parts[3];
  const type = parts[4] as DeviceType;
  const ts = parseInt(parts[5], 10);

  // Validate
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
const QR_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function isQRExpired(payload: QRPayload): boolean {
  return Date.now() - payload.ts > QR_EXPIRY_MS;
}