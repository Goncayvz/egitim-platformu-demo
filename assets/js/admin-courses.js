(() => {
  "use strict";

  const COURSES_KEY = "demo_courses_v1";
  const SETTINGS_KEY = "demo_site_settings_v1";

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function readSettings() {
    const s = safeJsonParse(localStorage.getItem(SETTINGS_KEY), {});
    return s && typeof s === "object" ? s : {};
  }

  function writeSettings(next) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next ?? {}));
  }

  function getList() {
    const list = safeJsonParse(localStorage.getItem(COURSES_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function setList(list) {
    localStorage.setItem(COURSES_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function uid(prefix) {
    const rand = Math.random().toString(16).slice(2, 10);
    return `${String(prefix || "c")}_${Date.now().toString(36)}_${rand}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function byDateDesc(a, b) {
    const da = new Date(a?.createdAt || 0).getTime();
    const db = new Date(b?.createdAt || 0).getTime();
    return db - da;
  }

  function ensureSeed() {
    const list = getList();
    if (list.length) return;
    const now = new Date().toISOString();
    setList([
      {
        id: uid("c"),
        title: "React ile Modern Frontend",
        excerpt: "42 ders, proje tabanlı anlatım.",
        description: "Gerçek proje geliştirerek React, state yönetimi ve ölçeklenebilir mimariyi öğren.",
        level: "Orta",
        duration: "18 saat",
        lessonsCount: 42,
        instructor: "Dr. Selin Yılmaz",
        priceLabel: "₺499",
        vatRate: 0.20,
        published: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid("c"),
        title: "İleri JavaScript",
        excerpt: "Asenkron yapı, performans, mimari.",
        description: "Asenkron programlama, performans ve modern JS mimarisi ile daha sağlam uygulamalar geliştir.",
        level: "İleri",
        duration: "12 saat",
        lessonsCount: 36,
        instructor: "Eğitim Platformu",
        priceLabel: "₺399",
        vatRate: 0.20,
        published: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid("c"),
        title: "UI/UX Temelleri",
        excerpt: "Figma ve ürün odaklı tasarım yaklaşımı.",
        description: "Figma ile pratik yaparak kullanıcı odaklı arayüz tasarımının temellerini öğren.",
        level: "Başlangıç",
        duration: "8 saat",
        lessonsCount: 20,
        instructor: "Eğitim Platformu",
        priceLabel: "₺249",
        vatRate: 0.20,
        published: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  function ensureDefaultPricesOnce() {
    // Var olan kurslara otomatik fiyat atama (sadece 1 kere; boş olanlara).
    const seededKey = "demo_courses_prices_seeded_v1";
    try {
      if (localStorage.getItem(seededKey) === "1") return;
    } catch {
      // ignore
    }

    const list = getList().filter((x) => x && typeof x === "object");
    if (!list.length) return;

    const now = new Date().toISOString();
    let changed = false;

    const pickDefaultPrice = (course) => {
      const level = String(course?.level || "").toLowerCase();
      if (level.includes("baş") || level.includes("basic") || level.includes("begin")) return "₺249";
      if (level.includes("ileri") || level.includes("advanced")) return "₺399";
      return "₺499";
    };

    const next = list.map((c) => {
      const price = String(c?.priceLabel || "").trim();
      if (price) return c;
      changed = true;
      return { ...c, priceLabel: pickDefaultPrice(c), updatedAt: now };
    });

    if (changed) {
      setList(next);
    }
    try {
      localStorage.setItem(seededKey, "1");
    } catch {
      // ignore
    }
  }

  function getCoursesPageEnabled() {
    const s = readSettings();
    return s?.sections?.coursesPageEnabled !== false;
  }

  function setCoursesPageEnabled(enabled) {
    const s = readSettings();
    const next = { ...s, sections: { ...(s.sections || {}) } };
    next.sections.coursesPageEnabled = !!enabled;
    writeSettings(next);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function fillForm(item) {
    document.getElementById("course-id").value = item?.id || "";
    document.getElementById("course-title").value = item?.title || "";
    document.getElementById("course-excerpt").value = item?.excerpt || "";
    document.getElementById("course-description").value = item?.description || "";
    document.getElementById("course-level").value = item?.level || "";
    document.getElementById("course-duration").value = item?.duration || "";
    document.getElementById("course-lessons").value = item?.lessonsCount ? String(item.lessonsCount) : "";
    document.getElementById("course-instructor").value = item?.instructor || "";
    document.getElementById("course-price").value = item?.priceLabel || "";
    const vatPct = Number(item?.vatRate);
    document.getElementById("course-vat").value = Number.isFinite(vatPct) ? String(Math.round(vatPct * 1000) / 10) : "20";
    document.getElementById("course-published").checked = item?.published !== false;
  }

  function readForm() {
    const id = String(document.getElementById("course-id")?.value || "").trim();
    const now = new Date().toISOString();
    const lessonsRaw = String(document.getElementById("course-lessons")?.value || "").trim();
    const lessons = lessonsRaw ? Number(lessonsRaw) : 0;
    const vatRaw = String(document.getElementById("course-vat")?.value || "").trim();
    const vatPct = vatRaw ? Number(vatRaw) : 20;
    const vatRate = Number.isFinite(vatPct) ? Math.min(0.30, Math.max(0, vatPct / 100)) : 0.20;
    return {
      id: id || uid("c"),
      title: String(document.getElementById("course-title")?.value || "").trim(),
      excerpt: String(document.getElementById("course-excerpt")?.value || "").trim(),
      description: String(document.getElementById("course-description")?.value || "").trim(),
      level: String(document.getElementById("course-level")?.value || "").trim(),
      duration: String(document.getElementById("course-duration")?.value || "").trim(),
      lessonsCount: Number.isFinite(lessons) ? lessons : 0,
      instructor: String(document.getElementById("course-instructor")?.value || "").trim(),
      priceLabel: String(document.getElementById("course-price")?.value || "").trim(),
      vatRate,
      published: !!document.getElementById("course-published")?.checked,
      createdAt: now,
      updatedAt: now,
    };
  }

  function upsert(list, item) {
    const idx = list.findIndex((x) => x && x.id === item.id);
    if (idx >= 0) {
      const prev = list[idx] || {};
      const next = { ...prev, ...item, createdAt: prev.createdAt || item.createdAt, updatedAt: item.updatedAt };
      const copy = list.slice();
      copy[idx] = next;
      return copy;
    }
    return [item, ...list];
  }

  function render() {
    const tbody = document.getElementById("courses-tbody");
    const summary = document.getElementById("courses-summary");
    const toggle = document.getElementById("courses-page-enabled");
    if (!tbody) return;

    ensureSeed();
    ensureDefaultPricesOnce();
    if (toggle) toggle.checked = getCoursesPageEnabled();

    const q = String(document.getElementById("courses-search")?.value || "").trim().toLowerCase();
    const filter = String(document.getElementById("courses-filter")?.value || "all");

    const list = getList().filter((x) => x && typeof x === "object").slice().sort(byDateDesc);
    const filtered = list
      .filter((x) => (filter === "all" ? true : filter === "published" ? x.published !== false : x.published === false))
      .filter((x) => {
        if (!q) return true;
        const hay = `${x.title || ""} ${x.excerpt || ""} ${x.instructor || ""}`.toLowerCase();
        return hay.includes(q);
      });

    if (summary) {
      const publishedCount = list.filter((x) => x.published !== false).length;
      summary.textContent = `Toplam ${list.length} • Yayında ${publishedCount} • Kapalı ${list.length - publishedCount}`;
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-sm text-slate-500">Kurs bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((c) => {
        const id = escapeHtml(c.id || "");
        const title = escapeHtml(c.title || "Kurs");
        const excerpt = escapeHtml(c.excerpt || "");
        const instructor = escapeHtml(c.instructor || "-");
        const status =
          c.published !== false
            ? `<span class="px-2 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">Yayında</span>`
            : `<span class="px-2 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Kapalı</span>`;

        return `
          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4">
              <div class="font-extrabold text-slate-900 dark:text-slate-100">${title}</div>
              ${excerpt ? `<div class="text-xs text-slate-500 mt-1">${excerpt}</div>` : ""}
            </td>
            <td class="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">${escapeHtml(c.level || "-")}</td>
            <td class="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">${escapeHtml(c.duration || "-")}</td>
            <td class="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">${instructor}</td>
            <td class="px-6 py-4">${status}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <a class="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-extrabold hover:opacity-90"
                  href="kurs_detay.html?id=${encodeURIComponent(c.id || "")}" target="_blank" rel="noopener noreferrer">
                  Gör
                </a>
                <button type="button" class="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-extrabold hover:opacity-90" data-action="edit" data-id="${id}">
                  Düzenle
                </button>
                <button type="button" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-extrabold hover:opacity-90" data-action="toggle" data-id="${id}">
                  ${c.published !== false ? "Kapat" : "Aç"}
                </button>
                <button type="button" class="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-extrabold hover:bg-rose-700" data-action="delete" data-id="${id}">
                  Sil
                </button>
              </div>
            </td>
          </tr>
        `.trim();
      })
      .join("\n");
  }

  function bind() {
    const tbody = document.getElementById("courses-tbody");
    if (!tbody) return;

    ensureSeed();
    render();

    document.getElementById("courses-search")?.addEventListener("input", render);
    document.getElementById("courses-filter")?.addEventListener("change", render);

    const enabledToggle = document.getElementById("courses-page-enabled");
    enabledToggle?.addEventListener("change", () => {
      setCoursesPageEnabled(!!enabledToggle.checked);
      render();
    });

    document.getElementById("courses-add")?.addEventListener("click", () => {
      fillForm({ published: true });
      openModal("course-modal");
    });

    document.getElementById("course-modal-close")?.addEventListener("click", () => closeModal("course-modal"));
    document.getElementById("course-modal-cancel")?.addEventListener("click", () => closeModal("course-modal"));
    document.getElementById("course-modal-backdrop")?.addEventListener("click", () => closeModal("course-modal"));

    document.getElementById("course-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const item = readForm();
      if (!item.title) return alert("Kurs başlığı zorunlu.");

      const list = getList();
      setList(upsert(list, item));
      closeModal("course-modal");
      render();
      alert("Kurs kaydedildi.");
    });

    tbody.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-action][data-id]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;

      const list = getList();
      const item = list.find((x) => x && x.id === id);
      if (!item) return;

      if (action === "edit") {
        fillForm(item);
        openModal("course-modal");
        return;
      }
      if (action === "toggle") {
        const next = list.map((x) =>
          x && x.id === id ? { ...x, published: x.published === false, updatedAt: new Date().toISOString() } : x
        );
        setList(next);
        render();
        return;
      }
      if (action === "delete") {
        if (!window.confirm("Bu kurs silinsin mi?")) return;
        setList(list.filter((x) => x && x.id !== id));
        render();
      }
    });

    const params = new URLSearchParams(window.location.search || "");
    if (params.get("new") === "1") {
      fillForm({ published: true });
      openModal("course-modal");
    }

    window.addEventListener("storage", (ev) => {
      if (!ev) return;
      if (ev.key === COURSES_KEY || ev.key === SETTINGS_KEY) render();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
