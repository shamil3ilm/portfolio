import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Testimonials } from './testimonials';

describe('Testimonials', () => {
  let component: Testimonials;
  let fixture: ComponentFixture<Testimonials>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Testimonials],
    }).compileComponents();

    fixture = TestBed.createComponent(Testimonials);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when testimonials array is empty', () => {
    expect(component.hasTestimonials).toBe(false);
    const section = fixture.nativeElement.querySelector('section');
    expect(section).toBeNull();
  });
});
