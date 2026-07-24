// Hamburger side-drawer nav, shared verbatim across every page. Expects the
// markup block documented in README's "Shared header/nav markup" section:
// #nav-toggle, #site-drawer, #nav-drawer-backdrop.
(function () {
  const toggle = document.getElementById("nav-toggle");
  const drawer = document.getElementById("site-drawer");
  const backdrop = document.getElementById("nav-drawer-backdrop");
  const closeBtn = document.getElementById("nav-drawer-close");
  if (!toggle || !drawer || !backdrop) return;

  function onKeydown(e) {
    if (e.key === "Escape") closeDrawer();
  }

  function openDrawer() {
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    drawer.removeAttribute("inert");
    drawer.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    const firstLink = drawer.querySelector("a, button");
    if (firstLink) firstLink.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("inert", "");
    drawer.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
    document.removeEventListener("keydown", onKeydown);
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeDrawer() : openDrawer();
  });

  backdrop.addEventListener("click", closeDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
})();
