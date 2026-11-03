import type { ApiClient, ApiResponse } from './api-client';
import type {
  ConsolidatedItem,
  Dish,
  DishSort,
  DishType,
  GroupSessions,
  GroupStatus,
  GuestSessionCreated,
  Location,
  Me,
  Order,
  OwnerSession,
  Reservation,
  SignInResponse,
  Table,
  TimeRange,
} from './models';

export interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  [extra: string]: unknown;
}

export const authApi = {
  register: (api: ApiClient, body: RegisterBody) => api.send<{ message?: string; error?: string }>('POST', 'register', { data: body }),
  signIn: (api: ApiClient, email: string, password: string) =>
    api.send<SignInResponse>('POST', 'signin', { data: { email, password } }),
  me: (api: ApiClient) => api.send<Me>('GET', 'me'),
};

export const dishesApi = {
  list: (api: ApiClient, query: { dishType?: DishType; sortBy?: DishSort; name?: string } = {}) =>
    api.send<Dish[]>('GET', 'dishes', { params: query as Record<string, string> }),
  popular: (api: ApiClient) => api.send<Dish[]>('GET', 'dishes/popular'),
  byId: (api: ApiClient, id: string) => api.send<Dish>('GET', `dishes/${encodeURIComponent(id)}`),
  create: (api: ApiClient, body: Record<string, unknown>) => api.send<Dish>('POST', 'dishes', { data: body }),
  remove: (api: ApiClient, id: string) => api.send('DELETE', `dishes/${encodeURIComponent(id)}`),
};

export const locationsApi = {
  list: (api: ApiClient) => api.send<Location[]>('GET', 'locations'),
  byId: (api: ApiClient, id: string) => api.send<Location>('GET', `locations/${encodeURIComponent(id)}`),
  create: (api: ApiClient, address: string) =>
    api.send<Location>('POST', 'locations', {
      data: {
        address,
        description: 'Created by automated e2e tests; removed after the run.',
        totalCapacity: 10,
        averageOccupancy: '0%',
        imageBase64: null,
        rating: 0,
      },
    }),
  /** `force=true` also removes the location's tables and waiter assignments. */
  removeWithChildren: (api: ApiClient, id: string) =>
    api.send('DELETE', `locations/${encodeURIComponent(id)}`, { params: { force: 'true' } }),
};

export const waitersApi = {
  assign: (api: ApiClient, email: string, locationId: string) => api.send('POST', 'waiters', { data: { email, locationId } }),
};

export const tablesApi = {
  create: (api: ApiClient, locationId: string, capacity: number, tableNumber: number) =>
    api.send<Table>('POST', 'tables', { data: { locationId, capacity, tableNumber } }),
  available: (api: ApiClient, query: { locationId: string; capacity: number; startTime: string }) =>
    api.send<Table[]>('GET', 'available-tables', { params: query }),
  timeSlots: (api: ApiClient, tableId: string, startTime: string) =>
    api.send<TimeRange[]>('GET', `tables/${encodeURIComponent(tableId)}/available-time-slots`, { params: { startTime } }),
};

export interface ReservationBody {
  tableId: string;
  startTime: string;
  endTime: string;
  guestCount: number;
}

export const reservationsApi = {
  create: (api: ApiClient, body: ReservationBody) => api.send<Reservation>('POST', 'reservations', { data: body }),
  mine: (api: ApiClient) => api.send<Reservation[]>('GET', 'reservations'),
  byId: (api: ApiClient, id: string) => api.send<Reservation>('GET', `reservations/${encodeURIComponent(id)}`),
  edit: (api: ApiClient, body: { reservationId: string; startTime: string; endTime: string; guestCount: number }) =>
    api.send<Reservation>('PUT', 'reservations', { data: body }),
  cancel: (api: ApiClient, id: string) => api.send<{ message?: string }>('DELETE', 'reservations', { data: { id } }),
};

/** Owner side of the group pre-order (Cognito token of the reservation owner). */
export const groupApi = {
  inviteToken: (api: ApiClient, reservationId: string) =>
    api.send<{ token: string }>('GET', `reservations/${encodeURIComponent(reservationId)}/invite-token`),
  ownerSession: (api: ApiClient, reservationId: string) =>
    api.send<OwnerSession>('GET', `reservations/${encodeURIComponent(reservationId)}/guest-session-id`),
  sessions: (api: ApiClient, groupId: string) =>
    api.send<GroupSessions>('GET', `guest/groups/${encodeURIComponent(groupId)}/sessions`),
  status: (api: ApiClient, groupId: string) =>
    api.send<GroupStatus>('GET', `guest/groups/${encodeURIComponent(groupId)}/status`),
  submit: (api: ApiClient, groupId: string, reservationId: string) =>
    api.send<ConsolidatedItem[]>('POST', `group-reservations/${encodeURIComponent(groupId)}/submit`, { data: { reservationId } }),
  removeParticipant: (api: ApiClient, groupId: string, guestSessionId: string) =>
    api.send<GroupSessions>(
      'DELETE',
      `guest/groups/${encodeURIComponent(groupId)}/sessions/${encodeURIComponent(guestSessionId)}`,
    ),
};

/** Guest side: anonymous join, then calls with the guest session token. */
export const guestApi = {
  join: (api: ApiClient, groupId: string, guestName: string) =>
    api.send<GuestSessionCreated>('POST', 'guest/sessions', { data: { groupReservationId: groupId, guestName } }),
  addDish: (api: ApiClient, sessionId: string, dishId: string, quantity: number) =>
    api.send('POST', `guest/sessions/${encodeURIComponent(sessionId)}/dishes`, { data: { dishId, quantity } }),
  submitCart: (api: ApiClient, sessionId: string) =>
    api.send('POST', `guest/sessions/${encodeURIComponent(sessionId)}/submit`, { data: {} }),
};

export const ordersApi = {
  create: (api: ApiClient, reservationId: string, items: { dishId: string; quantity: number }[]) =>
    api.send<Order>('POST', 'orders', { data: { reservationId, orderItems: items } }),
  byReservation: (api: ApiClient, reservationId: string) =>
    api.send<Order>('GET', `orders/${encodeURIComponent(reservationId)}`),
};

export type { ApiResponse };
