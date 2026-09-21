// src/components/DeviceCard.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP DEVICE CARD
// "Your Device" card. Device ka naam + status dikhata hai.
// ─────────────────────────────────────────────────────────────

'use client';

import { Smartphone, Check } from 'lucide-react';
import type { DeviceCardProps } from '@/types';

export default function DeviceCard({ deviceName, isActive }: DeviceCardProps) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-xl shadow-gray-200/50 border border-rose-100 mb-3">
      <div className="flex items-center gap3">
        {/* Icon */}
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-900 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <Smartphone className="w-5 h-5 text-white" />
        </div>

        {/* Device Info */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium">Your Device</p>
                   <p className="text-base font-bold text-gray-900">{deviceName}</p>
        </div>

        {/* Status Indicator */}
        {isActive && (
                   <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </div>
        )}
      </div>
    </div>
  );
}