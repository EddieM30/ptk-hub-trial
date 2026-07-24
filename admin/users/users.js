import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../../assets/js/firebase-init.js";
import { initAdminGuard } from "../../assets/js/admin-guard.js";

const errorEl = document.getElementById("users-error");
const countEl = document.getElementById("users-count");
const listEl = document.getElementById("users-list");
const searchEl = document.getElementById("user-search");

let allUsers = []; // { id, email, display_name, created_at, attendance: [{eventId, timestamp}] }

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatTimestamp(ts) {
  if (!ts || typeof ts.toDate !== "function") return "unknown";
  return ts.toDate().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

async function loadUsersWithAttendance() {
  const [usersSnap, attendanceSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collectionGroup(db, "attendance")),
  ]);

  const attendanceByUser = new Map();
  attendanceSnap.forEach((snap) => {
    const uid = snap.ref.parent.parent.id;
    const list = attendanceByUser.get(uid) || [];
    list.push({ eventId: snap.id, timestamp: snap.data().timestamp });
    attendanceByUser.set(uid, list);
  });

  return usersSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    attendance: (attendanceByUser.get(d.id) || []).sort(
      (a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)
    ),
  }));
}

function matchesSearch(user, term) {
  if (!term) return true;
  const haystack = `${user.display_name || ""} ${user.email || ""}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
}

function renderAttendanceList(user) {
  if (user.attendance.length === 0) {
    return `<p class="tag">No check-ins yet.</p>`;
  }
  return `
    <ul class="admin-attendance-list">
      ${user.attendance
        .map(
          (a) => `
        <li>
          <span>${escapeHtml(a.eventId)} — ${escapeHtml(formatTimestamp(a.timestamp))}</span>
          <button class="btn btn--outline" type="button" data-delete-attendance="${escapeHtml(a.eventId)}">Remove</button>
        </li>`
        )
        .join("")}
    </ul>
  `;
}

function renderUsers() {
  const term = searchEl.value.trim();
  const filtered = allUsers.filter((u) => matchesSearch(u, term));
  countEl.textContent = `${filtered.length} of ${allUsers.length} user${allUsers.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    listEl.innerHTML = `<p>No matching users.</p>`;
    return;
  }

  listEl.innerHTML = filtered
    .map(
      (user) => `
    <article class="card admin-user-card" data-uid="${escapeHtml(user.id)}">
      <div class="admin-user-card__header">
        <div>
          <h3 class="admin-user-name" data-display>${escapeHtml(user.display_name || "(no name)")}</h3>
          <p class="tag">${escapeHtml(user.email)}</p>
        </div>
        <p class="tag">${user.attendance.length} check-in${user.attendance.length === 1 ? "" : "s"}</p>
      </div>

      <div class="admin-user-edit" hidden>
        <div class="field">
          <label for="edit-name-${escapeHtml(user.id)}">Display name</label>
          <input type="text" id="edit-name-${escapeHtml(user.id)}" value="${escapeHtml(user.display_name || "")}" />
        </div>
        <button class="btn" type="button" data-save-name>Save name</button>
        <button class="btn btn--outline" type="button" data-cancel-edit>Cancel</button>
      </div>

      <div class="admin-event-actions">
        <button class="btn btn--outline" type="button" data-edit-name>Edit name</button>
        <button class="btn btn--outline" type="button" data-toggle-attendance>View attendance</button>
      </div>

      <div class="admin-user-attendance" hidden>
        ${renderAttendanceList(user)}
      </div>
    </article>
  `
    )
    .join("");

  listEl.querySelectorAll(".admin-user-card").forEach((card) => {
    const uid = card.dataset.uid;
    const user = allUsers.find((u) => u.id === uid);

    card.querySelector("[data-edit-name]").addEventListener("click", () => {
      card.querySelector(".admin-user-edit").hidden = false;
    });
    card.querySelector("[data-cancel-edit]").addEventListener("click", () => {
      card.querySelector(".admin-user-edit").hidden = true;
    });
    card.querySelector("[data-save-name]").addEventListener("click", async () => {
      const input = card.querySelector(`#edit-name-${CSS.escape(uid)}`);
      const newName = input.value.trim();
      try {
        await updateDoc(doc(db, "users", uid), { display_name: newName });
        user.display_name = newName;
        renderUsers();
      } catch (err) {
        showError(`Couldn't update name: ${err.message}`);
      }
    });
    card.querySelector("[data-toggle-attendance]").addEventListener("click", () => {
      const panel = card.querySelector(".admin-user-attendance");
      panel.hidden = !panel.hidden;
    });
    card.querySelectorAll("[data-delete-attendance]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const eventId = btn.dataset.deleteAttendance;
        const confirmed = confirm(`Remove the check-in for "${eventId}" from ${user.email}?`);
        if (!confirmed) return;
        try {
          await deleteDoc(doc(db, "users", uid, "attendance", eventId));
          user.attendance = user.attendance.filter((a) => a.eventId !== eventId);
          renderUsers();
        } catch (err) {
          showError(`Couldn't remove check-in: ${err.message}`);
        }
      });
    });
  });
}

searchEl.addEventListener("input", renderUsers);

async function refresh() {
  try {
    allUsers = await loadUsersWithAttendance();
    renderUsers();
  } catch (err) {
    showError(`Couldn't load users: ${err.message}`);
  }
}

initAdminGuard(
  {
    signedOutEl: document.getElementById("admin-signed-out"),
    notAdminEl: document.getElementById("admin-not-admin"),
    contentEl: document.getElementById("admin-content"),
    signInBtn: document.getElementById("admin-sign-in-btn"),
    signOutBtn: document.getElementById("admin-sign-out-btn"),
    notAdminSignOutBtn: document.getElementById("admin-not-admin-sign-out-btn"),
  },
  () => {
    refresh();
  }
);
