import type { ApiClient, ApiResponse } from './api-client';
import type { Dish, DishSort, DishType, Location, Me, Reservation, SignInResponse, Table, TimeRange } from './models';

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

export type { ApiResponse };
