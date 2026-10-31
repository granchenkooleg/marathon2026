import { errorText } from '../../src/api/api-client';
import { reservationsApi } from '../../src/api/endpoints';
import { ReservationStatus } from '../../src/api/models';
import { addMinutes, iso, minutesFromNow, SLOT_MINUTES, utcDayAt } from '../../src/data/time';
import { expect, test } from '../../src/fixtures';
import { book, sameInstant } from '../../src/support/booking';
import { knownDefect } from '../../src/support/defects';

/**
 * Booking rules checked at the API level. The UI only offers half-hour slots, so boundaries such as
 * "start in 14 minutes" or "end before start" cannot be entered through the page; the homework allows
 * preparing and checking state outside the UI. Every test books its own new table, so tests stay
 * independent and can run in parallel.
 *
 * "15 minutes" is sent as 15 min + 20 s: the server compares with its own clock when the request
 * arrives, so an exact 15:00 would be judged a few hundred ms late.
 */
const LATENCY_MARGIN_MIN = 20 / 60;

test.describe('Booking rules: start time', { tag: ['@L2', '@api'] }, () => {
  for (const [minutes, accepted] of [
    [14, false],
    [15, true],
    [16, true],
  ] as const) {
    test(`a booking starting in ${minutes} min is ${accepted ? 'accepted' : 'rejected'}`, async ({ customer, tables }) => {
      const table = await tables.create(2);
      const start = minutesFromNow(minutes === 15 ? 15 + LATENCY_MARGIN_MIN : minutes);
      const res = await book(customer, table, start);

      if (accepted) {
        expect(res.status, errorText(res.body)).toBe(201);
        expect(res.body.status).toBe(ReservationStatus.Reserved);
      } else {
        expect(res.status).toBe(400);
        expect(errorText(res.body)).toMatch(/at least 15 minutes in advance/);
      }
    });
  }
});

test.describe('Booking rules: end time', { tag: ['@L2', '@api'] }, () => {
  for (const [label, minutes, accepted] of [
    ['before the start', -30, false],
    ['equal to the start', 0, false],
    ['1 minute after the start', 1, true],
  ] as const) {
    test(`an end time ${label} is ${accepted ? 'accepted' : 'rejected'}`, async ({ customer, tables }) => {
      const table = await tables.create(2);
      const res = await book(customer, table, utcDayAt(3, 12), { minutes });

      if (accepted) expect(res.status, errorText(res.body)).toBe(201);
      else {
        expect(res.status).toBe(400);
        expect(errorText(res.body)).toMatch(/must be after start time/);
      }
    });
  }
});

test.describe('Booking rules: guests vs table capacity', { tag: ['@L2', '@api'] }, () => {
  for (const [guests, accepted] of [
    [3, true],
    [4, true],
    [5, false],
  ] as const) {
    test(`${guests} guests at a table for 4 is ${accepted ? 'accepted' : 'rejected'}`, async ({ customer, tables }) => {
      const table = await tables.create(4);
      const res = await book(customer, table, utcDayAt(3, 12), { guests });

      if (accepted) {
        expect(res.status, errorText(res.body)).toBe(201);
        expect(res.body.guestCount).toBe(guests);
      } else {
        expect(res.status).toBe(400);
        expect(errorText(res.body)).toBe('Guest count (5) exceeds table capacity (4).');
      }
    });
  }
});

/**
 * The spec says bookings of one table must not intersect. The app is stricter: it keeps a 15-minute
 * gap between bookings of the same table (cleaning buffer). Tests follow the implemented rule and
 * check both of its boundaries (14 min gap → rejected, 15 min → accepted).
 */
test.describe('Booking rules: overlapping and adjacent intervals', { tag: ['@L2', '@api'] }, () => {
  const existingStart = () => utcDayAt(3, 14, 0); // existing booking 14:00–15:30

  for (const [label, offsetMin, length, accepted] of [
    ['the same interval', 0, SLOT_MINUTES, false],
    ['an interval starting inside it', 30, SLOT_MINUTES, false],
    ['an interval that contains it', -30, SLOT_MINUTES + 60, false],
    ['an adjacent interval right after it (no gap)', SLOT_MINUTES, SLOT_MINUTES, false],
    ['an interval after it with a 14-min gap', SLOT_MINUTES + 14, SLOT_MINUTES, false],
    ['an interval after it with a 15-min gap', SLOT_MINUTES + 15, SLOT_MINUTES, true],
    ['an adjacent interval right before it (no gap)', -SLOT_MINUTES, SLOT_MINUTES, false],
    ['an interval before it with a 15-min gap', -SLOT_MINUTES - 15, SLOT_MINUTES, true],
  ] as const) {
    test(`${label} on the same table is ${accepted ? 'accepted' : 'rejected'}`, async ({ customer, tables }) => {
      const table = await tables.create(2);
      expect((await book(customer, table, existingStart())).status).toBe(201);

      const res = await book(customer, table, addMinutes(existingStart(), offsetMin), { minutes: length });
      if (accepted) expect(res.status, errorText(res.body)).toBe(201);
      else {
        expect(res.status).toBe(400);
        expect(errorText(res.body)).toMatch(/overlaps with an existing reservation/);
      }
    });
  }

  test('the same interval on another table is accepted', async ({ customer, tables }) => {
    const [first, second] = [await tables.create(2), await tables.create(2)];
    expect((await book(customer, first, existingStart())).status).toBe(201);
    expect((await book(customer, second, existingStart())).status).toBe(201);
  });
});

