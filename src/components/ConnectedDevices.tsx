// src/components/ConnectedDevices.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP CONNECTED DEVICES
// Device list. Connect button. Status indicator.
// ─────────────────────────────────────────────────────────────

'use client';

import { Laptop, Wifi } from 'lucide-react';
import type { ConnectedDevicesProps, Device } from '@/types';

interface Props extends ConnectedDevicesProps {
  onConnectNew: () => void;
}

export default function ConnectedDevices({
  devices,
  onConnect,
  onConnectNew,
}: Props) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 mb-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Connected Devices
      </h2>

      <div className="space-y-3">
        {devices.map((device: Device) => (
          <div
            key={device.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"
          >
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
              <Laptop className="w-5 h-5 text-rose-600" />
            </div>

            {/* Name */}
            <span className="flex-1 font-semibold text-gray-800">
              {device.name}
            </span>

            {/* Status */}
            {device.status === 'connected' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-green-700">
                  Live
                </span>
              </div>
            ) : (
              <button
                onClick={() => onConnect(device.id)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Tap to connect
              </button>
            )}
          </div>
        ))}
      </div>

            {/* Connect New Device Button — Opens QR Scanner */}
      <button
        onClick={onConnectNew}
        className="w-full mt-4 py-3 border-2 border-dashed border-rose-200 rounded-2xl text-rose-600 font-semibold text-sm hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
      >
        <Wifi className="w-4 h-4" />
        Scan QR to Connect
      </button>
    </div>
  );
}