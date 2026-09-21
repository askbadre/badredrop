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
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-rose-100 mb-4">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-900 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <Smartphone className="w-7 h-7 text-white" />
        </div>

        {/* Device Info */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium">Your Device</p>
          <p className="text-lg font-bold text-gray-900">{deviceName}</p>
        </div>

        {/* Status Indicator */}
        {isActive && (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
        )}
      </div>
    </div>
  );
}