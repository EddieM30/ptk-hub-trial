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
| My Passport | Yes (`@email.vccs.edu` only) | Real, live Firestore-backed dashboard |

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

## Repo layout

```
index.html            hub landing page
speak-up/              Speak Up feedback form
show-up/                Show Up event hub + QR check-in
your-reynolds/          placeholder page
my-passport/            sign-in gated dashboard
assets/css/             design tokens, base styles, shared components
assets/js/               shared JS (Firebase init, auth, nav, per-page logic)
firebase/                Firebase project setup docs
firestore.rules          security rules — the real access-control layer
firebase.json / .firebaserc   Firebase CLI hosting/project config
.github/workflows/       GitHub Actions auto-deploy to Firebase Hosting
smoke-test/              throwaway sign-in + Firestore round-trip test (see below)
```

## What's real vs. placeholder (this phase)

- **Real:** Speak Up submission pipeline, Show Up QR generation + attendance
  logging + duplicate-checkin guard, My Passport dashboard (live Firestore
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

## Migrating to a PTK-owned account later

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
