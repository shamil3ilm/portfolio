# Portfolio — Mohamed Shamil

Personal site at [shamil.dev](https://shamil.dev) (placeholder — update once deployed).

Single-page Angular 21 site positioning me as a full-stack engineer with production
backend depth. Client-facing: services, case studies, principles, and a booking flow.

## Stack

- Angular 21 (standalone components, signals, control-flow syntax)
- TypeScript 5.9
- SCSS design system (CSS variables for dark/light theming)
- Vitest for unit tests

## Local development

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build to dist/
npm test           # Vitest
```

## Adding testimonials

Drop quotes into `readonly testimonials: Testimonial[]` in
`src/app/components/testimonials/testimonials.ts`. The section renders itself
only when the array is non-empty.

## Section map

- `hero/` — outcome-first headline, availability pill, "Currently" proof card
- `services/` — three packaged offers with pricing
- `about/` — positioning prose + "How I work" principles
- `projects/` — case studies (Problem / Approach / Result) + compact grid
- `skills/` — domains I've shipped into + tools I reach for
- `testimonials/` — client quotes (renders when populated)
- `contact/` — email, "what happens next" ladder, form
