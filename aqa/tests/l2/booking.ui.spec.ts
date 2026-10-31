import { reservationsApi } from '../../src/api/endpoints';
import { ReservationStatus } from '../../src/api/models';
import { addMinutes, cardTime, datePickerLabel, hhmm, SLOT_MINUTES, utcDayAt } from '../../src/data/time';
import { expect, test } from '../../src/fixtures';
import { LoginModal } from '../../src/pages/auth.pages';
import { BookingPage, ReservationsPage } from '../../src/pages/booking.pages';
import { book, freeSlots, sameInstant } from '../../src/support/booking';
import { knownDefect } from '../../src/support/defects';
import { sidestepMonthEndDateDefect } from '../../src/support/browser-clock';
import { signInBrowser } from '../../src/support/sessions';

/** Search time used by the UI tests: 12:00 UTC, two days ahead (always inside the 14-day picker). */
const DAYS_AHEAD = 2;
const SEARCH_TIME = '12:00';
const searchStart = () => utcDayAt(DAYS_AHEAD, 12, 0);

test.describe('Table booking (UI)', { tag: ['@L2', '@ui'] }, () => {
  // Defect D10 makes the page query the wrong month on the 29th–31st; it has its own test below.
  // Here the browser date is moved off the month end so these tests check booking itself.
  test.beforeEach(async ({ page }) => {
    await sidestepMonthEndDateDefect(page);
  });

  test('customer finds a free table, books it and sees it in "my reservations"', { tag: '@smoke' }, async ({
    page,
    api,
    customer,
    privateTables,
    privateLocation,
  }) => {
    const table = await privateTables.create(4);
    const address = privateLocation.location.address;
    const day = searchStart();
    const slot = (await freeSlots(api, table, day))[0]!;
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);

    await signInBrowser(page, customer);
    const booking = new BookingPage(page);
    await booking.open();
    await booking.search({ location: address, date: datePickerLabel(day), time: SEARCH_TIME, guests: 2 });

    await expect(booking.tableCard(table.tableNumber)).toContainText(`Up to ${table.capacity} guests`);
    await booking.slot(table.tableNumber, hhmm(slotStart)).click();
    expect(await booking.dialogDetails(booking.reviewDialog)).toEqual({
      Location: address,
      Date: datePickerLabel(day),
      Time: `${hhmm(slotStart)} - ${hhmm(slotEnd)}`,
      Guests: '2 people',
    });
    await booking.reviewDialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(booking.confirmedDialog).toBeVisible();
    expect(await booking.dialogDetails(booking.confirmedDialog)).toMatchObject({
      Location: address,
      Time: `${hhmm(slotStart)} - ${hhmm(slotEnd)}`,
      Guests: '2 people',
    });

    // "My reservations" shows it with the right date, time, guests and status …
    const reservationsPage = new ReservationsPage(page);
    await reservationsPage.open();
    const card = reservationsPage.card(address);
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(datePickerLabel(day));
    await expect(card).toContainText(`${cardTime(slotStart)} – ${cardTime(slotEnd)}`);
    await expect(card).toContainText('2 Guests');
    await expect(reservationsPage.status(card)).toHaveText('Reserved');

    // … and the table, which the card does not display, is checked through the API.
    const mine = (await reservationsApi.mine(customer.api)).body;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ tableId: table.id, guestCount: 2, status: ReservationStatus.Reserved });
    expect(sameInstant(mine[0]!.startTime, slotStart) && sameInstant(mine[0]!.endTime, slotEnd)).toBe(true);

    // The booked time is no longer offered for this table.
    await booking.open();
    await booking.search({ location: address, date: datePickerLabel(day), time: SEARCH_TIME, guests: 2 });
    await expect(booking.tableCard(table.tableNumber)).toBeVisible();
    expect(await booking.availableSlots(table.tableNumber)).not.toContain(hhmm(slotStart));
  });

  for (const guests of [1, 2, 3]) {
    const fits = guests <= 2;
    test(`a table for 2 is ${fits ? '' : 'not '}offered for ${guests} guest(s)`, async ({ page, customer, privateTables, privateLocation }) => {
      const table = await privateTables.create(2);
      await signInBrowser(page, customer);
      const booking = new BookingPage(page);
      await booking.open();
      await booking.search({
        location: privateLocation.location.address,
        date: datePickerLabel(searchStart()),
        time: SEARCH_TIME,
        guests,
      });

      if (fits) await expect(booking.tableCard(table.tableNumber)).toBeVisible();
      else await expect(booking.tableCard(table.tableNumber)).toHaveCount(0);
    });
  }

  test('an anonymous visitor can search but has to sign in to book', async ({ page, api, privateTables, privateLocation }) => {
    const table = await privateTables.create(2);
    const day = searchStart();
    const slot = (await freeSlots(api, table, day))[0]!;
    const booking = new BookingPage(page);
    await booking.open();
    await booking.search({ location: privateLocation.location.address, date: datePickerLabel(day), time: SEARCH_TIME, guests: 1 });
    await booking.slot(table.tableNumber, hhmm(new Date(slot.start))).click();
    await booking.reviewDialog.getByRole('button', { name: 'Confirm' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(new LoginModal(page).email).toBeVisible();
    // Nothing was booked: the slot is still free.
    const after = await freeSlots(api, table, day);
    expect(after.some((s) => sameInstant(s.start, slot.start))).toBe(true);
  });

  test('an anonymous visitor opening "my reservations" is sent to sign in', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page).toHaveURL(/\/login$/);
    await expect(new LoginModal(page).email).toBeVisible();
  });

  test('customer changes the time and the number of guests', async ({ page, customer, privateTables }) => {
    const table = await privateTables.create(4);
    const start = utcDayAt(DAYS_AHEAD, 13, 0);
    const created = await book(customer, table, start, { guests: 1 });
    expect(created.status).toBe(201);

    await signInBrowser(page, customer);
    const reservationsPage = new ReservationsPage(page);
    await reservationsPage.open();
    await reservationsPage.cards.first().getByRole('button', { name: 'Edit' }).click();
    const modal = reservationsPage.editModal;
    await expect(modal.root).toBeVisible();

    // Pick the last free start offered for this table (always later than the current booking).
    const starts = await modal.from.options();
    const newStartLabel = starts.at(-1)!;
    expect(newStartLabel).not.toBe(hhmm(start));
    await modal.from.choose(newStartLabel);
    await modal.guests.set(3);
    await modal.submit.click();

    const [hours, minutes] = newStartLabel.split(':').map(Number) as [number, number];
    const newStart = utcDayAt(DAYS_AHEAD, hours, minutes);
    const card = reservationsPage.cards.first();
    await expect(card).toContainText(`${cardTime(newStart)} – ${cardTime(addMinutes(newStart, SLOT_MINUTES))}`);
    await expect(card).toContainText('3 Guests');
    const stored = (await reservationsApi.byId(customer.api, created.body.id)).body;
    expect(stored.guestCount).toBe(3);
    expect(sameInstant(stored.startTime, newStart)).toBe(true);
  });

  test('editing cannot raise guests above the table capacity', async ({ page, customer, privateTables }) => {
    const table = await privateTables.create(2);
    expect((await book(customer, table, utcDayAt(DAYS_AHEAD, 13, 0), { guests: 1 })).status).toBe(201);

    await signInBrowser(page, customer);
    const reservationsPage = new ReservationsPage(page);
    await reservationsPage.open();
    await reservationsPage.cards.first().getByRole('button', { name: 'Edit' }).click();
    const modal = reservationsPage.editModal;
    await expect(modal.root).toContainText('Table seating capacity: 2 people');
    await modal.guests.set(2);

    await expect(modal.guests.increase).toBeDisabled();
    expect(await modal.guests.current()).toBe(2);
  });

  test('customer cancels a reservation', async ({ page, customer, privateTables }) => {
    const table = await privateTables.create(2);
    const created = await book(customer, table, utcDayAt(DAYS_AHEAD, 13, 0));
    expect(created.status).toBe(201);

    await signInBrowser(page, customer);
    const reservationsPage = new ReservationsPage(page);
    await reservationsPage.open();
    const card = reservationsPage.cards.first();
    await card.getByRole('button', { name: 'Cancel' }).click();

    await expect(reservationsPage.status(card)).toHaveText('Cancelled');
    await expect(card.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    expect((await reservationsApi.byId(customer.api, created.body.id)).body.status).toBe(ReservationStatus.Cancelled);

    // After a reload the state comes from the server, not from the page's memory.
    await reservationsPage.open();
    await expect(reservationsPage.status(reservationsPage.cards.first())).toHaveText('Cancelled');
  });

  test("a customer does not see another customer's reservations", async ({ page, customer, otherCustomer, privateTables, privateLocation }) => {
    const table = await privateTables.create(2);
    expect((await book(otherCustomer, table, utcDayAt(DAYS_AHEAD, 13, 0))).status).toBe(201);

    await signInBrowser(page, customer);
    const reservationsPage = new ReservationsPage(page);
    await reservationsPage.open();
    await expect(reservationsPage.greeting).toContainText(customer.user.firstName);
    await expect(reservationsPage.card(privateLocation.location.address)).toHaveCount(0);
  });
});

test.describe('Booking search dates', { tag: ['@L2', '@ui'] }, () => {
  test('searching on the 31st of a month asks for the selected date', { tag: '@known-defect' }, async ({ page }) => {
    knownDefect('D10');
    // Jan 31 → the visitor picks Feb 2. Deterministic, independent of the real date.
    await page.clock.install({ time: new Date('2027-01-31T08:00:00Z') });
    const booking = new BookingPage(page);
    await booking.open();
    await booking.date.choose('Feb 2, 2027');
    await booking.time.choose('12:00');
    const [request] = await Promise.all([
      page.waitForRequest((r) => new URL(r.url()).pathname.endsWith('/available-tables')),
      booking.findButton.click(),
    ]);

    expect(new URL(request.url()).searchParams.get('startTime')).toBe('2027-02-02T12:00:00.000Z');
  });
});
