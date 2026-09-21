// src/components/ConnectedDevices.tsx
'use client';

import { Laptop, Camera } from 'lucide-react';
import type { ConnectedDevicesProps, Device } from '@/types';

interface Props extends ConnectedDevicesProps {
  onShowQR: () => void;
  onScanQR: () => void;
}

export default function ConnectedDevices({
  devices,
  onConnect,
  onShowQR,
  onScanQR,
}: Props) {
  return (
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-200/50 mb-3">
      <h2 className="text-base font-bold text-gray-900 mb-3">
        Connected Devices
      </h2>

      {devices.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-3">
          No devices connected
        </p>
      )}

      <div className="space-y-3">
        {devices.map((device: Device) => (
                    <div
            key={device.id}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
              <Laptop className="w-4 h-4 text-rose-600" />
            </div>
            <span className="flex-1 font-semibold text-gray-800">
              {device.name}
            </span>
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
                className="text-xs font-semibold text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50"
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 2 BUTTONS — 1 scan, 1 show */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onScanQR}
          className="flex-1 py-2.5 bg-rose-600 text-white rounded-2xl font-semibold text-sm hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Scan QR
        </button>
        <button
          onClick={onShowQR}
          className="flex-1 py-2.5 border-2 border-dashed border-rose-200 rounded-2xl text-rose-600 font-semibold text-sm hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
        >
          Show My QR
        </button>
      </div>
    </div>
  );
}