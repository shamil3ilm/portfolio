# Portfolio — Mohamed Shamil

Live at **[mohamed3shamil.vercel.app](https://mohamed3shamil.vercel.app/)**.

A static site: plain HTML, CSS and JavaScript, with no build step.

## Files

- `index.html` — home page (hero, game, work, projects, contact) and the 60-second view
- `case-delegated-access.html`, `case-recurring-safeguards.html` — case studies
- `resume.html` — résumé page; "Save as PDF" prints a one-page résumé
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
- `quick-view.js` — the 60-second summary dialog (also opens from `index.html?view=quick`)
- `palette.js` — command palette (Ctrl+K or /) to jump to any section, demo, tool or action
- `achievements.js` — the 17 challenges and the 🏆 progress counter (progress is stored only in the visitor's browser)
- `favicon.svg`, `og-image.png` — icon and link-preview image

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

## Deploy

Vercel serves the repository root as a static site (`vercel.json` sets the framework to "Other", so there is no build).
`.vercelignore` keeps this README and repo config files off the public site.
