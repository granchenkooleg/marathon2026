import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Reservation, ReservationStatus } from '@app/models/reservations/reservation.model';
import { ReservationConfirmedComponent } from './reservation-confirmed.component';

const RESERVATION: Reservation = {
  id: 'reservation-1',
  tableId: 'table-1',
  customerId: 'customer-1',
  startTime: new Date(2026, 5, 17, 12, 0),
  endTime: new Date(2026, 5, 17, 13, 30),
  guestCount: 4,
  status: ReservationStatus.Reserved,
  locationAddress: '14 Rustaveli Avenue',
  tableCapacity: 4,
  restaurantName: 'Green & Tasty',
  waiterId: 'waiter-1',
};

describe('ReservationConfirmedComponent', () => {
  let component: ReservationConfirmedComponent;
  let fixture: ComponentFixture<ReservationConfirmedComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationConfirmedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationConfirmedComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('reservation', RESERVATION);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  function infoText(): string {
    return (element.querySelector('.reservation-info')?.textContent ?? '').replace(/\s+/g, ' ');
  }

  it('summarises the reservation', () => {
    const text = infoText();
    expect(text).toContain('Green & Tasty');
    expect(text).toContain('4 people');
    expect(text).toContain('Jun 17, 2026');
    expect(text).toContain('14 Rustaveli Avenue');
    expect(element.querySelector('.cancelled-text')).toBeNull();
  });

  it('marks the address line of a cancelled reservation', () => {
    fixture.componentRef.setInput('reservation', { ...RESERVATION, status: ReservationStatus.Cancelled });
    fixture.detectChanges();
    expect(element.querySelector('.cancelled-text')?.textContent).toContain('14 Rustaveli Avenue');
  });

  it('emits edit and cancel from its buttons', () => {
    const edit = spyOn(component.editReservation, 'emit');
    const cancel = spyOn(component.cancelReservation, 'emit');
    const buttons = Array.from(element.querySelectorAll<HTMLElement>('.confirmed-buttons app-custom-button'));
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Cancel Reservation', 'Edit Reservation']);

    buttons[0].click();
    buttons[1].click();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('closes once, fades out, and ignores clicks inside the dialog', () => {
    const closed = spyOn(component.closed, 'emit');
    element.querySelector<HTMLElement>('.confirmed-wrapper')?.click();
    expect(closed).not.toHaveBeenCalled();

    element.querySelector<HTMLElement>('.modal-backdrop')?.click();
    element.querySelector<HTMLButtonElement>('[aria-label="Close reservation confirmation"]')?.click();
    fixture.detectChanges();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(element.classList).toContain('fade-out');
  });
});
