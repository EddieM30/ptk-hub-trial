import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../../assets/js/firebase-init.js";
import { initAdminGuard } from "../../assets/js/admin-guard.js";

const formTitleEl = document.getElementById("spotlight-form-title");
const formErrorEl = document.getElementById("spotlight-form-error");
const formEl = document.getElementById("spotlight-form");
const titleField = document.getElementById("spotlight-title");
const submittedByField = document.getElementById("spotlight-submitted-by");
const bodyField = document.getElementById("spotlight-body");
const publishedField = document.getElementById("spotlight-published");
const saveBtn = document.getElementById("spotlight-save-btn");
const cancelEditBtn = document.getElementById("spotlight-cancel-edit-btn");
const listEl = document.getElementById("spotlights-list");

let editingId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
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
  formTitleEl.textContent = "Add a new spotlight draft";
  saveBtn.textContent = "Save draft";
  cancelEditBtn.hidden = true;
  clearFormError();
}

cancelEditBtn.addEventListener("click", resetForm);

function startEdit(spotlight) {
  editingId = spotlight.id;
  titleField.value = spotlight.title || "";
  submittedByField.value = spotlight.submitted_by || "";
  bodyField.value = spotlight.body || "";
  publishedField.checked = !!spotlight.published;
  formTitleEl.textContent = `Editing "${spotlight.title}"`;
  saveBtn.textContent = "Save changes";
  cancelEditBtn.hidden = false;
  clearFormError();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleDelete(spotlight) {
  const confirmed = confirm(`Delete the draft "${spotlight.title}"?`);
  if (!confirmed) return;
  try {
    await deleteDoc(doc(db, "spotlights", spotlight.id));
    await refresh();
  } catch (err) {
    showFormError(`Couldn't delete: ${err.message}`);
  }
}

function renderSpotlights(spotlights) {
  listEl.innerHTML = "";
  if (spotlights.length === 0) {
    listEl.innerHTML = `<p>No drafts yet — add one above.</p>`;
    return;
  }
  spotlights.forEach((spotlight) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(spotlight.title)}</h3>
      <p class="tag">${spotlight.published ? "Marked published (not live)" : "Draft"}${spotlight.submitted_by ? ` &middot; submitted by ${escapeHtml(spotlight.submitted_by)}` : ""}</p>
      <p>${escapeHtml(spotlight.body)}</p>
      <div class="admin-event-actions">
        <button class="btn btn--outline" type="button" data-action="edit">Edit</button>
        <button class="btn btn--outline" type="button" data-action="delete">Delete</button>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener("click", () => startEdit(spotlight));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => handleDelete(spotlight));
    listEl.appendChild(card);
  });
}

async function loadSpotlights() {
  const snap = await getDocs(query(collection(db, "spotlights"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function refresh() {
  const spotlights = await loadSpotlights();
  renderSpotlights(spotlights);
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormError();

  const title = titleField.value.trim();
  const submittedBy = submittedByField.value.trim();
  const body = bodyField.value.trim();
  const published = publishedField.checked;

  if (!title || !body) {
    showFormError("Title and body are required.");
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "spotlights", editingId), {
        title,
        submitted_by: submittedBy || null,
        body,
        published,
        updated_at: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "spotlights"), {
        title,
        submitted_by: submittedBy || null,
        body,
        published,
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
