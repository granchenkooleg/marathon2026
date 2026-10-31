import { errorText } from '../../src/api/api-client';
import { reservationsApi } from '../../src/api/endpoints';
import { ReservationStatus } from '../../src/api/models';
import { addMinutes, iso, SLOT_MINUTES, utcDayAt } from '../../src/data/time';
import { expect, test } from '../../src/fixtures';
import { book, sameInstant } from '../../src/support/booking';
import { knownDefect } from '../../src/support/defects';

test.describe("Access to other customers' reservations", { tag: ['@L2', '@api'] }, () => {
  test("another customer's reservation is not in my list", async ({ customer, otherCustomer, tables }) => {
    const table = await tables.create(2);
    const theirs = (await book(otherCustomer, table, utcDayAt(3, 12))).body;

    const mine = await reservationsApi.mine(customer.api);
    expect(mine.status).toBe(200);
    expect(mine.body.map((r) => r.id)).not.toContain(theirs.id);
  });

  test("another customer's reservation cannot be edited", async ({ customer, otherCustomer, tables }) => {
    const table = await tables.create(2);
    const theirs = (await book(otherCustomer, table, utcDayAt(3, 12), { guests: 1 })).body;
    const newStart = utcDayAt(3, 17);

    const res = await reservationsApi.edit(customer.api, {
      reservationId: theirs.id,
      startTime: iso(newStart),
      endTime: iso(addMinutes(newStart, SLOT_MINUTES)),
      guestCount: 2,
    });
    expect(res.status).toBe(403);
    expect(errorText(res.body)).toBe('Not authorized to edit this reservation.');
    const stored = (await reservationsApi.byId(otherCustomer.api, theirs.id)).body;
    expect(sameInstant(stored.startTime, theirs.startTime) && stored.guestCount === 1).toBe(true);
  });

  test("another customer's reservation cannot be cancelled", async ({ customer, otherCustomer, tables }) => {
    const table = await tables.create(2);
    const theirs = (await book(otherCustomer, table, utcDayAt(3, 12))).body;

    const res = await reservationsApi.cancel(customer.api, theirs.id);
    expect(res.status).toBe(403);
    expect((await reservationsApi.byId(otherCustomer.api, theirs.id)).body.status).toBe(ReservationStatus.Reserved);
  });

  test("another customer's reservation cannot be read by id", { tag: '@known-defect' }, async ({ customer, otherCustomer, tables }) => {
    knownDefect('D7');
    const table = await tables.create(2);
    const theirs = (await book(otherCustomer, table, utcDayAt(3, 12))).body;

    const res = await reservationsApi.byId(customer.api, theirs.id);
    expect([403, 404]).toContain(res.status);
  });
});

test.describe('Unauthenticated access to reservations', { tag: ['@L2', '@api'] }, () => {
  test('booking without signing in is refused and books nothing', async ({ api, tables }) => {
    const table = await tables.create(2);
    const start = utcDayAt(3, 12);
    const res = await reservationsApi.create(api, {
      tableId: table.id,
      startTime: iso(start),
      endTime: iso(addMinutes(start, SLOT_MINUTES)),
      guestCount: 1,
    });
    expect(res.status).toBe(401);
  });

  test('listing, reading, editing and cancelling without signing in are refused', async ({ api, customer, tables }) => {
    const table = await tables.create(2);
    const created = (await book(customer, table, utcDayAt(3, 12))).body;

    expect((await reservationsApi.mine(api)).status).toBe(401);
    expect((await reservationsApi.byId(api, created.id)).status).toBe(401);
    expect(
      (
        await reservationsApi.edit(api, {
          reservationId: created.id,
          startTime: created.startTime,
          endTime: created.endTime,
          guestCount: 2,
        })
      ).status,
    ).toBe(401);
    expect((await reservationsApi.cancel(api, created.id)).status).toBe(401);
    expect((await reservationsApi.byId(customer.api, created.id)).body.status).toBe(ReservationStatus.Reserved);
  });
});
