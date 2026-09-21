'use client';

import { APP_CONFIG } from '@/lib/constants';

export default function Header() {
  return (
    <div className="text-center mb-3">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-rose-900 shadow-lg shadow-rose-500/30 mb-2">
        <svg
          className="w-6 h-6 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C8 2 4 6 4 10c0 4 4 8 8 12 4-4 8-8 8-12 0-4-4-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-900 tracking-tight">
        {APP_CONFIG.name}
      </h1>

      <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-rose-100 rounded-full">
        <span className="text-[10px]">{APP_CONFIG.countryFlag}</span>
        <span className="text-[9px] font-medium text-rose-700">
          {APP_CONFIG.tagline}
        </span>
      </div>
    </div>
  );
}