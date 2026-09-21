// src/components/SupportButton.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP SUPPORT BUTTON
// "Support Badre" golden button. Pay if you want.
// ─────────────────────────────────────────────────────────────

'use client';

import { Heart } from 'lucide-react';
import type { SupportButtonProps } from '@/types';

export default function SupportButton({ onClick }: SupportButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 bg-white border-2 border-yellow-400 rounded-2xl font-bold text-gray-900 shadow-lg shadow-yellow-400/20 hover:bg-yellow-50 transition-colors flex items-center justify-center gap-2 mb-6"
    >
      <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
      Support Badre
      <span className="text-xs font-normal text-gray-500">
        (Pay if you want)
      </span>
    </button>
  );
}