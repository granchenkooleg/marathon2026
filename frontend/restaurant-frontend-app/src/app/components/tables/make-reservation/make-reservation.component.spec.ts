import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Table } from '@app/models/tables/table.model';
import { ToastService } from '@app/services/toast/toast.service';
import { MakeReservationComponent } from './make-reservation.component';

// Built from local time, so formatTime() gives the same text in any time zone.
const NOON = { start: new Date(2026, 5, 17, 12, 0).toISOString(), end: new Date(2026, 5, 17, 13, 30).toISOString() };
const AFTERNOON = { start: new Date(2026, 5, 17, 15, 0).toISOString(), end: new Date(2026, 5, 17, 16, 30).toISOString() };

const TABLE: Table = {
  id: 'table-uuid',
  tableNumber: 7,
  locationId: 'location-1',
  capacity: 4,
  timeRanges: [NOON, AFTERNOON],
};

describe('MakeReservationComponent', () => {
  let component: MakeReservationComponent;
  let fixture: ComponentFixture<MakeReservationComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakeReservationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MakeReservationComponent);
    component = fixture.componentInstance;
    component.title = 'Edit Reservation';
    component.table = TABLE;
    component.locationName = 'Rustaveli Avenue';
    component.selectedTimeRange = NOON;
    component.guests = 2;
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('names the location, the table number and the date', () => {
    const subtitle = (element.querySelector('.subtitle')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(subtitle).toBe('You are making a reservation at Rustaveli Avenue, Table 7 for Jun 17, 2026.');
    expect(element.querySelector('.title')?.textContent?.trim()).toBe('Edit Reservation');
  });

  it('offers the table’s slots as start and end times', () => {
    expect(component.startTimeOptions()).toEqual(['12:00', '15:00']);
    expect(component.endTimeOptions()).toEqual(['13:30', '16:30']);
    expect(component.selectStartTime()).toBe('12:00');
    expect(component.selectEndTime()).toBe('13:30');
  });

  it('picks the slot that matches the chosen time and ignores unknown times', () => {
    component.onStartTimeChange('15:00');
    expect(component.selectedTimeRange).toBe(AFTERNOON);
    component.onEndTimeChange('23:59');
    expect(component.selectedTimeRange).toBe(AFTERNOON);
    component.onEndTimeChange('13:30');
    expect(component.selectedTimeRange).toBe(NOON);
  });

  it('emits the table, the chosen slot and the guest count', () => {
    const submitted = spyOn(component.makeReservation, 'emit');
    component.onGuestsChange(3);
    component.onGuestsChange(undefined);
    component.onStartTimeChange('15:00');

    element.querySelector<HTMLElement>('app-custom-button')?.click();
    expect(submitted).toHaveBeenCalledOnceWith({ tableId: 'table-uuid', timeRange: AFTERNOON, guests: 3 });
  });

  it('does not announce success itself: the request has not been sent yet', () => {
    const success = spyOn(TestBed.inject(ToastService), 'success');
    component.onMakeReservation();
    expect(success).not.toHaveBeenCalled();
  });

  it('closes from the close button', () => {
    const closed = spyOn(component.closeModal, 'emit');
    element.querySelector<HTMLButtonElement>('.close-btn')?.click();
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
