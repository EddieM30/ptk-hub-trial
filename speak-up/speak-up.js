import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "../assets/js/firebase-init.js";

const form = document.getElementById("feedback-form");
const errorEl = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");
const successState = document.getElementById("success-state");

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const message = form.message.value.trim();
  const nomination = form.nomination.value.trim();
  const attendanceInterest = form["attendance-interest"].value;

  if (!message) {
    showError("Please fill in the first question before sending.");
    form.message.focus();
    return;
  }
  if (message.length > 5000) {
    showError("That response is too long (max 5000 characters).");
    return;
  }
  if (nomination.length > 500) {
    showError("The nomination field is too long (max 500 characters).");
    return;
  }

  const payload = {
    message,
    createdAt: serverTimestamp(),
  };
  if (attendanceInterest) payload.attendance_interest = attendanceInterest;
  if (nomination) payload.nomination = nomination;

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    await addDoc(collection(db, "feedback"), payload);
    form.hidden = true;
    successState.hidden = false;
  } catch (err) {
    showError("Something went wrong sending your feedback. Please try again in a moment.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Send feedback";
  }
});
