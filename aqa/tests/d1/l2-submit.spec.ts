import { randomUUID } from 'node:crypto';
import { errorText } from '../../src/api/api-client';
import { groupApi, guestApi, ordersApi } from '../../src/api/endpoints';
import { OrderStatus } from '../../src/api/models';
import { seededDishes } from '../../src/data/seeded';
import { expect, test } from '../../src/fixtures';
import { GroupOrderPage, WaiterPreOrderPage, WaiterReservationsPage } from '../../src/pages/group.pages';
import {
  createGroup,
  guestWithCart,
  joinGuest,
  orderQuantities,
  ownerPreOrder,
  type Group,
} from '../../src/support/group';
import { signIn, signInBrowser } from '../../src/support/sessions';

const OWNER_ONLY = 'Only the reservation owner can perform this action.';

async function expectGroupStillOpen(group: Group): Promise<void> {
  expect((await groupApi.status(group.owner.api, group.groupId)).body.status).toBe('Open');
}

test.describe('Direction 1 · L2 · the Owner submits the consolidated pre-order', { tag: ['@D1', '@D1-L2'] }, () => {
  test('submit merges the submitted carts, leaves out the rest, and the restaurant gets the order', { tag: '@ui' }, async ({ page, api, customer, tables }) => {
    const [bruschetta, hummus, khinkali, stew] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    await ownerPreOrder(group, [{ dish: khinkali, quantity: 1 }]);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }, { dish: hummus, quantity: 1 }], { submit: true });
    await guestWithCart(api, group, 'Taras', [{ dish: bruschetta, quantity: 1 }], { submit: true });
    await guestWithCart(api, group, 'Max', [{ dish: stew, quantity: 5 }], { submit: false });

    await signInBrowser(page, customer);
    const screen = new GroupOrderPage(page);
    await screen.open(group.reservation.id);
    expect(await screen.consolidated()).toEqual([`${bruschetta.name} × 3`, `${hummus.name} × 1`].sort());
    await expect(screen.grandTotal).toHaveText('$33.50');

    await screen.submit();
    await expect(screen.toasts.withText('Pre-order sent to the restaurant')).toBeVisible();
    await expect(screen.statusBadge).toHaveText('Sent to Restaurant');
    await expect(screen.sentButton).toBeDisabled();
    await expect(screen.cards.getByRole('button', { name: /^Remove / })).toHaveCount(0);

    // Reloading keeps the read-only "sent" state.
    await page.reload();
    await expect(screen.statusBadge).toHaveText('Sent to Restaurant');

    expect((await groupApi.status(customer.api, group.groupId)).body.status).toBe('Submitted');
    const order = await ordersApi.byReservation(customer.api, group.reservation.id);
    expect(order.body.status).toBe(OrderStatus.SubmittedByCustomer);
    // The Owner's own dish stays; guests' dishes are added and merged; Max's cart is not included.
    expect(orderQuantities(order.body.orderItems)).toEqual({
      [khinkali.name]: 1,
      [bruschetta.name]: 3,
      [hummus.name]: 1,
    });
  });

  test('the submit response lists the guests’ dishes merged by dish', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta, hummus] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    await ownerPreOrder(group, [{ dish: hummus, quantity: 1 }]);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: true });
    await guestWithCart(api, group, 'Taras', [{ dish: bruschetta, quantity: 1 }, { dish: hummus, quantity: 2 }], { submit: true });

    const res = await groupApi.submit(customer.api, group.groupId, group.reservation.id);
    expect(res.status, errorText(res.body)).toBe(200);
    expect([...res.body].sort((a, b) => a.dishId.localeCompare(b.dishId))).toEqual(
      [
        { dishId: bruschetta.id, quantity: 3 },
        { dishId: hummus.id, quantity: 2 },
      ].sort((a, b) => a.dishId.localeCompare(b.dishId)),
    );
  });

  test('the waiter sees the order exactly as the Owner submitted it', { tag: '@ui' }, async ({ page, api, customer, privateTables, privateLocation }) => {
    const [bruschetta, hummus, khinkali] = seededDishes();
    const group = await createGroup(customer, await privateTables.create(3), 3);
    await ownerPreOrder(group, [{ dish: khinkali, quantity: 1 }]);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: true });
    await guestWithCart(api, group, 'Max', [{ dish: hummus, quantity: 4 }], { submit: false });
    const submitted = await groupApi.submit(customer.api, group.groupId, group.reservation.id);
    expect(submitted.status, errorText(submitted.body)).toBe(200);

    const waiter = await signIn(api, privateLocation.waiter);
    await signInBrowser(page, waiter);
    const reservations = new WaiterReservationsPage(page);
    await reservations.open();
    await reservations.openPreOrder(`${customer.user.firstName} ${customer.user.lastName}`);
    expect(await new WaiterPreOrderPage(page).quantities()).toEqual({
      [khinkali.name]: 1,
      [bruschetta.name]: 2,
    });
  });

  test('cannot submit while no guest has submitted a cart', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(3), 3);
    await ownerPreOrder(group, [{ dish: bruschetta, quantity: 1 }]);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: false });

    const res = await groupApi.submit(customer.api, group.groupId, group.reservation.id);
    expect(res.status).toBe(400);
    expect(errorText(res.body)).toBe('No submitted guest sessions found for this group reservation.');
    await expectGroupStillOpen(group);
  });

  test('a submitted cart always has dishes: a guest cannot submit an empty cart', { tag: '@api' }, async ({ api, customer, tables }) => {
    // The "submitted carts contain no dishes" condition cannot be reached through the API, because
    // an empty cart is rejected here. The backend guard is covered by a unit test (see README).
    const group = await createGroup(customer, await tables.create(2), 2);
    const guest = await joinGuest(api, group, 'Olena');

    const res = await guestApi.submitCart(guest.api, guest.sessionId);
    expect(res.status).toBe(400);
    expect(errorText(res.body)).toBe('The cart is empty');
  });

  test('cannot submit while the Owner has no order', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(2), 2);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 1 }], { submit: true });

    const res = await groupApi.submit(customer.api, group.groupId, group.reservation.id);
    expect(res.status).toBe(400);
    expect(errorText(res.body)).toBe(`Order for reservation '${group.reservation.id}' not found.`);
    await expectGroupStillOpen(group);
  });

  test('cannot submit for a reservation or a group that does not exist', { tag: '@api' }, async ({ customer, tables }) => {
    const group = await createGroup(customer, await tables.create(2), 2);
    const noReservation = await groupApi.submit(customer.api, group.groupId, randomUUID());
    expect(noReservation.status).toBe(404);
    // The backend's ReservationNotFoundException always uses this text (it ignores the id).
    expect(errorText(noReservation.body)).toBe('Reservation not found.');

    const noGroup = await groupApi.submit(customer.api, randomUUID(), group.reservation.id);
    expect(noGroup.status).toBe(404);
    expect(errorText(noGroup.body)).toBe('Group reservation was not found');
  });

  test('a group that is already submitted cannot be submitted again', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta, hummus] = seededDishes();
    const group = await createGroup(customer, await tables.create(2), 2);
    await ownerPreOrder(group, [{ dish: hummus, quantity: 1 }]);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: true });
    expect((await groupApi.submit(customer.api, group.groupId, group.reservation.id)).status).toBe(200);

    const again = await groupApi.submit(customer.api, group.groupId, group.reservation.id);
    expect(again.status).toBe(400);
    expect(again.body).toMatchObject({ errorCode: 'GroupReservationSubmitted', message: 'Group reservation was submitted.' });
    // The guests' dishes are not added a second time.
    const order = await ordersApi.byReservation(customer.api, group.reservation.id);
    expect(orderQuantities(order.body.orderItems)).toEqual({ [hummus.name]: 1, [bruschetta.name]: 2 });
  });

  test('only the Owner can submit', { tag: '@api' }, async ({ api, customer, otherCustomer, tables, testLocation }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(2), 2);
    await ownerPreOrder(group, [{ dish: bruschetta, quantity: 1 }]);
    const guest = await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 1 }], { submit: true });
    const waiter = await signIn(api, testLocation.waiter);

    for (const [who, client] of [['another customer', otherCustomer.api], ['the waiter of the location', waiter.api]] as const) {
      const res = await groupApi.submit(client, group.groupId, group.reservation.id);
      expect(res.status, who).toBe(403);
      expect(errorText(res.body), who).toBe(OWNER_ONLY);
    }
    for (const [who, client] of [['a guest of the group', guest.api], ['an anonymous user', api.anonymous()]] as const) {
      expect((await groupApi.submit(client, group.groupId, group.reservation.id)).status, who).toBe(401);
    }
    await expectGroupStillOpen(group);
  });

  test("an Owner cannot submit another reservation's group with their own reservation", { tag: '@api' }, async ({ api, customer, otherCustomer, tables }) => {
    const [bruschetta] = seededDishes();
    const mine = await createGroup(customer, await tables.create(2), 2);
    await ownerPreOrder(mine, [{ dish: bruschetta, quantity: 1 }]);
    const theirs = await createGroup(otherCustomer, await tables.create(2), 2);
    await guestWithCart(api, theirs, 'Olena', [{ dish: bruschetta, quantity: 3 }], { submit: true });

    const res = await groupApi.submit(customer.api, theirs.groupId, mine.reservation.id);
    expect(res.status).toBe(400);
    expect(errorText(res.body)).toBe('Group reservation does not belong to this reservation.');
    await expectGroupStillOpen(theirs);
    const myOrder = await ordersApi.byReservation(customer.api, mine.reservation.id);
    expect(orderQuantities(myOrder.body.orderItems)).toEqual({ [bruschetta.name]: 1 });
  });
});
