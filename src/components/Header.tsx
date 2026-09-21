// src/components/Header.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP HEADER
// Logo + tagline. Update karna easy — sirf yeh file.
// ─────────────────────────────────────────────────────────────

'use client';

import { APP_CONFIG } from '@/lib/constants';

export default function Header() {
  return (
    <div className="text-center mb-10">
      {/* Logo */}
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-600 to-rose-900 shadow-2xl shadow-rose-500/30 mb-4">
        <svg
          className="w-12 h-12 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C8 2 4 6 4 10c0 4 4 8 8 12 4-4 8-8 8-12 0-4-4-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
        </svg>
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
        {APP_CONFIG.name}
      </h1>

      {/* Tagline Badge */}
      <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 bg-rose-100 rounded-full">
        <span>{APP_CONFIG.countryFlag}</span>
        <span className="text-xs font-medium text-rose-700">
          {APP_CONFIG.tagline}
        </span>
      </div>
    </div>
  );
}