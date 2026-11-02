import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';
import { SKIP_ERROR_TOAST } from '@app/auth/skip-error-toast.context';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { GroupStatusResponse } from '@app/models/group-orders/group-status.model';
import { OwnerSessionResponse } from '@app/models/group-orders/owner-session.model';
import {
  SubmitGroupPreOrderRequest,
  SubmittedDish,
} from '@app/models/group-orders/submit-group-pre-order.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GuestInviteService } from '@app/services/reservation/guest-invite.service';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { ReservationDetails, SyncRequestOptions } from './models';

@Injectable({
  providedIn: 'root',
})
export class GroupOrdersService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);
  private readonly guestInviteService = inject(GuestInviteService);

  /**
   * GroupReservationId і дані для шапки.
   * Основний шлях: owner-сесія повертає groupReservationId, шапка — з GET /reservations (мої бронювання).
   * Запасний шлях (бекенд без groupReservationId у відповіді): invite-token → invite. Справжній бекенд
   * відхиляє цей шлях, коли група заповнена, вже відправлена чи закрита, тому він лише запасний.
   */
  getGroupInvite$(reservationId: string): Observable<GuestInvite> {
    return this.getOwnerSession$(reservationId).pipe(
      switchMap(({ groupReservationId }) =>
        groupReservationId
          ? this.getReservationDetails$(reservationId).pipe(
              map((details) => toGroupHeader(groupReservationId, details))
            )
          : this.getInviteViaToken$(reservationId)
      )
    );
  }

  getSessions$(
    groupReservationId: string,
    options: SyncRequestOptions = {}
  ): Observable<GroupSessionsResponse> {
    return this.http.get<GroupSessionsResponse>(`${this.groupUrl(groupReservationId)}/sessions`, {
      context: this.contextFor(options),
    });
  }

  getOwnerSessionId$(reservationId: string): Observable<string> {
    return this.getOwnerSession$(reservationId).pipe(map((response) => response.guestSessionId));
  }

  private getOwnerSession$(reservationId: string): Observable<OwnerSessionResponse> {
    return this.http.get<OwnerSessionResponse>(
      `${this.baseUrl}/reservations/${encodeURIComponent(reservationId)}/guest-session-id`
    );
  }

  /** Зі списку «мої бронювання»: його вже використовує сторінка Reservations, і він повертає лише власні бронювання. */
  private getReservationDetails$(reservationId: string): Observable<ReservationDetails> {
    return this.http.get<ReservationDetails[]>(`${this.baseUrl}/reservations`).pipe(
      switchMap((reservations) => {
        const reservation = reservations.find((item) => item.id === reservationId);
        return reservation
          ? of(reservation)
          : throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Reservation not found' }));
      })
    );
  }

  private getInviteViaToken$(reservationId: string): Observable<GuestInvite> {
    return this.guestInviteService
      .getInviteToken$(reservationId)
      .pipe(switchMap(({ token }) => this.guestInviteService.getInvite$(token)));
  }

  getStatus$(
    groupReservationId: string,
    options: SyncRequestOptions = {}
  ): Observable<GroupStatusResponse> {
    return this.http.get<GroupStatusResponse>(`${this.groupUrl(groupReservationId)}/status`, {
      context: this.contextFor(options),
    });
  }

  submit$(groupReservationId: string, reservationId: string): Observable<SubmittedDish[]> {
    const body: SubmitGroupPreOrderRequest = { reservationId };
    return this.http.post<SubmittedDish[]>(
      `${this.baseUrl}/group-reservations/${encodeURIComponent(groupReservationId)}/submit`,
      body
    );
  }

  /** Бонус: DELETE повертає оновлений список у форматі GET …/sessions. */
  removeSession$(
    groupReservationId: string,
    guestSessionId: string
  ): Observable<GroupSessionsResponse> {
    return this.http.delete<GroupSessionsResponse>(
      `${this.groupUrl(groupReservationId)}/sessions/${encodeURIComponent(guestSessionId)}`
    );
  }

  private groupUrl(groupReservationId: string): string {
    return `${this.baseUrl}/guest/groups/${encodeURIComponent(groupReservationId)}`;
  }

  /** Тихий запит (фонова синхронізація): interceptor не показує toast на помилку. */
  private contextFor(options: SyncRequestOptions): HttpContext {
    return new HttpContext().set(SKIP_ERROR_TOAST, options.silent === true);
  }
}

/** Шапка Owner-екрана в тій самій формі, що й invite: сторінці байдуже, звідки дані. */
function toGroupHeader(groupReservationId: string, details: ReservationDetails): GuestInvite {
  return {
    GroupReservationId: groupReservationId,
    LocationId: '',
    RestaurantName: details.restaurantName ?? 'Green & Tasty',
    LocationAddress: details.locationAddress,
    StartTime: details.startTime,
    EndTime: details.endTime,
    MaxGuestCount: details.guestCount,
    TableNumber: 0,
    InviterName: '',
  };
}
