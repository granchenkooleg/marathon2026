import { tablesApi } from '../../src/api/endpoints';
import { iso, utcDayAt } from '../../src/data/time';
import { expect, test } from '../../src/fixtures';
import { book, freeSlots, sameInstant } from '../../src/support/booking';

test.describe('Table availability (API)', { tag: ['@L2', '@api'] }, () => {
  test('a booked slot is no longer offered for that table, other tables keep it', async ({ api, customer, privateTables }) => {
    const [booked, free] = [await privateTables.create(2), await privateTables.create(2)];
    const day = utcDayAt(3, 12);
    const slot = (await freeSlots(api, booked, day))[0]!;

    expect((await book(customer, booked, new Date(slot.start))).status).toBe(201);

    expect((await freeSlots(api, booked, day)).some((s) => sameInstant(s.start, slot.start))).toBe(false);
    expect((await freeSlots(api, free, day)).some((s) => sameInstant(s.start, slot.start))).toBe(true);
  });

  test('search filters out tables smaller than the party', async ({ api, privateLocation, privateTables }) => {
    const [forTwo, forFour] = [await privateTables.create(2), await privateTables.create(4)];
    const res = await tablesApi.available(api, { locationId: privateLocation.location.id, capacity: 3, startTime: iso(utcDayAt(3, 12)) });

    expect(res.status).toBe(200);
    const ids = res.body.map((table) => table.id);
    expect(ids).toContain(forFour.id);
    expect(ids).not.toContain(forTwo.id);
  });

  test('search returns every free table of a location, every time', async ({ api, privateLocation, privateTables }) => {
    // Was D11 (see README); fixed.
    const created = await Promise.all(Array.from({ length: 25 }, () => privateTables.create(4)));
    const query = { locationId: privateLocation.location.id, capacity: 1, startTime: iso(utcDayAt(3, 12)) };

    // The search finds tables through a GSI, which is eventually consistent: wait until it lists every new table once.
    await expect
      .poll(async () => (await tablesApi.available(api, query)).body.length, { timeout: 20_000 })
      .toBe(created.length);

    // From then on every search must return all of them: D11 dropped tables at random.
    for (let attempt = 1; attempt <= 10; attempt++) {
      const res = await tablesApi.available(api, query);
      expect(res.body.length, `attempt ${attempt}: tables returned`).toBe(created.length);
    }
  });
});
