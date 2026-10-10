# Tag journeys: design

**Date:** 2026-10-09 · **Status:** approved in conversation, awaiting written review

## Goal

Know whether, and how seriously, the people I send tagged portfolio links to (`?ref=<tag>`, one tag per application) engage with the site, without identifying anyone. Follow each tagged visit as a short journey, recognise returns of the same tag on later days, make explained rule-based decisions, alert on WhatsApp, and keep a tamper-evident log.

## Scope

**In:** journeys for visits that arrive through a **registered** tag; returns per tag; three decisions (first open, return, strong interest) with WhatsApp alerts; an append-only, hash-chained event log in Neon; a verification function.

**Out:** untagged visitors; any persistent ID on the visitor's device; IP addresses or fingerprints; a dashboard (data is read in Neon's table viewer); AI-generated summaries; automatic data deletion.

## Architecture

```
browser (journey.js) --sendBeacon--> /api/journey (Vercel, sin1)
                                        | journey_append()  -> journey_events (hash-chained, append-only)
                                        | journey_evaluate() -> journey_decisions (unique per tag/type/day)
                                        +--> api/_lib/whatsapp.js --> Meta Cloud API (portfolio_alert template)
```

Units and responsibilities:

| Unit | Responsibility | Depends on |
|---|---|---|
| `journey.js` (browser) | Emit the fixed event set for tagged, non-owner tabs | `analytics.js` (tag in `sessionStorage`), `va-disable` owner flag |
| `api/journey.js` | Validate, store, evaluate, alert; always respond 204 | Neon driver, `_lib/whatsapp.js`, `_lib/journey-summary.js` |
| `api/_lib/whatsapp.js` | Send one `portfolio_alert` template message | `WA_*` env vars |
| `api/_lib/journey-summary.js` | Pure function: visit aggregate → alert headline + details | none |
| `db/journeys.sql` | Tables, permissions, triggers, the three SQL functions | Postgres `pgcrypto` |
| `api/alert.js` | Contact-form alerts only (its `visit` type is removed) | `_lib/whatsapp.js` |

## Data (Neon project `portfolio`, separate from lee)

- `journey_tags(tag text primary key, label text, created_at timestamptz)`: registered tags. The owner inserts a row before sending a link.
- `journey_events(id bigserial, visit_id uuid, tag text, type text, page text, detail jsonb, created_at timestamptz, prev_hash bytea, hash bytea)`: append-only.
- `journey_decisions(id bigserial, tag text, type text, day date, visit_id uuid, reasons jsonb, sent_at timestamptz null, attempts int, unique(tag, type, day))`.

Never stored: IP, user agent, cookies or device IDs, contact-form contents, names.

**Hash chain:** `hash = sha256(prev_hash || id || visit_id || tag || type || page || detail::text || created_at)`. `journey_append` serialises appends with a row lock on a single chain-head row, so concurrent events cannot fork the chain. The first row uses a fixed genesis `prev_hash` of 32 zero bytes.

**Append-only:** a trigger raises on `UPDATE` or `DELETE` of `journey_events`.

## Access control (no external read access)

1. No endpoint returns journey data; `/api/journey` always answers 204.
2. The function connects as role `journey_app`, which has `EXECUTE` on `journey_append`, `journey_evaluate` and `journey_mark_sent` only. All three are `SECURITY DEFINER`. Table privileges are revoked, so a leaked connection string can append events but cannot read the log.
3. Append-only trigger (above).
4. Events for unregistered tags are dropped inside `journey_append` before storage.
5. Request guards: `Origin` must be `https://mohamed3shamil.vercel.app`; JSON only; per-IP rate limit (in memory, per warm instance); strict field validation.
6. `JOURNEYS_DATABASE_URL` lives only in Vercel's server-side environment variables.

The owner reads the data, and runs `journey_verify()`, in Neon's SQL editor with the owner role.

## Events (browser)

`journey.js` runs only when the tab has a tag in `sessionStorage` (set by `analytics.js`) and `localStorage['va-disable']` is not set. It creates `sessionStorage['journey-visit']` (a random UUID) on the first tagged landing.

