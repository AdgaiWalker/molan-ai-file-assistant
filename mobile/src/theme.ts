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
  quoteBackground: string;
  quoteBorder: string;
  tableHeaderBg: string;
  tableRowAltBg: string;
}

export const themes: Record<ThemeMode, Theme> = {
  day: {
    mode: 'day',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    heading: '#111111',
    codeBackground: '#F0F0F0',
    codeText: '#C7254E',
    border: '#E0E0E0',
    link: '#1A73E8',
    quoteBackground: '#F7F7F7',
    quoteBorder: '#CCCCCC',
    tableHeaderBg: '#EEEEEE',
    tableRowAltBg: '#F7F7F7',
  },
  night: {
    mode: 'night',
    background: '#1C1C1E',
    surface: '#2C2C2E',
    text: '#E5E5E5',
    textSecondary: '#AEAEB2',
    heading: '#FFFFFF',
    codeBackground: '#2C2C2E',
    codeText: '#FF8AB4',
    border: '#38383A',
    link: '#66A3FF',
    quoteBackground: '#262628',
    quoteBorder: '#3A3A3C',
    tableHeaderBg: '#2C2C2E',
    tableRowAltBg: '#242424',
  },
};

// 字号档位：相对于基准的缩放系数
export const FONT_SCALES = [0.85, 1.0, 1.15, 1.3, 1.5] as const;
export const DEFAULT_FONT_SCALE_INDEX = 1;

export const BASE_FONT_SIZE = 16;
