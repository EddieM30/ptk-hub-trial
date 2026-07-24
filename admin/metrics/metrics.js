import {
  collection,
  collectionGroup,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../../assets/js/firebase-init.js";
import { initAdminGuard } from "../../assets/js/admin-guard.js";
import { renderBarChart, renderLegend, renderStatTile } from "../../assets/js/mini-chart.js";
import { MILESTONES } from "../../assets/js/config.js";

// Validated categorical set (dataviz skill default palette, slots 1-5) —
// the site's own brand accents (gold/terracotta/navy) don't give enough
// distinguishable hues for a 5-category chart, so these are used only for
// the genuinely categorical breakdowns below. Single-series bars use the
// brand's --color-link terracotta instead (see mini-chart.js default).
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

const errorEl = document.getElementById("metrics-error");
const rangeSelect = document.getElementById("filter-range");
const granularitySelect = document.getElementById("filter-granularity");
const eventsFieldEl = document.getElementById("filter-events-list");
const statTilesEl = document.getElementById("stat-tiles");

let users = [];
let attendance = []; // { uid, eventId, date: Date }
let feedback = []; // { date: Date, attendance_interest }
let events = []; // { id, name, date }
let spotlightsCount = 0;
let selectedEventIds = new Set();

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

async function loadAll() {
  const [usersSnap, attendanceSnap, feedbackSnap, eventsSnap, spotlightsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collectionGroup(db, "attendance")),
    getDocs(collection(db, "feedback")),
    getDocs(collection(db, "events")),
    getDocs(collection(db, "spotlights")),
  ]);

  users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  attendance = attendanceSnap.docs.map((d) => ({
    uid: d.ref.parent.parent.id,
    eventId: d.id,
    date: d.data().timestamp?.toDate?.() || null,
  })).filter((a) => a.date);

  feedback = feedbackSnap.docs.map((d) => ({
    date: d.data().createdAt?.toDate?.() || null,
    attendance_interest: d.data().attendance_interest || null,
  })).filter((f) => f.date);

  events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  spotlightsCount = spotlightsSnap.size;

  selectedEventIds = new Set(events.map((e) => e.id));
  renderEventFilter();
}

function renderEventFilter() {
  if (events.length === 0) {
    eventsFieldEl.innerHTML = `<p class="tag">No events yet.</p>`;
    return;
  }
  eventsFieldEl.innerHTML = events
    .map(
      (e) => `
    <label style="display:flex;align-items:center;gap:0.4rem;font-family:var(--font-body);text-transform:none;font-size:0.9rem;">
      <input type="checkbox" data-event-checkbox value="${e.id}" checked style="width:auto" />
      ${e.name}
    </label>`
    )
    .join("");
  eventsFieldEl.querySelectorAll("[data-event-checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) selectedEventIds.add(cb.value);
      else selectedEventIds.delete(cb.value);
      render();
    });
  });
}

