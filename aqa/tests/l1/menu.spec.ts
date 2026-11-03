import { randomUUID } from 'node:crypto';
import { errorText } from '../../src/api/api-client';
import { dishesApi, locationsApi } from '../../src/api/endpoints';
import type { Dish, DishSort, DishType } from '../../src/api/models';
import { seededDishes } from '../../src/data/seeded';
import { expect, test } from '../../src/fixtures';
import { BookingPage } from '../../src/pages/booking.pages';
import { LocationPage, MainPage, MenuPage } from '../../src/pages/menu.pages';

const CATEGORIES: DishType[] = ['Appetizer', 'MainCourse', 'Dessert'];

/** The list endpoint returns "Main course" while create/filter use "MainCourse"; compare loosely. */
function sameType(actual: string, expected: DishType): boolean {
  return actual.replace(/\s+/g, '').toLowerCase() === expected.toLowerCase();
}

function isSorted(values: number[], direction: 'asc' | 'desc'): boolean {
  return values.every((value, i) => i === 0 || (direction === 'asc' ? values[i - 1]! <= value : values[i - 1]! >= value));
}

test.describe('Menu', { tag: ['@L1', '@ui'] }, () => {
  test('shows every dish, including the ones seeded for this run', { tag: '@smoke' }, async ({ page }) => {
    const menu = new MenuPage(page);
    const loaded = await menu.open();

    await expect(menu.cardNames).toHaveText(loaded.map((dish) => dish.name));
    for (const dish of seededDishes()) {
      await expect(menu.cardNames.filter({ hasText: dish.name })).toHaveCount(1);
    }
  });

  for (const category of CATEGORIES) {
    test(`category filter "${category}" shows only ${category} dishes`, async ({ page, api }) => {
      const menu = new MenuPage(page);
      await menu.open();
      const shown = await menu.toggleCategory(category);

      // Every dish the page received and shows belongs to the category …
      expect(shown.length).toBeGreaterThan(0);
      expect(shown.every((dish) => sameType(dish.dishType, category))).toBe(true);
      await expect(menu.cardNames).toHaveText(shown.map((dish) => dish.name));
      await expect(menu.categoryButton(category)).toHaveClass(/active/);
      // … it matches the API, contains this category's seeded dishes and none of the others.
      const fromApi = await dishesApi.list(api, { dishType: category });
      expect(new Set(shown.map((d) => d.id))).toEqual(new Set(fromApi.body.map((d) => d.id)));
      for (const dish of seededDishes()) {
        await expect(menu.cardNames.filter({ hasText: dish.name })).toHaveCount(dish.dishType === category ? 1 : 0);
      }

      // Clicking the active category again removes the filter.
      const all = await menu.toggleCategory(category);
      await expect(menu.cardNames).toHaveCount(all.length);
      expect(all.length).toBeGreaterThan(shown.length);
    });
  }

  for (const [sort, direction] of [
    ['PriceAscending', 'asc'],
    ['PriceDescending', 'desc'],
  ] as const) {
    test(`sort by price ${direction} orders all dishes by price`, async ({ page }) => {
      const menu = new MenuPage(page);
      const all = await menu.open();
      const sorted = await menu.sortBy(sort);

      await expect(menu.cardNames).toHaveText(sorted.map((dish) => dish.name));
      const prices = await menu.shownPrices();
      expect(prices).toHaveLength(all.length);
      expect(isSorted(prices, direction), `prices ${prices.join(', ')} should be ${direction}`).toBe(true);
    });
  }

  for (const sort of ['PopularityAscending', 'PopularityDescending'] as DishSort[]) {
    // Popularity = number of orders containing the dish; the order table is not readable through the API,
    // so the backend ranking is the oracle: the page must show exactly that ranking.
    test(`sort by ${sort} shows the backend popularity ranking`, async ({ page, api }) => {
      const menu = new MenuPage(page);
      await menu.open('?sort=PriceAscending');
      const shown = await menu.sortBy(sort);

      const fromApi = await dishesApi.list(api, { sortBy: sort });
      expect(shown.map((d) => d.id)).toEqual(fromApi.body.map((d) => d.id));
      await expect(menu.cardNames).toHaveText(fromApi.body.map((dish) => dish.name));
    });
  }

  test('category and sort combine: desserts by price ascending', async ({ page }) => {
    const menu = new MenuPage(page);
    const shown = await menu.open('?category=Dessert&sort=PriceAscending');

    expect(shown.every((dish) => sameType(dish.dishType, 'Dessert'))).toBe(true);
    await expect(menu.cardNames).toHaveText(shown.map((dish) => dish.name));
    expect(isSorted(await menu.shownPrices(), 'asc')).toBe(true);
    await expect(menu.sort).toHaveValue('PriceAscending');
  });

  test('opening a dish shows its details', async ({ page, api }) => {
    const dish = seededDishes().find((d) => d.dishType === 'Dessert')!;
    const details = (await dishesApi.byId(api, dish.id)).body;
    const menu = new MenuPage(page);
    await menu.open();
    await menu.openDish(dish.name);

    await expect(menu.dishModal.getByRole('heading', { level: 3 })).toHaveText(details.name);
    await expect(menu.dishModal).toContainText(details.description);
    await expect(menu.dishModal).toContainText(`${details.price}$`);
    await expect(menu.dishModal).toContainText(details.weight);
    await expect(menu.dishModal).toContainText(`${details.calories} kcal`);
  });

  test('the menu page offers search by dish name', async ({ page }) => {
    // Was D5 (see README); fixed.
    const menu = new MenuPage(page);
    await menu.open();
    await expect(menu.searchBox).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Main page: popular dishes and locations', { tag: ['@L1', '@ui'] }, () => {
  // By design the main page previews the first 4 popular dishes and the first 3 locations;
  // the full location list is the booking page's location picker (checked below).
  // Other workers create/remove their own locations while this runs, so each attempt re-reads
  // the API and reloads the page until both agree.
  test('previews the first 4 popular dishes and the first 3 locations', async ({ page, api }) => {
    const main = new MainPage(page);
    await expect(async () => {
      const [popular, locations] = await Promise.all([dishesApi.popular(api), locationsApi.list(api)]);
      await main.open();
      await expect(main.popularDishes.locator('.dish-name')).toHaveText(popular.body.slice(0, 4).map((d) => d.name), { timeout: 5_000 });
      const expectedLocations = locations.body.slice(0, 3);
      await expect(main.locationCards).toHaveCount(expectedLocations.length, { timeout: 5_000 });
      for (const location of expectedLocations) {
        await expect(main.locationCard(location.address)).toBeVisible({ timeout: 5_000 });
      }
    }).toPass({ timeout: 60_000 });
  });

  test('the booking page lists every location', async ({ page, api, testLocation }) => {
    const booking = new BookingPage(page);
    await expect(async () => {
      const locations = (await locationsApi.list(api)).body.map((location) => location.address);
      expect(locations).toContain(testLocation.location.address);
      await booking.open();
      await expect
        .poll(async () => new Set(await booking.location.options()), { timeout: 10_000 })
        .toEqual(new Set(['All Locations', ...locations]));
    }).toPass({ timeout: 60_000 });
  });

  test('opening a location shows its page', async ({ page, api }) => {
    const first = (await locationsApi.list(api)).body[0]!;
    const main = new MainPage(page);
    await main.open();
    await main.locationCard(first.address).click();

    await expect(page).toHaveURL(new RegExp(`/locations/${first.id}$`));
    await expect(new LocationPage(page).address).toHaveText(first.address);
  });

  test('opening a popular dish shows its details', async ({ page }) => {
    // Was D4 (see README); fixed.
    const main = new MainPage(page);
    await main.open();
    const first = main.popularDishes.first();
    const name = (await first.locator('.dish-name').innerText()).trim();
    await first.click();

    // Expected: a dish page or dialog with the dish name. Actual: redirect to the main page.
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Missing dish or location', { tag: ['@L1'] }, () => {
  test('a dish that does not exist returns 404 with a message', { tag: '@api' }, async ({ api }) => {
    const id = randomUUID();
    const res = await dishesApi.byId(api, id);
    expect(res.status).toBe(404);
    expect(errorText(res.body)).toBe(`Dish with id '${id}' was not found.`);
  });

  test('a location that does not exist returns 404 with a message', { tag: '@api' }, async ({ api }) => {
    const id = randomUUID();
    const res = await locationsApi.byId(api, id);
    expect(res.status).toBe(404);
    expect(errorText(res.body)).toBe(`Location with id '${id}' was not found.`);
  });

  test('opening a location that does not exist shows an error', { tag: '@ui' }, async ({ page }) => {
    const location = new LocationPage(page);
    await location.open(randomUUID());

    await expect(location.toasts.withText('Failed to load location details')).toBeVisible();
    await expect(location.address).toHaveText('');
  });

  test('searching the API for a missing name returns an empty list', { tag: '@api' }, async ({ api }) => {
    const res = await dishesApi.list(api, { name: `no-such-dish-${randomUUID()}` });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('searching the API by part of a name is case-insensitive', { tag: '@api' }, async ({ api }) => {
    const dish = seededDishes().find((d) => d.dishType === 'MainCourse')!;
    const fragment = dish.name.split(' ').at(-1)!.toLowerCase();
    const res = await dishesApi.list(api, { name: fragment });

    expect(res.status).toBe(200);
    expect(res.body.map((d: Dish) => d.id)).toContain(dish.id);
    expect(res.body.every((d: Dish) => d.name.toLowerCase().includes(fragment))).toBe(true);
  });
});
