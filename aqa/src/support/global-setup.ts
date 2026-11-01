import { request, type FullConfig } from '@playwright/test';
import { ApiClient, errorText } from '../api/api-client';
import { dishesApi, locationsApi } from '../api/endpoints';
import type { DishType } from '../api/models';
import { env } from '../config/env';
import { dishNamePrefix, locationAddressPrefix, runIdToDate } from '../data/test-data';
import { registerAndSignIn } from './sessions';

/** Leftovers of crashed/cancelled runs older than this are removed at the start of the next run. */
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/** Menu fixture data: two dishes per category with distinct prices, so filters and sorts are meaningful. */
const MENU_DISHES: { suffix: string; dishType: DishType; price: number }[] = [
  { suffix: 'Herb Bruschetta', dishType: 'Appetizer', price: 7.5 },
  { suffix: 'Beet Hummus', dishType: 'Appetizer', price: 11 },
  { suffix: 'Mushroom Khinkali', dishType: 'MainCourse', price: 16.25 },
  { suffix: 'Lentil Stew', dishType: 'MainCourse', price: 13 },
  { suffix: 'Walnut Churchkhela', dishType: 'Dessert', price: 6 },
  { suffix: 'Plum Sorbet', dishType: 'Dessert', price: 9.75 },
];

function isStale(name: string, prefix: string): boolean {
  if (!name.startsWith(prefix)) return false;
  const id = name.slice(prefix.length).split(' ')[0] ?? '';
  const created = runIdToDate(id);
  return created !== null && Date.now() - created.getTime() > STALE_AFTER_MS;
}

export default async function globalSetup(_config: FullConfig): Promise<() => Promise<void>> {
  const context = await request.newContext();
  const api = new ApiClient(context, env.apiUrl);
  const maintenance = await registerAndSignIn(api);

  // 1. Sweep leftovers of earlier runs that never reached their teardown.
  const locations = await locationsApi.list(api);
  for (const location of locations.status === 200 ? locations.body : []) {
    if (isStale(location.address, locationAddressPrefix())) {
      await locationsApi.removeWithChildren(maintenance.api, location.id);
    }
  }
  const dishPrefix = `${env.dataPrefix.toUpperCase()} `;
  const dishes = await dishesApi.list(api);
  for (const dish of dishes.status === 200 ? dishes.body : []) {
    if (isStale(dish.name, dishPrefix)) await dishesApi.remove(maintenance.api, dish.id);
  }

  // 2. Seed this run's menu dishes.
  const seeded: { id: string; name: string; dishType: DishType; price: number }[] = [];
  for (const dish of MENU_DISHES) {
    const name = `${dishNamePrefix()} ${dish.suffix}`;
    const res = await dishesApi.create(api, {
      name,
      description: `${dish.suffix} — seeded by the e2e run and removed afterwards.`,
      dishType: dish.dishType,
      price: dish.price,
      weight: '200g',
      calories: '250',
      proteins: '8g',
      fats: '9g',
      carbohydrates: '30g',
      vitamins: 'A, C',
      imageBase64: null,
      state: 'Available',
      locationIds: [],
    });
    if (res.status !== 201) throw new Error(`Seeding dish "${name}" failed: HTTP ${res.status} ${errorText(res.body)}`);
    seeded.push({ id: res.body.id, name, dishType: dish.dishType, price: dish.price });
  }
  // Workers inherit the runner's environment, so this is how tests see the seeded data.
  process.env.AQA_SEEDED_DISHES = JSON.stringify(seeded);

  return async () => {
    for (const dish of seeded) {
      const res = await dishesApi.remove(maintenance.api, dish.id);
      if (res.status !== 200) console.warn(`[cleanup] dish ${dish.id} not removed: HTTP ${res.status}`);
    }
    await context.dispose();
  };
}
