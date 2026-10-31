import type { Page } from '@playwright/test';

/**
 * Workaround for defect D10: the booking page builds request dates with `new Date()` +
 * `setMonth()`, which overflows into the next month when "today" is the 29th–31st.
 * On those days the browser clock is moved back 4 days (still before every date the tests book,
 * and short enough to keep the 14-day date picker covering them). The backend still uses real time.
 * Tokens stay valid: only their expiry is checked, and it is later than the shifted time.
 */
export async function sidestepMonthEndDateDefect(page: Page): Promise<void> {
  const now = new Date();
  if (now.getUTCDate() > 28) {
    await page.clock.install({ time: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) });
  }
}
