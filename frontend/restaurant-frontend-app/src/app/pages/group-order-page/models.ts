import { Participant } from '@app/models/group-orders/participant.model';

/** Стан першого завантаження екрана. */
export type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

/** Що сторінка передає в картку учасника. */
export interface ParticipantCardView {
  participant: Participant;
  isMe: boolean;
  canRemove: boolean;
}

/** Рядок консолідованого замовлення: однакові страви вже об'єднані. */
export interface ConsolidatedRow {
  dishId: string;
  name: string;
  quantity: number;
  lineTotal: number;
}
