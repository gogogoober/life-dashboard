// ═══════════════════════════════════════════
// Raw color values for canvas rendering
// ═══════════════════════════════════════════

export const canvasColors = {
  bg: {
    base: '#0a0e0a',
  },
  text: {
    emphasis: '#d4f5d4',
    primary: '#c8d8c8',
    secondary: '#5a7a5a',
    tertiary: '#3a5a3a',
    alert: '#e85d35',
    warning: '#e8a735',
  },
  status: {
    alert: '#e85d35',
    warning: '#e8a735',
    primary: '#2ecc71',
    secondary: '#1a8a4a',
  },
  category: {
    travel:   { emphasis: '#00e5ff', primary: '#0097a7', secondary: '#004d5a' },
    personal: { emphasis: '#ce93d8', primary: '#8e4a9e', secondary: '#4a2558' },
    project:  { emphasis: '#cfd8dc', primary: '#78909c', secondary: '#37474f' },
    admin:    { emphasis: '#90a4ae', primary: '#546e7a', secondary: '#263238' },
  },
  border: {
    emphasis: 'rgba(46, 204, 113, 0.4)',
    primary: 'rgba(40, 70, 40, 0.25)',
    secondary: 'rgba(40, 70, 40, 0.12)',
    alert: 'rgba(232, 93, 53, 0.35)',
    warning: 'rgba(232, 167, 53, 0.3)',
  },
  grid: 'rgba(46, 204, 113, 0.05)',
} as const;

// ═══════════════════════════════════════════
// Hue scale functions
// ═══════════════════════════════════════════
// Input: 0 (alert/urgent) → 100 (calm/dormant)
// Output: HSLA color string

export function hue(value: number, alpha: number = 1): string {
  const clamped = Math.max(0, Math.min(100, value));
  const h = 15 + (clamped / 100) * (150 - 15);
  const s = 80 - (clamped / 100) * (80 - 60);
  const l = 55 - (clamped / 100) * (55 - 15);
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${alpha})`;
}

export function hueLog(value: number, alpha: number = 1): string {
  const clamped = Math.max(0, Math.min(100, value));
  const logValue = (Math.log(clamped + 1) / Math.log(101)) * 100;
  return hue(logValue, alpha);
}

// ═══════════════════════════════════════════
// Stress color helpers (for orbital chart)
// ═══════════════════════════════════════════

export function stressColor(daysAway: number): string {
  if (daysAway <= 1) return canvasColors.status.alert;
  if (daysAway <= 3) return canvasColors.status.alert;
  if (daysAway <= 7) return canvasColors.status.warning;
  if (daysAway <= 14) return canvasColors.status.primary;
  if (daysAway <= 30) return canvasColors.status.secondary;
  return '#0d4a28';
}

export function stressGlow(daysAway: number): string {
  if (daysAway <= 1) return 'rgba(232, 93, 53, 0.35)';
  if (daysAway <= 3) return 'rgba(232, 93, 53, 0.25)';
  if (daysAway <= 7) return 'rgba(232, 167, 53, 0.2)';
  return 'rgba(46, 204, 113, 0.1)';
}

export function distanceOpacity(daysAway: number): number {
  if (daysAway <= 14) return 1;
  if (daysAway <= 30) return 0.7;
  return 0.4;
}

// ═══════════════════════════════════════════
// Hue value from days (maps days → 0-100 scale)
// ═══════════════════════════════════════════

export function daysToHueValue(days: number, maxDays: number = 60): number {
  return Math.min(100, (days / maxDays) * 100);
}
