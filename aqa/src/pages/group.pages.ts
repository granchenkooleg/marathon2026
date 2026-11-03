import type { Locator, Page } from '@playwright/test';
import { Toasts } from './components';

/** One participant card on the Owner screen (components/group-orders/participant-card). */
export class ParticipantCard {
  readonly status: Locator;
  readonly lines: Locator;
  readonly noDishes: Locator;
  readonly subtotal: Locator;
  readonly removeButton: Locator;

  constructor(readonly root: Locator) {
    this.status = root.locator('.chip');
    this.lines = root.locator('.item');
    this.noDishes = root.getByText('No dishes yet');
    this.subtotal = root.locator('.subtotal span').last();
    this.removeButton = root.getByRole('button', { name: /^Remove / });
  }

  /** "Herb Bruschetta × 2 $15.00" per dish line, sorted (the avatar letter is left out). */
  async lineTexts(): Promise<string[]> {
    const texts: string[] = [];
    for (const line of await this.lines.all()) {
      const parts = await Promise.all(['.name', '.qty', '.price'].map((css) => line.locator(css).innerText()));
      texts.push(parts.map((part) => part.trim()).join(' '));
    }
    return texts.sort();
  }
}

/** /reservations/:reservationId/group-order — the Owner screen of the group pre-order. */
export class GroupOrderPage {
  readonly toasts: Toasts;
  readonly statusBadge: Locator;
  readonly cards: Locator;
  readonly consolidatedRows: Locator;
  readonly grandTotal: Locator;
  readonly pendingNotice: Locator;
  readonly emptyState: Locator;
  readonly refreshButton: Locator;
  readonly submitButton: Locator;
  readonly sentButton: Locator;
  readonly submitDialog: Locator;
  readonly removeDialog: Locator;
  readonly loadError: Locator;

  constructor(private readonly page: Page) {
    this.toasts = new Toasts(page);
    this.statusBadge = page.locator('.page-header .badge');
    this.cards = page.locator('app-participant-card article');
    this.consolidatedRows = page.locator('.consolidated-row');
    this.grandTotal = page.locator('.grand-total-value');
    this.pendingNotice = page.locator('.notice');
    this.emptyState = page.getByText('Participants haven’t added any dishes yet');
    this.refreshButton = page.getByRole('button', { name: 'Refresh' });
    this.submitButton = page.getByRole('button', { name: 'Submit Pre-Order' });
    this.sentButton = page.getByRole('button', { name: 'Pre-Order Sent' });
    this.submitDialog = page.getByRole('dialog', { name: 'Submit Pre-Order' });
    this.removeDialog = page.getByRole('dialog', { name: 'Remove Guest' });
    this.loadError = page.getByRole('heading', { name: 'Couldn’t load the group pre-order' });
  }

  async open(reservationId: string): Promise<void> {
    await this.page.goto(`/reservations/${reservationId}/group-order`);
    await this.statusBadge.waitFor();
  }

  card(guestName: string): ParticipantCard {
    return new ParticipantCard(
      this.cards.filter({ has: this.page.getByRole('heading', { name: `Guest: ${guestName}`, exact: true }) }),
    );
  }

  /** "Herb Bruschetta × 3" per consolidated dish, sorted. */
  async consolidated(): Promise<string[]> {
    const names = await this.consolidatedRows.locator('span:first-child').allInnerTexts();
    return names.map((text) => text.replace(/\s+/g, ' ').trim()).sort();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.submitDialog.getByRole('button', { name: 'Submit', exact: true }).click();
  }

  async removeGuest(guestName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Remove ${guestName}` }).click();
    await this.removeDialog.getByRole('button', { name: 'Remove Guest' }).click();
  }
}

/** /waiter-reservations — the waiter's list of reservations at their location. */
export class WaiterReservationsPage {
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.cards = page.getByRole('listitem').filter({ hasText: 'Pre-order:' });
  }

  async open(): Promise<void> {
    await this.page.goto('/waiter-reservations');
    await this.page.getByRole('heading', { name: /^Hello,/ }).waitFor();
  }

  card(customerName: string): Locator {
    return this.cards.filter({ hasText: `Customer ${customerName}` });
  }

  async openPreOrder(customerName: string): Promise<void> {
    await this.card(customerName).getByRole('button', { name: 'Pre-order' }).click();
    await this.page.waitForURL('**/waiter-pre-order**');
  }
}

/** /waiter-pre-order — dishes of one reservation's order as the waiter sees them. */
export class WaiterPreOrderPage {
  readonly title: Locator;
  readonly dishes: Locator;

  constructor(page: Page) {
    this.title = page.getByRole('heading', { name: /^Pre-order of / });
    this.dishes = page.locator('.pre-order-dish');
  }

  /** { dish name → quantity } as shown to the waiter. */
  async quantities(): Promise<Record<string, number>> {
    await this.title.waitFor();
    // The order loads after the title: wait for the first dish card.
    await this.dishes.first().waitFor();
    const result: Record<string, number> = {};
    for (const dish of await this.dishes.all()) {
      const name = (await dish.locator('.dish-name').innerText()).trim();
      const quantity = Number((await dish.locator('.pre-order-quantity').innerText()).replace(/\D+/g, ''));
      result[name] = quantity;
    }
    return result;
  }
}
