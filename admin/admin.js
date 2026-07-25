import { initAdminGuard } from "../assets/js/admin-guard.js";

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
  (user) => {
    document.getElementById("admin-welcome").textContent = `Signed in as ${user.email}.`;
  }
);
