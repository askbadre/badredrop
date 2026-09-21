// src/lib/security.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP SECURITY LAYER
// Zero-knowledge encryption. XSS protection. Input validation.
// Server ko kuch nahi pata. Sirf device ko pata hai.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// 1. CONSTANTS
// ─────────────────────────────────────────────
const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

// ─────────────────────────────────────────────
// 2. RANDOM HELPERS (Cryptographically secure)
// ─────────────────────────────────────────────
export function generateSecureRandom(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

export function generateDeviceId(): string {
  const bytes = generateSecureRandom(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─────────────────────────────────────────────
// 3. HASHING (for device ID, names — never reversible)
// ─────────────────────────────────────────────
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─────────────────────────────────────────────
// 4. KEY DERIVATION (password → encryption key)
// ─────────────────────────────────────────────
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─────────────────────────────────────────────
// 5. ENCRYPTION (AES-256-GCM — military grade)
// ─────────────────────────────────────────────
export async function encryptData(
  data: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const salt = generateSecureRandom(SALT_LENGTH);
  const iv = generateSecureRandom(IV_LENGTH);
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(data)
  );

  // Combine salt + iv + ciphertext into one base64 string
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

// ─────────────────────────────────────────────
// 6. DECRYPTION
// ─────────────────────────────────────────────
export async function decryptData(
  encryptedBase64: string,
  password: string
): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0)
  );

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ─────────────────────────────────────────────
// 7. INPUT SANITIZATION (XSS protection)
// ─────────────────────────────────────────────
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove inline event handlers
    .slice(0, 10000); // Max length
}

// ─────────────────────────────────────────────
// 8. VALIDATION HELPERS
// ─────────────────────────────────────────────
export function isValidDeviceName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const cleaned = name.trim();
  return cleaned.length >= 1 && cleaned.length <= 50;
}

export function isValidTier(tier: string): boolean {
  const validTiers = ['chai', 'lunch', 'dinner', 'home', 'nepal'];
  return validTiers.includes(tier);
}

// ─────────────────────────────────────────────
// 9. SECURITY HEADERS CHECK (client-side safety)
// ─────────────────────────────────────────────
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true; // SSR
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

// ─────────────────────────────────────────────
// 10. RATE LIMITING (prevent abuse)
// ─────────────────────────────────────────────
const rateLimitMap = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const attempts = rateLimitMap.get(key) || [];
  const recentAttempts = attempts.filter((time) => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return true;
  }

  recentAttempts.push(now);
  rateLimitMap.set(key, recentAttempts);
  return false;
}

// ─────────────────────────────────────────────
// 11. MEMORY WIPE (clear sensitive data from memory)
// ─────────────────────────────────────────────
export function wipeArray(array: Uint8Array): void {
  if (!array || !array.length) return;
  crypto.getRandomValues(array);
  array.fill(0);
}