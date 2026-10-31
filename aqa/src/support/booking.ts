import type { ApiClient } from '../api/api-client';
import { reservationsApi, tablesApi } from '../api/endpoints';
import type { Table, TimeRange } from '../api/models';
import { addMinutes, iso, SLOT_MINUTES } from '../data/time';
import type { Session } from './sessions';

/** Books `table` for `customer` through the API (used to prepare data or to probe a rule). */
export function book(customer: Session, table: Table, start: Date, options: { minutes?: number; guests?: number } = {}) {
  return reservationsApi.create(customer.api, {
    tableId: table.id,
    startTime: iso(start),
    endTime: iso(addMinutes(start, options.minutes ?? SLOT_MINUTES)),
    guestCount: options.guests ?? 1,
  });
}

/** Free slots of a table from `from` until the end of that working day, as the booking page requests them. */
export async function freeSlots(api: ApiClient, table: Table, from: Date): Promise<TimeRange[]> {
  const res = await tablesApi.timeSlots(api, table.id, iso(from));
  if (res.status !== 200) throw new Error(`time slots of table ${table.id}: HTTP ${res.status}`);
  return res.body;
}

export function sameInstant(a: string | Date, b: string | Date): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}
