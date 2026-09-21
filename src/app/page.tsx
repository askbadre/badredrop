// src/app/page.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP MAIN PAGE
// Sirf components ko assemble karta hai. Sab modular.
// Kuch change karna ho? Us ek component file pe kaam kar.
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

import { SYNC_CONFIG } from '@/lib/constants';
import { generateDeviceId } from '@/lib/security';
import {
  getDeviceName,
  getSyncState,
  saveDeviceName,
  saveSyncState,
} from '@/lib/storage';
import type { Device, SupportTier } from '@/types';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [deviceName, setDeviceName] = useState(SYNC_CONFIG.defaultDeviceName);
  const [deviceId, setDeviceId] = useState('');
  const [isSyncOn, setIsSyncOn] = useState(SYNC_CONFIG.defaultSyncState);
  const [showSupport, setShowSupport] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SupportTier>('chai');

  // Connected devices (placeholder until real P2P)
  const [devices] = useState<Device[]>([
    {
      id: 'laptop-1',
      name: "Badre's Laptop",
      type: 'laptop',
      status: 'connected',
    },
    {
      id: 'pc-1',
      name: 'Office PC',
      type: 'desktop',
      status: 'available',
    },
  ]);

  // Initialize: load saved data
  useEffect(() => {
    setMounted(true);

    // Generate or load device ID
    let id = localStorage.getItem('badredrop_device_id');
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem('badredrop_device_id', id);
    }
    setDeviceId(id);

    // Load saved device name
    const savedName = getDeviceName(SYNC_CONFIG.defaultDeviceName);
    setDeviceName(savedName);

    // Load saved sync state
    const savedSync = getSyncState(SYNC_CONFIG.defaultSyncState);
    setIsSyncOn(savedSync);
  }, []);

  // Handler: toggle sync
  const handleToggleSync = (value: boolean) => {
    setIsSyncOn(value);
    saveSyncState(value);
  };

  // Handler: connect device
  const handleConnectDevice = (id: string) => {
    console.log('Connecting to device:', id);
    // TODO: Real P2P connection
  };

  // Handler: send file
  const handleSendFile = () => {
    console.log('Send file clicked');
    // TODO: File picker + transfer
  };

  // Handler: select support tier
  const handleSelectTier = (tier: SupportTier) => {
    setSelectedTier(tier);
    setShowSupport(false);
    setShowThankYou(true);
    // TODO: Real payment integration
  };

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
        <DeviceCard deviceName={deviceName} isActive={true} />
        <ConnectedDevices devices={devices} onConnect={handleConnectDevice} />
        <AutoSyncToggle isOn={isSyncOn} onToggle={handleToggleSync} />
        <SendFileButton onSend={handleSendFile} />
        <SupportButton onClick={() => setShowSupport(true)} />
        <Footer />
      </div>

      {/* Modals */}
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
    </main>
  );
}