(function () {
  const SETTINGS_KEY = "demo_site_settings_v1";
  const HOME_MODULES_KEY = "homeModules";

  function safeParseJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function readSettings() {
    return safeParseJson(localStorage.getItem(SETTINGS_KEY), {});
  }

  function applyModules(settings) {
    const main = document.querySelector("main");
    if (!main) return;
    // Use any marked section under <main>, but only reorder direct children
    // so we don't accidentally move nested layout blocks.
    const sections = Array.from(main.querySelectorAll("section[data-aa-module]"));
    if (!sections.length) return;

    const byId = new Map(sections.map((s) => [String(s.getAttribute("data-aa-module") || ""), s]));
    const saved = settings && typeof settings === "object" ? settings[HOME_MODULES_KEY] : null;
    if (!Array.isArray(saved) || !saved.length) return;

    const enabledById = new Map();
    const order = [];
    saved.forEach((row) => {
      const id = String(row?.id || "").trim();
      if (!id) return;
      order.push(id);
      enabledById.set(id, row?.enabled !== false);
    });

    // Visibility
    sections.forEach((s) => {
      const id = String(s.getAttribute("data-aa-module") || "");
      const enabled = enabledById.has(id) ? enabledById.get(id) : true;
      if (enabled) {
        s.removeAttribute("hidden");
        s.classList.remove("hidden");
        s.style.removeProperty("display");
      } else {
        s.setAttribute("hidden", "");
        s.classList.add("hidden");
        s.style.display = "none";
      }
    });

    // Order: only reorder direct child modules to preserve layout.
    const topLevel = Array.from(main.children).filter(
      (el) => el && el.tagName === "SECTION" && el.hasAttribute("data-aa-module")
    );
    if (!topLevel.length) return;

    const used = new Set();
    order.forEach((id) => {
      const el = byId.get(id);
      if (!el || used.has(id) || el.parentElement !== main) return;
      used.add(id);
      main.appendChild(el);
    });
    topLevel.forEach((s) => {
      const id = String(s.getAttribute("data-aa-module") || "");
      if (used.has(id)) return;
      main.appendChild(s);
    });
  }

  function loadAndApply() {
    const settings = readSettings();
    applyModules(settings);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAndApply, { once: true });
  } else {
    loadAndApply();
  }

  window.addEventListener("storage", (event) => {
    if (event && event.key === SETTINGS_KEY) loadAndApply();
  });
})();
