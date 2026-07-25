// Shared admin-gate logic for every /admin/ page. This is a UX gate only —
// the real enforcement is firestore.rules' isAdmin() check on each admin
// collection; this module just decides what the page shows.
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { onAuthChange, signInWithGoogle, signOutUser } from "./auth.js";

/**
 * @param {object} els - { signedOutEl, notAdminEl, contentEl, signInBtn, signOutBtn, notAdminSignOutBtn, notAdminInfoEl }
 *   notAdminInfoEl (optional): shown the signed-in user's uid/email so they
 *   can compare it exactly against the Firestore admins/{uid} doc — the
 *   most common failure mode here is a copy-paste mismatch, and this makes
 *   it visible instead of leaving both "wrong uid" and "correctly not an
 *   admin" looking identical.
 * @param {(user: import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js").User) => void} onReady
 *   Called every time an admin is confirmed signed in (including on auth
 *   state changes) — content pages should treat this as "(re)load my data."
 */
export function initAdminGuard(els, onReady) {
  const { signedOutEl, notAdminEl, contentEl, signInBtn, signOutBtn, notAdminSignOutBtn, notAdminInfoEl } = els;

  function showOnly(el) {
    [signedOutEl, notAdminEl, contentEl].forEach((e) => {
      if (e) e.hidden = e !== el;
    });
  }

  onAuthChange(async (user) => {
    if (!user) {
      showOnly(signedOutEl);
      return;
    }
    try {
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (!adminDoc.exists()) {
        if (notAdminInfoEl) {
          notAdminInfoEl.textContent = `Signed in as ${user.email} — UID: ${user.uid}`;
        }
        showOnly(notAdminEl);
        return;
      }
    } catch (err) {
      if (notAdminInfoEl) {
        notAdminInfoEl.textContent = `Signed in as ${user.email} — UID: ${user.uid}. Error checking admin status: ${err.message}`;
      }
      showOnly(notAdminEl);
      return;
    }
    showOnly(contentEl);
    if (onReady) onReady(user);
  });

  if (signInBtn) {
    signInBtn.addEventListener("click", () => {
      signInWithGoogle().catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Admin sign-in failed:", err);
      });
    });
  }
  if (signOutBtn) signOutBtn.addEventListener("click", () => signOutUser());
  if (notAdminSignOutBtn) notAdminSignOutBtn.addEventListener("click", () => signOutUser());
}
