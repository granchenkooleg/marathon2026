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
