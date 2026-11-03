import { seededDishes } from '../../src/data/seeded';
import { expect, test } from '../../src/fixtures';
import { ReservationsPage } from '../../src/pages/booking.pages';
import { GroupOrderPage, WaiterPreOrderPage, WaiterReservationsPage } from '../../src/pages/group.pages';
import { createGroup, guestWithCart, ownerPreOrder } from '../../src/support/group';
import { signIn, signInBrowser } from '../../src/support/sessions';

test.describe('Direction 1 · end to end', { tag: ['@D1', '@D1-L3', '@ui', '@smoke'] }, () => {
  test('guests order → the Owner reviews, removes one guest and submits → the waiter gets the order without that guest', async ({
    browser,
    page,
    api,
    customer,
    privateTables,
    privateLocation,
  }) => {
    const [bruschetta, hummus, khinkali, , churchkhela] = seededDishes();
    const group = await createGroup(customer, await privateTables.create(4), 4);
    await ownerPreOrder(group, [{ dish: churchkhela, quantity: 1 }]);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: true });
    await guestWithCart(api, group, 'Max', [{ dish: hummus, quantity: 2 }], { submit: true });
    await guestWithCart(api, group, 'Ira', [{ dish: khinkali, quantity: 1 }, { dish: bruschetta, quantity: 1 }], { submit: true });

    // The Owner opens the screen the way a user does: from "Reservations".
    await signInBrowser(page, customer);
    const reservations = new ReservationsPage(page);
    await reservations.open();
    await page.getByRole('link', { name: 'Group Pre-Order' }).click();
    await page.waitForURL(`**/reservations/${group.reservation.id}/group-order`);

    const screen = new GroupOrderPage(page);
    await expect(screen.cards).toHaveCount(3);
    await expect(screen.grandTotal).toHaveText('$60.75');

    await screen.removeGuest('Max');
    await expect(screen.cards).toHaveCount(2);
    await expect(screen.grandTotal).toHaveText('$38.75');
    expect(await screen.consolidated()).toEqual([`${bruschetta.name} × 3`, `${khinkali.name} × 1`].sort());

    await screen.submit();
    await expect(screen.statusBadge).toHaveText('Sent to Restaurant');

    // The waiter of the location, in a separate browser session.
    const waiterContext = await browser.newContext();
    try {
      const waiterPage = await waiterContext.newPage();
      await signInBrowser(waiterPage, await signIn(api, privateLocation.waiter));
      const waiterReservations = new WaiterReservationsPage(waiterPage);
      await waiterReservations.open();
      await waiterReservations.openPreOrder(`${customer.user.firstName} ${customer.user.lastName}`);
      expect(await new WaiterPreOrderPage(waiterPage).quantities()).toEqual({
        [churchkhela.name]: 1,
        [bruschetta.name]: 3,
        [khinkali.name]: 1,
      });
    } finally {
      await waiterContext.close();
    }
  });
});
