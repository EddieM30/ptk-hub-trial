import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../../assets/js/firebase-init.js";
import { initAdminGuard } from "../../assets/js/admin-guard.js";

const formTitleEl = document.getElementById("event-form-title");
const formErrorEl = document.getElementById("event-form-error");
const formEl = document.getElementById("event-form");
const idField = document.getElementById("event-id");
const nameField = document.getElementById("event-name");
const dateField = document.getElementById("event-date");
const locationField = document.getElementById("event-location");
const descriptionField = document.getElementById("event-description");
const saveBtn = document.getElementById("event-save-btn");
const cancelEditBtn = document.getElementById("event-cancel-edit-btn");
const eventsListEl = document.getElementById("events-list");

let editingId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function showFormError(message) {
  formErrorEl.textContent = message;
  formErrorEl.hidden = false;
}

function clearFormError() {
  formErrorEl.hidden = true;
  formErrorEl.textContent = "";
}

function resetForm() {
  editingId = null;
  formEl.reset();
  delete idField.dataset.manuallyEdited;
  idField.readOnly = false;
  formTitleEl.textContent = "Add a new event";
  saveBtn.textContent = "Create event";
  cancelEditBtn.hidden = true;
  clearFormError();
}

nameField.addEventListener("input", () => {
  if (!editingId && !idField.dataset.manuallyEdited) {
    idField.value = slugify(nameField.value);
  }
});

idField.addEventListener("input", () => {
  idField.dataset.manuallyEdited = "true";
});

cancelEditBtn.addEventListener("click", resetForm);

function buildCheckinUrl(eventId) {
  return `${location.origin}/show-up/?event=${encodeURIComponent(eventId)}&checkin=1`;
}

function startEdit(event) {
  editingId = event.id;
  idField.value = event.id;
  idField.readOnly = true;
  nameField.value = event.name;
  dateField.value = event.date;
  locationField.value = event.location;
  descriptionField.value = event.description;
  formTitleEl.textContent = `Editing "${event.name}"`;
  saveBtn.textContent = "Save changes";
  cancelEditBtn.hidden = false;
  clearFormError();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleDelete(event) {
  const confirmed = confirm(
    `Delete "${event.name}"? This does not delete any check-in history already logged for it — only the event listing and its QR code.`
  );
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "events", event.id));
    await refresh();
  } catch (err) {
    showFormError(`Couldn't delete: ${err.message}`);
  }
}

function toggleQr(event, card) {
  const wrap = card.querySelector(".admin-qr-print");
  if (!wrap.hidden) {
    wrap.hidden = true;
    wrap.innerHTML = "";
    return;
  }
  const url = buildCheckinUrl(event.id);
  const qr = window.qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const svg = qr.createSvgTag({
    cellSize: 6,
    margin: 2,
    alt: `Check-in QR code for ${event.name}`,
    title: `${event.name} check-in QR code`,
  });
  wrap.innerHTML = `
    <div class="admin-qr-print-inner">
      <h4>${escapeHtml(event.name)}</h4>
      ${svg}
      <p class="tag">${escapeHtml(url)}</p>
      <button class="btn" type="button" data-print>Print this QR</button>
    </div>
  `;
  wrap.hidden = false;
  wrap.querySelector("[data-print]").addEventListener("click", () => window.print());
}

function renderEvents(events) {
  eventsListEl.innerHTML = "";
  if (events.length === 0) {
    eventsListEl.innerHTML = `<p>No events yet — add one above.</p>`;
    return;
  }
  events.forEach((event) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(event.name)}</h3>
      <p class="tag">${escapeHtml(event.date)} &middot; ${escapeHtml(event.location)}</p>
      <p>${escapeHtml(event.description)}</p>
      <p class="tag">ID: ${escapeHtml(event.id)}</p>
      <div class="admin-event-actions">
        <button class="btn btn--outline" type="button" data-action="edit">Edit</button>
        <button class="btn btn--outline" type="button" data-action="delete">Delete</button>
        <button class="btn btn--outline" type="button" data-action="qr">View/Print QR</button>
      </div>
      <div class="qr-wrap admin-qr-print" hidden></div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener("click", () => startEdit(event));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => handleDelete(event));
    card.querySelector('[data-action="qr"]').addEventListener("click", () => toggleQr(event, card));
    eventsListEl.appendChild(card);
  });
}

async function loadEvents() {
  const snap = await getDocs(query(collection(db, "events"), orderBy("date")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function refresh() {
  const events = await loadEvents();
  renderEvents(events);
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormError();

  const id = idField.value.trim();
  const name = nameField.value.trim();
  const date = dateField.value;
  const eventLocation = locationField.value.trim();
  const description = descriptionField.value.trim();

  if (!id || !name || !date || !eventLocation || !description) {
    showFormError("Please fill in every field.");
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "events", editingId), {
        name,
        date,
        location: eventLocation,
        description,
        updated_at: serverTimestamp(),
      });
    } else {
      const ref = doc(db, "events", id);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        showFormError(`An event with ID "${id}" already exists — choose a different ID.`);
        return;
      }
      await setDoc(ref, {
        name,
        date,
        location: eventLocation,
        description,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    resetForm();
    await refresh();
  } catch (err) {
    showFormError(`Couldn't save: ${err.message}`);
  }
});

initAdminGuard(
  {
    signedOutEl: document.getElementById("admin-signed-out"),
    notAdminEl: document.getElementById("admin-not-admin"),
    contentEl: document.getElementById("admin-content"),
    signInBtn: document.getElementById("admin-sign-in-btn"),
    signOutBtn: document.getElementById("admin-sign-out-btn"),
    notAdminSignOutBtn: document.getElementById("admin-not-admin-sign-out-btn"),
    notAdminInfoEl: document.getElementById("admin-not-admin-info"),
  },
  () => {
    refresh();
  }
);
