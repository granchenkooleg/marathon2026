import { expect, type Locator, type Page } from '@playwright/test';

/** Top navigation bar shown on every main-layout page. */
export class Header {
  readonly root: Locator;
  readonly signInLink: Locator;
  readonly reservationsLink: Locator;
  readonly bookTableLink: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('banner');
    this.signInLink = this.root.getByRole('link', { name: 'Sign In' });
    this.reservationsLink = this.root.getByRole('link', { name: 'Reservations' });
    this.bookTableLink = this.root.getByRole('link', { name: 'Book a Table' });
  }
}

/** App toast notifications (services/toast). */
export class Toasts {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('app-toast');
  }

  withText(text: string | RegExp): Locator {
    return this.root.getByText(text);
  }
}

/**
 * The app's custom dropdown (shared/custom-components/custom-select): a role=button showing the
 * placeholder or current value, which opens a role=listbox of role=option items.
 */
export class CustomSelect {
  constructor(
    private readonly page: Page,
    readonly trigger: Locator,
  ) {}

  async choose(option: string): Promise<void> {
    await this.trigger.click();
    await this.page.getByRole('listbox').getByRole('option', { name: option, exact: true }).click();
  }

  async options(): Promise<string[]> {
    await this.trigger.click();
    await this.page.getByRole('listbox').waitFor();
    const texts = await this.page.getByRole('listbox').getByRole('option').allInnerTexts();
    await this.trigger.click();
    return texts.map((text) => text.trim());
  }
}

/** The +/- counter (shared/custom-components/custom-number). */
export class Counter {
  readonly increase: Locator;
  readonly decrease: Locator;
  readonly value: Locator;

  constructor(root: Locator) {
    this.increase = root.getByRole('button', { name: 'Increase value' });
    this.decrease = root.getByRole('button', { name: 'Decrease value' });
    this.value = root.locator('.value');
  }

  async current(): Promise<number> {
    return Number((await this.value.innerText()).trim());
  }

  /** Clicks +/- one step at a time, waiting for the page to show each new value before the next click. */
  async set(target: number): Promise<void> {
    for (let guard = 0; guard < 20; guard++) {
      const now = await this.current();
      if (now === target) return;
      const next = now < target ? now + 1 : now - 1;
      await (now < target ? this.increase : this.decrease).click();
      await expect(this.value).toHaveText(String(next));
    }
    throw new Error(`Counter did not reach ${target}`);
  }
}
