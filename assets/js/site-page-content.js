(function () {
  const SETTINGS_KEY = "demo_site_settings_v1";

  const safeParseJson = (raw, fallback) => {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  };

  const readSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = safeParseJson(raw, {});
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  };

  const getFilename = () => {
    const path = String(window.location?.pathname || "");
    const file = path.split("/").filter(Boolean).pop() || "";
    return file;
  };

  const getSlug = () => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return String(params.get("slug") || "").trim().toLowerCase();
    } catch (_e) {
      return "";
    }
  };

  const applyByPath = () => {
    const contentEl = document.getElementById("aa-page-content");
    if (!contentEl) return false;

    const settings = readSettings();
    const byPath = settings?.pageContentByPath || {};
    const filename = getFilename();
    const entry = filename ? byPath?.[filename] : null;
    const text =
      typeof entry?.text === "string"
        ? entry.text
        : typeof entry?.html === "string"
          ? (() => {
              try {
                const doc = new DOMParser().parseFromString(String(entry.html || ""), "text/html");
                return String(doc?.body?.textContent || "");
              } catch (_e) {
                return String(entry?.html || "");
              }
            })()
          : "";
    if (!text.trim()) return false;

    // Render plain text as paragraphs/line-breaks without using user-provided HTML.
    while (contentEl.firstChild) contentEl.removeChild(contentEl.firstChild);
    const blocks = String(text).replace(/\r\n?/g, "\n").split(/\n{2,}/g);
    blocks.forEach((block) => {
      const p = document.createElement("p");
      const lines = String(block || "").split("\n");
      lines.forEach((line, idx) => {
        if (idx) p.appendChild(document.createElement("br"));
        p.appendChild(document.createTextNode(line));
      });
      contentEl.appendChild(p);
    });
    if (typeof entry?.title === "string" && entry.title.trim()) {
      document.title = `${entry.title.trim()} - Eğitim Platformu`;
    }
    return true;
  };

  const applyCustomPage = () => {
    const customRoot = document.getElementById("aa-custom-page");
    const contentEl = document.getElementById("aa-page-content");
    if (!customRoot || !contentEl) return false;

    const slug = getSlug();
    if (!slug) return false;

    const settings = readSettings();
    const pages = Array.isArray(settings?.customPages) ? settings.customPages : [];
    const match = pages.find((p) => String(p?.slug || "").trim().toLowerCase() === slug) || null;
    if (!match || (typeof match.text !== "string" && typeof match.html !== "string")) return false;

    if (typeof match.title === "string" && match.title.trim()) {
      document.title = `${match.title.trim()} - Eğitim Platformu`;
      const h1 = document.getElementById("aa-page-title");
      if (h1) h1.textContent = match.title.trim();
    }

    const raw =
      typeof match.text === "string"
        ? match.text
        : typeof match.html === "string"
          ? (() => {
              try {
                const doc = new DOMParser().parseFromString(String(match.html || ""), "text/html");
                return String(doc?.body?.textContent || "");
              } catch (_e) {
                return String(match?.html || "");
              }
            })()
          : "";
    if (!String(raw || "").trim()) return false;

    while (contentEl.firstChild) contentEl.removeChild(contentEl.firstChild);
    const blocks = String(raw).replace(/\r\n?/g, "\n").split(/\n{2,}/g);
    blocks.forEach((block) => {
      const p = document.createElement("p");
      const lines = String(block || "").split("\n");
      lines.forEach((line, idx) => {
        if (idx) p.appendChild(document.createElement("br"));
        p.appendChild(document.createTextNode(line));
      });
      contentEl.appendChild(p);
    });
    return true;
  };

  const applyAll = () => {
    const didCustom = applyCustomPage();
    const didPath = applyByPath();
    return didCustom || didPath;
  };

  applyAll();
  window.addEventListener("storage", (event) => {
    if (event?.key === SETTINGS_KEY) applyAll();
  });
})();
