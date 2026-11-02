/** Рядок страви в картці учасника — уже з порахованою ціною рядка. */
export interface ParticipantRow {
  dishId: string;
  name: string;
  imageUrl?: string;
  initial: string;
  quantity: number;
  lineTotal: number;
}
