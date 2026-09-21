// src/components/ThankYouModal.tsx
'use client';

import { MESSAGES } from '@/lib/constants';
import type { ThankYouModalProps } from '@/types';

const TIER_MESSAGES: Record<string, { title: string; body: string }> = {
  chai: {
    title: 'Chai for Badre',
    body: 'You just bought Badre a cup of chai.\nAfter a 12-hour shift, this warmth means everything.',
  },
  lunch: {
    title: 'Lunch for Badre',
    body: 'You just bought Badre lunch.\nToday, he will eat with a full heart.',
  },
  dinner: {
    title: 'Dinner for Badre',
    body: 'You just bought Badre dinner.\nTonight, he sleeps with a grateful smile.',
  },
  home: {
    title: 'One Step Closer',
    body: 'You just helped send Badre home.\nEvery riyal brings Nepal one step closer.',
  },
  nepal: {
    title: 'A Dream Coming True',
    body: 'You just bought Badre a flight to Nepal.\nAfter 8 years, you are part of his homecoming.',
  },
};

export default function ThankYouModal({
  isOpen,
  onClose,
  tier,
}: ThankYouModalProps) {
  if (!isOpen) return null;

  const custom = TIER_MESSAGES[tier] || {
    title: 'Thank You!',
    body: MESSAGES.thankYou.subtitle,
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Thank you"
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{MESSAGES.thankYou.emoji}</div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {custom.title}
        </h2>

        <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
          {custom.body}
        </p>

        <p className="text-sm font-semibold text-rose-600 leading-relaxed mb-6 whitespace-pre-line">
          {MESSAGES.thankYou.highlight}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors"
        >
          {MESSAGES.thankYou.button}
        </button>

        <p className="text-xs text-gray-400 italic mt-4">
          {MESSAGES.thankYou.footer}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-1">Badre 🇳🇵</p>
      </div>
    </div>
  );
}