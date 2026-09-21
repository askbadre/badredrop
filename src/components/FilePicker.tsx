// src/components/FilePicker.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP FILE PICKER
// File select karta hai. Validate karta hai. Send callback deta hai.
// ─────────────────────────────────────────────────────────────

'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { formatBytes } from '@/lib/webrtc';
import {
  isValidFileSize,
  MAX_FILE_SIZE,
  sanitizeFilename,
  getFileCategory,
} from '@/lib/fileTransfer';

interface FilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
}

export default function FilePicker({
  isOpen,
  onClose,
  onFileSelected,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  // ─────────────────────────────────────────────
  // HANDLE FILE
  // ─────────────────────────────────────────────
  const handleFile = (file: File) => {
    setError('');

    if (!isValidFileSize(file.size)) {
      setError(
        `File too large. Max ${formatBytes(MAX_FILE_SIZE)}. Your file: ${formatBytes(
          file.size
        )}`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // ─────────────────────────────────────────────
  // INPUT CHANGE
  // ─────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ─────────────────────────────────────────────
  // DRAG & DROP
  // ─────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ─────────────────────────────────────────────
  // CONFIRM SEND
  // ─────────────────────────────────────────────
  const handleConfirm = () => {
    if (!selectedFile) return;
    onFileSelected(selectedFile);
    setSelectedFile(null);
    setError('');
  };

  // ─────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────
  const handleCancel = () => {
    setSelectedFile(null);
    setError('');
    onClose();
  };

  const category = selectedFile ? getFileCategory(selectedFile.type) : '';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Select file"
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-sm w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Send a File</h2>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Drop Zone */}
        {!selectedFile && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-rose-500 bg-rose-50'
                : 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/50'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-900 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">
              Tap to select a file
            </p>
            <p className="text-xs text-gray-500">
              or drag & drop here
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Max {formatBytes(MAX_FILE_SIZE)}
            </p>
          </div>
        )}

        {/* Selected File */}
        {selectedFile && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {sanitizeFilename(selectedFile.name)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatBytes(selectedFile.size)} • {category}
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedFile}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              selectedFile
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-gray-400 italic mt-4">
          🔒 File goes directly to the other device
        </p>
      </div>
    </div>
  );
}