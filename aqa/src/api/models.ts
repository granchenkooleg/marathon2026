/** Shapes returned by the deployed backend (see backend/restaurant-backend-app/docs/ApiRoutes.md). */

export type DishType = 'Appetizer' | 'MainCourse' | 'Dessert';
export type DishSort = 'PriceAscending' | 'PriceDescending' | 'PopularityAscending' | 'PopularityDescending';

export interface Dish {
  id: string;
  name: string;
  price: number;
  dishType: DishType;
  state: string;
  weight: string;
  description: string;
  calories: string;
  imageUrl: string | null;
}

export interface Location {
  id: string;
  address: string;
  description: string;
  totalCapacity: number;
  averageOccupancy: string;
  imageUrl: string | null;
  rating: number;
}

export interface Table {
  id: string;
  locationId: string;
  capacity: number;
  tableNumber: number;
}

export interface TimeRange {
  start: string;
  end: string;
}

/** Backend enum ReservationStatus serialised as a number. */
export const ReservationStatus = { Reserved: 0, Cancelled: 1, InProgress: 2, Completed: 3 } as const;

export interface Reservation {
  id: string;
  tableId: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: number;
  customerId: string | null;
  waiterId: string;
  locationAddress: string;
}

export interface Me {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Customer' | 'Waiter' | 'Admin' | string;
}

export interface SignInResponse {
  message: string;
  idToken: string;
  accessToken: string;
}

// ── Group pre-order (Direction 1) ──────────────────────────────────────────

export interface ParticipantItem {
  dish: { id: string; name: string; price: number };
  quantity: number;
}

/** GET /guest/groups/{id}/sessions — the Owner's own session is not listed (see aqa/README.md). */
export interface Participant {
  id: string;
  type: 'Guest' | 'Owner';
  name: string;
  items: ParticipantItem[];
  total: number;
  isSubmitted: boolean;
}

export interface GroupSessions {
  participants: Participant[];
  total: number;
}

/** GET /reservations/{id}/guest-session-id */
export interface OwnerSession {
  guestSessionId: string;
  groupReservationId: string;
}

/** POST /guest/sessions (PascalCase on the wire). */
export interface GuestSessionCreated {
  SessionId: string;
  SessionToken: string;
}

export interface GroupStatus {
  currentParticipants: number;
  maxCapacity: number;
  status: 'Open' | 'Submitted' | 'Closed';
}

/** POST /group-reservations/{id}/submit — one item per dish, quantities summed. */
export interface ConsolidatedItem {
  dishId: string;
  quantity: number;
}

/** GET /orders/{reservationId} */
export interface Order {
  orderId: string;
  reservationId: string;
  status: number;
  orderItems: { dish: { id: string; name: string; price: number }; quantity: number }[];
}

/** Backend enum OrderStatus serialised as a number. */
export const OrderStatus = { SubmittedByCustomer: 3 } as const;
