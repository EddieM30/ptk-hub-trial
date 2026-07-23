# PTK Wants to Know

Trial-run engagement site for Phi Theta Kappa, Alpha Iota Beta Chapter (Reynolds Community College).

> **Status: trial build, not a final production launch.** Several sections use
> placeholder content on purpose (see "What's real vs. placeholder" below).
> This trial exists to test whether a centralized, PTK-owned engagement system
> is worth building out officially.

## Sections

| Section | Sign-in required? | Status |
|---|---|---|
| Speak Up | No | Placeholder questions, real submission pipeline |
| Show Up | No (sign-in only to check in) | Placeholder events, real QR + attendance tracking |
| Your Reynolds | No | Placeholder only — "Under Construction" |
| My Passport | Yes (`@email.vccs.edu` only) | Real, live spreadsheet-backed dashboard |

## Architecture

- **Frontend:** static HTML/CSS/vanilla JS, hosted on GitHub Pages.
- **Backend/data:** Google Sheets, accessed only through a Google Apps Script
  Web App (`apps-script/Code.gs`) acting as a small REST-style API. There is
  no other backend and no database beyond the Sheet.
- **Auth:** Google Identity Services, used only on the My Passport page.
  Access is restricted to `@email.vccs.edu` addresses. The client-side domain
  hint is a UI nicety only — the Apps Script backend independently verifies
  the signed-in user's email domain via Google's tokeninfo endpoint before
  ever reading or writing a user row. Never trust the frontend check alone.

Full setup steps for the Google Sheet, Apps Script deployment, and OAuth
Client ID live in [`apps-script/DEPLOYMENT.md`](apps-script/DEPLOYMENT.md).

## Repo layout

```
index.html            hub landing page
speak-up/              Speak Up feedback form
show-up/                Show Up event hub + QR check-in
your-reynolds/          placeholder page
my-passport/            sign-in gated dashboard
assets/css/             design tokens, base styles, shared components
assets/js/               shared JS (nav, api client, auth, per-page logic)
apps-script/             backend source + deployment docs
test-spike/              throwaway CORS/auth round-trip test (see below)
```

## What's real vs. placeholder (this phase)

- **Real:** Speak Up submission pipeline, Show Up QR generation + attendance
  logging + duplicate-checkin guard, My Passport dashboard (live spreadsheet
  data, milestone logic driven by config).
- **Placeholder, by design:** Speak Up questions, Show Up event list, Your
  Reynolds content, My Passport milestone thresholds/prizes. All of these are
  config-driven so real values can be swapped in later without touching logic.

## Local development

This is a static site — no build step. Serve the folder with any static
server and open it in a browser, e.g.:

```
npx serve .
```

Before anything in `show-up/` or `my-passport/` will work, you need a
deployed Apps Script Web App and a Google OAuth Client ID — see
[`apps-script/DEPLOYMENT.md`](apps-script/DEPLOYMENT.md). Drop the resulting
values into `assets/js/config.js`.

### Validate the backend round-trip first

Before trusting any of the sign-in/attendance features, open
`test-spike/index.html` and confirm the full round trip — sign in, write a
test row, read it back — actually works against your deployed Apps Script
Web App. This project's biggest technical risk is inconsistent CORS behavior
between a GitHub Pages frontend and an Apps Script Web App backend; this
spike is how that risk gets retired before the real pages are built on top
of it.

## Migrating to a PTK-owned account later

This trial is built under a personal GitHub account and a personal Google
account (for the Sheet + Apps Script). Nothing in the code hardcodes either
account:

- The frontend never hardcodes a GitHub Pages URL — check-in deep links are
  built at runtime from `location.origin`/`location.pathname`.
- The only Google-account-specific value the frontend knows about is the
  Apps Script Web App URL and the OAuth Client ID, both in
  `assets/js/config.js` — neither is a secret (see below), so migrating means
  redeploying the Sheet/Apps Script under the new account and updating those
  two config values.
- Transferring the GitHub repo to a chapter-owned org/account is a normal
  GitHub repo transfer; no code changes needed.

## On "secrets"

This repo is public (a requirement of the free GitHub Pages tier). No
credentials are committed. The Apps Script Web App URL and the Google OAuth
Client ID are both visible to anyone using the site by design (a Client ID is
always public; a Web App URL is not a real access control) — the actual
security boundary is the domain-verification check the backend performs on
every write, not secrecy of these values.

## Third-party code

- QR code generation: vendored copy of `qrcode-generator` by Kazuhiko Arase
  (MIT License) in `assets/js/vendor/qrcode.js`.
