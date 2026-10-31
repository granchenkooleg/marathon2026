import { test } from '@playwright/test';

/**
 * Defects found while automating. Tests that hit one are marked with test.fail(): they pass while
 * the defect exists and turn red ("unexpectedly passed") once it is fixed, so the list stays honest.
 * The same ids are used in aqa/README.md.
 */
export const DEFECTS = {
  D1: 'D1: Registering an already used email returns HTTP 500 (expected 4xx, e.g. 409)',
  D2: 'D2: A valid email longer than 128 characters fails with HTTP 500 (Cognito username limit), spec allows up to 254',
  D3: 'D3: Last name validation messages say "First name ..." on the sign-up form',
  D4: 'D4: Clicking a popular dish on the main page links to /dish/:id, a route that does not exist (redirects to main page)',
  D5: 'D5: The menu page has no search by dish name (API supports ?name=)',
  D6: 'D6: A cancelled reservation still blocks its table: the same slot cannot be booked again',
  D7: 'D7: A customer can read another customer\'s reservation via GET /reservations/{id} (HTTP 200)',
  D8: 'D8: Cognito password-policy rejection is returned as HTTP 500 instead of 400',
  D9: 'D9: Sign-in with an unregistered email returns HTTP 500 "Internal Server Error" instead of 401',
  D11: 'D11: GET /available-tables randomly omits tables of a location (results collected from parallel tasks into a non-thread-safe List)',
  D10: 'D10: On the 29th-31st of a month the booking page searches (and edits) one month later than the selected date (Date.setMonth overflow in revertFormatTime)',
} as const;

export type DefectId = keyof typeof DEFECTS;

/** Marks the current test as an expected failure caused by a known defect. */
export function knownDefect(id: DefectId): void {
  test.fail(true, DEFECTS[id]);
}
