(() => {
  "use strict";

  const SETTINGS_KEY = "demo_site_settings_v1";
  const DEFAULT_THEME = "dark"; // existing admin defaults

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function readSettings() {
    try {
      return safeJsonParse(localStorage.getItem(SETTINGS_KEY), {}) || {};
    } catch {
      return {};
    }
  }

  function normalizeTheme(value) {
    const v = String(value || "").trim().toLowerCase();
    if (v === "light" || v === "aydınlık" || v === "acik" || v === "açık") return "light";
    if (v === "dark" || v === "karanlık" || v === "koyu") return "dark";
    return "";
  }

  function getThemeFromSettings(settings) {
    // Primary: ayarlarpage.html uses `settings.theme`
    const direct = normalizeTheme(settings?.theme);
    if (direct) return direct;

    // Back/alt: allow nested keys if later introduced
    const nested =
      normalizeTheme(settings?.adminTheme) ||
      normalizeTheme(settings?.admin?.theme) ||
      normalizeTheme(settings?.ui?.theme) ||
      normalizeTheme(settings?.visualIdentity?.adminTheme);
    if (nested) return nested;

    return DEFAULT_THEME;
  }

  function applyTheme(theme) {
    const t = normalizeTheme(theme) || DEFAULT_THEME;
    const isDark = t === "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    try {
      root.style.colorScheme = isDark ? "dark" : "light";
    } catch {
      // ignore
    }
  }

  function syncFromStorage() {
    const settings = readSettings();
    applyTheme(getThemeFromSettings(settings));
  }

  // Run immediately (should be loaded before Tailwind CDN script for zero FOUC)
  syncFromStorage();

  // Keep in sync across tabs/windows
  window.addEventListener("storage", (e) => {
    if (!e || e.key !== SETTINGS_KEY) return;
    syncFromStorage();
  });
})();

