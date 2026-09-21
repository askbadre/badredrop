// src/components/AutoSyncToggle.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP AUTO-SYNC TOGGLE
// On/off switch for clipboard sync.
// ─────────────────────────────────────────────────────────────

'use client';

import { Sparkles } from 'lucide-react';
import type { AutoSyncToggleProps } from '@/types';

export default function AutoSyncToggle({
  isOn,
  onToggle,
}: AutoSyncToggleProps) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-xl shadow-gray-200/50 mb-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-rose-600" />
        </div>

        {/* Label */}
        <div className="flex-1">
          <p className="font-semibold text-gray-900">Auto-Sync Clipboard</p>
          <p className="text-xs text-gray-500">Copy here, paste there</p>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(!isOn)}
          role="switch"
          aria-checked={isOn}
          aria-label="Toggle auto-sync"
          className={`w-14 h-8 rounded-full transition-colors relative ${
            isOn ? 'bg-rose-600' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              isOn ? 'translate-x-7' : 'translate-x-1'
            }`}
          ></div>
        </button>
      </div>
    </div>
  );
}