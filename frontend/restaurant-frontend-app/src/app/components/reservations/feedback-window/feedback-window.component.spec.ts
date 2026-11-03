import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FeedbackWindowComponent } from './feedback-window.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('FeedbackWindowComponent', () => {
  let component: FeedbackWindowComponent;
  let fixture: ComponentFixture<FeedbackWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
      ],
      imports: [FeedbackWindowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
