/** Другий параметр getSessions$ / getStatus$: silent — без toast на помилку (фонова синхронізація). */
export interface SyncRequestOptions {
  silent?: boolean;
}

/** Бронювання з GET /reservations: лише поля, потрібні для шапки Owner-екрана. */
export interface ReservationDetails {
  id: string;
  locationAddress: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  restaurantName?: string;
}
