import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Services } from './services';

describe('Services', () => {
  let component: Services;
  let fixture: ComponentFixture<Services>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Services],
    }).compileComponents();

    fixture = TestBed.createComponent(Services);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose exactly three service packages', () => {
    expect(component.packages.length).toBe(3);
  });

  it('should mark exactly one package as featured', () => {
    const featured = component.packages.filter((p) => p.featured);
    expect(featured.length).toBe(1);
  });
});
