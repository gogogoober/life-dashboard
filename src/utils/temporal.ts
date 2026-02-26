export const MAX_DAYS = 60;

export function daysFromNow(date: Date): number {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const eventMidnight = new Date(date);
  eventMidnight.setHours(0, 0, 0, 0);
  return Math.max(0.5, (eventMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

export function logX(days: number): number {
  const t = Math.log(days + 1) / Math.log(MAX_DAYS + 1);
  return Math.pow(t, 1.3) * 100;
}
