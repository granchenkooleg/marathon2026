import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { DishSelectCardComponent } from './dish-select-card.component';

const DISH = {
  id: 'dish-1',
  name: 'Beet Hummus',
  imageUrl: 'https://cdn.test/hummus.jpg',
  price: 11,
  description: 'Beetroot and chickpeas',
} as DishListResponse;

describe('DishSelectCardComponent', () => {
  let component: DishSelectCardComponent;
  let fixture: ComponentFixture<DishSelectCardComponent>;
  let element: HTMLElement;

  function counterButtons(): { minus: HTMLButtonElement; plus: HTMLButtonElement } {
    const [minus, plus] = Array.from(element.querySelectorAll<HTMLButtonElement>('.counter button'));
    return { minus, plus };
  }

  function shownQuantity(): string {
    return element.querySelector('.counter .value')?.textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DishSelectCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DishSelectCardComponent);
    component = fixture.componentInstance;
    component.dish = DISH;
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the dish, its price and a quantity of 1 that cannot go lower', () => {
    expect(element.querySelector('.dish-name')?.textContent?.trim()).toBe('Beet Hummus');
    expect(element.querySelector('.dish-description')?.textContent?.trim()).toBe('Beetroot and chickpeas');
    expect(element.querySelector('.price')?.textContent?.trim()).toBe('$11.00');
    expect(shownQuantity()).toBe('1');
    expect(counterButtons().minus.disabled).toBeTrue();
  });

  it('plus and minus change the quantity and emit it, never below 1', () => {
    const emitted: number[] = [];
    component.quantityChanged.subscribe((quantity) => emitted.push(quantity));

    counterButtons().plus.click();
    counterButtons().plus.click();
    fixture.detectChanges();
    expect(shownQuantity()).toBe('3');
    expect(counterButtons().minus.disabled).toBeFalse();

    counterButtons().minus.click();
    component.onDecrement();
    component.onDecrement();
    fixture.detectChanges();
    expect(shownQuantity()).toBe('1');
    expect(emitted).toEqual([2, 3, 2, 1, 1]);
  });

  it('emits remove from the trash button', () => {
    const removed = spyOn(component.remove, 'emit');
    element.querySelector<HTMLButtonElement>('.remove-btn')?.click();
    expect(removed).toHaveBeenCalledTimes(1);
  });
});
