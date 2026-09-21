// src/components/SendFileButton.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP SEND FILE BUTTON
// Bada gradient button. File send karne ke liye.
// ─────────────────────────────────────────────────────────────

'use client';

import { Send } from 'lucide-react';
import type { SendFileButtonProps } from '@/types';

export default function SendFileButton({
  onSend,
  disabled = false,
}: SendFileButtonProps) {
  return (
    <button
      onClick={onSend}
      disabled={disabled}
      className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 mb-4 transition-transform ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-rose-600 to-rose-900 text-white shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98]'
      }`}
    >
      <Send className="w-6 h-6" />
      Send File
    </button>
  );
}