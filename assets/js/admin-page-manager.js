(function () {
  const SETTINGS_KEY = "demo_site_settings_v1";

  const SYSTEM_PAGES = [
    { id: "privacy", title: "Gizlilik Politikası", path: "gizlilik_politikasi.html" },
    { id: "terms", title: "Kullanım Şartları", path: "kullanim_sartlari.html" },
    { id: "distance", title: "Mesafeli Satış Sözleşmesi", path: "mesafeli_satis_sozlesmesi.html" },
  ];

  const $ = (id) => document.getElementById(id);

  const toastEl = $("toast");
  const toastInnerEl = $("toast-inner");

  const systemListEl = $("system-page-list");
  const customListEl = $("custom-page-list");
  const btnNew = $("btn-new-page");

  const editorTitleEl = $("editor-title");
  const editorSubtitleEl = $("editor-subtitle");

  const fieldTitleEl = $("field-title");
  const fieldKeyLabelEl = $("field-key-label");
  const fieldKeyEl = $("field-key");
  const fieldKeyHintEl = $("field-key-hint");
  const fieldTextEl = $("field-text");

  const btnLoadDefault = $("btn-load-default");
  const btnClearOverride = $("btn-clear-override");
  const btnDelete = $("btn-delete-page");
  const btnSave = $("btn-save-page");

  const previewFrame = $("preview-frame");
  const btnPreviewRefresh = $("btn-preview-refresh");
  const btnPreviewOpen = $("btn-preview-open");

  const safeParseJson = (raw, fallback) => {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  };
  const readSettings = () => safeParseJson(localStorage.getItem(SETTINGS_KEY), {});
  const writeSettings = (next) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(next ?? {}));
  const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const showToast = (message, tone = "info") => {
    if (!toastEl || !toastInnerEl) return;
    const text = String(message || "").trim();
    if (!text) return;
    const toneClass =
      tone === "danger"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
        : tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-primary/20 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100";
    toastInnerEl.className = `rounded-xl border px-4 py-2 text-sm shadow-2xl ${toneClass}`;
    toastInnerEl.textContent = text;
    toastEl.classList.remove("hidden");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toastEl.classList.add("hidden"), 2200);
  };

  const normalizeSlug = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replaceAll("ı", "i")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "");

  const getData = () => {
    const settings = readSettings();
    const pageContentByPath = settings && typeof settings.pageContentByPath === "object" ? settings.pageContentByPath : {};
    const customPages = Array.isArray(settings?.customPages) ? settings.customPages : [];
    return { settings, pageContentByPath, customPages };
  };

  let selected = { kind: "system", id: SYSTEM_PAGES[0].id };

  const getSelectedModel = () => {
    const { pageContentByPath, customPages } = getData();
    if (selected.kind === "custom") {
      const item = customPages.find((p) => p && p.id === selected.id) || null;
      return item ? { kind: "custom", item } : null;
    }
    const sys = SYSTEM_PAGES.find((p) => p.id === selected.id) || SYSTEM_PAGES[0];
    const override = sys?.path ? pageContentByPath?.[sys.path] : null;
    return { kind: "system", item: sys, override };
  };

  const listButtonClass = (active) =>
    active
      ? "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20"
      : "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200";

  const renderLists = () => {
    const { customPages } = getData();

    if (systemListEl) {
      systemListEl.innerHTML = SYSTEM_PAGES.map((p) => {
        const active = selected.kind === "system" && selected.id === p.id;
        return `
          <button type="button" class="${listButtonClass(active)}" data-pick-kind="system" data-pick-id="${p.id}">
            <span class="material-symbols-outlined text-xl">gavel</span>
            <div class="min-w-0">
              <div class="text-sm font-extrabold truncate">${p.title}</div>
              <div class="text-[11px] text-slate-500 truncate">${p.path}</div>
            </div>
          </button>
        `;
      }).join("");
    }

    if (customListEl) {
      if (!customPages.length) {
        customListEl.innerHTML = `<div class="px-3 py-3 text-sm text-slate-500">Henüz özel sayfa yok. “Yeni” ile ekleyin.</div>`;
      } else {
        customListEl.innerHTML = customPages
          .slice()
          .sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")))
          .map((p) => {
            const active = selected.kind === "custom" && selected.id === p.id;
            const slug = String(p?.slug || "");
            return `
              <button type="button" class="${listButtonClass(active)}" data-pick-kind="custom" data-pick-id="${p.id}">
                <span class="material-symbols-outlined text-xl">description</span>
                <div class="min-w-0">
                  <div class="text-sm font-extrabold truncate">${String(p?.title || "Başlıksız")}</div>
                  <div class="text-[11px] text-slate-500 truncate">sayfa.html?slug=${slug ? slug : "-"}</div>
                </div>
              </button>
            `;
          })
          .join("");
      }
    }
  };

  const setPreviewSrc = (kind, model) => {
    if (!previewFrame || !btnPreviewOpen) return;
    let url = "gizlilik_politikasi.html";
    if (kind === "custom") {
      const slug = normalizeSlug(model?.slug || "sayfa");
      url = `sayfa.html?slug=${encodeURIComponent(slug)}`;
    } else {
      url = String(model?.path || "gizlilik_politikasi.html");
    }
    const join = url.includes("?") ? "&" : "?";
    const busted = `${url}${join}pv=${Date.now()}`;
    previewFrame.src = busted;
    btnPreviewOpen.href = url;
  };

  const fillEditor = () => {
    const m = getSelectedModel();
    if (!m) return;

    if (m.kind === "system") {
      const sys = m.item;
      const override = m.override;
      if (editorTitleEl) editorTitleEl.textContent = sys.title;
      if (editorSubtitleEl) editorSubtitleEl.textContent = `Dosya: ${sys.path}`;

      if (fieldKeyLabelEl) fieldKeyLabelEl.textContent = "Dosya";
      if (fieldKeyEl) {
        fieldKeyEl.disabled = true;
        fieldKeyEl.value = sys.path;
      }
      if (fieldKeyHintEl) fieldKeyHintEl.textContent = "Bu sayfaya yazdığınız içerik, dosyanın <main> içeriğini override eder.";
      if (fieldTitleEl) fieldTitleEl.value = String(override?.title || sys.title || "");
      if (fieldTextEl) {
        const rawText =
          typeof override?.text === "string"
            ? override.text
            : typeof override?.html === "string"
              ? (() => {
                  try {
                    const doc = new DOMParser().parseFromString(String(override.html || ""), "text/html");
                    return String(doc?.body?.textContent || "");
                  } catch (_e) {
                    return String(override?.html || "");
                  }
                })()
              : "";
        fieldTextEl.value = rawText.trim();
      }

      btnDelete?.classList.add("hidden");
      const hasOverride = override && ((typeof override.text === "string" && override.text.trim()) || (typeof override.html === "string" && override.html.trim()));
      btnClearOverride?.classList.toggle("hidden", !hasOverride);
      setPreviewSrc("system", sys);
      return;
    }

    const item = m.item;
    if (editorTitleEl) editorTitleEl.textContent = item?.title || "Özel Sayfa";
    if (editorSubtitleEl) editorSubtitleEl.textContent = "Özel sayfa: sayfa.html?slug=...";

    if (fieldKeyLabelEl) fieldKeyLabelEl.textContent = "Slug";
    if (fieldKeyEl) {
      fieldKeyEl.disabled = false;
      fieldKeyEl.value = String(item?.slug || "");
    }
    if (fieldKeyHintEl) fieldKeyHintEl.textContent = "URL: sayfa.html?slug=SLUG";
    if (fieldTitleEl) fieldTitleEl.value = String(item?.title || "");
    if (fieldTextEl) {
      const rawText =
        typeof item?.text === "string"
          ? item.text
          : typeof item?.html === "string"
            ? (() => {
                try {
                  const doc = new DOMParser().parseFromString(String(item.html || ""), "text/html");
                  return String(doc?.body?.textContent || "");
                } catch (_e) {
                  return String(item?.html || "");
                }
              })()
            : "";
      fieldTextEl.value = rawText;
    }

    btnDelete?.classList.remove("hidden");
    btnClearOverride?.classList.add("hidden");
    setPreviewSrc("custom", item);
  };

  const pick = (kind, id) => {
    selected = { kind, id };
    renderLists();
    fillEditor();
  };

  const ensureDefaultHtmlFromServer = async () => {
    const m = getSelectedModel();
    if (!m || m.kind !== "system") return;
    const path = m.item?.path;
    if (!path) return;
    try {
      const join = path.includes("?") ? "&" : "?";
      const res = await fetch(`${path}${join}src=${Date.now()}`, { cache: "no-store" });
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const content = doc.getElementById("aa-page-content") || doc.querySelector("main");
      const value = content ? String(content.textContent || "") : "";
      if (fieldTextEl) fieldTextEl.value = value.trim();
      showToast("Varsayılan içerik yüklendi.", "success");
    } catch (_e) {
      showToast("Varsayılan içerik yüklenemedi.", "danger");
    }
  };

  const clearOverride = () => {
    const m = getSelectedModel();
    if (!m || m.kind !== "system") return;
    const sys = m.item;
    const { settings } = getData();
    const next = settings && typeof settings === "object" ? { ...settings } : {};
    next.pageContentByPath = next.pageContentByPath && typeof next.pageContentByPath === "object" ? { ...next.pageContentByPath } : {};
    delete next.pageContentByPath[sys.path];
    writeSettings(next);
    showToast("Override temizlendi.", "success");
    renderLists();
    fillEditor();
  };

  const saveCurrent = () => {
    const m = getSelectedModel();
    if (!m) return;
    const title = String(fieldTitleEl?.value || "").trim();
    const text = String(fieldTextEl?.value || "");
    const { settings, customPages } = getData();
    const next = settings && typeof settings === "object" ? { ...settings } : {};
    const now = new Date().toISOString();

    if (m.kind === "system") {
      const sys = m.item;
      next.pageContentByPath = next.pageContentByPath && typeof next.pageContentByPath === "object" ? { ...next.pageContentByPath } : {};
      next.pageContentByPath[sys.path] = { title: title || sys.title, text, updatedAt: now };
      writeSettings(next);
      showToast("Kaydedildi.", "success");
      renderLists();
      fillEditor();
      return;
    }

    const slug = normalizeSlug(fieldKeyEl?.value || m.item?.slug || "");
    if (!slug) {
      showToast("Slug boş olamaz.", "danger");
      return;
    }
    const existsOther = customPages.some((p) => p && p.id !== m.item.id && normalizeSlug(p.slug) === slug);
    if (existsOther) {
      showToast("Bu slug zaten kullanılıyor.", "danger");
      return;
    }
    next.customPages = customPages
      .map((p) => (p && p.id === m.item.id ? { ...p, title: title || "Yeni Sayfa", slug, text, updatedAt: now } : p))
      .filter(Boolean);
    writeSettings(next);
    showToast("Kaydedildi.", "success");
    pick("custom", m.item.id);
  };

  const createNewCustom = () => {
    const { settings, customPages } = getData();
    const next = settings && typeof settings === "object" ? { ...settings } : {};
    const baseSlug = "yeni-sayfa";
    let slug = baseSlug;
    let n = 1;
    const used = new Set(customPages.map((p) => normalizeSlug(p?.slug)));
    while (used.has(slug)) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const page = {
      id: uid("page"),
      title: "Yeni Sayfa",
      slug,
      text: "Yeni sayfa içeriğini buradan düzenleyin.",
      updatedAt: new Date().toISOString(),
    };
    next.customPages = customPages.concat([page]);
    writeSettings(next);
    showToast("Yeni sayfa eklendi.", "success");
    pick("custom", page.id);
  };

  const deleteCurrentCustom = () => {
    const m = getSelectedModel();
    if (!m || m.kind !== "custom") return;
    const ok = window.confirm("Bu özel sayfa silinsin mi?");
    if (!ok) return;
    const { settings, customPages } = getData();
    const next = settings && typeof settings === "object" ? { ...settings } : {};
    next.customPages = customPages.filter((p) => p && p.id !== m.item.id);
    writeSettings(next);
    showToast("Silindi.", "success");
    selected = { kind: "system", id: SYSTEM_PAGES[0].id };
    renderLists();
    fillEditor();
  };

  const wirePickHandlers = () => {
    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-pick-kind][data-pick-id]");
      if (!btn) return;
      pick(btn.getAttribute("data-pick-kind"), btn.getAttribute("data-pick-id"));
    });
  };

  const wireSidebarCollapse = () => {
    const STORAGE_KEY = "demo_admin_v1:sidebar_collapsed";
    const btn = $("sidebar-collapse-btn");
    const btn2 = $("sidebar-collapse-btn-top");
    const apply = (collapsed) => document.body.classList.toggle("sidebar-collapsed", collapsed);
    apply(localStorage.getItem(STORAGE_KEY) === "1");
    const toggle = () => {
      const next = !document.body.classList.contains("sidebar-collapsed");
      apply(next);
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    };
    btn?.addEventListener("click", toggle);
    btn2?.addEventListener("click", toggle);
  };

  const wireSidebarDropdown = () => {
    const STORAGE_KEY = "demo_admin_v1:sidebar_groups";
    const toggles = Array.from(document.querySelectorAll("[data-sidebar-toggle]"));
    if (!toggles.length) return;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (_e) {
      saved = {};
    }
    const applyState = (btn, isOpen, persist) => {
      const targetId = btn.getAttribute("data-sidebar-toggle");
      const panel = targetId ? document.getElementById(targetId) : null;
      const icon = btn.querySelector(".material-symbols-outlined");
      if (!panel) return;
      panel.classList.toggle("hidden", !isOpen);
      btn.setAttribute("aria-expanded", String(isOpen));
      if (icon) icon.classList.toggle("rotate-180", isOpen);
      if (persist) {
        saved[targetId] = isOpen;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    };
    toggles.forEach((btn) => {
      const targetId = btn.getAttribute("data-sidebar-toggle");
      const isOpen = typeof saved[targetId] === "boolean" ? saved[targetId] : true;
      applyState(btn, isOpen, false);
      btn.addEventListener("click", () => {
        const current = btn.getAttribute("aria-expanded") === "true";
        applyState(btn, !current, true);
      });
    });
  };

  const wireEditorEvents = () => {
    btnNew?.addEventListener("click", createNewCustom);
    btnLoadDefault?.addEventListener("click", ensureDefaultHtmlFromServer);
    btnClearOverride?.addEventListener("click", clearOverride);
    btnDelete?.addEventListener("click", deleteCurrentCustom);
    btnSave?.addEventListener("click", saveCurrent);

    fieldKeyEl?.addEventListener("input", () => {
      const m = getSelectedModel();
      if (m?.kind !== "custom") return;
      const normalized = normalizeSlug(fieldKeyEl.value);
      if (normalized !== fieldKeyEl.value) fieldKeyEl.value = normalized;
      setPreviewSrc("custom", { ...m.item, slug: normalized });
    });

    fieldTextEl?.addEventListener("input", () => {
      window.clearTimeout(fillEditor._t);
      fillEditor._t = window.setTimeout(() => {
        const m = getSelectedModel();
        if (!m) return;
        setPreviewSrc(m.kind, m.item);
      }, 700);
    });

    btnPreviewRefresh?.addEventListener("click", () => {
      const m = getSelectedModel();
      if (!m) return;
      setPreviewSrc(m.kind, m.item);
    });
  };

  window.addEventListener("DOMContentLoaded", () => {
    renderLists();
    fillEditor();
    wirePickHandlers();
    wireEditorEvents();
    wireSidebarCollapse();
    wireSidebarDropdown();
  });
})();
