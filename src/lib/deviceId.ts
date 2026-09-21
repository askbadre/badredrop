// src/lib/deviceId.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP DEVICE ID
// Har device ka unique ID. Server ko nahi jaata. Sirf local.
// ─────────────────────────────────────────────────────────────

import { generateSecureRandom, hashString } from './security';

const DEVICE_ID_KEY = 'badredrop_device_id';
const DEVICE_NAME_KEY = 'badredrop_device_name';

// ─────────────────────────────────────────────
// 1. GET OR CREATE DEVICE ID
// ─────────────────────────────────────────────
export async function getOrCreateDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return '';

  // Check if already exists
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (id) return id;

  // Generate new: random + timestamp
  const randomBytes = generateSecureRandom(16);
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const timestamp = Date.now().toString(36);
  const rawId = `${randomHex}-${timestamp}`;

  // Hash it for extra security (one-way)
  id = await hashString(rawId);

  // Shorten for QR (first 16 chars)
  id = id.substring(0, 16);

  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

// ─────────────────────────────────────────────
// 2. GET DEVICE ID (sync, from storage)
// ─────────────────────────────────────────────
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(DEVICE_ID_KEY) || '';
}

// ─────────────────────────────────────────────
// 3. SET DEVICE NAME
// ─────────────────────────────────────────────
export function setDeviceName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_NAME_KEY, name.trim().slice(0, 50));
}

// ─────────────────────────────────────────────
// 4. GET DEVICE NAME
// ─────────────────────────────────────────────
export function getStoredDeviceName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(DEVICE_NAME_KEY) || '';
}

// ─────────────────────────────────────────────
// 5. GET DEVICE TYPE (from user agent)
// ─────────────────────────────────────────────
export function getDeviceType(): 'phone' | 'laptop' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();

  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'phone';
  return 'desktop';
}

// ─────────────────────────────────────────────
// 6. AUTO-GENERATE DEVICE NAME
// ─────────────────────────────────────────────
export function getAutoDeviceName(): string {
  const type = getDeviceType();
  const stored = getStoredDeviceName();

  if (stored) return stored;

  const typeLabel =
    type === 'phone'
      ? 'Phone'
      : type === 'tablet'
      ? 'Tablet'
      : type === 'laptop'
      ? 'Laptop'
      : 'Desktop';

  return `Badre's ${typeLabel}`;
}

// ─────────────────────────────────────────────
// 7. CLEAR DEVICE ID (reset)
// ─────────────────────────────────────────────
export function clearDeviceId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_NAME_KEY);
}