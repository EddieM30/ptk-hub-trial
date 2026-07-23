// Google sign-in via Firebase Auth, shared by Show Up (check-in) and My
// Passport. `isAllowedEmail` here is a UX nicety only (lets us show a
// friendly "wrong account" message) — the real enforcement is in
// firestore.rules, which independently checks request.auth.token.email
// server-side. Never treat this client-side check as the security boundary.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { auth } from "./firebase-init.js";

export const ALLOWED_EMAIL_DOMAIN = "email.vccs.edu";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN });

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function isAllowedEmail(email) {
  return (
    typeof email === "string" &&
    email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
  );
}
