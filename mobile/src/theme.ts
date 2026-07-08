import { TextStyle, ViewStyle } from 'react-native';

export type ThemeMode = 'day' | 'night';

export interface Theme {
  mode: ThemeMode;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  heading: string;
  codeBackground: string;
  codeText: string;
  border: string;
  link: string;
  error: string;
  success: string;
  quoteBackground: string;
  quoteBorder: string;
  tableHeaderBg: string;
  tableRowAltBg: string;
}

export const themes: Record<ThemeMode, Theme> = {
  day: {
    mode: 'day',
    background: '#F7F8FA',
    surface: '#FFFFFF',
    text: '#1F2328',
    textSecondary: '#6B7280',
    heading: '#0B0F19',
    codeBackground: '#F2F4F7',
    codeText: '#B42318',
    border: '#E5E7EB',
    link: '#007AFF',
    error: '#B42318',
    success: '#16A34A',
    quoteBackground: '#F3F6F8',
    quoteBorder: '#C9CED6',
    tableHeaderBg: '#F1F3F6',
    tableRowAltBg: '#FAFBFC',
  },
  night: {
    mode: 'night',
    background: '#111113',
    surface: '#1C1C1E',
    text: '#F2F2F7',
    textSecondary: '#A1A1AA',
    heading: '#FFFFFF',
    codeBackground: '#242426',
    codeText: '#FF9F8A',
    border: '#303034',
    link: '#0A84FF',
    error: '#FF6B6B',
    success: '#34D399',
    quoteBackground: '#1F2023',
    quoteBorder: '#3A3A40',
    tableHeaderBg: '#242426',
    tableRowAltBg: '#18181B',
  },
};

// 字号档位：相对于基准的缩放系数
export const FONT_SCALES = [0.85, 1.0, 1.15, 1.3, 1.5] as const;
export const DEFAULT_FONT_SCALE_INDEX = 1;

export const BASE_FONT_SIZE = 16;
