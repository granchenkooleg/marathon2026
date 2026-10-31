import type { Locator, Page, Response } from '@playwright/test';
import type { Dish, DishSort, DishType } from '../api/models';
import { Header, Toasts } from './components';

export const CATEGORY_LABEL: Record<DishType, string> = {
  Appetizer: 'Appetizers',
  MainCourse: 'Main Courses',
  Dessert: 'Desserts',
};

function isDishListResponse(response: Response): boolean {
  const url = new URL(response.url());
  return response.request().method() === 'GET' && /\/dishes$/.test(url.pathname);
}

/** /menu — category buttons, sort dropdown, dish cards, dish details modal. */
export class MenuPage {
  readonly header: Header;
  readonly sort: Locator;
  readonly cards: Locator;
  readonly cardNames: Locator;
  readonly cardPrices: Locator;
  readonly dishModal: Locator;
  readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.sort = page.getByRole('combobox', { name: 'Sort by:' });
    this.cards = page.locator('.dish-cards app-dish-card');
    this.cardNames = this.cards.locator('.dish-name');
    this.cardPrices = this.cards.locator('.dish-price');
    this.dishModal = page.locator('app-dish-modal .modal-content');
    this.searchBox = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
  }

  categoryButton(type: DishType): Locator {
    return this.page.getByRole('button', { name: CATEGORY_LABEL[type], exact: true });
  }

  /** Each action returns the dish list the page received, so tests can compare UI with data. */
  private async loadAfter(action: () => Promise<unknown>): Promise<Dish[]> {
    const [response] = await Promise.all([this.page.waitForResponse(isDishListResponse), action()]);
    return (await response.json()) as Dish[];
  }

  async open(query = ''): Promise<Dish[]> {
    return this.loadAfter(() => this.page.goto(`/menu${query}`));
  }

  async toggleCategory(type: DishType): Promise<Dish[]> {
    return this.loadAfter(() => this.categoryButton(type).click());
  }

  async sortBy(sort: DishSort): Promise<Dish[]> {
    return this.loadAfter(() => this.sort.selectOption(sort));
  }

  async shownPrices(): Promise<number[]> {
    return (await this.cardPrices.allInnerTexts()).map((text) => Number(text.replace(/[^0-9.]/g, '')));
  }

  async openDish(name: string): Promise<void> {
    await this.cards.filter({ has: this.page.locator('.dish-name', { hasText: name }) }).first().click();
    await this.dishModal.waitFor();
  }
}

/** /main — "Most Popular Dishes" and "Locations". */
export class MainPage {
  readonly header: Header;
  readonly popularDishes: Locator;
  readonly locationCards: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.popularDishes = page.locator('.popular-dishes-section a.dish-card');
    this.locationCards = page.locator('.locations-section app-location-card');
  }

  async open(): Promise<void> {
    await this.page.goto('/main');
  }

  locationCard(address: string): Locator {
    return this.page.locator('.locations-section').getByRole('link', { name: new RegExp(escapeRegExp(address)) });
  }
}

/** /locations/:id */
export class LocationPage {
  readonly address: Locator;
  readonly toasts: Toasts;

  constructor(private readonly page: Page) {
    this.address = page.locator('.restaurant-address');
    this.toasts = new Toasts(page);
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/locations/${encodeURIComponent(id)}`);
  }
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
