import { errorText } from '../../src/api/api-client';
import { authApi } from '../../src/api/endpoints';
import { newUser } from '../../src/data/test-data';
import { expect, test } from '../../src/fixtures';
import { LoginModal } from '../../src/pages/auth.pages';

test.describe('Login', { tag: ['@L1', '@ui'] }, () => {
  test('correct email and password sign the customer in', { tag: '@smoke' }, async ({ page, customer }) => {
    const login = new LoginModal(page);
    await login.open();
    await login.signIn(customer.user.email, customer.user.password);

    await expect(login.header.reservationsLink).toBeVisible();
    await expect(login.header.signInLink).toBeHidden();
    const stored = await page.evaluate(() => window.localStorage.getItem('auth'));
    expect(stored, 'tokens are stored after sign-in').toContain('idToken');
  });

  test('a wrong password is rejected with a message', async ({ page, customer }) => {
    const login = new LoginModal(page);
    await login.open();
    await login.signIn(customer.user.email, `${customer.user.password}x`);

    await expect(login.invalidCredentials).toBeVisible();
    await expect(login.header.reservationsLink).toBeHidden();
  });

  test('an unregistered email is rejected with a message', async ({ page }) => {
    const login = new LoginModal(page);
    await login.open();
    await login.signIn(newUser().email, 'Aqa1!pass');

    await expect(login.invalidCredentials).toBeVisible();
    await expect(login.header.reservationsLink).toBeHidden();
  });

  test('empty email and password cannot be submitted', async ({ page }) => {
    const login = new LoginModal(page);
    await login.open();
    await login.email.fill('x');
    await login.email.fill('');
    await login.password.fill('x');
    await login.password.fill('');

    await expect(login.submit).toBeDisabled();
    await expect(login.fieldError('Email address is required. Please enter your email to continue.')).toBeVisible();
    await expect(login.fieldError('Password is required. Please enter your password to continue.')).toBeVisible();
  });
});

test.describe('Login API', { tag: ['@L1', '@api'] }, () => {
  test('correct credentials return tokens of a Customer', async ({ api, customer }) => {
    const res = await authApi.signIn(api, customer.user.email, customer.user.password);
    expect(res.status).toBe(200);
    expect(res.body.idToken).toBeTruthy();
    const me = await authApi.me(api.withToken(res.body.idToken));
    expect(me.body).toMatchObject({ email: customer.user.email, role: 'Customer' });
  });

  test('a wrong password returns 401', async ({ api, customer }) => {
    const res = await authApi.signIn(api, customer.user.email, 'Wrong1!pass');
    expect(res.status).toBe(401);
    expect(errorText(res.body)).toBe('Invalid email or password');
  });

  test('an unregistered email returns 401', async ({ api }) => {
    // Was D9 (see README); fixed.
    const res = await authApi.signIn(api, newUser().email, 'Aqa1!pass');
    expect(res.status, errorText(res.body)).toBe(401);
  });

  test('a protected endpoint without a token returns 401', async ({ api }) => {
    const res = await authApi.me(api);
    expect(res.status).toBe(401);
  });
});
