// src/components/SupportSheet.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP SUPPORT SHEET
// Bottom sheet with support tiers. Pay if you want.
// ─────────────────────────────────────────────────────────────

'use client';

import { SUPPORT_TIERS, MESSAGES } from '@/lib/constants';
import type { SupportSheetProps, SupportTier } from '@/types';

export default function SupportSheet({
  isOpen,
  onClose,
  onSelectTier,
}: SupportSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Support Badre"
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-md p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {MESSAGES.support.title}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          {MESSAGES.support.subtitle}
        </p>

        {/* Tiers */}
        <div className="space-y-3">
          {SUPPORT_TIERS.map((tier, i) => (
            <button
              key={i}
              onClick={() => onSelectTier(tier.tier as SupportTier)}
              className="w-full p-4 border border-yellow-300 rounded-2xl bg-gradient-to-r from-yellow-50/50 to-transparent flex items-center gap-3 hover:bg-yellow-50 transition-colors"
            >
              <span className="text-2xl">{tier.emoji}</span>
              <span className="flex-1 text-left font-semibold text-gray-900">
                {tier.label}
              </span>
              <span className="px-3.5 py-1 bg-yellow-200 text-yellow-900 rounded-full font-bold text-sm">
                {tier.price}
              </span>
            </button>
          ))}
        </div>

        {/* Quote */}
        <p className="text-center text-xs text-gray-400 italic mt-6">
          {MESSAGES.support.quote}
        </p>
        <p className="text-center text-sm font-semibold text-gray-900 mt-2">
          {MESSAGES.support.signature}
        </p>
      </div>
    </div>
  );
}