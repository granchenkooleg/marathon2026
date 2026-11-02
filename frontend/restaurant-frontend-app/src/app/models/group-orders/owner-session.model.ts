/** GET /reservations/{reservationId}/guest-session-id */
export interface OwnerSessionResponse {
  guestSessionId: string;
  /** Є в бекенді після оновлення ДЗ #5; без нього Owner-екран іде запасним шляхом через invite. */
  groupReservationId?: string;
}
