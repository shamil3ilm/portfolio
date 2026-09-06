import { Component } from '@angular/core';
import { RevealDirective } from '../../shared/reveal.directive';

interface DomainItem {
  readonly name: string;
  readonly detail: string;
}

interface ToolGroup {
  readonly label: string;
  readonly items: readonly string[];
}

@Component({
  selector: 'app-skills',
  imports: [RevealDirective],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  readonly domains: readonly DomainItem[] = [
    {
      name: 'Payments',
      detail: 'ACH, approvals, recurring billing, bank-verification SDKs, check mailing',
    },
    { name: 'Compliance', detail: 'ZATCA e-invoicing (Saudi Phase 2), KYC/KYB review tooling' },
    { name: 'Ed-tech', detail: 'Role-based access, row-level security, safe data for minors' },
    {
      name: 'Metered billing',
      detail: 'Subscription throttles, credit refill, fee gateways with exemption cascades',
    },
    {
      name: 'LLM observability',
      detail: 'OpenRouter usage tracking, per-call logging, cost dashboards',
    },
  ];

  readonly tools: readonly ToolGroup[] = [
    { label: 'Backend', items: ['PHP 8', 'Laravel 12', 'MySQL', 'Redis', 'Queues / Jobs'] },
    { label: 'Frontend', items: ['TypeScript', 'Next.js', 'React', 'Angular 21', 'Tailwind'] },
    { label: 'Data & auth', items: ['Supabase', 'Postgres (RLS)', 'SQLite', 'Sanctum'] },
    { label: 'Testing', items: ['PHPUnit', 'Vitest', 'Playwright', 'Purpose-built harnesses'] },
    { label: 'Deploy', items: ['Vercel', 'Bitbucket Pipelines', 'Windows Task Scheduler'] },
  ];

  readonly limits: string =
    "I'll tell you when a job needs someone else — I don't claim Docker/container infra, mobile, or ML platform work.";
}
