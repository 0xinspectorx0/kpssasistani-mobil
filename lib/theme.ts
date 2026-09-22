export type ThemeMode = 'light' | 'dark';

export interface Palette {
  bg: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  gold: string;
  success: string;
  successSoft: string;
  warning: string;
  danger: string;
  dangerSoft: string;
  tabBar: string;
  hero1: string;
  hero2: string;
  shadow: string;
}

export const lightPalette: Palette = {
  bg: '#F2F5FA',
  card: '#FFFFFF',
  card2: '#F6F8FC',
  text: '#0F1F3D',
  muted: '#64748B',
  border: '#E2E8F0',
  primary: '#1B3A6B',
  primarySoft: '#E3EAF6',
  accent: '#D7263D',
  accentSoft: '#FDE8EB',
  gold: '#E8A020',
  success: '#16A34A',
  successSoft: '#E5F6EC',
  warning: '#D97706',
  danger: '#DC2626',
  dangerSoft: '#FDE8E8',
  tabBar: '#FFFFFF',
  hero1: '#1B3A6B',
  hero2: '#B3122E',
  shadow: '#0F1F3D',
};

export const darkPalette: Palette = {
  bg: '#0B1220',
  card: '#141D33',
  card2: '#1B2540',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#26314D',
  primary: '#5B8DEF',
  primarySoft: '#1E2C4E',
  accent: '#F0526A',
  accentSoft: '#3A1B26',
  gold: '#F2B544',
  success: '#34D399',
  successSoft: '#123B2C',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerSoft: '#3B1A1A',
  tabBar: '#101829',
  hero1: '#1B3A6B',
  hero2: '#7A0E22',
  shadow: '#000000',
};

export const radius = { sm: 8, md: 14, lg: 20, xl: 26 };
