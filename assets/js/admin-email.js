(() => {
  "use strict";

  const API_BASE = window.location.pathname.includes("/pages/") ? "../api/" : "api/";
  const apiUrl = (path) => {
    const p = String(path || "").replace(/^\.?\//, "").replace(/^api\//, "");
    return `${API_BASE}${p}`;
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(text, tone) {
    const el = $("email-status");
    if (!el) return;
    el.textContent = String(text || "");
    el.className =
      "text-sm font-semibold " +
      (tone === "ok"
        ? "text-emerald-600"
        : tone === "warn"
        ? "text-amber-600"
        : tone === "danger"
        ? "text-rose-600"
        : "text-slate-600 dark:text-slate-300");
  }

  function parseEmails(raw) {
    const parts = String(raw || "")
      .split(/[\n,;]+/g)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(parts));
  }

  function isValidEmail(email) {
    const e = String(email || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function apiGet(url) {
    const resp = await fetch(url, { method: "GET", credentials: "include" });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error(data.message || "İstek başarısız.");
    return data;
  }

  async function apiPost(url, payload) {
    const resp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error(data.message || "Gönderim hatası.");
    return data;
  }

  async function refreshBrevoStatus() {
    const el = $("brevo-status");
    if (!el) return;
    try {
      const s = await apiGet(apiUrl("email_status.php"));
      if (!s.configured) {
        el.innerHTML =
          '<span class="px-2 py-1 rounded-full text-xs font-extrabold bg-rose-50 dark:bg-rose-500/10 text-rose-600">Brevo yapılandırılmadı</span>' +
          '<span class="ml-2 text-xs text-slate-500 dark:text-slate-400">.env içine `BREVO_API_KEY` ve `MAIL_FROM` girin.</span>';
      } else {
        el.innerHTML =
          '<span class="px-2 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">Brevo hazır</span>' +
          `<span class="ml-2 text-xs text-slate-500 dark:text-slate-400">Gönderici: ${String(s.mailFrom || "")}</span>`;
      }
    } catch (e) {
      el.innerHTML =
        '<span class="px-2 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">Durum alınamadı</span>';
    }
  }

  function switchTab(next) {
    const tabs = ["bulk", "single", "test"];
    tabs.forEach((t) => {
      $("tab-" + t)?.classList.toggle("hidden", t !== next);
      $("btn-" + t)?.classList.toggle("bg-primary", t === next);
      $("btn-" + t)?.classList.toggle("text-white", t === next);
      $("btn-" + t)?.classList.toggle("bg-slate-100", t !== next);
      $("btn-" + t)?.classList.toggle("dark:bg-slate-800", t !== next);
      $("btn-" + t)?.classList.toggle("text-slate-700", t !== next);
      $("btn-" + t)?.classList.toggle("dark:text-slate-200", t !== next);
    });
  }

  function bind() {
    refreshBrevoStatus();

    $("btn-bulk")?.addEventListener("click", () => switchTab("bulk"));
    $("btn-single")?.addEventListener("click", () => switchTab("single"));
    $("btn-test")?.addEventListener("click", () => switchTab("test"));

    $("bulk-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", "");
      const subject = String($("bulk-subject")?.value || "").trim();
      const body = String($("bulk-body")?.value || "").trim();
      const recipients = parseEmails($("bulk-recipients")?.value || "");
      if (!subject || !body) return setStatus("Konu ve içerik zorunlu.", "warn");
      if (!recipients.length) return setStatus("En az bir alıcı ekleyin.", "warn");
      if (recipients.some((x) => !isValidEmail(x))) return setStatus("Alıcı listesinde geçersiz e-posta var.", "warn");
      $("bulk-send")?.setAttribute("disabled", "disabled");
      try {
        const res = await apiPost(apiUrl("email_send.php"), { subject, body, recipients });
        setStatus(`Toplu gönderim tamamlandı. Gönderildi: ${res.delivered}, Hata: ${res.failed}`, "ok");
      } catch (err) {
        setStatus(String(err?.message || err), "danger");
      } finally {
        $("bulk-send")?.removeAttribute("disabled");
      }
    });

    $("single-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", "");
      const to = String($("single-to")?.value || "").trim();
      const subject = String($("single-subject")?.value || "").trim();
      const body = String($("single-body")?.value || "").trim();
      if (!isValidEmail(to)) return setStatus("Geçerli bir alıcı e-postası girin.", "warn");
      if (!subject || !body) return setStatus("Konu ve içerik zorunlu.", "warn");
      $("single-send")?.setAttribute("disabled", "disabled");
      try {
        const res = await apiPost(apiUrl("email_send.php"), { subject, body, recipients: [to] });
        setStatus(`Gönderildi. ${res.delivered ? "Başarılı" : "Kontrol edin"}`, "ok");
      } catch (err) {
        setStatus(String(err?.message || err), "danger");
      } finally {
        $("single-send")?.removeAttribute("disabled");
      }
    });

    $("test-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", "");
      const to = String($("test-to")?.value || "").trim();
      const subject = String($("test-subject")?.value || "").trim();
      const body = String($("test-body")?.value || "").trim();
      if (!isValidEmail(to)) return setStatus("Geçerli bir test e-postası girin.", "warn");
      if (!subject || !body) return setStatus("Konu ve içerik zorunlu.", "warn");
      $("test-send")?.setAttribute("disabled", "disabled");
      try {
        const res = await apiPost(apiUrl("email_test.php"), { subject, body, recipients: [to] });
        setStatus(res.message || "Test e-postası gönderildi.", "ok");
      } catch (err) {
        setStatus(String(err?.message || err), "danger");
      } finally {
        $("test-send")?.removeAttribute("disabled");
      }
    });

    // default tab
    switchTab("bulk");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
