// src/components/QRCodeDisplay.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP QR CODE DISPLAY
// QR code dikhata hai. Doosre device ko scan karne ke liye.
// ─────────────────────────────────────────────────────────────

'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, RefreshCw, Copy, Check } from 'lucide-react';
import { buildQRPayload, encodeQR } from '@/lib/qr';
import type { DeviceType } from '@/types';

interface QRCodeDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
}

export default function QRCodeDisplay({
  isOpen,
  onClose,
  deviceId,
  deviceName,
  deviceType,
}: QRCodeDisplayProps) {
  const [qrString, setQrString] = useState('');
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 min

  // Generate QR on open
  useEffect(() => {
    if (!isOpen || !deviceId) return;

    const payload = buildQRPayload(deviceId, deviceName, deviceType);
    setQrString(encodeQR(payload));
    setSecondsLeft(300);
  }, [isOpen, deviceId, deviceName, deviceType]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  // Regenerate QR
  const handleRefresh = () => {
    const payload = buildQRPayload(deviceId, deviceName, deviceType);
    setQrString(encodeQR(payload));
    setSecondsLeft(300);
  };

  // Format time
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Show QR code"
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-sm w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Share QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-500 text-center mb-5">
          Open BadreDrop on another device and scan this code
        </p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-2xl border-2 border-rose-100 flex items-center justify-center mb-4">
          {qrString ? (
            <QRCodeSVG
              value={qrString}
              size={220}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1A1A1A"
            />
          ) : (
            <div className="w-[220px] h-[220px] flex items-center justify-center text-gray-400">
              Generating...
            </div>
          )}
        </div>

        {/* Device Info */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500">Your device</p>
          <p className="text-sm font-semibold text-gray-900">{deviceName}</p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div
            className={`w-2 h-2 rounded-full ${
              secondsLeft > 30 ? 'bg-green-500' : 'bg-red-500 animate-pulse'
            }`}
          ></div>
          <p className="text-xs text-gray-500">
            Expires in{' '}
            <span className="font-semibold text-gray-700">
              {formatTime(secondsLeft)}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-gray-400 italic mt-4">
          🔒 This code contains no personal data
        </p>
      </div>
    </div>
  );
}