# Roll Call

Trial-run engagement site for a student organization chapter.

> **Status: trial build, not a final production launch.** Several sections use
> placeholder content on purpose (see "What's real vs. placeholder" below).
> This trial exists to test whether a centralized, chapter-owned engagement
> system is worth building out officially.

## Sections

| Section | Sign-in required? | Status |
|---|---|---|
| Speak Up | No | Placeholder questions, real submission pipeline |
| Show Up | No (sign-in only to check in) | Real, admin-managed events; QR codes are admin-only (see below), not shown on this page |
| Shout Out | No | Placeholder only — "Under Construction" |
| My Passport | Yes (`@email.vccs.edu` only) | Real, live Firestore-backed dashboard |
| Admin (`/admin/`) | Yes (admin allowlist) | Real: events, users, spotlight drafts, metrics |

## Architecture

- **Frontend:** static HTML/CSS/vanilla JS, hosted on **Firebase Hosting**
  (free Spark plan), deployed automatically via a GitHub Actions workflow on
  every push to `main`. Source lives in this GitHub repo.
- **Backend/data:** **Cloud Firestore** (Firebase's NoSQL database), free
  Spark tier. There is no other backend and no Cloud Functions — deliberately,
  since Cloud Functions require a billing-enabled (Blaze) plan even for
  free-tier usage, and this project doesn't need one.
- **Auth:** **Firebase Authentication** with the Google sign-in provider,
  used only on the My Passport page and for Show Up check-ins. Access to
  writing user/attendance data is restricted to `@email.vccs.edu` addresses.
  This is enforced by **Firestore Security Rules** reading
  `request.auth.token.email` — a value Firebase Auth itself verifies
  server-side during sign-in — not by any client-side check. Rules are the
  actual security boundary; the client never has to be trusted.

Full setup steps for the Firebase project, Firestore, and the GitHub Actions
deploy wiring live in [`firebase/DEPLOYMENT.md`](firebase/DEPLOYMENT.md).

## Admin dashboard

`/admin/` is a small internal section for officers — not linked from the
main nav, just a small "Admin" link in every public page's footer (real
access control is Firestore rules, not link visibility). It reuses the same
Google sign-in as My Passport.

- **`/admin/events/`** — create/edit/delete events (this is now the only
  source of the public Show Up event list — there's no static config array
  anymore) and generate/print a QR code per event for physical posting.
  QR codes are **not** shown anywhere on the public site.
- **`/admin/users/`** — search the user directory, view each user's
  check-in history, fix a display name, remove a mistaken check-in.
- **`/admin/spotlights/`** — draft spotlight entries. Nothing here is
  public yet; Shout Out still shows its placeholder regardless of what's
  drafted. Presentation-only for now.
- **`/admin/metrics/`** — attendance/signup/feedback trends filterable by
  date range, event, and time-series granularity, computed live in the
  browser from Firestore (no separate analytics backend — fine at trial
  scale, would need a real pipeline if this goes to production volume).

### Granting admin access

There's no self-serve admin signup. To make an account an admin:

1. Have that person sign in once anywhere on the site (so their account
   exists in Firebase Auth) — or find their UID some other way.
