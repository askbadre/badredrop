// src/components/QRScanner.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP QR SCANNER
// Camera se QR scan karta hai. Device pairing ke liye.
// ─────────────────────────────────────────────────────────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { decodeQR } from '@/lib/qr';
import type { QRPayload } from '@/lib/qr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (payload: QRPayload) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    hasScannedRef.current = false;
    setError('');
    setIsScanning(true);

    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode('badredrop-qr-reader');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            // Prevent multiple scans
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            const payload = decodeQR(decodedText);
            if (payload) {
              // Vibrate if supported
              if (navigator.vibrate) navigator.vibrate(100);
              onScan(payload);
            } else {
              setError('Invalid QR code. Not a BadreDrop code.');
              hasScannedRef.current = false;
            }
          },
          () => {
            // Ignore per-frame errors
          }
        );
      } catch (err: any) {
        if (!mounted) return;
        setError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access.'
            : 'Could not start camera. Make sure no other app is using it.'
        );
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5QrRef.current) {
        html5QrRef.current
          .stop()
          .then(() => {
            html5QrRef.current?.clear();
            html5QrRef.current = null;
          })
          .catch(() => {
            // silent
          });
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR code"
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative bg-black rounded-3xl overflow-hidden aspect-square mb-4">
          {/* Container for html5-qrcode */}
          <div
            id="badredrop-qr-reader"
            ref={scannerRef}
            className="w-full h-full"
          ></div>

          {/* Overlay Frame */}
          {isScanning && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-rose-500 rounded-3xl relative">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl"></div>

                {/* Scanning line animation */}
                <div className="absolute inset-x-0 top-0 h-1 bg-rose-500 shadow-lg shadow-rose-500/50 animate-scan"></div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isScanning && !error && (
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-xs text-white/70">
                Point camera at the QR code
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80">
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

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white/80 space-y-1">
              <p>1. Open BadreDrop on the other device</p>
              <p>2. Tap &quot;Connect New Device&quot;</p>
              <p>3. Scan the QR code shown there</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: calc(100% - 4px);
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}