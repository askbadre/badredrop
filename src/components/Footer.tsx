// src/components/Footer.tsx
// ─────────────────────────────────────────────────────────────
// BADRUDROP FOOTER
// Privacy promise + Badre's dream.
// ─────────────────────────────────────────────────────────────

'use client';

import { MESSAGES } from '@/lib/constants';

export default function Footer() {
  return (
    <div className="text-center space-y-1.5">
      <p className="text-xs text-gray-500 font-medium">
        {MESSAGES.footer.privacy}
      </p>
      <p className="text-xs text-gray-400">{MESSAGES.footer.madeBy}</p>
      <p className="text-xs text-gray-400 italic">{MESSAGES.footer.dream}</p>
    </div>
  );
}