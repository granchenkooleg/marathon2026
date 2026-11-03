import { test as base, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { ApiClient, errorText } from '../api/api-client';
import { locationsApi, reservationsApi, tablesApi, waitersApi } from '../api/endpoints';
import { ReservationStatus, type Location, type Table } from '../api/models';
import { env } from '../config/env';
import { locationAddress, newUser, type UserData } from '../data/test-data';
import { cancelReservationQuietly } from '../support/reservation-cleanup';
import { registerAndSignIn, type Session } from '../support/sessions';

export interface TestLocation {
  location: Location;
  waiterEmail: string;
  /** The waiter assigned to this location; sign in with it to see the location's orders. */
  waiter: UserData;
}

/** Creates tables inside the worker's location; each test books only its own tables. */
export class TableFactory {
  private readonly used = new Set<number>();

  constructor(
    private readonly api: ApiClient,
    private readonly locationId: string,
  ) {}

  async create(capacity: number): Promise<Table> {
    let tableNumber: number;
    do {
      tableNumber = 10_000 + Math.floor(Math.random() * 89_999);
    } while (this.used.has(tableNumber));
    this.used.add(tableNumber);

    const res = await tablesApi.create(this.api, this.locationId, capacity, tableNumber);
    expect(res.status, `create table: ${errorText(res.body)}`).toBe(201);
    return res.body;
  }
}

type WorkerFixtures = {
  workerRequest: APIRequestContext;
  workerApi: ApiClient;
  /** Signed-in helper user of this worker; used only for setup/cleanup calls that need a token. */
  workerSession: Session;
  /** A location owned by this worker, with a waiter assigned (the backend requires one to accept bookings). */
  testLocation: TestLocation;
};

async function createLocationWithWaiter(api: ApiClient, label: string): Promise<TestLocation> {
  const created = await locationsApi.create(api, locationAddress(label));
  expect(created.status, `create location: ${errorText(created.body)}`).toBe(201);
  const waiter = newUser({ firstName: 'Aqa', lastName: 'Waiter' });
  await registerAndSignIn(api, waiter);
  const assigned = await waitersApi.assign(api, waiter.email, created.body.id);
  expect(assigned.status, `assign waiter: ${errorText(assigned.body)}`).toBe(200);
  return { location: created.body, waiterEmail: waiter.email, waiter };
}

async function removeLocation(owner: Session, location: Location): Promise<string | null> {
  // Removes the location together with its tables and waiter assignment.
  const removed = await locationsApi.removeWithChildren(owner.api, location.id);
  return removed.status === 200 ? null : `location ${location.id} not removed: HTTP ${removed.status} ${errorText(removed.body)}`;
}

type TestFixtures = {
  /** Auto fixture: sends the test's tags (@L1, @ui, @known-defect …) to Report Portal as attributes. */
  reportPortalTags: void;
  /** Anonymous API client; calls go through the test's request context, so they appear in the trace. */
  api: ApiClient;
  /** Fresh customer for this test. All of their active reservations are cancelled after the test. */
  customer: Session;
  /** A second, unrelated customer (for access-control checks). Cleaned up the same way. */
  otherCustomer: Session;
  tables: TableFactory;
  /**
   * A location that belongs to this test only. UI search tests use it so the results contain just
   * their own table (shared locations collect many tables, which triggers defect D11).
   */
  privateLocation: TestLocation;
  privateTables: TableFactory;
};

async function cancelAllActive(session: Session): Promise<string[]> {
  const mine = await reservationsApi.mine(session.api);
  if (mine.status !== 200) return [`list reservations of ${session.user.email}: HTTP ${mine.status}`];
  const problems: string[] = [];
  for (const reservation of mine.body.filter((r) => r.status === ReservationStatus.Reserved)) {
    const problem = await cancelReservationQuietly(session.api, reservation.id);
    if (problem) problems.push(problem);
  }
  return problems;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerRequest: [
    async ({}, use) => {
      const context = await playwrightRequest.newContext();
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  workerApi: [async ({ workerRequest }, use) => use(new ApiClient(workerRequest, env.apiUrl)), { scope: 'worker' }],

  workerSession: [async ({ workerApi }, use) => use(await registerAndSignIn(workerApi)), { scope: 'worker' }],

  testLocation: [
    async ({ workerApi, workerSession }, use, workerInfo) => {
      const testLocation = await createLocationWithWaiter(workerApi, `W${workerInfo.workerIndex}`);
      await use(testLocation);
      const problem = await removeLocation(workerSession, testLocation.location);
      if (problem) console.warn(`[cleanup] ${problem}`);
    },
    { scope: 'worker' },
  ],

  reportPortalTags: [
    async ({}, use, testInfo) => {
      if (process.env.RP_API_KEY && testInfo.tags.length) {
        const attributes = testInfo.tags.map((tag) => ({ key: 'tag', value: tag.replace(/^@/, '') }));
        testInfo.annotations.push({ type: 'rp:addAttributes', description: JSON.stringify(attributes) });
      }
      await use();
    },
    { auto: true },
  ],

  api: async ({ request }, use) => use(new ApiClient(request, env.apiUrl)),

  customer: async ({ api }, use, testInfo) => {
    const session = await registerAndSignIn(api);
    await use(session);
    for (const problem of await cancelAllActive(session)) {
      testInfo.annotations.push({ type: 'cleanup-warning', description: problem });
    }
  },

  otherCustomer: async ({ api }, use, testInfo) => {
    const session = await registerAndSignIn(api, newUser({ firstName: 'Other', lastName: 'Customer' }));
    await use(session);
    for (const problem of await cancelAllActive(session)) {
      testInfo.annotations.push({ type: 'cleanup-warning', description: problem });
    }
  },

  tables: async ({ api, testLocation }, use) => use(new TableFactory(api, testLocation.location.id)),

  privateLocation: async ({ api, workerSession }, use, testInfo) => {
    const privateLocation = await createLocationWithWaiter(api, `T${testInfo.workerIndex}x${testInfo.testId.slice(0, 6)}`);
    await use(privateLocation);
    const problem = await removeLocation(workerSession, privateLocation.location);
    if (problem) testInfo.annotations.push({ type: 'cleanup-warning', description: problem });
  },

  privateTables: async ({ api, privateLocation }, use) => use(new TableFactory(api, privateLocation.location.id)),
});

export { expect };
