(() => {
  "use strict";

  const STORAGE_KEY = "demo_support_messages_v1";

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return escapeHtml(value);
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return d.toISOString().replace("T", " ").slice(0, 16);
    }
  }

  function getList() {
    const list = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function setList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function updateById(id, patch) {
    const list = getList();
    const next = list.map((x) => (x && x.id === id ? { ...x, ...patch } : x));
    setList(next);
  }

  function removeById(id) {
    const list = getList();
    setList(list.filter((x) => x && x.id !== id));
  }

  function matchesQuery(item, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    const hay = `${item?.name || ""} ${item?.email || ""} ${item?.subject || ""} ${item?.message || ""}`.toLowerCase();
    return hay.includes(q);
  }

  function statusPill(status) {
    const s = String(status || "new");
    if (s === "closed") return `<span class="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Kapalı</span>`;
    if (s === "read") return `<span class="px-2 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600">Okundu</span>`;
    return `<span class="px-2 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600">Yeni</span>`;
  }

  function render() {
    const wrap = document.getElementById("support-list");
    const summary = document.getElementById("support-summary");
    if (!wrap) return;

    const statusFilter = document.getElementById("support-filter-status")?.value || "all";
    const q = document.getElementById("support-search")?.value || "";

    const list = getList().filter((x) => x && typeof x === "object");
    const filtered = list
      .filter((x) => (statusFilter === "all" ? true : String(x.status || "new") === statusFilter))
      .filter((x) => matchesQuery(x, q));

    const counts = list.reduce(
      (acc, x) => {
        const s = String(x?.status || "new");
        acc.total += 1;
        if (s === "new") acc.new += 1;
        else if (s === "read") acc.read += 1;
        else if (s === "closed") acc.closed += 1;
        return acc;
      },
      { total: 0, new: 0, read: 0, closed: 0 }
    );

    if (summary) summary.textContent = `Toplam ${counts.total} • Yeni ${counts.new} • Okundu ${counts.read} • Kapalı ${counts.closed}`;

    if (!filtered.length) {
      wrap.innerHTML = `
        <div class="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300">
          <div class="font-extrabold">Kayıt bulunamadı</div>
          <div class="text-sm mt-1">Filtreyi değiştirin veya yeni destek mesajı gelmesini bekleyin.</div>
        </div>
      `.trim();
      return;
    }

    wrap.innerHTML = filtered
      .map((x) => {
        const id = escapeHtml(x.id || "");
        const name = escapeHtml(x.name || "-");
        const email = escapeHtml(x.email || "-");
        const subject = escapeHtml(x.subject || "Destek Mesajı");
        const message = escapeHtml(x.message || "");
        const createdAt = escapeHtml(formatDateTime(x.createdAt));
        const src = escapeHtml(x.sourcePath || "");
        const pill = statusPill(x.status);
        const isNew = String(x.status || "new") === "new";

        return `
          <details class="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm" data-id="${id}">
            <summary class="cursor-pointer list-none px-6 py-5 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="material-symbols-outlined text-primary">support_agent</span>
                  <div class="font-extrabold text-base truncate">${subject}</div>
                  ${pill}
                </div>
                <div class="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                  <span class="font-semibold text-slate-700 dark:text-slate-200">${name}</span>
                  <span class="mx-2">•</span>
                  <span>${email}</span>
                  <span class="mx-2">•</span>
                  <span>${createdAt}</span>
                  ${src ? `<span class="mx-2">•</span><span class="font-semibold">${src}</span>` : ""}
                </div>
              </div>
              <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <div class="px-6 pb-6">
              <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">${message}</div>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" class="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-extrabold hover:opacity-90" data-action="mark-read" data-id="${id}">Okundu</button>
                <button type="button" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-extrabold hover:opacity-90" data-action="close" data-id="${id}">Kapat</button>
                <a class="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-extrabold hover:opacity-90"
                   href="mailto:${encodeURIComponent(x.email || "")}?subject=${encodeURIComponent("Re: " + (x.subject || "Destek Mesajı"))}">
                   Yanıtla (Mail)
                </a>
                <button type="button" class="ml-auto px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-extrabold hover:bg-rose-700" data-action="delete" data-id="${id}">Sil</button>
                ${isNew ? `<span class="text-xs font-bold text-rose-500">Yeni mesaj</span>` : ""}
              </div>
            </div>
          </details>
        `.trim();
      })
      .join("\n");
  }

  function bind() {
    const wrap = document.getElementById("support-list");
    if (!wrap) return;

    const statusSel = document.getElementById("support-filter-status");
    const search = document.getElementById("support-search");
    const clearBtn = document.getElementById("support-clear");

    statusSel?.addEventListener("change", render);
    search?.addEventListener("input", render);
    clearBtn?.addEventListener("click", () => {
      if (statusSel) statusSel.value = "all";
      if (search) search.value = "";
      render();
    });

    wrap.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-action][data-id]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;

      if (action === "delete") {
        if (!window.confirm("Bu destek mesajı silinsin mi?")) return;
        removeById(id);
        render();
        return;
      }
      if (action === "mark-read") {
        updateById(id, { status: "read", updatedAt: new Date().toISOString() });
        render();
        return;
      }
      if (action === "close") {
        updateById(id, { status: "closed", updatedAt: new Date().toISOString() });
        render();
      }
    });

    wrap.addEventListener("toggle", (e) => {
      const d = e.target;
      if (!(d instanceof HTMLDetailsElement)) return;
      if (!d.open) return;
      const id = d.getAttribute("data-id");
      if (!id) return;
      const item = getList().find((x) => x && x.id === id);
      if (!item) return;
      if (String(item.status || "new") !== "new") return;
      updateById(id, { status: "read", updatedAt: new Date().toISOString() });
      render();
    });

    window.addEventListener("storage", (ev) => {
      if (!ev || ev.key !== STORAGE_KEY) return;
      render();
    });

    document.addEventListener("demo-support-updated", render);

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();

