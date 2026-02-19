/**
 * EXIM Design System — Color Tokens
 *
 * Primary: Indigo / Royal Blue
 * Module accents: Export (Emerald), Import (Orange), Finance (Violet), Shipping (Cyan)
 */

export const colors = {
  // Primary — Indigo
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },

  // Neutral — Slate
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Success — Green
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Warning — Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Danger — Red
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Info — Blue
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Module Accents
  module: {
    /** Export module — Emerald */
    export: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
    },
    /** Import module — Orange */
    import: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
    },
    /** Finance module — Violet */
    finance: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
    },
    /** Shipping module — Cyan */
    shipping: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      200: '#A5F3FC',
      400: '#22D3EE',
      500: '#06B6D4',
      600: '#0891B2',
      700: '#0E7490',
    },
  },

  // Base
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
} as const;
