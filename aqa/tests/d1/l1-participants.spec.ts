import { randomUUID } from 'node:crypto';
import { errorText } from '../../src/api/api-client';
import { groupApi } from '../../src/api/endpoints';
import { seededDishes } from '../../src/data/seeded';
import { expect, test } from '../../src/fixtures';
import { GroupOrderPage } from '../../src/pages/group.pages';
import {
  addToCart,
  cartTotal,
  createGroup,
  expectConsistentTotals,
  guestWithCart,
  joinGuest,
  participant,
  submitCart,
} from '../../src/support/group';
import { signIn, signInBrowser } from '../../src/support/sessions';

const OWNER_ONLY = 'Only the reservation owner can perform this action.';

test.describe('Direction 1 · L1 · the Owner sees the participants', { tag: ['@D1', '@D1-L1'] }, () => {
  test('the Owner sees every participant with dishes, quantities and subtotals', { tag: '@ui' }, async ({ page, api, customer, tables }) => {
    const [bruschetta, hummus, khinkali] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    const olenaCart = [{ dish: bruschetta, quantity: 2 }, { dish: khinkali, quantity: 1 }];
    const maxCart = [{ dish: hummus, quantity: 3 }];
    await guestWithCart(api, group, 'Olena', olenaCart, { submit: true });
    await guestWithCart(api, group, 'Max', maxCart, { submit: false });

    const sessions = await groupApi.sessions(customer.api, group.groupId);
    expect(sessions.status, errorText(sessions.body)).toBe(200);
    expect(sessions.body.participants.map((item) => item.name).sort()).toEqual(['Max', 'Olena']);
    expect(participant(sessions.body, 'Olena').total).toBe(cartTotal(olenaCart));
    expect(participant(sessions.body, 'Max').total).toBe(cartTotal(maxCart));
    expectConsistentTotals(sessions.body);

    await signInBrowser(page, customer);
    const screen = new GroupOrderPage(page);
    await screen.open(group.reservation.id);

    const olena = screen.card('Olena');
    await expect(olena.status).toHaveText('Submitted');
    expect(await olena.lineTexts()).toEqual([`${bruschetta.name} × 2 $15.00`, `${khinkali.name} × 1 $16.25`].sort());
    await expect(olena.subtotal).toHaveText('$31.25');

    const max = screen.card('Max');
    await expect(max.status).toHaveText('Still choosing');
    expect(await max.lineTexts()).toEqual([`${hummus.name} × 3 $33.00`]);
    await expect(max.subtotal).toHaveText('$33.00');

    // Grand Total is what goes to the restaurant: submitted carts only.
    await expect(screen.grandTotal).toHaveText('$31.25');
    await expect(screen.pendingNotice).toContainText(/1 participant hasn.t submitted their cart yet/);
  });

  test('the group total follows a guest changing their cart', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta, hummus] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    await guestWithCart(api, group, 'Olena', [{ dish: hummus, quantity: 1 }], { submit: true });
    const max = await guestWithCart(api, group, 'Max', [{ dish: bruschetta, quantity: 1 }], { submit: false });

    const before = (await groupApi.sessions(customer.api, group.groupId)).body;
    expect(before.total).toBe(11 + 7.5);

    await addToCart(max, [{ dish: bruschetta, quantity: 2 }]);

    const after = (await groupApi.sessions(customer.api, group.groupId)).body;
    expect(participant(after, 'Max').items).toEqual([expect.objectContaining({ quantity: 3 })]);
    expect(participant(after, 'Max').total).toBe(22.5);
    expect(after.total).toBe(11 + 22.5);
    expectConsistentTotals(after);
  });

  test('a guest who has not submitted and a guest without dishes are both listed', { tag: '@ui' }, async ({ page, api, customer, tables }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 1 }], { submit: false });
    await joinGuest(api, group, 'Ira');

    const sessions = (await groupApi.sessions(customer.api, group.groupId)).body;
    expect(participant(sessions, 'Olena')).toMatchObject({ isSubmitted: false, total: 7.5 });
    expect(participant(sessions, 'Ira')).toMatchObject({ isSubmitted: false, items: [], total: 0 });

    await signInBrowser(page, customer);
    const screen = new GroupOrderPage(page);
    await screen.open(group.reservation.id);
    await expect(screen.card('Olena').status).toHaveText('Still choosing');
    await expect(screen.card('Ira').noDishes).toBeVisible();
    await expect(screen.card('Ira').subtotal).toHaveText('$0.00');
    await expect(screen.pendingNotice).toContainText(/2 participants haven.t submitted/);
    // Nothing is submitted, so nothing can be sent yet.
    await expect(screen.grandTotal).toHaveText('$0.00');
    await expect(screen.submitButton).toBeDisabled();
  });

  test('a group nobody has joined has no participants and a zero total', { tag: '@ui' }, async ({ page, customer, tables }) => {
    const group = await createGroup(customer, await tables.create(2), 2);

    const sessions = await groupApi.sessions(customer.api, group.groupId);
    expect(sessions.status).toBe(200);
    expect(sessions.body).toEqual({ participants: [], total: 0 });

    await signInBrowser(page, customer);
    const screen = new GroupOrderPage(page);
    await screen.open(group.reservation.id);
    await expect(screen.statusBadge).toHaveText('Collecting pre-orders');
    await expect(screen.emptyState).toBeVisible();
    await expect(screen.submitButton).toBeDisabled();
  });

  test('only the Owner of the group can see the participants', { tag: '@api' }, async ({ api, customer, otherCustomer, tables, testLocation }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    const guest = await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 1 }], { submit: true });
    const waiter = await signIn(api, testLocation.waiter);

    for (const [who, client] of [['another customer', otherCustomer.api], ['the waiter of the location', waiter.api]] as const) {
      const res = await groupApi.sessions(client, group.groupId);
      expect(res.status, who).toBe(403);
      expect(errorText(res.body), who).toBe(OWNER_ONLY);
    }
    for (const [who, client] of [['a guest of the group', guest.api], ['an anonymous user', api.anonymous()]] as const) {
      expect((await groupApi.sessions(client, group.groupId)).status, who).toBe(401);
    }
  });

  test('a group that does not exist is reported as not found', { tag: '@api' }, async ({ customer }) => {
    const res = await groupApi.sessions(customer.api, randomUUID());
    expect(res.status).toBe(404);
    expect(errorText(res.body)).toBe('Group reservation was not found');
  });

  test('the Owner session id is stable and points to the group', { tag: '@api' }, async ({ api, customer, otherCustomer, tables }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(3), 3);
    const guest = await joinGuest(api, group, 'Olena');
    await addToCart(guest, [{ dish: bruschetta, quantity: 1 }]);
    await submitCart(guest);

    const again = await groupApi.ownerSession(customer.api, group.reservation.id);
    expect(again.body).toEqual({ guestSessionId: group.ownerSessionId, groupReservationId: group.groupId });
    // The Owner's session is not one of the listed participants.
    const sessions = (await groupApi.sessions(customer.api, group.groupId)).body;
    expect(sessions.participants.map((item) => item.id)).not.toContain(group.ownerSessionId);

    const foreign = await groupApi.ownerSession(otherCustomer.api, group.reservation.id);
    expect(foreign.status).toBe(403);
  });
});
