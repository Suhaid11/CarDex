export interface ThemeColors {
  // Hardware chassis & housing
  hardwareBg: string;
  hardwareBevel: string;
  hardwareBorder: string;
  
  // Screen & readout panels
  displayBg: string;
  displayBorder: string;
  displayText: string;
  displayTextMuted: string;
  
  // Data cards & framing
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardTextMuted: string;
  
  // Retro tactile accents & indicators
  accentBlue: string;
  accentBlueGlow: string;
  ledRed: string;
  ledYellow: string;
  ledGreen: string;
  
  // Interactive buttons
  btnBg: string;
  btnBorder: string;
  btnText: string;
  btnSecondaryBg: string;
  btnSecondaryText: string;
  
  // Semantic status
  success: string;
  warning: string;
  error: string;
  
  // Overall background
  screenBg: string;
}

export const lightTheme: ThemeColors = {
  hardwareBg: '#DC2626', // Classic Pokédex warm red chassis
  hardwareBevel: '#B91C1C',
  hardwareBorder: '#991B1B',
  
  displayBg: '#181E29', // Dark LCD instrument panel
  displayBorder: '#2E384D',
  displayText: '#F3F4F6',
  displayTextMuted: '#9CA3AF',
  
  cardBg: '#FAFAF9', // Warm off-white data plate
  cardBorder: '#D6D3D1',
  cardText: '#1C1917',
  cardTextMuted: '#78716C',
  
  accentBlue: '#0284C7', // Spherical sensor lens blue
  accentBlueGlow: '#38BDF8',
  ledRed: '#EF4444',
  ledYellow: '#F59E0B',
  ledGreen: '#10B981',
  
  btnBg: '#1E293B',
  btnBorder: '#0F172A',
  btnText: '#FFFFFF',
  btnSecondaryBg: '#E7E5E4',
  btnSecondaryText: '#292524',
  
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  
  screenBg: '#F3F4F6',
};

export const darkTheme: ThemeColors = {
  hardwareBg: '#881337', // Deep automotive crimson chassis
  hardwareBevel: '#4C0519',
  hardwareBorder: '#330310',
  
  displayBg: '#0F1117', // Deep midnight cockpit display
  displayBorder: '#1E2330',
  displayText: '#F8FAFC',
  displayTextMuted: '#64748B',
  
  cardBg: '#1A1E29', // Charcoal tech panel
  cardBorder: '#2E3547',
  cardText: '#F1F5F9',
  cardTextMuted: '#94A3B8',
  
  accentBlue: '#0EA5E9',
  accentBlueGlow: '#7DD3FC',
  ledRed: '#F87171',
  ledYellow: '#FBBF24',
  ledGreen: '#34D399',
  
  btnBg: '#BE123C',
  btnBorder: '#881337',
  btnText: '#FFFFFF',
  btnSecondaryBg: '#242A38',
  btnSecondaryText: '#E2E8F0',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  screenBg: '#090B0E',
};
