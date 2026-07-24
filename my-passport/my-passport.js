import {
  doc,
  getDoc,
  setDoc,
  collection,
  getCountFromServer,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../assets/js/firebase-init.js";
import {
  onAuthChange,
  signInWithGoogle,
  signOutUser,
  isAllowedEmail,
  ALLOWED_EMAIL_DOMAIN,
} from "../assets/js/auth.js";
import { MILESTONES } from "../assets/js/config.js";

const errorEl = document.getElementById("passport-error");
const signedOutEl = document.getElementById("passport-signed-out");
const wrongDomainEl = document.getElementById("passport-wrong-domain");
const wrongDomainMessageEl = document.getElementById("passport-wrong-domain-message");
const dashboardEl = document.getElementById("passport-dashboard");
const welcomeEl = document.getElementById("passport-welcome");
const totalEl = document.getElementById("passport-total");
const nextMilestoneEl = document.getElementById("passport-next-milestone");
const milestonesEl = document.getElementById("passport-milestones");
const signInBtn = document.getElementById("passport-sign-in-btn");
const signOutBtn = document.getElementById("passport-sign-out-btn");
const wrongDomainSignOutBtn = document.getElementById("passport-wrong-domain-sign-out-btn");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function showOnly(el) {
  [signedOutEl, wrongDomainEl, dashboardEl].forEach((e) => {
    e.hidden = e !== el;
  });
}

async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const profile = {
    email: user.email,
    display_name: user.displayName || "",
    created_at: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

async function getTotalEvents(uid) {
  const attendanceRef = collection(db, "users", uid, "attendance");
  const snap = await getCountFromServer(attendanceRef);
  return snap.data().count;
}

function renderNextMilestone(total) {
  const next = MILESTONES.find((m) => total < m.threshold);
  if (!next) {
    nextMilestoneEl.textContent = "You've unlocked every milestone in this trial. Nice work.";
    return;
  }
  const remaining = next.threshold - total;
  nextMilestoneEl.textContent = `${remaining} more event${remaining === 1 ? "" : "s"} until "${next.label}".`;
}

function renderMilestones(total) {
  milestonesEl.innerHTML = "";
  MILESTONES.forEach((m) => {
    const unlocked = total >= m.threshold;
    const card = document.createElement("div");
    card.className = `card${unlocked ? "" : " milestone-card--locked"}`;
    card.innerHTML = `
      <h3>${unlocked ? escapeHtml(m.badge) : "&#x1F512;"} ${escapeHtml(m.label)}</h3>
      <p>${unlocked ? "Unlocked" : `${m.threshold} event${m.threshold === 1 ? "" : "s"} needed`}</p>
      <p class="tag">${escapeHtml(m.prize)}</p>
    `;
    milestonesEl.appendChild(card);
  });
}

async function loadDashboard(user) {
  try {
    const profile = await ensureUserDoc(user);
    const total = await getTotalEvents(user.uid);
    welcomeEl.textContent = `Welcome, ${profile.display_name || user.email}.`;
    totalEl.textContent = String(total);
    renderNextMilestone(total);
    renderMilestones(total);
    showOnly(dashboardEl);
  } catch (err) {
    showError(`Couldn't load your passport: ${err.message}`);
  }
}

onAuthChange((user) => {
  clearError();
  if (!user) {
    showOnly(signedOutEl);
    return;
  }
  if (!isAllowedEmail(user.email)) {
    wrongDomainMessageEl.textContent = `My Passport is limited to @${ALLOWED_EMAIL_DOMAIN} accounts. You're signed in as ${user.email}.`;
    showOnly(wrongDomainEl);
    return;
  }
  loadDashboard(user);
});

signInBtn.addEventListener("click", () => {
  signInWithGoogle().catch((err) => showError(`Sign-in failed: ${err.message}`));
});

signOutBtn.addEventListener("click", () => signOutUser());
wrongDomainSignOutBtn.addEventListener("click", () => signOutUser());
