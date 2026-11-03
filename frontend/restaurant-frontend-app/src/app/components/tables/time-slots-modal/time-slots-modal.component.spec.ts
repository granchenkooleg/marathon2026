import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Table } from '@app/models/tables/table.model';
import { TimeSlotsModalComponent } from './time-slots-modal.component';

const TABLE: Table = {
  id: '3f1c9a52-table-uuid',
  tableNumber: 7,
  locationId: 'location-1',
  capacity: 4,
  timeRanges: [
    { start: new Date(2026, 5, 17, 12, 0).toISOString(), end: new Date(2026, 5, 17, 13, 30).toISOString() },
    { start: new Date(2026, 5, 17, 15, 0).toISOString(), end: new Date(2026, 5, 17, 16, 30).toISOString() },
  ],
};

describe('TimeSlotsModalComponent', () => {
  let component: TimeSlotsModalComponent;
  let fixture: ComponentFixture<TimeSlotsModalComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeSlotsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsModalComponent);
    component = fixture.componentInstance;
    component.table = TABLE;
    component.locationName = 'Rustaveli Avenue';
    component.date = '2026-06-17';
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('says once how many slots the table has, where and when', () => {
    const subtitle = (element.querySelector('.subtitle')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(subtitle).toBe('There are 2 slots available at Rustaveli Avenue, Table 7 for Jun 17, 2026.');
    // The internal table id is not for guests.
    expect(subtitle).not.toContain(TABLE.id);
  });

  it('lists every slot and emits the table with the slot the user picks', () => {
    const selected = spyOn(component.timeSlotSelected, 'emit');
    const slots = element.querySelectorAll<HTMLElement>('app-time-slot');
    expect(slots.length).toBe(2);

    slots[1].click();
    expect(selected).toHaveBeenCalledOnceWith({ table: TABLE, timeRange: TABLE.timeRanges[1] });
  });

  it('closes from the close button and the backdrop, not from a click inside', () => {
    const closed = spyOn(component.closeModal, 'emit');
    element.querySelector<HTMLElement>('.modal-container')?.click();
    expect(closed).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('.close-btn')?.click();
    element.querySelector<HTMLElement>('.modal-backdrop')?.click();
    expect(closed).toHaveBeenCalledTimes(2);
  });
});
