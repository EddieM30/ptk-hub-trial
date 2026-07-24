import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../assets/js/firebase-init.js";
import {
  onAuthChange,
  signInWithGoogle,
  isAllowedEmail,
  ALLOWED_EMAIL_DOMAIN,
} from "../assets/js/auth.js";

const eventsListEl = document.getElementById("events-list");
const statusEl = document.getElementById("checkin-status");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

async function loadEvents() {
  const snap = await getDocs(query(collection(db, "events"), orderBy("date")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function renderEvents(events) {
  eventsListEl.innerHTML = "";
  if (events.length === 0) {
    eventsListEl.innerHTML = `<p>No events posted yet — check back soon.</p>`;
    return;
  }
  events.forEach((event) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(event.name)}</h3>
      <p class="tag">${escapeHtml(formatDate(event.date))} &middot; ${escapeHtml(event.location)}</p>
      <p>${escapeHtml(event.description)}</p>
    `;
    eventsListEl.appendChild(card);
  });
}

function setStatus(html) {
  statusEl.hidden = false;
  statusEl.innerHTML = html;
}

async function performCheckin(user, event) {
  const ref = doc(db, "users", user.uid, "attendance", event.id);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      setStatus(`<p>You're already checked in for <strong>${escapeHtml(event.name)}</strong> — no need to scan again.</p>`);
      return;
    }
    await setDoc(ref, { timestamp: serverTimestamp() });
    setStatus(`<p>You're checked in for <strong>${escapeHtml(event.name)}</strong>. See you there!</p>`);
  } catch (err) {
    setStatus(`<p class="form-error">Check-in failed: ${escapeHtml(err.message)}</p>`);
  }
}

function runCheckinFlow(event) {
  setStatus(`<p>Checking you in for <strong>${escapeHtml(event.name)}</strong>&hellip;</p>`);
  onAuthChange((user) => {
    if (!user) {
      setStatus(`
        <p>Sign in to check in for <strong>${escapeHtml(event.name)}</strong>.</p>
        <button class="btn" id="checkin-sign-in-btn" type="button">Sign in with Google</button>
      `);
      const btn = document.getElementById("checkin-sign-in-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          signInWithGoogle().catch((err) => {
            setStatus(`<p class="form-error">Sign-in failed: ${escapeHtml(err.message)}</p>`);
          });
        });
      }
      return;
    }

    if (!isAllowedEmail(user.email)) {
      setStatus(`<p class="form-error">Check-ins are limited to @${escapeHtml(ALLOWED_EMAIL_DOMAIN)} accounts. You're signed in as ${escapeHtml(user.email)}.</p>`);
      return;
    }

    performCheckin(user, event);
  });
}

async function init() {
  let events = [];
  try {
    events = await loadEvents();
  } catch (err) {
    eventsListEl.innerHTML = `<p class="form-error">Couldn't load events: ${escapeHtml(err.message)}</p>`;
    return;
  }
  renderEvents(events);

  const params = new URLSearchParams(location.search);
  if (params.get("checkin") === "1") {
    const eventId = params.get("event");
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      setStatus(`<p class="form-error">That event QR code doesn't match a known event. If you scanned this recently, let an officer know.</p>`);
    } else {
      runCheckinFlow(event);
    }
  }
}

init();
