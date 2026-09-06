import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

interface Highlight {
  readonly label: string;
  readonly body: string;
}

interface Stat {
  readonly value: string;
  readonly label: string;
}

interface CaseStudy {
  readonly title: string;
  readonly kicker: string;
  readonly context: string;
  readonly highlights: readonly Highlight[];
  readonly outcome: string;
  readonly stack: readonly string[];
  readonly meta: string;
  readonly accent: 'indigo' | 'pink' | 'cyan' | 'emerald';
  readonly stats?: readonly Stat[];
  readonly demoLink?: string;
  // Drop a screenshot into `public/case-<slug>.jpg` and set the filename here.
  // Placeholder is shown when omitted.
  readonly image?: string;
}

interface SmallProject {
  readonly title: string;
  readonly summary: string;
  readonly stack: readonly string[];
  readonly link?: string;
}

@Component({
  selector: 'app-projects',
  imports: [RevealDirective],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects {
  readonly caseStudies: readonly CaseStudy[] = [
    {
      title: 'Cert-Ed Academia — Tuition platform',
      kicker: 'Ed-tech platform · Shipped',
      context:
        'The full tuition-management application for an online 1:1 K–12 platform: classroom, assignments, grading, messaging, documents, payslips — across four roles.',
      stats: [
        { value: '184', label: 'RLS policies' },
        { value: '15k+', label: 'test lines' },
        { value: 'Live', label: 'on Vercel' },
      ],
      highlights: [
        {
          label: 'Problem',
          body: "An ed-tech platform storing academic records, private messages, and payslips for minors across admin / tutor / mentor / student. Getting access wrong isn't a bug — it's a compliance incident.",
        },
        {
          label: 'Approach',
          body: 'Separation enforced by 184 row-level-security policies in Postgres, not application code. 15,000+ lines of Vitest + Playwright tests on the paths that matter. Region-pinned Vercel deployment with runbooks and an accessibility pass.',
        },
        {
          label: 'Result',
          body: 'A 16,000-line portal on 21,000 lines of shared library code — production-ready, deployed, and running behind a live tuition business.',
        },
      ],
      outcome:
        'Passed a formal production-readiness audit. Live and running behind a real tuition business.',
      stack: ['Next.js', 'React', 'TypeScript', 'Supabase', 'Postgres', 'Vercel', 'Playwright'],
      meta: 'Shipped 2026 · Live',
      accent: 'pink',
    },
    {
      title: 'desk-time — Hosted desk-hours tracker',
      kicker: 'Live product · Multi-tenant · Edge-native',
      context:
        'A hosted, multi-tenant desk-hours tracking service on Cloudflare Workers with D1. Users sign up, hours are aggregated on a schedule, credentials are handled securely at rest, and everything runs on free-tier infrastructure.',
      stats: [
        { value: 'Live', label: 'multi-tenant' },
        { value: 'AES-GCM', label: 'credentials at rest' },
        { value: 'D1', label: 'SQLite on the edge' },
      ],
      highlights: [
        {
          label: 'Problem',
          body: 'A tracking service that had to run always-on (not only when a laptop is open), support multiple independent users, and store per-user credentials safely — while staying entirely on free-tier infrastructure.',
        },
        {
          label: 'Approach',
          body: "One Cloudflare Worker serving all tenants, D1 as the store. User credentials AES-GCM encrypted at rest with a Worker-held master key; session cookies HMAC-signed. Hourly sync driven by a GitHub Actions workflow POSTing an authenticated internal fan-out endpoint — the Worker's own scheduled() handler stays wired as backup, so a single-provider outage can't kill sync.",
        },
        {
          label: 'Result',
          body: 'Live in daily use. Signup, dashboards, per-user scheduled sync, and optional Telegram alerts — all on free-tier Cloudflare + GitHub Actions infrastructure. Zero server bill, zero laptop dependency.',
        },
      ],
      outcome:
        'Boring for the users, considered under the hood — a hosted utility that outlives any single laptop, with the security discipline a shared credential store demands.',
      stack: ['TypeScript', 'Cloudflare Workers', 'D1', 'GitHub Actions'],
      meta: 'Live · Multi-tenant',
      accent: 'emerald',
      // demoLink intentionally omitted until the live signup form is genericized.
    },
    {
      title: 'US fintech — Payments infrastructure',
      kicker: 'Backend engineering · Payments',
      context:
        'Backend engineering across payment approval, bank verification, recurring billing, and check-mailing automation for a US payments platform.',
      stats: [
        { value: 'Ongoing', label: 'engagement' },
        { value: 'Backend', label: 'primary' },
        { value: 'Real', label: 'money paths' },
      ],
      highlights: [
        {
          label: 'Approval hardening',
          body: "Introduced a cryptographic check that prevents an approved payment's destination from being silently swapped between approval and release — closing a class of silent-redirection defects, without invalidating a single prior approval.",
        },
        {
          label: 'Embeddable bank-verification SDK',
          body: 'A customer-facing widget for instant bank verification with session-token auth, tight expiry, IP-tracked lifecycle, and uniform error responses hardened against enumeration.',
        },
        {
          label: 'Recurring reliability program',
          body: "A sustained multi-month program on the scheduler that moves recurring money — turning crash-on-missing-data behaviour into validated failure paths, adding atomic retries so operators can't double-fire, and rewriting operator-facing status language to match reality.",
        },
      ],
      outcome:
        'Fewer silent failures. Fewer late-night pages. Operator dashboards that answer the questions operators actually ask.',
      stack: ['PHP 8', 'Laravel', 'MySQL', 'Redis', 'Queues'],
      meta: 'Ongoing · Details on request',
      accent: 'indigo',
    },
    {
      title: 'Masaar — GCC e-invoicing & ERP',
      kicker: 'Independent build · Compliance R&D',
      context:
        'An independent exploration into GCC e-invoicing and multi-tenant ERP design — Domain-Driven Design across ten bounded contexts. A depth signal on regulated-domain engineering.',
      stats: [
        { value: '10', label: 'bounded contexts' },
        { value: 'ZATCA', label: 'real crypto' },
        { value: 'DDD', label: 'architecture' },
      ],
      highlights: [
        {
          label: 'Why',
          body: "Saudi ZATCA Phase 2 mandates cryptographically-signed invoices with an offline queue for when the tax portal is unreachable. I wanted to build the real thing end-to-end — not a wrapper around someone else's SDK.",
        },
        {
          label: 'What',
          body: 'Actual secp256k1 ECDSA signing, X.509 certificate handling via OpenSSL, SHA-256 invoice-hash chaining, and TLV/base64 QR encoding — the true Phase 2 stack, plus full certificate-lifecycle commands (CSR, onboarding, sandbox, validate, expiry, offline cleanup).',
        },
        {
          label: 'Where it stands',
          body: 'A compliance domain plus an ERP backend across ten contexts, with a growing unit-test suite. Active development — not yet exposed to production traffic.',
        },
      ],
      outcome:
        'A deliberate exercise in cryptographic compliance and DDD at scale — proof of depth in unfamiliar regulated domains, without hand-waving.',
      stack: ['Laravel 12', 'PHP 8.2+', 'MySQL', 'DDD', 'React 19', 'Turborepo'],
      meta: 'In progress · Independent build',
      accent: 'cyan',
    },
  ];

  readonly smallProjects: readonly SmallProject[] = [
    {
      title: 'Jira Dashboard',
      summary:
        'TypeScript CLI I use daily to grade my launch checklists against real git-diff and test-run evidence — and refuse to auto-tick sign-off items.',
      stack: ['TypeScript', 'Node', 'Jira REST', 'ADF'],
    },
    {
      title: 'Axiom',
      summary:
        'Full-stack demo of the Angular ↔ Laravel Sanctum token-auth flow — Laravel 12 REST API with user CRUD, consumed by an Angular 21 SPA over Bearer tokens.',
      stack: ['Angular 21', 'Laravel 12', 'Sanctum'],
      link: 'https://github.com/shamil3ilm',
    },
    {
      title: 'Assist (Envoy)',
      summary:
        'Offline-first desktop assistant in Electron + React — communications, tasks, documents, and workflows running entirely on-device. Early stage.',
      stack: ['Electron', 'React', 'TypeScript'],
    },
  ];
}