function rangeCutoff() {
  const val = rangeSelect.value;
  if (val === "all") return null;
  const days = Number(val);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function withinRange(date, cutoff) {
  return !cutoff || date >= cutoff;
}

function filteredAttendance() {
  const cutoff = rangeCutoff();
  return attendance.filter((a) => selectedEventIds.has(a.eventId) && withinRange(a.date, cutoff));
}

function filteredFeedback() {
  const cutoff = rangeCutoff();
  return feedback.filter((f) => withinRange(f.date, cutoff));
}

function bucketKey(date, granularity) {
  if (granularity === "month") return date.toISOString().slice(0, 7);
  if (granularity === "week") {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function formatBucketLabel(key, granularity) {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const d = new Date(`${key}T00:00:00`);
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return granularity === "week" ? `wk of ${label}` : label;
}

function buildTimeSeries(dates, granularity) {
  const counts = new Map();
  dates.forEach((d) => {
    const k = bucketKey(d, granularity);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const sortedKeys = [...counts.keys()].sort();
  const capped = sortedKeys.slice(-24); // avoid an unreadably wide chart
  return capped.map((k) => ({ label: formatBucketLabel(k, granularity), value: counts.get(k) }));
}

function buildEngagementBuckets(filteredAtt) {
  const countsByUser = new Map();
  filteredAtt.forEach((a) => countsByUser.set(a.uid, (countsByUser.get(a.uid) || 0) + 1));

  const thresholds = [...MILESTONES.map((m) => m.threshold)].sort((a, b) => a - b);
  const labels = [`0`];
  for (let i = 0; i < thresholds.length; i++) {
    const lo = thresholds[i];
    const hi = thresholds[i + 1] !== undefined ? thresholds[i + 1] - 1 : null;
    labels.push(hi === null ? `${lo}+` : lo === hi ? `${lo}` : `${lo}-${hi}`);
  }

  const bucketCounts = new Array(labels.length).fill(0);
  users.forEach((user) => {
    const total = countsByUser.get(user.id) || 0;
    let idx = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (total >= thresholds[i]) idx = i + 1;
    }
    bucketCounts[idx] += 1;
  });

  return labels.map((label, i) => ({
    label,
    value: bucketCounts[i],
    color: CATEGORICAL[i % CATEGORICAL.length],
  }));
}

function buildFeedbackInterestBreakdown(filteredFb) {
  const categories = [
    { key: "very-likely", label: "Very likely" },
    { key: "somewhat-likely", label: "Somewhat likely" },
    { key: "not-sure", label: "Not sure yet" },
    { key: "probably-not", label: "Probably not" },
    { key: null, label: "Prefer not to say" },
  ];
  return categories.map((cat, i) => ({
    label: cat.label,
    value: filteredFb.filter((f) => f.attendance_interest === cat.key).length,
    color: CATEGORICAL[i % CATEGORICAL.length],
  }));
}

function renderStats(filteredAtt, filteredFb) {
  statTilesEl.innerHTML = "";
  const uniqueAttendees = new Set(filteredAtt.map((a) => a.uid));
  const perUserCounts = new Map();
  filteredAtt.forEach((a) => perUserCounts.set(a.uid, (perUserCounts.get(a.uid) || 0) + 1));
  const repeatAttendees = [...perUserCounts.values()].filter((c) => c >= 2).length;
  const avgPerAttendee = uniqueAttendees.size > 0 ? (filteredAtt.length / uniqueAttendees.size).toFixed(1) : "0";
  const repeatRate = uniqueAttendees.size > 0 ? Math.round((repeatAttendees / uniqueAttendees.size) * 100) : 0;

  const tiles = [
    { label: "Total users", value: users.length },
    { label: "Check-ins (filtered)", value: filteredAtt.length },
    { label: "Unique attendees (filtered)", value: uniqueAttendees.size },
    { label: "Feedback submissions (filtered)", value: filteredFb.length },
    { label: "Spotlight drafts", value: spotlightsCount },
    { label: "Total events", value: events.length },
    { label: "Avg check-ins / attendee", value: avgPerAttendee, sublabel: "within current filter" },
    { label: "Repeat-attendance rate", value: `${repeatRate}%`, sublabel: "2+ check-ins, of attendees" },
  ];
  tiles.forEach((t) => renderStatTile(statTilesEl, t));
}

function renderLeaderboard(filteredAtt) {
  const countsByUser = new Map();
  filteredAtt.forEach((a) => countsByUser.set(a.uid, (countsByUser.get(a.uid) || 0) + 1));
  const ranked = users
    .map((u) => ({ ...u, count: countsByUser.get(u.id) || 0 }))
    .filter((u) => u.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const tbody = document.getElementById("leaderboard-body");
  if (ranked.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No check-ins in this filter.</td></tr>`;
    return;
  }
  tbody.innerHTML = ranked
    .map(
      (u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${u.display_name || "(no name)"}</td>
      <td>${u.email || ""}</td>
      <td>${u.count}</td>
    </tr>`
    )
    .join("");
}

function render() {
  const granularity = granularitySelect.value;
  const filteredAtt = filteredAttendance();
  const filteredFb = filteredFeedback();

  renderStats(filteredAtt, filteredFb);

  renderBarChart(
    document.getElementById("chart-attendance-time"),
    buildTimeSeries(filteredAtt.map((a) => a.date), granularity),
    { ariaLabel: "Check-ins over time", emptyMessage: "No check-ins in this filter." }
  );

  const byEvent = events
    .filter((e) => selectedEventIds.has(e.id))
    .map((e) => ({ label: e.name, value: filteredAtt.filter((a) => a.eventId === e.id).length }))
    .sort((a, b) => b.value - a.value);
  renderBarChart(document.getElementById("chart-attendance-by-event"), byEvent, {
    ariaLabel: "Attendance by event",
    emptyMessage: "No events selected.",
  });

  const engagement = buildEngagementBuckets(filteredAtt);
  renderLegend(
    document.getElementById("chart-engagement-legend"),
    engagement.map((e) => ({ label: `${e.label} check-ins`, color: e.color }))
  );
  renderBarChart(document.getElementById("chart-engagement"), engagement, {
    ariaLabel: "Engagement segmentation",
  });

  const signupDates = users
    .map((u) => u.created_at?.toDate?.())
    .filter(Boolean)
    .filter((d) => withinRange(d, rangeCutoff()));
  renderBarChart(
    document.getElementById("chart-signups-time"),
    buildTimeSeries(signupDates, granularity),
    { ariaLabel: "Signups over time", emptyMessage: "No signups in this filter." }
  );

  renderBarChart(
    document.getElementById("chart-feedback-time"),
    buildTimeSeries(filteredFb.map((f) => f.date), granularity),
    { ariaLabel: "Feedback volume over time", emptyMessage: "No feedback in this filter." }
  );

  const interestBreakdown = buildFeedbackInterestBreakdown(filteredFb);
  renderLegend(
    document.getElementById("chart-feedback-interest-legend"),
    interestBreakdown.map((e) => ({ label: e.label, color: e.color }))
  );
  renderBarChart(document.getElementById("chart-feedback-interest"), interestBreakdown, {
    ariaLabel: "Feedback attendance interest breakdown",
  });

  renderLeaderboard(filteredAtt);
}

rangeSelect.addEventListener("change", render);
granularitySelect.addEventListener("change", render);

initAdminGuard(
  {
    signedOutEl: document.getElementById("admin-signed-out"),
    notAdminEl: document.getElementById("admin-not-admin"),
    contentEl: document.getElementById("admin-content"),
    signInBtn: document.getElementById("admin-sign-in-btn"),
    signOutBtn: document.getElementById("admin-sign-out-btn"),
    notAdminSignOutBtn: document.getElementById("admin-not-admin-sign-out-btn"),
  },
  async () => {
    try {
      await loadAll();
      render();
    } catch (err) {
      showError(`Couldn't load metrics: ${err.message}`);
    }
  }
);
