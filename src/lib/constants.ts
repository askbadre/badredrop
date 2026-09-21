// src/lib/constants.ts
// ─────────────────────────────────────────────────────────────
// BADRUDROP CONSTANTS
// Yeh file app ki saari settings rakhti hai. Update yahan kar.
// ─────────────────────────────────────────────────────────────

export const APP_CONFIG = {
  name: 'BadreDrop',
  tagline: 'Made with tired hands & big dreams',
  countryFlag: '🇳🇵',
  version: '1.0.0',
  author: 'Badre',
  authorLocation: 'KSA',
  authorDream: 'One day I will code from Nepal',
} as const;

export const COLORS = {
  primary: '#DC143C',
  primaryDark: '#8B0000',
  accent: '#FFD700',
  success: '#22C55E',
  text: '#1A1A1A',
  textMuted: '#6B7280',
} as const;

export const MESSAGES = {
  footer: {
    privacy: '🔒 No cloud. No storage. No trace.',
    madeBy: `Made with ❤️ by Badre in KSA`,
    dream: '🇳🇵 One day I will code from Nepal',
  },
  support: {
    title: "❤️ Support Badre's Dream",
    subtitle: 'Pay only if you want. Everything stays free.',
    quote: '"8 years in KSA. Your support brings me closer to Nepal."',
    signature: '- Badre 🇳🇵',
  },
  thankYou: {
    title: 'Thank You!',
    emoji: '🙏',
    subtitle: 'You just bought Badre a meal.',
    message:
      'Today I worked 12 hours.\nTonight I will code with energy\nbecause of you.',
    highlight: 'You are not a user.\nYou are part of my story.',
    footer: 'When I reach Nepal, I will remember you.',
    button: 'Close',
  },
} as const;

export const SUPPORT_TIERS = [
  { emoji: '☕', label: 'Buy Badre a Chai', price: '$1', tier: 'chai' },
  { emoji: '🍛', label: 'Buy Badre Lunch', price: '$5', tier: 'lunch' },
  { emoji: '🍕', label: 'Buy Badre Dinner', price: '$10', tier: 'dinner' },
  { emoji: '🏠', label: 'Send Badre Home', price: '$50', tier: 'home' },
  { emoji: '✈️', label: 'Fly Badre to Nepal', price: '$100', tier: 'nepal' },
] as const;

export const SYNC_CONFIG = {
  defaultDeviceName: "Badre's Phone" as string,
  defaultSyncState: true as boolean,
};