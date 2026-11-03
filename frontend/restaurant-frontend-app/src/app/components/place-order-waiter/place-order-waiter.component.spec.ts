import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, of, throwError } from 'rxjs';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { UserModel } from '@app/auth/models/user.model';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { ToastService } from '@app/services/toast/toast.service';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { PlaceOrderWaiterComponent } from './place-order-waiter.component';

const WAITER: UserModel = { id: 'waiter-1', firstName: 'Nino', lastName: 'Beridze', email: 'nino@test', role: 'Waiter' };

function dish(id: string, name: string): DishListResponse {
  return { id, name, imageUrl: '', price: 10, description: '' } as DishListResponse;
}

describe('PlaceOrderWaiterComponent', () => {
  let component: PlaceOrderWaiterComponent;
  let fixture: ComponentFixture<PlaceOrderWaiterComponent>;
  let element: HTMLElement;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<Pick<AuthenticationService, 'getUser' | 'getUserNameById$'>>;

  async function setUp(user: UserModel | null, customerName$: Observable<string>): Promise<void> {
    auth = jasmine.createSpyObj('AuthenticationService', ['getUser', 'getUserNameById$']);
    auth.getUser.and.returnValue(user);
    auth.getUserNameById$.and.returnValue(customerName$);

    await TestBed.configureTestingModule({
      imports: [PlaceOrderWaiterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: AuthenticationService, useValue: auth },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  }

  function render(customerId = 'customer-1'): void {
    fixture = TestBed.createComponent(PlaceOrderWaiterComponent);
    component = fixture.componentInstance;
    component.reservationId = 'reservation-1';
    component.customerId = customerId;
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  function subtitles(): string[] {
    return Array.from(element.querySelectorAll('.subtitle')).map((line) =>
      (line.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
  }

  afterEach(() => httpMock?.verify());

  it('names the reservation, the signed-in waiter and the customer', async () => {
    await setUp(WAITER, of('Olena Shevchenko'));
    render();
    expect(auth.getUserNameById$).toHaveBeenCalledOnceWith('customer-1');
    expect(subtitles()).toEqual(
      jasmine.arrayContaining(['Reservation #reservation-1', 'Waiter Nino Beridze', 'Customer Olena Shevchenko']),
    );
  });

  it('shows "Unknown Customer" and tells the waiter when the name cannot be loaded', async () => {
    await setUp(WAITER, throwError(() => new Error('500')));
    const toastError = spyOn(TestBed.inject(ToastService), 'error');
    spyOn(console, 'error');
    render();
    expect(component.customerName).toBe('Unknown Customer');
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('refuses to open without a signed-in user', async () => {
    await setUp(null, of(''));
    const toastError = spyOn(TestBed.inject(ToastService), 'error');
    expect(() => TestBed.createComponent(PlaceOrderWaiterComponent)).toThrowError('User is not authenticated');
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('searches dishes from 3 letters, adds a picked dish once, and clears the search', async () => {
    await setUp(WAITER, of('Olena Shevchenko'));
    render();

    component.dishNameForm.setValue({ dishName: 'hu' });
    component.onDishNameChange();
    httpMock.expectNone(() => true);

    component.dishNameForm.setValue({ dishName: 'hum' });
    component.onDishNameChange();
    const search = httpMock.expectOne((req) => req.url === 'https://test.api/dishes');
    expect(search.request.params.get('name')).toBe('hum');
    search.flush([dish('d1', 'Beet Hummus')]);
    fixture.detectChanges();

    element.querySelector<HTMLElement>('.dish-suggestions [role="button"]')?.click();
    component.onDishSelected(dish('d1', 'Beet Hummus'));
    fixture.detectChanges();

    expect(component.orderItems).toEqual([{ dish: dish('d1', 'Beet Hummus'), quantity: 1, state: 0 }]);
    expect(element.querySelectorAll('app-dish-select-card').length).toBe(1);
    expect(element.querySelector('.dish-suggestions')).toBeNull();
    expect(component.dishNameForm.value.dishName).toBeNull();
  });

  it('does not place an empty order', async () => {
    await setUp(WAITER, of('Olena Shevchenko'));
    render();
    const placed = spyOn(component.placeOrder, 'emit');
    const toastError = spyOn(TestBed.inject(ToastService), 'error');

    component.onCreateOrder();
    expect(placed).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('places the order with the chosen quantities and closes', async () => {
    await setUp(WAITER, of('Olena Shevchenko'));
    render();
    const placed = spyOn(component.placeOrder, 'emit');
    const closed = spyOn(component.closeModal, 'emit');
    component.onDishSelected(dish('d1', 'Beet Hummus'));
    component.onDishSelected(dish('d2', 'Herb Bruschetta'));
    component.onQuantityChanged('d2', 3);
    component.onRemoveDish('d1');

    component.onCreateOrder();
    expect(placed).toHaveBeenCalledOnceWith({
      reservationId: 'reservation-1',
      orderItems: [{ dish: dish('d2', 'Herb Bruschetta'), quantity: 3, state: 0 }],
    });
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
