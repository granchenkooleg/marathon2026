import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { DishModalComponent } from './dish-modal.component';

const DISH: DishListResponse = {
  id: 'dish-1',
  name: 'Herb Bruschetta',
  imageUrl: 'https://cdn.test/bruschetta.jpg',
  price: 7.5,
  state: 'Available',
  weight: '200 g',
  dishType: 'Appetizers',
  description: 'Toasted bread with herbs',
  calories: '250',
  proteins: '8 g',
  carbohydrates: '30 g',
  fats: '10',
  vitamins: 'B6, C',
};

describe('DishModalComponent', () => {
  let component: DishModalComponent;
  let fixture: ComponentFixture<DishModalComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DishModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DishModalComponent);
    component = fixture.componentInstance;
    component.dish = DISH;
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the dish details', () => {
    expect(element.querySelector('.dish-name')?.textContent?.trim()).toBe('Herb Bruschetta');
    expect(element.querySelector('.dish-description')?.textContent?.trim()).toBe('Toasted bread with herbs');
    const image = element.querySelector<HTMLImageElement>('.dish-image');
    expect(image?.getAttribute('src')).toBe(DISH.imageUrl);
    expect(image?.alt).toBe('Herb Bruschetta');
    const info = element.querySelector('.dish-info')?.textContent ?? '';
    expect(info).toContain('250 kcal');
    expect(info).toContain('B6, C');
    const priceAndWeight = element.querySelector('.price-weight')?.textContent ?? '';
    expect(priceAndWeight).toContain('7.5$');
    expect(priceAndWeight).toContain('200 g');
  });

  it('emits closed from the close button and from the overlay', () => {
    const closed = spyOn(component.closed, 'emit');
    element.querySelector<HTMLButtonElement>('.close-button')?.click();
    element.querySelector<HTMLElement>('.modal-overlay')?.click();
    expect(closed).toHaveBeenCalledTimes(2);
  });
});