| Type | Trigger | `detail` |
|---|---|---|
| `visit_start` | First tagged landing in the tab (sent before that page's `page_view`) | `{ "from": "<referrer host or null>" }` |
| `page_view` | Every page load in the visit, including the landing page | none |
| `case_study_read` | 30 s visible on a `case-*.html` page, once per page view | `{ "study": "<slug>", "seconds": n }` |
| `resume_pdf` | "Save as PDF" click or `beforeprint` on the résumé page | none |
| `contact_open` | First `focusin` inside the contact form | none |
| `active` | Every 30 s while the tab is visible and there was a pointer, key, scroll or touch event in the last 60 s; max 20 per visit | `{ "seconds": 30 }` |

Transport: `navigator.sendBeacon('/api/journey', application/json)`. Failures are ignored. The per-open `visit` alert currently sent from `analytics.js` is removed and replaced by the `first_open` decision.

Server validation: `type` is in the list above; `page` matches `^/[a-z0-9-]*(\.html)?$`; `tag` matches `^[a-z0-9][a-z0-9-]{0,39}$`; `visit_id` is a UUID; `detail` is at most 300 bytes.

## Decisions

"Day" is the calendar day in `Asia/Kolkata`.

| Decision | True when | Limit |
|---|---|---|
| `first_open` | `visit_start` and the tag has no earlier `visit_start` (from any visit) | Once per tag, ever |
| `return` | `visit_start` and the tag's previous visit started on an earlier day | Once per tag per day |
| `strong_interest` | The current visit has at least 2 of: résumé viewed (`page_view /resume.html` or `resume_pdf`) · any `case_study_read` · at least 6 `active` events (3 min) · `contact_open` | Once per tag per day |

`journey_evaluate(visit_id, tag)` inserts any newly true decisions with `ON CONFLICT DO NOTHING`. It returns those rows, plus any unsent rows for the tag with `attempts < 3`, together with a visit aggregate: visit number (count of distinct `visit_id`s for the tag), day number (days since the tag's first `visit_start`, in `Asia/Kolkata`, plus 1), active seconds, studies read with seconds, résumé viewed or saved, contact opened, page path in order, and referrer host. After a send, `api/journey.js` marks the row `sent_at` through a third `SECURITY DEFINER` function, `journey_mark_sent(id, ok)`, which increments `attempts`.

## Alerts

The same approved template, `portfolio_alert`: `{{1}}` is the headline, `{{2}}` the details, both built by `journey-summary.js`.

> {{1}} `acme · 2nd visit (day 3) · strong interest`
> {{2}} `6 min active · Read: ZATCA case study (2m 40s), résumé (saved PDF) · Not opened: contact form · Path: home → work → ZATCA case study → résumé · From: linkedin.com`

Variables are single-line (no newlines, tabs or runs of 4+ spaces). The headline is capped at 100 characters and the details at 800, so the whole message stays under WhatsApp's 1,024-character template body limit.

## Failure handling

- Database error or timeout: log `journey_store_failed`, respond 204; that event is lost and the site is unaffected.
- WhatsApp error: the decision stays unsent and is retried on the tag's next event, at most 3 attempts; log `whatsapp_alert_failed` with Meta's response.
- Neon cold start (about 1 s) is invisible to visitors, because beacons do not wait.

## Verification

`journey_verify()` recomputes the chain from the genesis row and returns `{ ok: true, rows: n }` or `{ ok: false, first_bad_id: id }`.

## Testing

- **SQL** (local Postgres in Laragon): append and chain; unregistered tag dropped; `UPDATE`/`DELETE` refused; `journey_app` cannot `SELECT`; each decision and its daily limit; 20 concurrent appends leave the chain intact; `journey_verify` detects a row altered with the trigger disabled.
- **Node** (`node:test`): request validation; `journey-summary.js` output, including the length cap and the "not opened" list. The site's existing 21 tests must still pass.
- **Browser** (stubbed `sendBeacon`): event order on a tagged visit; nothing on untagged visits; nothing with `?owner=1`; `active` stops at 20.

## Configuration and rollout

- `package.json` (private) with the dependency `@neondatabase/serverless`. `vercel.json` gets `installCommand: "npm install --omit=dev"` and `regions: ["sin1"]`.
- Vercel env var: `JOURNEYS_DATABASE_URL` (pooled connection string). Existing `WA_*` vars are reused.
- Owner steps: run `db/journeys.sql` once in Neon's SQL editor; set the env var; push; insert a test tag; open `?ref=<tag>` in a private window; check the alert and the rows.
