import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Participant } from '@app/models/group-orders/participant.model';
import { ParticipantRow } from './models';

@Component({
  selector: 'app-participant-card',
  imports: [CurrencyPipe],
  templateUrl: './participant-card.component.html',
  styleUrl: './participant-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ParticipantCardComponent {
  // що картка отримує ззовні — як параметр функції
  readonly participant = input.required<Participant>();
  /** Картка самого Owner (participant.id === guestSessionId) — підпис «My Pre-Order». */
  readonly isMe = input(false);
  /** Показати «Remove Guest» (бонус рівня 3). Вирішує сторінка: лише гості й лише поки група Open. */
  readonly canRemove = input(false);

  readonly removeClick = output<Participant>();

  // рахується саме, коли змінюється participant або isMe
  readonly title = computed(() => {
    const person = this.participant();
    if (this.isMe()) return 'My Pre-Order';
    return person.type === 'Owner' ? `Owner: ${person.name}` : `Guest: ${person.name}`;
  });

  // ціна рядка рахується тут, а не в шаблоні (правило проєкту: без логіки в шаблонах)
  readonly rows = computed<ParticipantRow[]>(() =>
    this.participant().items.map((item) => ({
      dishId: item.dish.id,
      name: item.dish.name,
      imageUrl: item.dish.imageUrl,
      initial: item.dish.name.charAt(0).toUpperCase(),
      quantity: item.quantity,
      lineTotal: item.dish.price * item.quantity,
    }))
  );

  readonly removeLabel = computed(() => `Remove ${this.participant().name}`);

  onRemove(): void {
    this.removeClick.emit(this.participant());
  }
}
