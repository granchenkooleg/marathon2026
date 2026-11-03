import { expect } from '@playwright/test';
import { errorText, type ApiClient } from '../api/api-client';
import { groupApi, guestApi, ordersApi } from '../api/endpoints';
import type { GroupSessions, Reservation, Table } from '../api/models';
import type { SeededDish } from '../data/seeded';
import { utcDayAt } from '../data/time';
import { book } from './booking';
import type { Session } from './sessions';

/** A group pre-order prepared through the API: the Owner's reservation and its group. */
export interface Group {
  owner: Session;
  reservation: Reservation;
  groupId: string;
  ownerSessionId: string;
}

/** A guest who joined through the invite; `api` carries the guest session token. */
export interface Guest {
  name: string;
  sessionId: string;
  api: ApiClient;
}

export interface CartLine {
  dish: SeededDish;
  quantity: number;
}

/**
 * Books `table` for `owner` for `guestCount` people and returns the group created with it.
 * A group of N admits N - 1 guests (the Owner is the first participant).
 */
export async function createGroup(owner: Session, table: Table, guestCount: number): Promise<Group> {
  const booked = await book(owner, table, utcDayAt(3, 12), { guests: guestCount });
  expect(booked.status, `book a table for ${guestCount}: ${errorText(booked.body)}`).toBe(201);

  const session = await groupApi.ownerSession(owner.api, booked.body.id);
  expect(session.status, `owner session: ${errorText(session.body)}`).toBe(200);
  return {
    owner,
    reservation: booked.body,
    groupId: session.body.groupReservationId,
    ownerSessionId: session.body.guestSessionId,
  };
}

/** The Owner's own pre-order. The backend needs it before the group can be submitted. */
export async function ownerPreOrder(group: Group, lines: CartLine[]): Promise<void> {
  const res = await ordersApi.create(
    group.owner.api,
    group.reservation.id,
    lines.map((line) => ({ dishId: line.dish.id, quantity: line.quantity })),
  );
  expect([200, 201], `owner pre-order: ${errorText(res.body)}`).toContain(res.status);
}

/** A guest joins through the invite (anonymous call, as the invite page does). */
export async function joinGuest(api: ApiClient, group: Group, name: string): Promise<Guest> {
  const res = await guestApi.join(api.anonymous(), group.groupId, name);
  expect(res.status, `guest ${name} joins: ${errorText(res.body)}`).toBe(200);
  return { name, sessionId: res.body.SessionId, api: api.withToken(res.body.SessionToken) };
}

export async function addToCart(guest: Guest, lines: CartLine[]): Promise<void> {
  for (const line of lines) {
    const res = await guestApi.addDish(guest.api, guest.sessionId, line.dish.id, line.quantity);
    expect(res.status, `${guest.name} adds ${line.dish.name}: ${errorText(res.body)}`).toBe(200);
  }
}

export async function submitCart(guest: Guest): Promise<void> {
  const res = await guestApi.submitCart(guest.api, guest.sessionId);
  expect(res.status, `${guest.name} submits the cart: ${errorText(res.body)}`).toBe(200);
}

/** Joins, fills and (optionally) submits a cart in one call. */
export async function guestWithCart(
  api: ApiClient,
  group: Group,
  name: string,
  lines: CartLine[],
  options: { submit: boolean },
): Promise<Guest> {
  const guest = await joinGuest(api, group, name);
  await addToCart(guest, lines);
  if (options.submit) await submitCart(guest);
  return guest;
}

/** Money is compared in cents so that 16.25 × 3 is exact. */
export function cents(amount: number): number {
  return Math.round(amount * 100);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + cents(line.dish.price) * line.quantity, 0) / 100;
}

export function participant(sessions: GroupSessions, name: string) {
  const found = sessions.participants.find((item) => item.name === name);
  expect(found, `participant ${name} in ${JSON.stringify(sessions.participants.map((item) => item.name))}`).toBeDefined();
  return found!;
}

/** Same check the Owner relies on: group total = sum of participant totals = sum of their lines. */
export function expectConsistentTotals(sessions: GroupSessions): void {
  for (const item of sessions.participants) {
    const lines = item.items.reduce((sum, line) => sum + cents(line.dish.price) * line.quantity, 0);
    expect(cents(item.total), `subtotal of ${item.name}`).toBe(lines);
  }
  const subtotals = sessions.participants.reduce((sum, item) => sum + cents(item.total), 0);
  expect(cents(sessions.total), 'group total').toBe(subtotals);
}

/** Order lines as { dish name → quantity }, for comparing with what the Owner submitted. */
export function orderQuantities(items: { dish: { name: string }; quantity: number }[]): Record<string, number> {
  return Object.fromEntries(items.map((item) => [item.dish.name, item.quantity]));
}
