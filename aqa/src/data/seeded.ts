import type { DishType } from '../api/models';

export interface SeededDish {
  id: string;
  name: string;
  dishType: DishType;
  price: number;
}

/** Dishes created by global setup for this run (see src/support/global-setup.ts). */
export function seededDishes(): SeededDish[] {
  const raw = process.env.AQA_SEEDED_DISHES;
  if (!raw) throw new Error('AQA_SEEDED_DISHES is not set; global setup did not run');
  return JSON.parse(raw) as SeededDish[];
}
