import type { Locator, Page } from '@playwright/test';
import { Header } from './components';

export interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

/** /signup — "Create an account". */
export class SignUpPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly submit: Locator;
  /** Server-side error shown above the form (e.g. "First name must be between 2 and 50 characters long."). */
  readonly serverError: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.getByRole('textbox', { name: /^First Name/ });
    this.lastName = page.getByRole('textbox', { name: /^Last Name/ });
    this.email = page.getByRole('textbox', { name: /^Email/ });
    this.password = page.getByRole('textbox', { name: 'Enter your Password' });
    this.confirmPassword = page.getByRole('textbox', { name: 'Confirm New Password' });
    this.submit = page.getByRole('button', { name: 'Create an Account' });
    this.serverError = page.locator('.response-error-message');
  }

  async open(): Promise<void> {
    await this.page.goto('/signup');
    await this.firstName.waitFor();
  }

  async fill(form: RegistrationForm): Promise<void> {
    await this.firstName.fill(form.firstName);
    await this.lastName.fill(form.lastName);
    await this.email.fill(form.email);
    await this.password.fill(form.password);
    await this.confirmPassword.fill(form.confirmPassword ?? form.password);
    // blur the last field so "touched" validation messages render
    await this.confirmPassword.blur();
  }

  /** Inline validation message under a field (label scope). */
  fieldError(field: 'firstName' | 'lastName' | 'email'): Locator {
    return this.page.locator(`label[for="${field}"] .error-message`);
  }

  /** Password requirement bullet; its CSS class is `valid` or `invalid`. */
  passwordRule(text: string | RegExp): Locator {
    return this.page.getByRole('listitem').filter({ hasText: text });
  }
}

/** Sign-in modal, opened on /login (or from the header "Sign In" link). */
export class LoginModal {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly invalidCredentials: Locator;
  readonly header: Header;

  constructor(private readonly page: Page) {
    this.email = page.getByPlaceholder('e.g. username@domain.com');
    this.password = page.getByRole('textbox', { name: /^Password/ });
    this.submit = page.getByRole('button', { name: 'Sign In', exact: true });
    this.invalidCredentials = page.getByText('Incorrect email or password. Try again or create an account.');
    this.header = new Header(page);
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
    await this.email.waitFor();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  fieldError(text: string): Locator {
    return this.page.getByText(text);
  }
}
