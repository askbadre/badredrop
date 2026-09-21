// src/app/connect/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

function ConnectContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Connecting to device...');

  useEffect(() => {
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    const type = searchParams.get('type');
    const ts = searchParams.get('ts');

    if (!id || !name || !type || !ts) {
      setStatus('error');
      setMessage('Invalid QR code. Missing device info.');
      return;
    }

    const timestamp = parseInt(ts, 10);
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      setStatus('error');
      setMessage('QR code expired. Please generate a new one.');
      return;
    }

    try {
      localStorage.setItem(
        'badredrop_scanned_peer',
        JSON.stringify({
          id,
          name,
          type,
          ts: timestamp,
          scannedAt: Date.now(),
        })
      );

      setStatus('success');
      setMessage(`Connected to ${name}!`);

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch {
      setStatus('error');
      setMessage('Could not save connection info.');
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connecting...
            </h1>
            <p className="text-sm text-gray-500">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Device Found!
            </h1>
            <p className="text-sm text-gray-500">{message}</p>
            <p className="text-xs text-gray-400 mt-4">
              Returning to BadreDrop...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Failed
            </h1>
            <p className="text-sm text-gray-500 mb-4">{message}</p>
            <button
              onClick={() => (window.location.href = '/')}
              className="w-full py-3 bg-rose-600 text-white rounded-xl font-semibold"
            >
              Go to BadreDrop
            </button>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 italic">
            🔒 No data stored on any server
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
        </main>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}