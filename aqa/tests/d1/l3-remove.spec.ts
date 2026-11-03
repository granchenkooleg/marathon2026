import { randomUUID } from 'node:crypto';
import { errorText } from '../../src/api/api-client';
import { groupApi } from '../../src/api/endpoints';
import { seededDishes } from '../../src/data/seeded';
import { expect, test } from '../../src/fixtures';
import { GroupOrderPage } from '../../src/pages/group.pages';
import { createGroup, expectConsistentTotals, guestWithCart, joinGuest } from '../../src/support/group';
import { signIn, signInBrowser } from '../../src/support/sessions';

const OWNER_ONLY = 'Only the reservation owner can perform this action.';

test.describe('Direction 1 · L3 · the Owner removes a participant', { tag: ['@D1', '@D1-L3'] }, () => {
  test('removing one of several guests updates the list and the totals', { tag: '@ui' }, async ({ page, api, customer, tables }) => {
    const [bruschetta, hummus, , stew] = seededDishes();
    const group = await createGroup(customer, await tables.create(4), 4);
    await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: true });
    await guestWithCart(api, group, 'Max', [{ dish: hummus, quantity: 1 }], { submit: true });
    await guestWithCart(api, group, 'Ira', [{ dish: stew, quantity: 1 }], { submit: false });

    await signInBrowser(page, customer);
    const screen = new GroupOrderPage(page);
    await screen.open(group.reservation.id);
    await expect(screen.grandTotal).toHaveText('$26.00');

    await screen.removeGuest('Max');
    await expect(screen.toasts.withText('Max was removed from the reservation')).toBeVisible();
    await expect(screen.card('Max').root).toHaveCount(0);
    await expect(screen.card('Olena').root).toBeVisible();
    await expect(screen.card('Ira').root).toBeVisible();
    expect(await screen.consolidated()).toEqual([`${bruschetta.name} × 2`]);
    await expect(screen.grandTotal).toHaveText('$15.00');

    const sessions = (await groupApi.sessions(customer.api, group.groupId)).body;
    expect(sessions.participants.map((item) => item.name).sort()).toEqual(['Ira', 'Olena']);
    expect(sessions.total).toBe(15 + 13);
    expectConsistentTotals(sessions);
  });

  test('a guest who already submitted can be removed; the response is the updated group', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta, hummus] = seededDishes();
    const group = await createGroup(customer, await tables.create(3), 3);
    const olena = await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 2 }], { submit: true });
    await guestWithCart(api, group, 'Max', [{ dish: hummus, quantity: 1 }], { submit: false });

    const res = await groupApi.removeParticipant(customer.api, group.groupId, olena.sessionId);
    expect(res.status, errorText(res.body)).toBe(200);
    expect(res.body.participants.map((item) => item.name)).toEqual(['Max']);
    expect(res.body.total).toBe(11);
    expect((await groupApi.sessions(customer.api, group.groupId)).body).toEqual(res.body);
  });

  test('removing the last guest leaves an empty group', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(2), 2);
    const olena = await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 1 }], { submit: true });

    const res = await groupApi.removeParticipant(customer.api, group.groupId, olena.sessionId);
    expect(res.status, errorText(res.body)).toBe(200);
    expect(res.body).toEqual({ participants: [], total: 0 });
  });

  test('a guest of another group cannot be removed through this group', { tag: '@api' }, async ({ api, customer, tables }) => {
    const [bruschetta] = seededDishes();
    const groupA = await createGroup(customer, await tables.create(2), 2);
    const groupB = await createGroup(customer, await tables.create(2), 2);
    await joinGuest(api, groupA, 'Olena');
    const max = await guestWithCart(api, groupB, 'Max', [{ dish: bruschetta, quantity: 1 }], { submit: true });

    const res = await groupApi.removeParticipant(customer.api, groupA.groupId, max.sessionId);
    expect(res.status).toBe(400);
    expect(errorText(res.body)).toBe('Guest session does not belong to this group reservation.');
    expect((await groupApi.sessions(customer.api, groupB.groupId)).body.participants.map((item) => item.name)).toEqual(['Max']);
    expect((await groupApi.sessions(customer.api, groupA.groupId)).body.participants.map((item) => item.name)).toEqual(['Olena']);
  });

  test('a guest who does not exist is reported as not found', { tag: '@api' }, async ({ customer, tables }) => {
    const group = await createGroup(customer, await tables.create(2), 2);
    const missing = randomUUID();

    const res = await groupApi.removeParticipant(customer.api, group.groupId, missing);
    expect(res.status).toBe(404);
    expect(errorText(res.body)).toBe(`Guest session with id ${missing} not found.`);
  });

  test('only the Owner can remove a guest', { tag: '@api' }, async ({ api, customer, otherCustomer, tables, testLocation }) => {
    const [bruschetta] = seededDishes();
    const group = await createGroup(customer, await tables.create(3), 3);
    const olena = await guestWithCart(api, group, 'Olena', [{ dish: bruschetta, quantity: 1 }], { submit: true });
    const max = await joinGuest(api, group, 'Max');
    const waiter = await signIn(api, testLocation.waiter);

    for (const [who, client] of [['another customer', otherCustomer.api], ['the waiter of the location', waiter.api]] as const) {
      const res = await groupApi.removeParticipant(client, group.groupId, olena.sessionId);
      expect(res.status, who).toBe(403);
      expect(errorText(res.body), who).toBe(OWNER_ONLY);
    }
    for (const [who, client] of [['another guest of the group', max.api], ['an anonymous user', api.anonymous()]] as const) {
      expect((await groupApi.removeParticipant(client, group.groupId, olena.sessionId)).status, who).toBe(401);
    }
    const names = (await groupApi.sessions(customer.api, group.groupId)).body.participants.map((item) => item.name);
    expect(names.sort()).toEqual(['Max', 'Olena']);
  });
});
