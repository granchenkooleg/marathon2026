import { expect, type Page } from '@playwright/test';
import { ApiClient, errorText } from '../api/api-client';
import { authApi } from '../api/endpoints';
import type { Me } from '../api/models';
import { newUser, type UserData } from '../data/test-data';

/** A registered, signed-in user plus an API client that carries their token. */
export interface Session {
  user: UserData;
  idToken: string;
  accessToken: string;
  me: Me;
  api: ApiClient;
}

export async function registerUser(api: ApiClient, user: UserData): Promise<void> {
  const res = await authApi.register(api, { ...user, confirmPassword: user.password });
  expect(res.status, `register ${user.email}: ${errorText(res.body)}`).toBe(200);
}

export async function signIn(api: ApiClient, user: UserData): Promise<Session> {
  const res = await authApi.signIn(api, user.email, user.password);
  expect(res.status, `sign in ${user.email}: ${errorText(res.body)}`).toBe(200);
  const authed = api.withToken(res.body.idToken);
  const me = await authApi.me(authed);
  expect(me.status, `GET /me for ${user.email}`).toBe(200);
  return { user, idToken: res.body.idToken, accessToken: res.body.accessToken, me: me.body, api: authed };
}

export async function registerAndSignIn(api: ApiClient, user: UserData = newUser()): Promise<Session> {
  await registerUser(api, user);
  return signIn(api, user);
}

/**
 * Puts the session into the browser the same way the app does after a UI login
 * (localStorage `auth` + `user`). Used when login itself is not what the test checks.
 */
export async function signInBrowser(page: Page, session: Session): Promise<void> {
  await page.context().addInitScript(
    ([auth, user]) => {
      window.localStorage.setItem('auth', auth);
      window.localStorage.setItem('user', user);
    },
    [JSON.stringify({ idToken: session.idToken, accessToken: session.accessToken }), JSON.stringify(session.me)],
  );
}
