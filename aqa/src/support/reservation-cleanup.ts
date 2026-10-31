import type { ApiClient } from '../api/api-client';
import { reservationsApi } from '../api/endpoints';
import { ReservationStatus, type Reservation } from '../api/models';
import { addMinutes, iso } from '../data/time';

/** The backend refuses to cancel less than 30 minutes before the start. */
const CANCEL_CUTOFF_MINUTES = 30;

/**
 * Cancels a reservation so the run leaves nothing active behind.
 * Reservations that start too soon to cancel are first moved a few days ahead (edit allows it),
 * then cancelled. Errors are reported, not thrown: cleanup must not hide the real test result.
 */
export async function cancelReservationQuietly(owner: ApiClient, reservationId: string): Promise<string | null> {
  const current = await reservationsApi.byId(owner, reservationId);
  if (current.status !== 200) return `GET reservation ${reservationId}: HTTP ${current.status}`;
  const reservation = current.body;
  if (reservation.status === ReservationStatus.Cancelled) return null;

  if (new Date(reservation.startTime).getTime() < addMinutes(new Date(), CANCEL_CUTOFF_MINUTES + 5).getTime()) {
    const moved = await moveFarAhead(owner, reservation);
    if (!moved) return `could not move reservation ${reservationId} before cancelling`;
  }

  const cancelled = await reservationsApi.cancel(owner, reservationId);
  return cancelled.status === 200 ? null : `cancel ${reservationId}: HTTP ${cancelled.status}`;
}

async function moveFarAhead(owner: ApiClient, reservation: Reservation): Promise<boolean> {
  const start = new Date(reservation.startTime);
  const length = new Date(reservation.endTime).getTime() - start.getTime();
  for (let days = 3; days <= 6; days++) {
    const newStart = addMinutes(start, days * 24 * 60);
    const res = await reservationsApi.edit(owner, {
      reservationId: reservation.id,
      startTime: iso(newStart),
      endTime: iso(new Date(newStart.getTime() + length)),
      guestCount: reservation.guestCount,
    });
    if (res.status === 200) return true;
  }
  return false;
}
