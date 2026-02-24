export const MAX_DAYS = 60;
export const TODAY = new Date();

export function temporalColor(days: number, opacityOverride?: number): string {
  let hue: number, sat: number, lit: number;
  if (days <= 7) {
    hue = 25;
    sat = 92;
    lit = 55;
  } else if (days <= 14) {
    const t = (days - 7) / 7;
    hue = 25 + t * 5;
    sat = 92 - t * 25;
    lit = 55 - t * 5;
  } else {
    const daysIntoDecay = days - 14;
    const maxDecay = MAX_DAYS - 14;
    const t = Math.log(daysIntoDecay + 1) / Math.log(maxDecay + 1);
    hue = 30 + t * (220 - 30);
    sat = 67 - t * (67 - 8);
    lit = 50 + t * (35 - 50);
  }
  const alpha = opacityOverride != null ? opacityOverride : 1;
  return `hsla(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(lit)}%, ${alpha})`;
}

export function temporalGlow(days: number): string {
  if (days > 14) return "hsla(25, 0%, 35%, 0)";
  return `hsla(25, 90%, 55%, ${days <= 7 ? 0.4 : 0.2})`;
}

export function daysFromNow(date: Date): number {
  return Math.max(0.5, (date.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

export function logX(days: number): number {
  const t = Math.log(days + 1) / Math.log(MAX_DAYS + 1);
  return Math.pow(t, 1.3) * 100;
}
