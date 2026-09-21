// src/components/ThankYouModal.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP THANK YOU MODAL
// Dil se likha hua. User ka support acknowledge karta hai.
// ─────────────────────────────────────────────────────────────

'use client';

import { MESSAGES } from '@/lib/constants';
import type { ThankYouModalProps } from '@/types';

export default function ThankYouModal({
  isOpen,
  onClose,
  tier,
}: ThankYouModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Thank you"
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Emoji */}
        <div className="text-6xl mb-4">{MESSAGES.thankYou.emoji}</div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {MESSAGES.thankYou.title}
        </h2>

        {/* Subtitle */}
        <p className="text-gray-500 mb-4">{MESSAGES.thankYou.subtitle}</p>

        {/* Message */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-line">
          {MESSAGES.thankYou.message}
        </p>

        {/* Highlight */}
        <p className="text-sm font-semibold text-rose-600 leading-relaxed mb-6 whitespace-pre-line">
          {MESSAGES.thankYou.highlight}
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
        >
          {MESSAGES.thankYou.button}
        </button>

        {/* Footer */}
        <p className="text-xs text-gray-400 italic mt-4">
          {MESSAGES.thankYou.footer}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-1">
          Badre 🇳🇵
        </p>
      </div>
    </div>
  );
}