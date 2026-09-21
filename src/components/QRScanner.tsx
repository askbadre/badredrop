// src/components/QRScanner.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { decodeQR } from '@/lib/qr';
import type { QRPayload } from '@/lib/qr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (payload: QRPayload) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    hasScannedRef.current = false;
    setError('');
    setIsStarting(true);

    let mounted = true;
    let scanner: Html5Qrcode | null = null;

    const start = async () => {
      try {
        await new Promise((r) => setTimeout(r, 300));

        if (!mounted) return;

        const container = document.getElementById('qr-reader');
        if (!container) {
          setError('Scanner container not found');
          setIsStarting(false);
          return;
        }

        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            const payload = decodeQR(decodedText);
            if (payload) {
              if (navigator.vibrate) navigator.vibrate(100);
              onScan(payload);
            } else {
              setError('Not a BadreDrop QR code');
              hasScannedRef.current = false;
            }
          },
          () => {}
        );

        if (mounted) setIsStarting(false);
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          msg.includes('Permission') || msg.includes('NotAllowed')
            ? 'Camera permission denied. Please allow camera and reload.'
            : msg.includes('NotFound')
            ? 'No camera found on this device'
            : `Camera error: ${msg}`
        );
        setIsStarting(false);
      }
    };

    start();

    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="relative bg-black rounded-3xl overflow-hidden aspect-square mb-4">
          <div id="qr-reader" className="w-full h-full"></div>

          {isStarting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="text-white text-sm">Starting camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/90">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <p className="text-white text-sm mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-rose-600 text-white rounded-xl font-semibold text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <p className="text-xs text-white/80 text-center">
            Point your camera at the QR code on the other device
          </p>
        </div>
      </div>
    </div>
  );
}