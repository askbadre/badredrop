// src/components/TransferProgress.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP TRANSFER PROGRESS
// Progress bar, speed, ETA dikhata hai.
// ─────────────────────────────────────────────────────────────

'use client';

import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes, formatSpeed } from '@/lib/webrtc';

export type TransferState =
  | 'connecting'
  | 'sending'
  | 'receiving'
  | 'complete'
  | 'error';

interface TransferProgressProps {
  isOpen: boolean;
  state: TransferState;
  fileName: string;
  fileSize: number;
  percent: number;
  bytesTransferred: number;
  speed: number; // bytes per second
  error?: string;
  onCancel: () => void;
  onClose: () => void;
}

export default function TransferProgress({
  isOpen,
  state,
  fileName,
  fileSize,
  percent,
  bytesTransferred,
  speed,
  error,
  onCancel,
  onClose,
}: TransferProgressProps) {
  if (!isOpen) return null;

  // ─────────────────────────────────────────────
  // ETA CALCULATION
  // ─────────────────────────────────────────────
  const remainingBytes = fileSize - bytesTransferred;
  const etaSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
  const etaText =
    etaSeconds > 60
      ? `${Math.ceil(etaSeconds / 60)} min left`
      : etaSeconds > 0
      ? `${etaSeconds}s left`
      : 'Almost done';

  // ─────────────────────────────────────────────
  // STATE LABEL
  // ─────────────────────────────────────────────
  const stateLabel =
    state === 'connecting'
      ? 'Connecting to device...'
      : state === 'sending'
      ? 'Sending file...'
      : state === 'receiving'
      ? 'Receiving file...'
      : state === 'complete'
      ? 'Transfer complete'
      : 'Transfer failed';

  // ─────────────────────────────────────────────
  // STATE ICON
  // ─────────────────────────────────────────────
  const StateIcon = () => {
    if (state === 'complete') {
      return (
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
      );
    }
    if (state === 'error') {
      return (
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
      );
    }
    return (
      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={state === 'complete' || state === 'error' ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Transfer progress"
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-sm w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <StateIcon />
        </div>

        {/* State Label */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
          {stateLabel}
        </h2>

        {/* File Name */}
        <p className="text-sm text-gray-500 text-center truncate mb-6">
          {fileName}
        </p>

        {/* Progress Bar (hide if complete/error) */}
        {(state === 'sending' || state === 'receiving') && (
          <>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-900 transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-gray-900">
                  {formatBytes(bytesTransferred)}
                </span>{' '}
                / {formatBytes(fileSize)}
              </div>
              <div className="text-xs text-gray-500">
                {speed > 0 && formatSpeed(speed)}
              </div>
            </div>

            {/* Percent + ETA */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-2xl font-bold text-rose-600">
                {percent}%
              </div>
              {etaSeconds > 0 && (
                <div className="text-xs text-gray-500">{etaText}</div>
              )}
            </div>
          </>
        )}

        {/* Complete State */}
        {state === 'complete' && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">
              {formatBytes(fileSize)} transferred
            </p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-6 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              {error || 'Something went wrong. Please try again.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {(state === 'sending' ||
            state === 'receiving' ||
            state === 'connecting') && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}

          {(state === 'complete' || state === 'error') && (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold text-sm text-white transition-colors"
            >
              Done
            </button>
          )}
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-gray-400 italic mt-4">
          🔒 Direct device-to-device transfer
        </p>
      </div>
    </div>
  );
}