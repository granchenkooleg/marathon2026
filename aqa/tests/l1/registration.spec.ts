import type { Page } from '@playwright/test';
import { errorText, type ApiClient } from '../../src/api/api-client';
import { authApi } from '../../src/api/endpoints';
import { emailOfLength, nameOfLength, newUser, passwordOfLength, type UserData } from '../../src/data/test-data';
import { expect, test } from '../../src/fixtures';
import { LoginModal, SignUpPage } from '../../src/pages/auth.pages';
import { ReservationsPage } from '../../src/pages/booking.pages';
import { knownDefect } from '../../src/support/defects';
import { registerUser } from '../../src/support/sessions';

/**
 * Rules under test (homework L1): names 2–50 chars, Latin letters / hyphen / apostrophe;
 * email valid format, ≤ 254 chars; password 8–16 chars; confirmation must match;
 * registration always creates a Customer; invalid data blocks registration and explains why.
 *
 * "blockedBy" records WHERE the app stops invalid input today: in the browser (button disabled +
 * inline message) or on the server (message returned by the API and shown above the form).
 */
type BlockedBy = 'browser' | 'server';

test.describe('Registration', { tag: ['@L1', '@ui'] }, () => {
  test('a new user registers, signs in and gets the Customer role', { tag: '@smoke' }, async ({ page, api }) => {
    const user = newUser();
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(user);
    await signUp.submit.click();

    // The app sends the new user to the sign-in modal.
    await expect(page).toHaveURL(/\/login$/);
    const login = new LoginModal(page);
    await login.signIn(user.email, user.password);
    await expect(login.header.reservationsLink).toBeVisible();
    await expect(login.header.signInLink).toBeHidden();

    // Role is shown on "my reservations" and confirmed by the API.
    const reservations = new ReservationsPage(page);
    await reservations.open();
    await expect(reservations.greeting).toHaveText(`Hello, ${user.firstName} ${user.lastName} (Customer)`);
    const signIn = await authApi.signIn(api, user.email, user.password);
    const me = await authApi.me(api.withToken(signIn.body.idToken));
    expect(me.body.role).toBe('Customer');
  });

  async function expectRegistered(page: Page, api: ApiClient, user: UserData) {
    await expect(page, 'registration should complete and open sign-in').toHaveURL(/\/login$/);
    const signIn = await authApi.signIn(api, user.email, user.password);
    expect(signIn.status, `user ${user.email} should exist: ${errorText(signIn.body)}`).toBe(200);
  }

  async function expectRejected(
    page: Page,
    signUp: SignUpPage,
    api: ApiClient,
    user: UserData,
    blockedBy: BlockedBy,
    message: RegExp,
  ) {
    if (blockedBy === 'browser') {
      await expect(signUp.submit, 'invalid form must not be submittable').toBeDisabled();
      await expect(page.getByText(message)).toBeVisible();
    } else {
      await signUp.submit.click();
      await expect(signUp.serverError).toHaveText(message);
    }
    await expect(page).toHaveURL(/\/signup$/);
    const signIn = await authApi.signIn(api, user.email, user.password);
    // Sign-in must fail. (401 for a wrong password; an unknown email currently gives 500 — defect D9.)
    expect(signIn.status, 'rejected registration must not create the user').not.toBe(200);
  }

  const NAME_BOUNDARIES = [
    { length: 1, valid: false, blockedBy: 'server' as const },
    { length: 2, valid: true },
    { length: 50, valid: true },
    { length: 51, valid: false, blockedBy: 'browser' as const },
  ];

  for (const field of ['firstName', 'lastName'] as const) {
    const label = field === 'firstName' ? 'First name' : 'Last name';
    for (const c of NAME_BOUNDARIES) {
      test(`${label} of ${c.length} chars is ${c.valid ? 'accepted' : 'rejected'}`, async ({ page, api }) => {
        const user = newUser({ [field]: nameOfLength(c.length) });
        const signUp = new SignUpPage(page);
        await signUp.open();
        await signUp.fill(user);
        if (c.valid) {
          await signUp.submit.click();
          await expectRegistered(page, api, user);
        } else {
          // Any explanation is accepted here; the exact wording per field is checked separately.
          await expectRejected(page, signUp, api, user, c.blockedBy!, /must be (between 2 and 50|up to 50) characters/);
        }
      });
    }
  }

  test('First name over 50 chars shows a message about the first name', async ({ page }) => {
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(newUser({ firstName: nameOfLength(51) }));
    await expect(signUp.fieldError('firstName')).toHaveText('First name must be up to 50 characters.');
  });

  test('Last name over 50 chars shows a message about the last name', { tag: '@known-defect' }, async ({ page }) => {
    knownDefect('D3');
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(newUser({ lastName: nameOfLength(51) }));
    await expect(signUp.fieldError('lastName')).toHaveText('Last name must be up to 50 characters.');
  });

  test('names with a hyphen and an apostrophe are accepted', async ({ page, api }) => {
    const user = newUser({ firstName: 'Mary-Jane', lastName: "O'Neil" });
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(user);
    await signUp.submit.click();
    await expectRegistered(page, api, user);
  });

  for (const [field, value] of [
    ['firstName', 'Олег'],
    ['lastName', 'Smith2'],
    ['firstName', 'Anna Maria'],
  ] as const) {
    test(`${field} "${value}" with non-Latin letters, digits or spaces is rejected`, async ({ page, api }) => {
      const user = newUser({ [field]: value });
      const signUp = new SignUpPage(page);
      await signUp.open();
      await signUp.fill(user);
      await expectRejected(page, signUp, api, user, 'browser', /Only Latin letters, hyphens, and apostrophes are allowed/);
    });
  }

  for (const email of ['user@domain', 'userdomain.com', 'user@@domain.com']) {
    test(`email "${email}" with a wrong format is rejected`, async ({ page, api }) => {
      const user = newUser({ email });
      const signUp = new SignUpPage(page);
      await signUp.open();
      await signUp.fill(user);
      await expectRejected(page, signUp, api, user, 'browser', /Invalid email address/);
    });
  }

  test('email of 128 chars is accepted', async ({ page, api }) => {
    const user = newUser({ email: emailOfLength(128) });
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(user);
    await signUp.submit.click();
    await expectRegistered(page, api, user);
  });

  test('email of 254 chars (spec maximum) is accepted', { tag: '@known-defect' }, async ({ page, api }) => {
    knownDefect('D2');
    const user = newUser({ email: emailOfLength(254) });
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(user);
    await signUp.submit.click();
    await expectRegistered(page, api, user);
  });

  test('email of 255 chars is rejected', async ({ page, api }) => {
    const user = newUser({ email: emailOfLength(255) });
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill(user);
    await expectRejected(page, signUp, api, user, 'server', /cannot exceed 254 characters/);
  });

  const PASSWORD_BOUNDARIES = [
    { length: 7, valid: false },
    { length: 8, valid: true },
    { length: 16, valid: true },
    { length: 17, valid: false },
  ];
  for (const c of PASSWORD_BOUNDARIES) {
    test(`password of ${c.length} chars is ${c.valid ? 'accepted' : 'rejected'}`, async ({ page, api }) => {
      const user = newUser({ password: passwordOfLength(c.length) });
      const signUp = new SignUpPage(page);
      await signUp.open();
      await signUp.fill(user);
      const lengthRule = signUp.passwordRule('Password must be 8–16 characters long');
      if (c.valid) {
        await expect(lengthRule).toHaveClass(/\bvalid\b/);
        await signUp.submit.click();
        await expectRegistered(page, api, user);
      } else {
        await expect(lengthRule).toHaveClass(/\binvalid\b/);
        await expectRejected(page, signUp, api, user, 'browser', /Password must be 8–16 characters long/);
      }
    });
  }

  test('password confirmation that does not match is rejected', async ({ page, api }) => {
    const user = newUser();
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill({ ...user, confirmPassword: `${user.password}x` });
    await expect(signUp.passwordRule('Confirm password must match new password')).toHaveClass(/\binvalid\b/);
    await expectRejected(page, signUp, api, user, 'browser', /Confirm password must match new password/);
  });

  test('an already registered email is rejected with an explanation', async ({ page, api }) => {
    const existing = newUser();
    await registerUser(api, existing);
    const signUp = new SignUpPage(page);
    await signUp.open();
    await signUp.fill({ ...newUser({ email: existing.email }) });
    await signUp.submit.click();
    await expect(signUp.serverError).toHaveText(/already exists/i);
    await expect(page).toHaveURL(/\/signup$/);
  });
});

