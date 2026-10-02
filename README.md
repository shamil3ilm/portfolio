# Portfolio — Mohamed Shamil

Live at **[mohamed3shamil.vercel.app](https://mohamed3shamil.vercel.app/)**.

A static site: plain HTML, CSS and JavaScript. Every page is committed ready to serve, so the site works with no build. On Vercel, a tiny zero-dependency build regenerates the résumé from `profile.json` (see below).

## Files

- `index.html` — home page (hero, game, work, projects, contact) and the 60-second view
- `case-delegated-access.html`, `case-recurring-safeguards.html` — case studies
- `profile.json` — **the source of truth for my public profile details** (JSON Resume format), served at `/profile.json`
- `resume.html` — résumé page, **generated from `profile.json`**; "Save as PDF" prints a one-page résumé
- `scripts/build-resume.mjs` — validates `profile.json`, then renders `resume.html` and the 60-second view in `index.html`. `scripts/lib/` holds the validator and the renderer, `scripts/*.template.html` the page templates, `scripts/profile.schema.json` the schema and `scripts/test/` the tests
- `styles.css` — layout, light/dark themes, responsive rules
- `script.js` — theme toggle and contact form (Web3Forms)
- `patrol.js` — Risk Review Desk, the home page game (review ten items, release or hold each with a reason, get a shift report)
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

**Don't edit `profile.json` here directly**, except in an emergency. A manual edit is safe: before its next write, lee compares the file's sha with the one it last wrote, notices the change and asks me what to do.

Don't edit `resume.html` or the marked 60-second view block in `index.html` by hand either. The next build overwrites them.

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
node scripts/build-resume.mjs           # validate profile.json, then write resume.html and the 60-second view
node scripts/build-resume.mjs --check   # validate, and fail if the committed pages don't match profile.json
node --test scripts/test/               # unit and CLI tests
```

It needs Node 18+ and no packages. The build checks `profile.json` against `scripts/profile.schema.json` with a small hand-written JSON Schema validator (`scripts/lib/validate.mjs`). Then it cross-checks that keys in `order` and `caseStudies` exist, names are unique, and no end date comes before its start date.

**Nothing is written unless every check passes.** Any problem exits non-zero and lists what's wrong, for example `/work/0/startDate: "soon" does not match ...`.

After lee syncs, the committed `resume.html` lags behind `profile.json` until someone runs the build locally and commits the result. `--check` reports this. The live site is always rebuilt by Vercel.

## Deploy

Vercel serves the repository root as a static site. `vercel.json` sets:

- `framework: null` ("Other") and `installCommand: ""`, because there is nothing to install.
- `buildCommand: node scripts/build-resume.mjs`, which regenerates the pages from `profile.json` on every push.
- `outputDirectory: "."`, which serves the whole repository root.
- Headers for `/profile.json`: `Content-Type: application/json`, `Cache-Control: public, max-age=300` and CORS `*`. It's the same public information that's already on the site.

If `profile.json` is invalid, the build fails and the deployment isn't promoted, so **the previous deployment stays live**. The failed build's log lists the problems.

`.vercelignore` keeps this README, the tests and repo config files off the public site.
