import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeRange } from '@app/models/tables/time-range.model';
import { TimeSlotComponent } from './time-slot.component';

// Built from local time, so formatTime() gives the same text in any time zone.
const SLOT: TimeRange = {
  start: new Date(2026, 5, 17, 15, 0).toISOString(),
  end: new Date(2026, 5, 17, 16, 30).toISOString(),
};

describe('TimeSlotComponent', () => {
  let component: TimeSlotComponent;
  let fixture: ComponentFixture<TimeSlotComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeSlotComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotComponent);
    component = fixture.componentInstance;
    component.timeRange = SLOT;
    element = fixture.nativeElement as HTMLElement;
  });

  function lines(): string[] {
    return Array.from(element.querySelectorAll('.line')).map((line) => line.textContent?.trim() ?? '');
  }

  it('shows the start time when no label is given', () => {
    fixture.detectChanges();
    expect(lines()).toEqual(['15:00']);
  });

  it('shows the label instead of the start time', () => {
    component.label = '15:00 - 16:30';
    fixture.detectChanges();
    expect(lines()).toEqual(['15:00 - 16:30']);
  });

  it('shows the date above the time when asked to', () => {
    component.showDate = true;
    fixture.detectChanges();
    expect(lines()).toEqual(['Jun 17, 2026', '15:00']);
  });

  it('marks a disabled slot', () => {
    component.disabled = true;
    fixture.detectChanges();
    expect(element.querySelector('.time-slot-container')?.classList).toContain('disabled');
  });
});
