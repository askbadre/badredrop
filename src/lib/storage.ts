// src/lib/storage.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP SAFE STORAGE
// Device pe encrypted data store karta hai. Server ko kuch nahi.
// ─────────────────────────────────────────────────────────────

import { encryptData, decryptData, sanitizeInput } from './security';

const STORAGE_PREFIX = 'badredrop_';

// ─────────────────────────────────────────────
// 1. SAFE LOCALSTORAGE WRAPPER
// ─────────────────────────────────────────────
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__badredrop_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// 2. PLAIN STORAGE (non-sensitive data)
// ─────────────────────────────────────────────
export function setPlain(key: string, value: string): void {
  if (!isStorageAvailable()) return;
  const safeKey = STORAGE_PREFIX + sanitizeInput(key);
  const safeValue = sanitizeInput(value);
  try {
    localStorage.setItem(safeKey, safeValue);
  } catch (error) {
    console.warn('Storage write failed:', error);
  }
}

export function getPlain(key: string): string | null {
  if (!isStorageAvailable()) return null;
  const safeKey = STORAGE_PREFIX + sanitizeInput(key);
  try {
    return localStorage.getItem(safeKey);
  } catch {
    return null;
  }
}

export function removePlain(key: string): void {
  if (!isStorageAvailable()) return;
  const safeKey = STORAGE_PREFIX + sanitizeInput(key);
  try {
    localStorage.removeItem(safeKey);
  } catch {
    // silent
  }
}

// ─────────────────────────────────────────────
// 3. ENCRYPTED STORAGE (sensitive data)
// ─────────────────────────────────────────────
export async function setEncrypted(
  key: string,
  value: string,
  password: string
): Promise<boolean> {
  if (!isStorageAvailable()) return false;
  try {
    const encrypted = await encryptData(value, password);
    const safeKey = STORAGE_PREFIX + 'enc_' + sanitizeInput(key);
    localStorage.setItem(safeKey, encrypted);
    return true;
  } catch (error) {
    console.warn('Encrypted write failed:', error);
    return false;
  }
}

export async function getEncrypted(
  key: string,
  password: string
): Promise<string | null> {
  if (!isStorageAvailable()) return null;
  try {
    const safeKey = STORAGE_PREFIX + 'enc_' + sanitizeInput(key);
    const encrypted = localStorage.getItem(safeKey);
    if (!encrypted) return null;
    return await decryptData(encrypted, password);
  } catch {
    return null;
  }
}

export function removeEncrypted(key: string): void {
  if (!isStorageAvailable()) return;
  const safeKey = STORAGE_PREFIX + 'enc_' + sanitizeInput(key);
  try {
    localStorage.removeItem(safeKey);
  } catch {
    // silent
  }
}

// ─────────────────────────────────────────────
// 4. CLEAR ALL BADRUDROP DATA
// ─────────────────────────────────────────────
export function clearAll(): void {
  if (!isStorageAvailable()) return;
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // silent
  }
}

// ─────────────────────────────────────────────
// 5. DEVICE-SPECIFIC HELPERS
// ─────────────────────────────────────────────
export function saveDeviceName(name: string): void {
  setPlain('device_name', name);
}

export function getDeviceName(defaultName: string): string {
  return getPlain('device_name') || defaultName;
}

export function saveSyncState(isOn: boolean): void {
  setPlain('sync_state', isOn ? '1' : '0');
}

export function getSyncState(defaultState: boolean): boolean {
  const saved = getPlain('sync_state');
  if (saved === null) return defaultState;
  return saved === '1';
}

// ─────────────────────────────────────────────
// 6. SESSION STORAGE (temporary, cleared on tab close)
// ─────────────────────────────────────────────
export function setSession(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + sanitizeInput(key), value);
  } catch {
    // silent
  }
}

export function getSession(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + sanitizeInput(key));
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // silent
  }
}