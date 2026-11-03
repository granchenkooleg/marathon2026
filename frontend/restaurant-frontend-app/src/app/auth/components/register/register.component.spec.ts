import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
      ],
      imports: [RegisterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function lastNameMessages(value: string): string[] {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#lastName')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    const messages = input.closest('label')!.querySelectorAll('.error-message');
    return Array.from(messages).map((message) => (message.textContent ?? '').trim());
  }

  // D3: the last-name messages used to talk about the first name.
  it('explains last-name errors in terms of the last name', () => {
    expect(lastNameMessages('')).toEqual(['Last name is required.']);
    expect(lastNameMessages('A'.repeat(51))).toEqual(['Last name must be up to 50 characters.']);
  });
});
