/**
 * Time helpers. Everything is UTC: the backend compares times in UTC and ends the working day
 * at 22:00 UTC, and the browser runs with timezoneId 'UTC' (playwright.config.ts), so UI labels
 * and API timestamps agree.
 */

const MINUTE = 60_000;

export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * MINUTE);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

/** `daysAhead` days from today (UTC) at hh:mm UTC. */
export function utcDayAt(daysAhead: number, hours: number, minutes = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

export function iso(date: Date): string {
  return date.toISOString();
}

/** "Nov 2, 2026" — the label used by the booking date picker. */
export function datePickerLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

/** "13:00" */
export function hhmm(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

/** "1:00 PM" — the time format used on reservation cards. */
export function cardTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date);
}

/** Standard reservation length used by the app's time slots. */
export const SLOT_MINUTES = 90;
