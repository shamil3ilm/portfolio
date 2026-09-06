import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

interface Testimonial {
  readonly quote: string;
  readonly author: string;
  readonly role: string;
  readonly company?: string;
}

@Component({
  selector: 'app-testimonials',
  imports: [RevealDirective],
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class Testimonials {
  // Drop real quotes here as you collect them.
  // Example shape (uncomment and replace to publish):
  // { quote: 'Shipped a Stripe → ACH migration in three weeks, on the day he said he would.',
  //   author: 'Jane Doe', role: 'CTO', company: 'Acme Payments' },
  readonly testimonials: readonly Testimonial[] = [];

  get hasTestimonials(): boolean {
    return this.testimonials.length > 0;
  }
}
