import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  defer,
  exhaustMap,
  finalize,
  forkJoin,
  interval,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { Participant } from '@app/models/group-orders/participant.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';
import { ConsolidatedRow, LoadState, ParticipantCardView } from './models';

/** Як часто підтягувати свіжі кошики, поки група Open. */
export const SYNC_INTERVAL_MS = 15_000;

const STATUS_LABELS: Record<GroupReservationStatus, string> = {
  Open: 'Collecting pre-orders',
  Submitted: 'Sent to Restaurant',
  Closed: 'Closed',
};

const DONE_BUTTON_LABELS: Record<GroupReservationStatus, string> = {
  Open: 'Submit Pre-Order',
  Submitted: 'Pre-Order Sent',
  Closed: 'Pre-Order Closed',
};

@Component({
  selector: 'app-group-order-page',
  imports: [ParticipantCardComponent, ModalComponent, CurrencyPipe, DatePipe],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly groupOrders = inject(GroupOrdersService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reservationId = this.route.snapshot.paramMap.get('reservationId') ?? '';
  private syncSubscription: Subscription | null = null;

  // ── стан: лише signal() ──────────────────────────────────────────────
  readonly loadState = signal<LoadState>('loading');
  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly ownerSessionId = signal<string | null>(null);
  readonly groupStatus = signal<GroupReservationStatus>('Open');

  readonly submitDialogOpen = signal(false);
  readonly submitting = signal(false);

  readonly guestToRemove = signal<Participant | null>(null);
  readonly removing = signal(false);

  readonly lastSyncedAt = signal<Date | null>(null);
  readonly syncFailed = signal(false);
  readonly syncing = signal(false);

  // ── похідні значення: лише computed() ───────────────────────────────
  readonly groupId = computed(() => this.invite()?.GroupReservationId ?? null);
  readonly isOpen = computed(() => this.groupStatus() === 'Open');
  readonly statusLabel = computed(() => STATUS_LABELS[this.groupStatus()]);
  readonly mainButtonLabel = computed(() => DONE_BUTTON_LABELS[this.groupStatus()]);

  readonly guestsText = computed(
    () => `${this.participants().length} of ${this.invite()?.MaxGuestCount ?? '—'} guests`
  );

  readonly cards = computed<ParticipantCardView[]>(() => {
    const ownerId = this.ownerSessionId();
    const open = this.isOpen();
    return this.participants().map((participant) => ({
      participant,
      isMe: participant.id === ownerId,
      canRemove: open && participant.type === 'Guest',
    }));
  });

  readonly hasAnyDishes = computed(() =>
    this.participants().some((person) => person.items.length > 0)
  );

  /** У ресторан ідуть лише підтверджені кошики — тому Grand Total рахуємо звідси, а не з `total` API. */
  readonly consolidated = computed(() => consolidatePreOrder(this.participants()));
  readonly consolidatedRows = computed<ConsolidatedRow[]>(() =>
    this.consolidated().items.map((item) => ({
      dishId: item.dish.id,
      name: item.dish.name,
      quantity: item.quantity,
      lineTotal: item.dish.price * item.quantity,
    }))
  );
  readonly grandTotal = computed(() => this.consolidated().total);
  readonly hasSubmittedDishes = computed(() => this.consolidated().items.length > 0);

  readonly pendingCount = computed(
    () => this.participants().filter((person) => !person.isSubmitted).length
  );
  readonly pendingNotice = computed(() => {
    const count = this.pendingCount();
    if (!this.isOpen() || count === 0) return null;
    const subject = count === 1 ? '1 participant hasn’t' : `${count} participants haven’t`;
    return `${subject} submitted their cart yet — their dishes won’t be included in the order`;
  });

  readonly canSubmit = computed(
    () => this.isOpen() && this.hasSubmittedDishes() && !this.submitting()
  );

  ngOnInit(): void {
    this.load();
  }

  // ── завантаження ────────────────────────────────────────────────────
  /** Перше завантаження і «Try again». Перед стартом зупиняє старий таймер, тож таймери не плодяться. */
  load(): void {
    this.stopSync();
    this.loadState.set('loading');

    this.groupOrders
      .getGroupInvite$(this.reservationId)
      .pipe(
        switchMap((invite) =>
          forkJoin({
            invite: of(invite),
            sessions: this.groupOrders.getSessions$(invite.GroupReservationId),
            // id потрібен лише для підпису «My Pre-Order» — без нього екран усе одно має працювати
            ownerSessionId: this.groupOrders
              .getOwnerSessionId$(this.reservationId)
              .pipe(catchError(() => of(null))),
            status: this.groupOrders.getStatus$(invite.GroupReservationId),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ invite, sessions, ownerSessionId, status }) => {
          this.invite.set(invite);
          this.participants.set(sessions.participants);
          this.ownerSessionId.set(ownerSessionId);
          this.groupStatus.set(status.status);
          this.lastSyncedAt.set(new Date());
          this.syncFailed.set(false);
          this.loadState.set('ready');
          if (status.status === 'Open') this.startSync();
        },
        error: (error: unknown) => {
          const notFound = error instanceof HttpErrorResponse && error.status === 404;
          this.loadState.set(notFound ? 'not-found' : 'error');
        },
      });
  }

  // ── фонова синхронізація (рівень 3) ─────────────────────────────────
  /** Кнопка «Refresh»: синхронізуватись зараз. Якщо запит уже йде — новий не стартує. */
  refresh(): void {
    this.sync$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private startSync(): void {
    this.stopSync();
    this.syncSubscription = interval(SYNC_INTERVAL_MS)
      .pipe(
        exhaustMap(() => this.sync$()), // попередній запит ще йде → цей тік пропускаємо
        takeUntilDestroyed(this.destroyRef) // вихід зі сторінки → таймер зупиняється
      )
      .subscribe();
  }

  private stopSync(): void {
    this.syncSubscription?.unsubscribe();
    this.syncSubscription = null;
  }

  /** Тихо підтягує кошики і статус. Помилка не чіпає дані на екрані — лише показує «Couldn’t refresh». */
  private sync$(): Observable<unknown> {
    return defer(() => {
      const groupId = this.groupId();
      if (!groupId || this.syncing()) return EMPTY;
      this.syncing.set(true);

      return forkJoin({
        sessions: this.groupOrders.getSessions$(groupId, { silent: true }),
        status: this.groupOrders.getStatus$(groupId, { silent: true }),
      }).pipe(
        tap(({ sessions, status }) => {
          // статус іде лише вперед (Open → Submitted → Closed): запізніла відповідь не «відкриває» групу назад
          if (!this.isOpen()) return;
          this.participants.set(sessions.participants);
          this.groupStatus.set(status.status);
          this.lastSyncedAt.set(new Date());
          this.syncFailed.set(false);
          if (status.status !== 'Open') this.stopSync();
        }),
        catchError(() => {
          this.syncFailed.set(true);
          return EMPTY;
        }),
        finalize(() => this.syncing.set(false))
      );
    });
  }

  // ── Submit Pre-Order ───────────────────────────────────────────────
  openSubmitDialog(): void {
    if (this.canSubmit()) this.submitDialogOpen.set(true);
  }

  closeSubmitDialog(): void {
    if (!this.submitting()) this.submitDialogOpen.set(false);
  }

  confirmSubmit(): void {
    const groupId = this.groupId();
    if (!groupId || this.submitting()) return; // подвійний клік не відправляє двічі
    this.submitting.set(true);

    this.groupOrders
      .submit$(groupId, this.reservationId)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.groupStatus.set('Submitted');
          this.stopSync();
          this.submitDialogOpen.set(false);
          this.toast.success('Pre-order sent to the restaurant');
        },
        error: () => {
          // toast з текстом від API вже показав tokenInterceptor — тут не дублюємо.
          // Підтягуємо свіжий стан: можливо, групу вже відправили з іншого пристрою.
          this.submitDialogOpen.set(false);
          this.refresh();
        },
      });
  }

  // ── Remove Guest (бонус) ────────────────────────────────────────────
  askRemove(participant: Participant): void {
    this.guestToRemove.set(participant);
  }

  cancelRemove(): void {
    if (!this.removing()) this.guestToRemove.set(null);
  }

  confirmRemove(): void {
    const guest = this.guestToRemove();
    const groupId = this.groupId();
    if (!guest || !groupId || this.removing()) return;
    this.removing.set(true);

    this.groupOrders
      .removeSession$(groupId, guest.id)
      .pipe(
        finalize(() => this.removing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (sessions) => {
          // список і суми — з відповіді сервера; Grand Total перерахують ті самі computed()
          this.participants.set(sessions.participants);
          this.guestToRemove.set(null);
          this.toast.success(`${guest.name} was removed from the reservation`);
        },
        error: () => this.guestToRemove.set(null), // toast уже показав interceptor, список не чіпаємо
      });
  }
}
