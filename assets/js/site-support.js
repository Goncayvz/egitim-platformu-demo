(() => {
  "use strict";

  const STORAGE_KEY = "demo_support_messages_v1";
  const MAX_LEN = { name: 80, email: 120, subject: 120, message: 2000 };

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function getList() {
    const list = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function setList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function uid(prefix) {
    const rand = Math.random().toString(16).slice(2, 10);
    return `${String(prefix || "sup")}_${Date.now().toString(36)}_${rand}`;
  }

  function clampText(value, maxLen) {
    const s = String(value ?? "").trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  function isValidEmail(email) {
    const e = String(email || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function bind() {
    const form = document.getElementById("support-form");
    if (!form) return;

    const nameEl = document.getElementById("support-name");
    const emailEl = document.getElementById("support-email");
    const subjectEl = document.getElementById("support-subject");
    const messageEl = document.getElementById("support-message");
    const statusEl = document.getElementById("support-status");

    const setStatus = (text, tone) => {
      if (!statusEl) return;
      statusEl.textContent = String(text || "");
      statusEl.className =
        "text-sm font-semibold " +
        (tone === "ok"
          ? "text-emerald-600"
          : tone === "warn"
          ? "text-amber-600"
          : tone === "danger"
          ? "text-rose-600"
          : "text-slate-600");
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = clampText(nameEl?.value, MAX_LEN.name);
      const email = clampText(emailEl?.value, MAX_LEN.email);
      const subject = clampText(subjectEl?.value, MAX_LEN.subject);
      const message = clampText(messageEl?.value, MAX_LEN.message);

      if (!name) return setStatus("Lütfen ad soyad girin.", "warn");
      if (!isValidEmail(email)) return setStatus("Lütfen geçerli bir e-posta girin.", "warn");
      if (!message) return setStatus("Lütfen mesajınızı yazın.", "warn");

      const item = {
        id: uid("sup"),
        name,
        email,
        subject: subject || "Destek Mesajı",
        message,
        status: "new",
        createdAt: new Date().toISOString(),
        sourcePath: String(window.location.pathname || ""),
        sourceHref: String(window.location.href || ""),
      };

      const list = getList();
      list.unshift(item);
      setList(list);

      try {
        document.dispatchEvent(new CustomEvent("demo-support-updated"));
      } catch {
        // ignore
      }

      try {
        form.reset();
      } catch {
        // ignore
      }

      setStatus("Mesajınız alındı. En kısa sürede dönüş yapılacak.", "ok");
      window.setTimeout(() => setStatus("", ""), 4500);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();

