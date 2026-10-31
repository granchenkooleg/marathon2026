import type { Locator, Page, Response } from '@playwright/test';
import { Counter, CustomSelect, Header, Toasts } from './components';

function isAvailableTablesResponse(response: Response): boolean {
  return response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/available-tables');
}

/** /tables — "Book a Table": search form, table cards with time slots, review/confirm dialogs. */
export class BookingPage {
  readonly header: Header;
  readonly toasts: Toasts;
  readonly location: CustomSelect;
  readonly date: CustomSelect;
  readonly time: CustomSelect;
  readonly guests: Counter;
  readonly findButton: Locator;
  readonly resultsSummary: Locator;
  readonly noTables: Locator;
  readonly reviewDialog: Locator;
  readonly confirmedDialog: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.toasts = new Toasts(page);
    const field = (label: string) => page.locator('.booking-card .field').filter({ hasText: label });
    this.location = new CustomSelect(page, field('Location').getByRole('button').first());
    this.date = new CustomSelect(page, field('Date').getByRole('button').first());
    this.time = new CustomSelect(page, field('Time').getByRole('button').first());
    this.guests = new Counter(field('Guests'));
    this.findButton = page.getByRole('button', { name: 'Find a Table' });
    this.resultsSummary = page.locator('.results-summary');
    this.noTables = page.getByRole('heading', { name: 'No Tables Available' });
    this.reviewDialog = page.getByRole('dialog', { name: 'Review & Confirm Reservation' });
    this.confirmedDialog = page.getByRole('dialog', { name: 'Reservation Confirmed' });
  }

  async open(): Promise<void> {
    await this.page.goto('/tables');
    await this.findButton.waitFor();
  }

  async search(criteria: { location: string; date: string; time: string; guests: number }): Promise<void> {
    await this.location.choose(criteria.location);
    await this.date.choose(criteria.date);
    await this.time.choose(criteria.time);
    await this.guests.set(criteria.guests);
    await Promise.all([this.page.waitForResponse(isAvailableTablesResponse), this.findButton.click()]);
  }

  tableCard(tableNumber: number): Locator {
    return this.page.locator('app-table-card').filter({ hasText: new RegExp(`Table ${tableNumber}(?!\\d)`) });
  }

  /** Slot labels the user can click on a table card (disabled buckets are excluded). */
  async availableSlots(tableNumber: number): Promise<string[]> {
    const slots = this.tableCard(tableNumber).locator('app-time-slot .time-slot-container:not(.disabled)');
    return (await slots.allInnerTexts()).map((text) => text.trim());
  }

  slot(tableNumber: number, label: string): Locator {
    return this.tableCard(tableNumber)
      .locator('app-time-slot .time-slot-container:not(.disabled)')
      .filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) });
  }

  /** term/definition pairs of a reservation dialog as a plain object. */
  async dialogDetails(dialog: Locator): Promise<Record<string, string>> {
    const terms = await dialog.getByRole('term').allInnerTexts();
    const definitions = await dialog.getByRole('definition').allInnerTexts();
    return Object.fromEntries(terms.map((term, i) => [term.trim(), (definitions[i] ?? '').trim()]));
  }
}

/** /reservations — the customer's "my reservations" list. */
export class ReservationsPage {
  readonly header: Header;
  readonly greeting: Locator;
  readonly cards: Locator;
  readonly editModal: EditReservationModal;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.greeting = page.getByRole('heading', { level: 3, name: /^Hello,/ });
    this.cards = page.getByRole('listitem').filter({ has: page.locator('.status-badge') });
    this.editModal = new EditReservationModal(page);
  }

  async open(): Promise<void> {
    await this.page.goto('/reservations');
    await this.greeting.waitFor();
  }

  card(text: string | RegExp): Locator {
    return this.cards.filter({ hasText: text });
  }

  status(card: Locator): Locator {
    return card.locator('.status-badge');
  }
}

/** "Edit Reservation" modal (components/tables/make-reservation). Not exposed as role=dialog by the app. */
export class EditReservationModal {
  readonly root: Locator;
  readonly guests: Counter;
  readonly from: CustomSelect;
  readonly to: CustomSelect;
  readonly submit: Locator;

  constructor(page: Page) {
    this.root = page.locator('app-make-reservation .modal-container');
    this.guests = new Counter(this.root.locator('app-custom-number'));
    const selector = (label: string) => this.root.locator('.time-selector').filter({ hasText: label }).getByRole('button').first();
    this.from = new CustomSelect(page, selector('From'));
    this.to = new CustomSelect(page, selector('To'));
    this.submit = this.root.getByRole('button', { name: 'Edit Reservation' });
  }
}
