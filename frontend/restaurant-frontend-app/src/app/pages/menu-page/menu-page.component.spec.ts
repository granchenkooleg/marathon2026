import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Params, Router, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MenuPageComponent } from './menu-page.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

function dish(id: string, name: string): DishListResponse {
  return {
    id,
    name,
    imageUrl: '',
    price: 10,
    state: 'Available',
    weight: '200 g',
    dishType: 'Appetizer',
    description: '',
  } as DishListResponse;
}

const DISHES = [dish('d1', 'Herb Bruschetta'), dish('d2', 'Beet Hummus'), dish('d3', 'Mushroom Khinkali')];

describe('MenuPageComponent', () => {
  let fixture: ComponentFixture<MenuPageComponent>;
  let httpMock: HttpTestingController;
  let queryParams: BehaviorSubject<Params>;

  async function render(params: Params = {}): Promise<void> {
    queryParams = new BehaviorSubject<Params>(params);
    await TestBed.configureTestingModule({
      imports: [MenuPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: ActivatedRoute, useValue: { queryParams } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MenuPageComponent);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === 'https://test.api/dishes').flush(DISHES);
    fixture.detectChanges();
  }

  function cardNames(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-dish-card .dish-name') as NodeListOf<HTMLElement>).map(
      (element) => element.textContent?.trim() ?? ''
    );
  }

  function search(text: string): void {
    const input = fixture.nativeElement.querySelector('#dishSearch') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('shows every loaded dish when the search box is empty', async () => {
    await render();
    expect(cardNames()).toEqual(['Herb Bruschetta', 'Beet Hummus', 'Mushroom Khinkali']);
  });

  it('filters dishes by name, ignoring case (defect D5)', async () => {
    await render();
    search('  BRU ');
    expect(cardNames()).toEqual(['Herb Bruschetta']);
  });

  it('says so when no dish matches the search', async () => {
    await render();
    search('pizza');
    expect(cardNames()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.no-results')?.textContent).toContain('No dishes match “pizza”.');
  });

  it('opens the dish given in ?dish=<id> once the menu is loaded (defect D4)', async () => {
    await render({ dish: 'd2' });
    expect(fixture.nativeElement.querySelector('app-dish-modal h3')?.textContent?.trim()).toBe('Beet Hummus');
  });

  it('drops ?dish from the URL when that dish is closed, so a reload does not reopen it', async () => {
    await render({ dish: 'd2' });
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture.componentInstance.closeModal();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-dish-modal')).toBeNull();
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { dish: null }, replaceUrl: true }));
  });
});
