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

## 6. Wire up GitHub Actions auto-deploy (Phase 3)

The workflow file (`.github/workflows/firebase-hosting-deploy.yml`) and
`firebase.json` are already in the repo. The one thing that can't be
scripted here is giving GitHub Actions permission to deploy to your Firebase
project:

1. In the [Firebase console](https://console.firebase.google.com/) → your
   project → **Project settings** (gear icon) → **Service accounts** tab.
2. Under "Firebase Admin SDK", click **Generate new private key**. Confirm
   — this downloads a JSON file to your computer. Keep track of where it
   saved; you'll paste its contents in the next step and then can delete it.
3. Go to your GitHub repo → **Settings → Secrets and variables → Actions →
   New repository secret**.
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_PTK_WANTS_TO_KNOW_TRIAL`
   - **Value:** open the downloaded JSON file in a text editor, select all,
     and paste the entire contents in.
4. Save the secret, then delete the downloaded JSON file from your
   computer — it's now stored only as an encrypted GitHub Actions secret,
   never in the repo.
5. Push (or re-push) to `main` and check the **Actions** tab on GitHub —
   you should see "Deploy to Firebase Hosting on merge" run and succeed.
   Your site will then be live at `https://ptk-wants-to-know-trial.web.app`.

This service account has broad (Editor) access to the Firebase project —
acceptable for a trial project with no other sensitive cloud resources in
it, but worth tightening to a narrower "Firebase Hosting Admin" role via
Google Cloud IAM if this ever handles anything more sensitive.

## 7. Run the smoke test (Phase 4 — hard gate)

Once you've pushed to `main` at least once after Phase 3 (so both the real
`firestore.rules` and the Hosting site are deployed), open the live smoke
test at `https://ptk-wants-to-know-trial.web.app/smoke-test/` (or serve the
repo locally with `npx serve .` and open `smoke-test/index.html` — Firebase
allows `localhost` by default, no extra config needed).

Sign in with whatever Google account you have handy and run all four tests.
Read each result carefully:

- **Test 1** (own profile doc) is expected to come back **ALLOWED** only if
  you signed in with an `@email.vccs.edu` address — if you used a personal
  Gmail, seeing **DENIED** here is correct, not a bug.
- **Tests 2–4** should always come back **DENIED**/blocking-duplicates as
  described on the page, regardless of which account you used. If any of
  them says "SECURITY BUG" in red, stop and flag it before Phase 5 proceeds
  — that means a rule isn't enforcing what it should.

Once you have access to a real `@email.vccs.edu` account, re-run test 1
with it to confirm the allowed path also works end to end.

## Later: migrating to a PTK-owned account

When this trial graduates to a real chapter-owned build, repeat steps 1–4
under the chapter's Google/Firebase account, then swap the `firebaseConfig`
values in `assets/js/firebase-config.js` and the project ID in
`.firebaserc`. Nothing else in the codebase references your personal
account.
