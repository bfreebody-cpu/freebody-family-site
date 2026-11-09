(() => {
  "use strict";

  const buttons = Array.from(document.querySelectorAll("[data-person-sort]"));
  const views = Array.from(document.querySelectorAll("[data-directory-view]"));
  const status = document.getElementById("people-sort-status");
  if (!buttons.length || !views.length || !status) return;

  function setMode(requestedMode, updateAddress) {
    const mode = requestedMode === "surname" ? "surname" : "first";
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.personSort === mode));
    });
    views.forEach((view) => {
      view.hidden = view.dataset.directoryView !== mode;
    });
    status.textContent = mode === "surname" ? "Organized by surname." : "Organized by first name.";

    if (updateAddress) {
      const url = new URL(window.location.href);
      if (mode === "surname") url.searchParams.set("sort", "surname");
      else url.searchParams.delete("sort");
      url.hash = "";
      window.history.replaceState(null, "", url);
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.personSort, true));
  });

  const requestedMode = new URL(window.location.href).searchParams.get("sort");
  setMode(requestedMode, false);
})();
