'use client';

import { MESSAGES } from '@/lib/constants';

export default function Footer() {
  return (
    <div className="text-center space-y-2">
      {/* Legal Links */}
      <div className="flex items-center justify-center gap-3 text-xs">
        <a
          href="/privacy"
          className="text-rose-600 hover:text-rose-700 font-semibold underline"
        >
          Privacy Policy
        </a>
        <span className="text-gray-300">•</span>
        <a
          href="/terms"
          className="text-rose-600 hover:text-rose-700 font-semibold underline"
        >
          Terms of Service
        </a>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 font-medium">
          {MESSAGES.footer.privacy}
        </p>
        <p className="text-xs text-gray-400">{MESSAGES.footer.madeBy}</p>
        <p className="text-xs text-gray-400 italic">{MESSAGES.footer.dream}</p>
      </div>
    </div>
  );
}