(function () {
  const UI_SETTINGS_KEY = "demo_site_settings_v1";
  const FOOTER_SETTINGS_KEY = "siteFooter";

  function safeParseJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  function normalizeHex(value) {
    const raw = String(value || "").trim().replace("#", "").toLowerCase();
    if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
    if (/^[0-9a-f]{3}$/.test(raw)) return `#${raw.split("").map((c) => c + c).join("")}`;
    return "";
  }

  function ensureStyle() {
    const id = "aa-site-footer-dynamic-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
#site-footer{background:var(--aa-footer-bg,initial);color:var(--aa-footer-text,inherit)}
#site-footer a{color:var(--aa-footer-text,inherit)}
#site-footer a:hover{opacity:.92}
#site-footer h1,#site-footer h2,#site-footer h3,#site-footer h4{color:var(--aa-footer-heading,var(--aa-footer-text,inherit))}
`.trim();
    document.head.appendChild(style);
  }

  function applyFooter(settings) {
    const footerEl = document.getElementById("site-footer");
    if (!footerEl) return;

    const footer = settings && typeof settings === "object" ? settings[FOOTER_SETTINGS_KEY] : null;
    if (!footer || typeof footer !== "object") return;

    ensureStyle();

    const bgHex = normalizeHex(footer.bgHex);
    const textHex = normalizeHex(footer.textHex);
    if (bgHex) footerEl.style.setProperty("--aa-footer-bg", bgHex);
    if (textHex) {
      footerEl.style.setProperty("--aa-footer-text", textHex);
      footerEl.style.setProperty("--aa-footer-heading", textHex);
    }

    const email = footer?.contact?.email ? String(footer.contact.email) : "";
    const phone = footer?.contact?.phone ? String(footer.contact.phone) : "";

    const emailLink = document.getElementById("site-footer-email");
    const emailText = document.getElementById("site-footer-email-text");
    if (emailLink && email) {
      emailLink.setAttribute("href", `mailto:${email}`);
      if (emailText) emailText.textContent = email;
    }

    const phoneLink = document.getElementById("site-footer-phone");
    const phoneText = document.getElementById("site-footer-phone-text");
    if (phoneLink && phone) {
      const tel = phone.replace(/[^\d+]/g, "");
      phoneLink.setAttribute("href", `tel:${tel || phone}`);
      if (phoneText) phoneText.textContent = phone;
    }

    const sanitizeHref = (href) => {
      const value = String(href || "").trim();
      const lower = value.toLowerCase();
      if (!value) return "#";
      if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return "#";
      return value;
    };

    const corpUl = document.getElementById("site-footer-corp-links");
    if (corpUl && Array.isArray(footer.corpLinks)) {
      const list = footer.corpLinks
        .filter((x) => x && (x.label || x.href))
        .map((x) => ({
          label: String(x.label || "").trim(),
          href: sanitizeHref(x.href),
        }));
      if (list.length) {
        corpUl.innerHTML = list
          .map(
            (x) =>
              `<li><a class="hover:text-white transition-colors" href="${escapeHtmlAttr(x.href)}">${escapeHtml(
                x.label || x.href
              )}</a></li>`
          )
          .join("");
      }
    }

    const tw = footer?.social?.twitter ? sanitizeHref(footer.social.twitter) : "";
    const li = footer?.social?.linkedin ? sanitizeHref(footer.social.linkedin) : "";
    const ig = footer?.social?.instagram ? sanitizeHref(footer.social.instagram) : "";
    const twEl = document.getElementById("site-footer-social-twitter");
    const liEl = document.getElementById("site-footer-social-linkedin");
    const igEl = document.getElementById("site-footer-social-instagram");
    if (twEl && tw) twEl.setAttribute("href", tw);
    if (liEl && li) liEl.setAttribute("href", li);
    if (igEl && ig) igEl.setAttribute("href", ig);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value).replaceAll("\n", "").replaceAll("\r", "");
  }

  function loadAndApply() {
    const settings = safeParseJson(localStorage.getItem(UI_SETTINGS_KEY), {});
    applyFooter(settings);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAndApply, { once: true });
  } else {
    loadAndApply();
  }

  window.addEventListener("storage", (event) => {
    if (event && event.key === UI_SETTINGS_KEY) loadAndApply();
  });
})();
