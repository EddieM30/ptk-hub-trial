# Firebase setup (do this yourself — one-time, in your Google/Firebase account)

This is manual because it happens inside the Firebase console and GitHub's
web UI, which nothing in this repo can reach for you. Follow these steps in
order — none of them are destructive, so don't worry about getting it
perfect the first time.

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) and
   click **Add project**. Name it something like `ptk-wants-to-know-trial`.
   You can skip Google Analytics for this trial — it isn't used.
2. Confirm the project is on the **Spark (free, no billing account)** plan.
   Nothing in this build requires Blaze — that's a deliberate design choice
   (Cloud Functions, which need Blaze, are intentionally not used).

## 2. Enable Google sign-in

1. In the console, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Google** as a provider. Set a project
   support email (required by Google's consent screen) — your own email is
   fine for this trial.
3. You do **not** need to configure authorized domains yet for local
   testing (`localhost` is allowed by default); once you have a Firebase
   Hosting URL (Phase 3), it's added automatically.

## 3. Create the Firestore database

1. Go to **Build → Firestore Database → Create database**.
2. Choose **Production mode** (starts locked-down; real access rules are
   provided in `firestore.rules` in this repo, not the console defaults).
3. Pick a location close to Virginia (e.g. `us-east1` or `us-east4`) —
   this can't be changed later, but it has no bearing on functionality for
   a project this size.

You don't need to create any collections by hand — the app creates
`users/{uid}` and `users/{uid}/attendance/{event_id}` documents itself the
first time someone signs in / checks in. Event data lives in the site's
code, not in Firestore (see `assets/js/config.js` once Phase 7 lands).

## 4. Register a Web App and get your config

1. In **Project settings** (gear icon, top left) → **General** tab, scroll
   to **Your apps** → click the **Web** icon (`</>`).
2. Give it a nickname (e.g. `ptk-web`) — Firebase Hosting setup can be
   skipped/deferred here, it's wired up separately in Phase 3.
3. Copy the `firebaseConfig` object it shows you — it looks like:

   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...firebaseapp.com",
     projectId: "...",
     storageBucket: "...appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

   **Send this whole object back** so it can go into
   `assets/js/firebase-config.js`. None of these values are secret — see
   the "On secrets" section of the main README for why.

## 5. Note your project ID

You'll need the **Project ID** (shown in Project settings → General, and
visible in the `firebaseConfig` you copied above) for `.firebaserc` in
Phase 3. It's not a credential — just an identifier.

## What you'll hand back after this phase

- The full `firebaseConfig` object from step 4.
- Your Firebase **Project ID** (also visible inside that same object).

## Later phases that also need you

- **Phase 2** — you'll create an empty public GitHub repo and send back its
  URL so the existing local commits can be pushed.
- **Phase 3** — you'll authorize Firebase's GitHub connection (or add a
  service-account key as a GitHub Actions secret) so pushes to `main`
  auto-deploy to Firebase Hosting. Exact steps will be written once we get
  there.
- **Phase 4** — you'll run the smoke test against this live project and
  confirm both an allowed write and a deliberately-denied write behave
  correctly, before any real page is built on top of it.

## Later: migrating to a PTK-owned account

When this trial graduates to a real chapter-owned build, repeat steps 1–4
under the chapter's Google/Firebase account, then swap the `firebaseConfig`
values in `assets/js/firebase-config.js` and the project ID in
`.firebaserc`. Nothing else in the codebase references your personal
account.