2. In the [Firebase console](https://console.firebase.google.com/) →
   Firestore Database → Data tab, create a document at
   `admins/{their-uid}` (any field, even empty, is fine — the document's
   *existence* is what grants access).
3. They can now sign in at `/admin/` and will pass the gate immediately.

Admin status is a Firestore allowlist, not a custom claim — this project
has no Cloud Functions to set claims with, and this approach needs none.

### Events collection starts empty

Since events moved from a static array to Firestore, `/show-up/` will show
nothing until an admin adds events through `/admin/events/`. The original
placeholder events are documented as a comment in `assets/js/config.js`
for quick re-entry.

## Shared header/nav markup

This is a multi-page static site with no templating step, so the header +
hamburger drawer markup is duplicated verbatim at the top of every page's
`<body>` (see `index.html` for the canonical copy). When adding a new page,
copy this block exactly — `assets/js/nav.js` expects these specific IDs:

```html
<a class="skip-link" href="#main">Skip to main content</a>

<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-header__brand" href="/">
      <span class="site-header__mark" aria-hidden="true">&#x2713;</span>
      Roll Call
    </a>
    <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-drawer">
      <span class="visually-hidden">Open menu</span>
      <span class="nav-toggle__bars" aria-hidden="true"></span>
    </button>
  </div>
</header>

<div class="nav-drawer-backdrop" id="nav-drawer-backdrop"></div>
<nav class="nav-drawer" id="site-drawer" aria-label="Main navigation" aria-hidden="true" inert>
  <button type="button" class="nav-drawer__close" id="nav-drawer-close">Close menu</button>
  <ul>
    <li><a href="/">Hub Home</a></li>
    <li><a href="/speak-up/">Speak Up</a></li>
    <li><a href="/show-up/">Show Up</a></li>
    <li><a href="/shout-out/">Shout Out</a></li>
    <li><a href="/my-passport/">My Passport</a></li>
  </ul>
</nav>
```

Then include `assets/css/{tokens,base,components}.css` in `<head>` and
`assets/js/nav.js` (with `defer`) before `</body>`.

## Repo layout

```
index.html            hub landing page
speak-up/              Speak Up feedback form
show-up/                Show Up event hub + check-in handler (no public QR)
shout-out/              placeholder page
my-passport/            sign-in gated dashboard
admin/                  officer-only: events, users, spotlights, metrics
assets/css/             design tokens, base styles, shared components
assets/js/               shared JS (Firebase init, auth, admin-guard, nav,
                         mini-chart, per-page logic)
firebase/                Firebase project setup docs
firestore.rules          security rules — the real access-control layer
firebase.json / .firebaserc   Firebase CLI hosting/project config
.github/workflows/       GitHub Actions auto-deploy to Firebase Hosting
smoke-test/              throwaway sign-in + Firestore round-trip test (see below)
```

## What's real vs. placeholder (this phase)

- **Real:** Speak Up submission pipeline, Show Up attendance logging +
  duplicate-checkin guard, My Passport dashboard (live Firestore data,
  milestone logic driven by config), the entire admin dashboard (events,
  users, metrics all operate on live data).
- **Placeholder, by design:** Speak Up questions, Shout Out content, My
  Passport milestone thresholds/prizes — config-driven so real values can be
  swapped in later without touching logic. Spotlight drafts are real data
  but intentionally not surfaced publicly yet.

## Local development

This is a static site — no build step. Serve the folder with any static
server and open it in a browser, e.g.:

```
npx serve .
```

Before anything in `show-up/` or `my-passport/` will work, you need a live
Firebase project (Auth + Firestore) — see
[`firebase/DEPLOYMENT.md`](firebase/DEPLOYMENT.md). Drop the resulting
`firebaseConfig` values into `assets/js/firebase-config.js`.

### Validate the backend round-trip first

Before trusting any of the sign-in/attendance features, open
`smoke-test/index.html` and confirm: sign-in works, a write to your own
Firestore doc succeeds, and a deliberately-wrong write (wrong domain or
someone else's doc) is actually denied by the security rules — not just
"happens to work." This is the go/no-go gate before the real pages get
built on top of it.

## Migrating to a chapter-owned account later

This trial is built under a personal GitHub account and a personal
Firebase/Google account. Nothing in the code hardcodes either account:

- The frontend never hardcodes a Hosting URL — check-in deep links are
  built at runtime from `location.origin`/`location.pathname`.
- The only Firebase-account-specific values the frontend knows about are the
  `firebaseConfig` object (`assets/js/firebase-config.js`) and the project ID
  (`.firebaserc`) — neither is a secret (see below), so migrating means
  standing up a new Firebase project under the chapter's account and
  swapping those values.
- Transferring the GitHub repo to a chapter-owned org/account is a normal
  GitHub repo transfer; the GitHub Actions secret used for deploys would
  need to be re-added under the new repo, but no code changes are needed.

## On "secrets"

This repo is public (Firebase Hosting's free tier doesn't require a public
repo, but this project stays public by choice for the same transparency
reasons a GitHub Pages site would). No credentials are committed. The
Firebase web config values are visible to anyone using the site by design —
Firebase's public web config is meant to be exposed; it is not an access
control. The actual security boundary is `firestore.rules`, enforced
server-side on every read/write, not secrecy of these values. The one real
secret in this project — the service account credential used by GitHub
Actions to deploy — lives only as a GitHub Actions secret, never in the repo.

## Third-party code

- QR code generation: vendored copy of `qrcode-generator` by Kazuhiko Arase
  (MIT License) in `assets/js/vendor/qrcode.js`.
