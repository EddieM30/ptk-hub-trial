import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../assets/js/firebase-init.js";
import {
  signInWithGoogle,
  signOutUser,
  onAuthChange,
  isAllowedEmail,
} from "../assets/js/auth.js";

const whoamiEl = document.getElementById("whoami");
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const testButtons = document.querySelectorAll(".run-test");

let currentUser = null;

onAuthChange((user) => {
  currentUser = user;
  if (user) {
    const domainNote = isAllowedEmail(user.email)
      ? "(matches @email.vccs.edu)"
      : "(does NOT match @email.vccs.edu — domain-restricted tests should come back DENIED)";
    whoamiEl.textContent = `Signed in as ${user.email} ${domainNote}`;
    signInBtn.disabled = true;
    signOutBtn.disabled = false;
    testButtons.forEach((btn) => (btn.disabled = false));
  } else {
    whoamiEl.textContent = "Not signed in.";
    signInBtn.disabled = false;
    signOutBtn.disabled = true;
    testButtons.forEach((btn) => (btn.disabled = true));
  }
});

signInBtn.addEventListener("click", () => {
  signInWithGoogle().catch((err) => {
    whoamiEl.textContent = `Sign-in failed: ${err.message}`;
  });
});

signOutBtn.addEventListener("click", () => signOutUser());

function report(testName, { outcome, expected, detail }) {
  const el = document.getElementById(`result-${testName}`);
  const pass = outcome === expected;
  el.className = `result ${pass ? "pass" : "fail"}`;
  el.textContent = `${pass ? "PASS" : "FAIL"} — outcome: ${outcome} (expected: ${expected})\n${detail || ""}`;
}

function isPermissionDenied(err) {
  return err && err.code === "permission-denied";
}

const tests = {
  async ownProfile() {
    const uid = currentUser.uid;
    const ref = doc(db, "users", uid);
    const expectedAllowed = isAllowedEmail(currentUser.email);
    try {
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        await setDoc(ref, {
          email: currentUser.email,
          display_name: currentUser.displayName || "(none)",
          created_at: serverTimestamp(),
        });
        await getDoc(ref);
      }
      report("ownProfile", {
        outcome: "allowed",
        expected: expectedAllowed ? "allowed" : "denied",
        detail: existing.exists()
          ? "Doc already existed from a previous run; read succeeded, which itself confirms the domain rule allowed access."
          : "Created and read back successfully.",
      });
    } catch (err) {
      if (!isPermissionDenied(err)) throw err;
      report("ownProfile", {
        outcome: "denied",
        expected: expectedAllowed ? "allowed" : "denied",
        detail: `permission-denied: ${err.message}`,
      });
    }
  },

  async spoofedEmail() {
    const uid = currentUser.uid;
    const ref = doc(db, "users", uid);
    try {
      await setDoc(ref, {
        email: "spoofed@example.com",
        display_name: "Spoof Test",
        created_at: serverTimestamp(),
      });
      report("spoofedEmail", {
        outcome: "allowed",
        expected: "denied",
        detail: "SECURITY BUG: a spoofed email was accepted. Check the create rule on /users/{userId}.",
      });
    } catch (err) {
      if (!isPermissionDenied(err)) throw err;
      report("spoofedEmail", {
        outcome: "denied",
        expected: "denied",
        detail: `permission-denied: ${err.message}`,
      });
    }
  },

  async crossUser() {
    const fakeUid = `not-a-real-uid-${Date.now()}`;
    const ref = doc(db, "users", fakeUid);
    try {
      await setDoc(ref, {
        email: currentUser.email,
        display_name: "Cross-user test",
        created_at: serverTimestamp(),
      });
      report("crossUser", {
        outcome: "allowed",
        expected: "denied",
        detail: "SECURITY BUG: wrote to another user's doc path. Check isOwner() in firestore.rules.",
      });
    } catch (err) {
      if (!isPermissionDenied(err)) throw err;
      report("crossUser", {
        outcome: "denied",
        expected: "denied",
        detail: `permission-denied: ${err.message}`,
      });
    }
  },

  async duplicateCheckin() {
    const uid = currentUser.uid;
    const eventId = `smoke-test-${Date.now()}`;
    const ref = doc(db, "users", uid, "attendance", eventId);
    const expectedAllowed = isAllowedEmail(currentUser.email);
    const lines = [];
    try {
      await setDoc(ref, { timestamp: serverTimestamp() });
      lines.push(`1st write: allowed (expected ${expectedAllowed ? "allowed" : "denied"})`);
      if (!expectedAllowed) {
        report("duplicateCheckin", {
          outcome: "allowed",
          expected: "denied",
          detail: lines.join("\n") + "\nSECURITY BUG: non-domain account was allowed to write attendance.",
        });
        return;
      }
    } catch (err) {
      if (!isPermissionDenied(err)) throw err;
      lines.push(`1st write: denied (expected ${expectedAllowed ? "allowed" : "denied"})`);
      report("duplicateCheckin", {
        outcome: "denied",
        expected: expectedAllowed ? "allowed" : "denied",
        detail: lines.join("\n"),
      });
      return;
    }
    try {
      await setDoc(ref, { timestamp: serverTimestamp() });
      lines.push("2nd write (duplicate): allowed — SECURITY BUG, duplicate checkins are not blocked.");
      report("duplicateCheckin", { outcome: "allowed", expected: "denied", detail: lines.join("\n") });
    } catch (err) {
      if (!isPermissionDenied(err)) throw err;
      lines.push("2nd write (duplicate): denied, as expected.");
      report("duplicateCheckin", { outcome: "denied", expected: "denied", detail: lines.join("\n") });
    }
  },
};

testButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await tests[btn.dataset.test]();
    } catch (err) {
      report(btn.dataset.test, {
        outcome: "error",
        expected: "n/a",
        detail: `Unexpected error (not permission-denied): ${err.message}`,
      });
    } finally {
      btn.disabled = false;
    }
  });
});
