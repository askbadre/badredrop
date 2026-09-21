// src/types/index.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP TYPE DEFINITIONS
// Saare types yahan. Code safe. Errors zero.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// 1. DEVICE TYPES
// ─────────────────────────────────────────────
export type DeviceStatus = 'connected' | 'available' | 'offline';

export type DeviceType = 'phone' | 'laptop' | 'desktop' | 'tablet';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeen?: number;
}

// ─────────────────────────────────────────────
// 2. SUPPORT TIER TYPES
// ─────────────────────────────────────────────
export type SupportTier = 'chai' | 'lunch' | 'dinner' | 'home' | 'nepal';

export interface SupportOption {
  emoji: string;
  label: string;
  price: string;
  tier: SupportTier;
}

// ─────────────────────────────────────────────
// 3. FILE TRANSFER TYPES
// ─────────────────────────────────────────────
export type TransferStatus = 'idle' | 'sending' | 'receiving' | 'done' | 'error';

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  status: TransferStatus;
  progress: number; // 0-100
  fromDevice: string;
  toDevice: string;
  startedAt: number;
}

// ─────────────────────────────────────────────
// 4. CLIPBOARD TYPES
// ─────────────────────────────────────────────
export type ClipboardType = 'text' | 'link' | 'code';

export interface ClipboardItem {
  id: string;
  content: string;
  type: ClipboardType;
  timestamp: number;
  expiresAt: number; // auto-delete after X time
}

// ─────────────────────────────────────────────
// 5. APP STATE TYPES
// ─────────────────────────────────────────────
export interface AppState {
  deviceId: string;
  deviceName: string;
  isSyncOn: boolean;
  connectedDevices: Device[];
  isInitialized: boolean;
}

// ─────────────────────────────────────────────
// 6. UI STATE TYPES
// ─────────────────────────────────────────────
export type ModalType = 'none' | 'support' | 'thankyou' | 'settings';

export interface UIState {
  activeModal: ModalType;
  selectedTier: SupportTier | null;
  isDarkMode: boolean;
}

// ─────────────────────────────────────────────
// 7. SECURITY TYPES
// ─────────────────────────────────────────────
export interface EncryptedPayload {
  ciphertext: string;
  salt: string;
  iv: string;
  version: number;
}

export type SecurityLevel = 'standard' | 'high' | 'paranoid';

// ─────────────────────────────────────────────
// 8. API RESPONSE TYPES
// ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ─────────────────────────────────────────────
// 9. COMPONENT PROP TYPES
// ─────────────────────────────────────────────
export interface SupportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier: (tier: SupportTier) => void;
}

export interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: SupportTier;
}

export interface DeviceCardProps {
  deviceName: string;
  isActive: boolean;
}

export interface ConnectedDevicesProps {
  devices: Device[];
  onConnect: (deviceId: string) => void;
}

export interface AutoSyncToggleProps {
  isOn: boolean;
  onToggle: (value: boolean) => void;
}

export interface SendFileButtonProps {
  onSend: () => void;
  disabled?: boolean;
}

export interface SupportButtonProps {
  onClick: () => void;
}

// ─────────────────────────────────────────────
// 10. UTILITY TYPES
// ─────────────────────────────────────────────
export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncFunction<T = void> = () => Promise<T>;

export type EventHandler<T = void> = (value: T) => void;