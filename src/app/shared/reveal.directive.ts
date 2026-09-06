import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Fades an element in the first time it enters the viewport.
 *
 * Usage: `<div appReveal>...</div>` or `<div appReveal [revealDelay]="120">...`
 *
 * Emits no animation for users who prefer reduced motion.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0;

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const el = this.host.nativeElement;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      el.classList.add('reveal-in');
      return;
    }

    el.classList.add('reveal');
    if (this.revealDelay > 0) {
      el.style.setProperty('--reveal-delay', `${this.revealDelay}ms`);
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('reveal-in');
            this.observer?.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );

    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
