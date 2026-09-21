// src/app/page.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP MAIN PAGE
// Sab kuch connected. Real WebRTC. Real file transfer.
// ─────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DeviceCard from '@/components/DeviceCard';
import ConnectedDevices from '@/components/ConnectedDevices';
import AutoSyncToggle from '@/components/AutoSyncToggle';
import SendFileButton from '@/components/SendFileButton';
import SupportButton from '@/components/SupportButton';
import SupportSheet from '@/components/SupportSheet';
import ThankYouModal from '@/components/ThankYouModal';
import Footer from '@/components/Footer';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import QRScanner from '@/components/QRScanner';
import FilePicker from '@/components/FilePicker';
import TransferProgress from '@/components/TransferProgress';

import { SYNC_CONFIG } from '@/lib/constants';
import {
  getOrCreateDeviceId,
  getAutoDeviceName,
  getDeviceType,
} from '@/lib/deviceId';
import { getSyncState, saveSyncState } from '@/lib/storage';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { QRPayload } from '@/lib/qr';
import type { Device, SupportTier, DeviceType } from '@/types';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Device info
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState(SYNC_CONFIG.defaultDeviceName);
  const [deviceType, setDeviceType] = useState<DeviceType>('phone');

  // Sync state
  const [isSyncOn, setIsSyncOn] = useState<boolean>(
    SYNC_CONFIG.defaultSyncState
  );

  // UI state
  const [showSupport, setShowSupport] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SupportTier>('chai');

  // Connected peers
  const [devices, setDevices] = useState<Device[]>([]);

  // WebRTC
  const webrtc = useWebRTC();

  // ─────────────────────────────────────────────
  // INITIALIZE
  // ─────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    (async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);

      const name = getAutoDeviceName();
      setDeviceName(name);

      const type = getDeviceType();
      setDeviceType(type);

      const savedSync = getSyncState(SYNC_CONFIG.defaultSyncState);
      setIsSyncOn(savedSync);
    })();
  }, []);

  // ─────────────────────────────────────────────
  // WATCH CONNECTION STATE
  // ─────────────────────────────────────────────
  useEffect(() => {
    const state = webrtc.connectionState;

    if (state === 'connected') {
      // Add a connected device to the list
      setDevices((prev) => {
        if (prev.some((d) => d.status === 'connected')) return prev;
        return [
          ...prev,
          {
            id: 'peer-' + Date.now(),
            name: 'Connected Device',
            type: 'laptop',
            status: 'connected',
          },
        ];
      });
    }

    if (state === 'disconnected' || state === 'failed') {
      setDevices((prev) =>
        prev.map((d) =>
          d.status === 'connected' ? { ...d, status: 'available' } : d
        )
      );
    }
  }, [webrtc.connectionState]);

  // ─────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────
  const handleToggleSync = (value: boolean) => {
    setIsSyncOn(value);
    saveSyncState(value);
  };

  const handleConnectDevice = (_id: string) => {
    setShowQRScanner(true);
  };

  const handleConnectNew = () => {
    setShowQRDisplay(true);
  };

  const handleSendFile = () => {
    if (!webrtc.isConnected) {
      // Not connected: show QR to pair first
      setShowQRDisplay(true);
      return;
    }
    setShowFilePicker(true);
  };

  const handleFileSelected = async (file: File) => {
    setShowFilePicker(false);
    await webrtc.sendFileToPeer(file);
  };

  // ─────────────────────────────────────────────
  // QR SCANNED (peer wants to connect)
  // ─────────────────────────────────────────────
  const handleQRScanned = async (payload: QRPayload) => {
    setShowQRScanner(false);

    // Add device to list as "connecting"
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.id !== payload.id);
      return [
        ...filtered,
        {
          id: payload.id,
          name: payload.name,
          type: payload.type,
          status: 'available',
        },
      ];
    });

    // We are the receiver: accept offer if QR contains one
    // In our MVP, QR only contains device ID.
    // For full WebRTC handshake, QR would need to carry offer SDP.
    // MVP simplification: show message that pairing is coming next.
    console.log('Scanned device:', payload);
  };

  // ─────────────────────────────────────────────
  // SUPPORT
  // ─────────────────────────────────────────────
  const handleSelectTier = (tier: SupportTier) => {
    setSelectedTier(tier);
    setShowSupport(false);
    setShowThankYou(true);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-md mx-auto px-6 py-10">
        <Header />

        <DeviceCard
          deviceName={deviceName}
          isActive={webrtc.connectionState === 'connected'}
        />

                <ConnectedDevices
          devices={devices}
          onConnect={handleConnectDevice}
          onConnectNew={handleConnectNew}
        />

        {/* Connect New Device Button (below ConnectedDevices) */}
        <button
          onClick={handleConnectNew}
          className="w-full mb-4 py-3 border-2 border-dashed border-rose-200 rounded-2xl text-rose-600 font-semibold text-sm hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
        >
          📱 Show My QR Code
        </button>

        {/* Connection Status */}
        {webrtc.connectionState !== 'idle' && (
          <div className="bg-white rounded-2xl p-3 mb-4 shadow-sm flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                webrtc.connectionState === 'connected'
                  ? 'bg-green-500'
                  : webrtc.connectionState === 'failed'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 animate-pulse'
              }`}
            ></div>
            <p className="text-xs font-medium text-gray-600 capitalize">
              {webrtc.connectionState.replace('-', ' ')}
            </p>
          </div>
        )}

        <AutoSyncToggle isOn={isSyncOn} onToggle={handleToggleSync} />

        <SendFileButton
          onSend={handleSendFile}
          disabled={webrtc.connectionState === 'connecting'}
        />

        <SupportButton onClick={() => setShowSupport(true)} />

        <Footer />
      </div>

      {/* ───────────────────────────────────── */}
      {/* MODALS */}
      {/* ───────────────────────────────────── */}

      <SupportSheet
        isOpen={showSupport}
        onClose={() => setShowSupport(false)}
        onSelectTier={handleSelectTier}
      />

      <ThankYouModal
        isOpen={showThankYou}
        onClose={() => setShowThankYou(false)}
        tier={selectedTier}
      />

      <QRCodeDisplay
        isOpen={showQRDisplay}
        onClose={() => setShowQRDisplay(false)}
        deviceId={deviceId}
        deviceName={deviceName}
        deviceType={deviceType}
      />

      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScanned}
      />

      <FilePicker
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onFileSelected={handleFileSelected}
      />

      <TransferProgress
        isOpen={webrtc.isTransferOpen}
        state={webrtc.transfer.state}
        fileName={webrtc.transfer.fileName}
        fileSize={webrtc.transfer.fileSize}
        percent={webrtc.transfer.percent}
        bytesTransferred={webrtc.transfer.bytesTransferred}
        speed={webrtc.transfer.speed}
        error={webrtc.transfer.error}
        onCancel={webrtc.cancelTransfer}
        onClose={webrtc.closeTransfer}
      />
    </main>
  );
}