test.describe('Editing a reservation follows the same rules', { tag: ['@L2', '@api'] }, () => {
  test('a valid change of time and guests is saved', async ({ customer, tables }) => {
    const table = await tables.create(4);
    const created = (await book(customer, table, utcDayAt(3, 12), { guests: 1 })).body;
    const newStart = utcDayAt(3, 17, 30);

    const res = await reservationsApi.edit(customer.api, {
      reservationId: created.id,
      startTime: iso(newStart),
      endTime: iso(addMinutes(newStart, SLOT_MINUTES)),
      guestCount: 4,
    });
    expect(res.status, errorText(res.body)).toBe(200);
    const stored = (await reservationsApi.byId(customer.api, created.id)).body;
    expect(stored.guestCount).toBe(4);
    expect(sameInstant(stored.startTime, newStart)).toBe(true);
    expect(stored.status).toBe(ReservationStatus.Reserved);
  });

  for (const [label, change, status, message] of [
    ['a start in 14 min', { startInMin: 14 }, 400, /at least 15 minutes in advance/],
    ['an end before the start', { lengthMin: -30 }, 400, /End time must be after start time/],
    ['an end equal to the start', { lengthMin: 0 }, 400, /End time must be after start time/],
    ['guests above capacity (5 at a table for 4)', { guests: 5 }, 400, /capacity is insufficient/],
  ] as const) {
    test(`an edit to ${label} is rejected`, async ({ customer, tables }) => {
      const table = await tables.create(4);
      const created = (await book(customer, table, utcDayAt(3, 12), { guests: 2 })).body;
      const start = 'startInMin' in change ? minutesFromNow(change.startInMin) : new Date(created.startTime);
      const length = 'lengthMin' in change ? change.lengthMin : SLOT_MINUTES;

      const res = await reservationsApi.edit(customer.api, {
        reservationId: created.id,
        startTime: iso(start),
        endTime: iso(addMinutes(start, length)),
        guestCount: 'guests' in change ? change.guests : 2,
      });
      expect(res.status).toBe(status);
      expect(errorText(res.body)).toMatch(message);
      // Nothing changed.
      const stored = (await reservationsApi.byId(customer.api, created.id)).body;
      expect(sameInstant(stored.startTime, created.startTime) && stored.guestCount === 2).toBe(true);
    });
  }

  for (const [gap, accepted] of [
    [0, false],
    [14, false],
    [15, true],
  ] as const) {
    test(`moving a booking to ${gap} min after another one on the table is ${accepted ? 'accepted' : 'rejected'}`, async ({
      customer,
      tables,
    }) => {
      const table = await tables.create(2);
      const other = utcDayAt(3, 12);
      expect((await book(customer, table, other)).status).toBe(201);
      const mine = (await book(customer, table, utcDayAt(3, 18))).body;
      const newStart = addMinutes(other, SLOT_MINUTES + gap);

      const res = await reservationsApi.edit(customer.api, {
        reservationId: mine.id,
        startTime: iso(newStart),
        endTime: iso(addMinutes(newStart, SLOT_MINUTES)),
        guestCount: 1,
      });
      if (accepted) expect(res.status, errorText(res.body)).toBe(200);
      else {
        expect(res.status).toBe(409);
        expect(errorText(res.body)).toBe('Time overlaps with existing reservation.');
      }
    });
  }
});

test.describe('Cancelling a reservation', { tag: ['@L2', '@api'] }, () => {
  test('cancelling sets the status to Cancelled', async ({ customer, tables }) => {
    const table = await tables.create(2);
    const created = (await book(customer, table, utcDayAt(3, 12))).body;

    const res = await reservationsApi.cancel(customer.api, created.id);
    expect(res.status).toBe(200);
    expect((await reservationsApi.byId(customer.api, created.id)).body.status).toBe(ReservationStatus.Cancelled);
  });

  // Behaviour chosen and documented in README: a repeated cancel is idempotent (200, state unchanged).
  test('cancelling again keeps the reservation cancelled', async ({ customer, tables }) => {
    const table = await tables.create(2);
    const created = (await book(customer, table, utcDayAt(3, 12))).body;
    expect((await reservationsApi.cancel(customer.api, created.id)).status).toBe(200);

    const again = await reservationsApi.cancel(customer.api, created.id);
    expect(again.status).toBe(200);
    const stored = (await reservationsApi.byId(customer.api, created.id)).body;
    expect(stored.status).toBe(ReservationStatus.Cancelled);
    expect(sameInstant(stored.startTime, created.startTime)).toBe(true);
  });

  for (const [minutes, allowed] of [
    [29, false],
    [31, true],
  ] as const) {
    test(`cancelling ${minutes} min before the start is ${allowed ? 'allowed' : 'refused'}`, async ({ customer, tables }) => {
      const table = await tables.create(2);
      const created = await book(customer, table, minutesFromNow(minutes));
      expect(created.status, errorText(created.body)).toBe(201);

      const res = await reservationsApi.cancel(customer.api, created.body.id);
      if (allowed) expect(res.status).toBe(200);
      else {
        expect(res.status).toBe(400);
        expect(errorText(res.body)).toMatch(/Too late to cancel/);
      }
    });
  }

  test('a cancelled slot can be booked again', { tag: '@known-defect' }, async ({ customer, tables }) => {
    knownDefect('D6');
    const table = await tables.create(2);
    const start = utcDayAt(3, 12);
    const first = (await book(customer, table, start)).body;
    expect((await reservationsApi.cancel(customer.api, first.id)).status).toBe(200);

    const again = await book(customer, table, start);
    expect(again.status, errorText(again.body)).toBe(201);
  });
});
