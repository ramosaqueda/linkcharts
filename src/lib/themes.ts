export type ThemeId = 'dark' | 'institutional' | 'midnight';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
  preview: { bg: string; surface: string; accent: string };
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'dark',
    name: 'Oscuro',
    description: 'Tema oscuro por defecto',
    preview: { bg: '#0A0F1A', surface: '#0F172A', accent: '#3b82f6' },
  },
  {
    id: 'institutional',
    name: 'Institucional',
    description: 'Fiscalía — claro institucional',
    preview: { bg: '#ffffff', surface: '#1D3E81', accent: '#B80D0E' },
  },
  {
    id: 'midnight',
    name: 'Medianoche',
    description: 'Oscuro con acentos índigo',
    preview: { bg: '#070B16', surface: '#0C1222', accent: '#818cf8' },
  },
];