test.describe('Registration API', { tag: ['@L1', '@api'] }, () => {
  test('registration ignores a requested role and always creates a Customer', async ({ api }) => {
    const user = newUser();
    const res = await authApi.register(api, { ...user, confirmPassword: user.password, role: 'Waiter', 'cognito:groups': ['Admin'] });
    expect(res.status).toBe(200);
    const signIn = await authApi.signIn(api, user.email, user.password);
    const me = await authApi.me(api.withToken(signIn.body.idToken));
    expect(me.body.role).toBe('Customer');
  });

  test('a duplicate email is rejected with a client error status', { tag: '@known-defect' }, async ({ api }) => {
    knownDefect('D1');
    const user = newUser();
    await registerUser(api, user);
    const res = await authApi.register(api, { ...user, confirmPassword: user.password });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status, errorText(res.body)).toBeLessThan(500);
  });

  test('a password that breaks the character policy is rejected with 400', { tag: '@known-defect' }, async ({ api }) => {
    knownDefect('D8');
    const user = newUser({ password: 'password1' });
    const res = await authApi.register(api, { ...user, confirmPassword: user.password });
    expect(res.status, errorText(res.body)).toBe(400);
  });

  for (const [name, body, message] of [
    ['first name of 1 char', { firstName: 'A' }, /First name must be between 2 and 50/],
    ['last name of 51 chars', { lastName: nameOfLength(51) }, /Last name must be between 2 and 50/],
    ['password of 17 chars', { password: passwordOfLength(17), confirmPassword: passwordOfLength(17) }, /between 8 and 16/],
    ['mismatched confirmation', { confirmPassword: 'Other1!pass' }, /Passwords do not match/],
  ] as const) {
    test(`server rejects ${name} with 400 and a message`, async ({ api }) => {
      const user = newUser();
      const res = await authApi.register(api, { ...user, confirmPassword: user.password, ...body });
      expect(res.status).toBe(400);
      expect(errorText(res.body)).toMatch(message);
    });
  }
});
