import { randomUUID } from 'node:crypto';
import { env } from '../config/env';

/**
 * One id per `playwright test` invocation, shared by all workers
 * (set in playwright.config.ts before workers start, so they inherit it).
 */
export function runId(): string {
  const id = process.env.AQA_RUN_ID;
  if (!id) throw new Error('AQA_RUN_ID is not set; it is initialised in playwright.config.ts');
  return id;
}

/** Short unique token: run id + random part. Safe for emails and addresses. */
export function uniqueToken(): string {
  return `${runId()}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

/** Password that satisfies both the UI rules and the Cognito policy (upper, lower, digit, special). */
export const VALID_PASSWORD = 'Aqa1!pass';

/** Password of an exact length that still satisfies the Cognito character policy. */
export function passwordOfLength(length: number): string {
  const base = 'Aa1!';
  return base + 'x'.repeat(Math.max(0, length - base.length));
}

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function newUser(overrides: Partial<UserData> = {}): UserData {
  return {
    firstName: 'Aqa',
    lastName: 'Tester',
    email: `${env.dataPrefix}.${uniqueToken()}@example.com`,
    password: VALID_PASSWORD,
    ...overrides,
  };
}

/** Email of exactly `length` characters in the form `<prefix.token>xxx…@example.com`. */
export function emailOfLength(length: number): string {
  const local = `${env.dataPrefix}.${uniqueToken()}`;
  const domain = '@example.com';
  const padding = length - local.length - domain.length;
  if (padding < 0) throw new Error(`Cannot build an email of length ${length}`);
  return `${local}${'x'.repeat(padding)}${domain}`;
}

/** Latin letters only, exact length. */
export function nameOfLength(length: number): string {
  return 'Ab'.repeat(Math.ceil(length / 2)).slice(0, length);
}

/** Address prefix of every location created by this framework; used by the stale-data sweeper. */
export function locationAddressPrefix(): string {
  return `${env.dataPrefix.toUpperCase()} `;
}

/** Address encodes the run id (base36 timestamp) so stale leftovers can be swept later. */
export function locationAddress(label: string): string {
  return `${locationAddressPrefix()}${runId()} ${label} Test St`;
}

export function dishNamePrefix(): string {
  return `${env.dataPrefix.toUpperCase()} ${runId()}`;
}

/** Parses the run id (base36 ms timestamp) back into a Date; null for foreign data. */
export function runIdToDate(id: string): Date | null {
  const ms = parseInt(id, 36);
  if (!Number.isFinite(ms) || ms < Date.UTC(2024, 0, 1) || ms > Date.now() + 86_400_000) return null;
  return new Date(ms);
}
