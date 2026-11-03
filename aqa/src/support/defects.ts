import { test } from '@playwright/test';

/**
 * Defects found while automating. Tests that hit one are marked with test.fail(): they pass while
 * the defect exists and turn red ("unexpectedly passed") once it is fixed, so the list stays honest.
 * The same ids are used in aqa/README.md.
 */
export const DEFECTS = {
  D2: 'D2: A valid email longer than 128 characters fails with HTTP 500 (Cognito username limit), spec allows up to 254',
} as const;
// D1, D3–D11 are fixed (2026-11-03); their tests are regular tests now. History: aqa/README.md, "Знайдені дефекти".

export type DefectId = keyof typeof DEFECTS;

/** Marks the current test as an expected failure caused by a known defect. */
export function knownDefect(id: DefectId): void {
  test.fail(true, DEFECTS[id]);
}
