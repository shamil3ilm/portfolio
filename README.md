# Portfolio — Mohamed Shamil

Live at **[mohamed3shamil.vercel.app](https://mohamed3shamil.vercel.app/)**.

A static site: plain HTML, CSS and JavaScript. Every page is committed ready to serve, so the site works with no build. On Vercel, a tiny zero-dependency build regenerates the résumé from `profile.json` (see below).

## Files

- `index.html` — home page (hero, game, work, projects, contact) and the 60-second view
- `case-delegated-access.html`, `case-recurring-safeguards.html`, `case-llm-observability.html`, `case-zatca-einvoicing.html` — case studies
- `404.html` — page shown for unknown addresses (Vercel serves it automatically)
- `profile.json` — **the source of truth for my public profile details** (JSON Resume format), served at `/profile.json`
- `resume.html` — résumé page, **generated from `profile.json`**; "Save as PDF" prints a one-page résumé
- `variants/<slug>.json` — tailored résumés published from lee (optional; same format as `profile.json`), served at `/variants/<slug>.json`
- `resume/<slug>.html` — one tailored résumé page per variant, **generated from `variants/<slug>.json`**; not indexed by search engines
- `scripts/build-resume.mjs` — validates `profile.json` and `variants/*.json`, then renders `resume.html`, the 60-second view in `index.html` and the `resume/<slug>.html` pages. `scripts/lib/` holds the validator and the renderer, `scripts/*.template.html` the page templates, `scripts/profile.schema.json` the schema and `scripts/test/` the tests
- `styles.css` — layout, light/dark themes, responsive rules
- `script.js` — theme toggle and contact form (Web3Forms)
- `patrol.js` — Risk Review Desk, the game at the top of the Playground (review ten items, release or hold each with a reason, get a shift report)
- `demos.js` — the three interactive "Try it" demos on the home page
- `sample-data.js` — fresh example data on every visit (businesses, providers, amounts, valid routing numbers, dates), shared by all demos
- `playground.html` — six working demos of my work; everything runs in the browser
- `playground-work.js` — delegated account access, recurring payment safeguards, AI usage tracking
- `playground.js` — e-invoice QR (with the QR library loaded from cdnjs, integrity-checked), webhook signatures, scheduling
- `tools.js` — handy tools (routing number checker, check amount in words)
- `qr-maker.js` — QR code maker (link, text, Wi-Fi, contact card, WhatsApp, email, phone, SMS; optional logo; PNG/SVG download)
- `picker.js` — custom date and time pickers (replace the browser's built-in ones)
- `select.js` — custom dropdowns for the playground (the hidden native select keeps the value)
- `crypto-tool.js` — Lock & unlock text (password lock with AES-256, Base64, hex, URL, SHA-256, Caesar/ROT13)
- `ui.js` — scroll reveal, active-section highlighting, header shadow, result pulses, mobile menu and local time
- `work.js` — Work section topic filters, "show all" and the collapsible list of smaller fixes
- `quick-view.js` — opens and closes the 60-second summary dialog (also opens from `index.html?view=quick`). The dialog's content is generated into `index.html` from `profile.json`
- `palette.js` — command palette (Ctrl+K or /) to jump to any section, demo, tool or action
- `achievements.js` — the 17 challenges and the 🏆 progress counter (progress is stored only in the visitor's browser)
- `favicon.svg`, `og-image.png` — icon and link-preview image

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

## Profile data (`profile.json`)

`profile.json` is **managed by lee**, my job-search app. I edit my details in lee. lee commits `profile.json` to this repo through the GitHub contents API, and the push triggers a Vercel build that regenerates the pages. lee's commit messages start with:

```
chore(profile): sync from lee
```

### Keeping the committed pages in sync

lee commits only `profile.json`. The GitHub Actions workflow `.github/workflows/regenerate.yml` then rebuilds the pages and commits them back:

- **Trigger:** a push to `main` that touches `profile.json`, `variants/**`, `scripts/**` (which holds the templates) or the workflow itself. It can also be run by hand from the Actions tab (`workflow_dispatch`).
- **Steps:** Node LTS, no install, `node --test "scripts/test/*.test.mjs"`, then `node scripts/build-resume.mjs`.
- **Commit:** if `resume.html`, `index.html` or anything in `resume/` changed (including new and deleted variant pages), it commits them as `github-actions[bot]` with the message `chore(build): regenerate pages from profile.json and variants [skip ci]`, using the built-in `GITHUB_TOKEN` (`contents: write`).
- **No loops:** pushes made with `GITHUB_TOKEN` don't start workflows, the message carries `[skip ci]`, and the job is skipped when `github-actions[bot]` triggered it.
- **No races:** runs are queued one at a time per branch (`concurrency`, no cancelling). If `main` moved during a run, the push is rejected. The job then rebuilds on the new tip and pushes once more (it doesn't rebase the generated files, so there are no conflicts).
- **On failure:** if a test or the `profile.json` or variant validation fails, the job fails and nothing is committed. Vercel's build fails on the same problem, so the previous deployment stays live.

Vercel doesn't redeploy for the bot's commit. `ignoreCommand` in `vercel.json` skips the build when the latest commit's author is `github-actions[bot]` and it changes only `resume.html`, `index.html` and `resume/`. That output is identical to what Vercel already built from the triggering commit. Any other commit builds as usual.

**Don't edit `profile.json` here directly**, except in an emergency. A manual edit is safe: before its next write, lee compares the file's sha with the one it last wrote, notices the change and asks me what to do.

Don't edit `resume.html` or the marked 60-second view block in `index.html` by hand either. The next build overwrites them.

### Tailored résumés (`variants/`)

lee can also publish a résumé variant (a version tailored to a region or role) when its "publish to portfolio" toggle is on. It commits `variants/<slug>.json` with `chore(profile): sync variant <slug> from lee`, using the same sha check as `profile.json`. Unpublishing deletes the file with `chore(profile): remove variant <slug> (lee)`.

- **Format:** the same as `profile.json`, checked against the same schema and cross-checks. It holds only the variant's items and highlights; `basics.label` is the variant's headline and `basics.summary` its summary. `meta.canonical` must be the file's own address, `https://<site>/variants/<slug>.json`.
- **Slug:** lowercase letters, digits and `-`, up to 60 characters. Any other file in `variants/` fails the build.
- **Page:** the build renders `resume/<slug>.html` from the same template and stylesheet as `resume.html`, with a "Tailored résumé" label, a canonical link to `https://<site>/resume/<slug>.html` and `noindex`. The page sits one folder down, so it sets `<base href="../">` and its "Back to top" link names its own path.
- **Removal:** when `variants/<slug>.json` is gone, the build deletes `resume/<slug>.html`. It only deletes pages it generated (they start with the "Generated from" comment). Any other file in `resume/` fails the build instead of being deleted.

### Format

The file follows [JSON Resume](https://jsonresume.org/schema) **v1.2.1** (its `$schema` points there), so any JSON Resume tool can read it.

- `basics`: `name`, `label`, `email`, `url`, `summary` and `profiles`. A LinkedIn profile and a GitHub profile are required because the footer uses them. The contact line lists the profiles in file order.
- `work`: `name`, `location`, `position`, `startDate`, `endDate` (leave it out for "Present") and `highlights` (one bullet each, rendered verbatim).
- `projects`: `name`, `description` (shown as "name – description"), `keywords` (the stack on the right), `highlights` and an optional `url`.
- `skills`: `name` (the row label) and `keywords`.
- `education`: `institution`, `studyType`, `area` (shown as "studyType in area"), `startDate` and `endDate`.
- `meta`: `canonical`, `version` (semver) and `lastModified` (`YYYY-MM-DDThh:mm:ss`).

Dates use JSON Resume's `YYYY`, `YYYY-MM` or `YYYY-MM-DD` and render as "Dec 2025" or "2021". Text is copied verbatim and HTML-escaped, so write plain text. Curly quotes and dashes are fine.

Other JSON Resume fields (such as `basics.location`, `phone` or `volunteer`) are allowed but the résumé page doesn't show them.

Site-specific data lives in `meta.x-portfolio`. JSON Resume allows extra `meta` fields. This block is strict, so an unknown key fails the build.

- `schemaVersion`: `1`.
- `displayName`: the short name in page titles and the header ("Mohamed Shamil").
- `order`: the display order per section, as lists of keys. `work`, `projects` and `skills` items are keyed by `name`, and `education` items by `institution`. Listed items come first, in list order, and unlisted items follow in file order. An unknown key fails the build.
- `caseStudies`: `{ id, title, url, work, highlight }`. Links a case study to a work item (by `name`) and to one of its `highlights` (a 0-based index). The résumé doesn't show it; it's there for lee and other readers.
- `quickView`: the 60-second view on the home page. It has `role`, `line`, `results` and `skills`. Each result has a `lead`, a `text` and an optional `link: { label, href, closesDialog }`. `href` is a page like `case-x.html` or `index.html#id`, or an `https://` URL.

## Build

```bash
node scripts/build-resume.mjs           # validate profile.json and variants/, then write resume.html, the 60-second view and resume/<slug>.html
node scripts/build-resume.mjs --check   # validate, and fail if a generated page is stale, missing or has no variant left
node --test "scripts/test/*.test.mjs"  # unit and CLI tests
```

It needs Node 18+ and no packages. The build checks `profile.json` and every `variants/*.json` against `scripts/profile.schema.json` with a small hand-written JSON Schema validator (`scripts/lib/validate.mjs`). Then it cross-checks that keys in `order` and `caseStudies` exist, names are unique, and no end date comes before its start date.

**Nothing is written unless every check passes.** Any problem exits non-zero and lists what's wrong, for example `/work/0/startDate: "soon" does not match ...`.

After lee syncs, the **Regenerate pages** workflow (see [Keeping the committed pages in sync](#keeping-the-committed-pages-in-sync)) commits the regenerated pages back, so the committed `resume.html` catches up shortly after. `--check` reports any lag. The live site is always rebuilt by Vercel.

## Deploy

Vercel serves the repository root as a static site. `vercel.json` sets:

- `framework: null` ("Other") and `installCommand: ""`, because there is nothing to install.
- `buildCommand: node scripts/build-resume.mjs`, which regenerates the pages from `profile.json` on every push.
- `outputDirectory: "."`, which serves the whole repository root.
- `ignoreCommand`, which skips the build for the Regenerate pages workflow's own commit (see [Keeping the committed pages in sync](#keeping-the-committed-pages-in-sync)). The command exits 0 to skip and non-zero to build, so if git fails for any reason, Vercel builds.
- Headers for `/profile.json` and `/variants/*`: `Content-Type: application/json`, `Cache-Control: public, max-age=300` and CORS `*`. It's the same public information that's already on the site. `/variants/*` and `/resume/*` also send `X-Robots-Tag: noindex`.

If `profile.json` or a variant is invalid, the build fails and the deployment isn't promoted, so **the previous deployment stays live**. The failed build's log lists the problems.

`.vercelignore` keeps this README, the tests, the workflow and repo config files off the public site.
