import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

interface ServicePackage {
  readonly name: string;
  readonly tag: string;
  readonly timeline: string;
  readonly startingPrice: string;
  readonly summary: string;
  readonly deliverables: readonly string[];
  readonly bestFor: string;
  readonly ctaLabel: string;
  readonly featured?: boolean;
}

@Component({
  selector: 'app-services',
  imports: [RevealDirective],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class Services {
  readonly packages: readonly ServicePackage[] = [
    {
      name: 'Backend & Payment Audit',
      tag: 'Start here',
      timeline: '1 week',
      startingPrice: 'from $750',
      summary:
        'A written, risk-ordered review of your backend or payment flow — before an audit, launch, or migration bites.',
      deliverables: [
        'Codebase & payment-flow walkthrough',
        'Prioritised written report (risk × effort)',
        '90-minute review call with the fixes explained',
        'Fixed fee. No handover surprises.',
      ],
      bestFor: 'Teams shipping payments who want a second pair of eyes.',
      ctaLabel: 'Enquire about an audit',
    },
    {
      name: 'Backend or Payment Build',
      tag: 'Most common',
      timeline: '3–8 weeks',
      startingPrice: 'from $3,000',
      summary:
        'A fixed-scope backend build — payments, integrations, workflows — shipped with the transaction safety and audit trails production demands.',
      deliverables: [
        'ACH, recurring billing, Stripe, or bank-verification',
        'Approval flows, migrations, or webhook infrastructure',
        'Tests, transactions, and audit trails included',
        'Direct Slack + weekly demos',
      ],
      bestFor: 'Founders and product teams who need a specific system shipped and stable.',
      ctaLabel: 'Discuss a build',
      featured: true,
    },
    {
      name: 'Full-Stack MVP',
      tag: 'Founder mode',
      timeline: '8–12 weeks',
      startingPrice: 'from $6,000',
      summary:
        'Idea to shipped product — the full pass. Modelled on the Cert-Ed Academia build: real auth, real database, real tests, deployed.',
      deliverables: [
        'Next.js + Supabase or Laravel + Angular/React',
        'Auth, database, role-based access, deploy pipeline',
        'Test coverage where correctness matters',
        'You end with a product, not a prototype',
      ],
      bestFor: 'Non-technical founders who need something users can pay for.',
      ctaLabel: 'Scope an MVP',
    },
  ];
}
