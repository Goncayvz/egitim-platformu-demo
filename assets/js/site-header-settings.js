(function () {
  const SETTINGS_KEY = "demo_site_settings_v1";
  const HEADER_KEY = "siteHeader";

  const PAGES_BASE = window.location.pathname.includes("/pages/") ? "" : "pages/";

  const headerEl = document.getElementById("site-header");
  const logoEl = document.getElementById("site-header-logo");
  const titleEl = document.getElementById("site-header-title");
  const navEl = document.getElementById("site-header-nav");
  const loginEl = document.getElementById("site-header-login");
  const signupEl = document.getElementById("site-header-signup");

  const toRgba = (hex, alpha) => {
    const clean = String(hex || "").trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "";
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const normalizeHex = (value, fallback) => {
    const raw = String(value || "").trim().replace("#", "").toLowerCase();
    if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
    if (/^[0-9a-f]{3}$/.test(raw)) return `#${raw.split("").map((c) => c + c).join("")}`;
    return fallback;
  };

  const defaults = {
    bgHex: "#32466f",
    textHex: "#ffffff",
    navLinks: [
      { label: "Kurslar", href: "kurslar.html", enabled: true },
      { label: "Özel Ders", href: "ozel_ders.html", enabled: true },
      { label: "Kurumsal", href: "iletisim.html", enabled: true },
    ],
    ctas: {
      login: { text: "Giriş Yap", href: "giris.html", enabled: true },
      signup: { text: "Kayıt Ol", href: "kayit.html", enabled: true },
    },
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const readSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  };

  const resolveHref = (href) => {
    const raw = String(href || "").trim();
    if (!raw) return "#";
    if (/^(https?:|mailto:|tel:|#)/i.test(raw)) return raw;
    if (raw.includes("/")) return raw;
    if (/^[A-Za-z0-9_.-]+\.html(\?.*)?$/i.test(raw)) return `${PAGES_BASE}${raw}`;
    return raw;
  };

  const applyHeaderSettings = () => {
    const settings = readSettings();
    const header = settings?.[HEADER_KEY] || {};

    const bgHex = normalizeHex(header.bgHex, defaults.bgHex);
    const textHex = normalizeHex(header.textHex, defaults.textHex);

    if (headerEl) {
      const tint = toRgba(bgHex, 0.9) || bgHex;
      headerEl.style.backgroundColor = tint;
    }

    if (titleEl) titleEl.style.color = textHex;
    if (loginEl) loginEl.style.color = textHex;

    if (logoEl && typeof settings.logoDataUrl === "string" && settings.logoDataUrl) {
      logoEl.src = settings.logoDataUrl;
    }

    const links = Array.isArray(header.navLinks) && header.navLinks.length ? header.navLinks : defaults.navLinks;
    if (navEl) {
      navEl.innerHTML = links
        .filter((x) => x && (x.enabled !== false) && (x.label || x.href))
        .map((x) => {
          const label = escapeHtml(x.label || "");
          const href = escapeHtml(resolveHref(x.href || "#"));
          return `<a class="text-sm font-semibold hover:text-primary transition-colors" href="${href}">${label}</a>`;
        })
        .join("");
      navEl.querySelectorAll("a").forEach((a) => {
        a.style.color = textHex;
      });
    }

    if (loginEl) {
      const login = header?.ctas?.login || defaults.ctas.login;
      if (login && login.enabled !== false) {
        loginEl.textContent = String(login.text || defaults.ctas.login.text);
        loginEl.setAttribute("href", resolveHref(login.href || defaults.ctas.login.href));
        loginEl.style.display = "";
      } else {
        loginEl.style.display = "none";
      }
    }

    if (signupEl) {
      const signup = header?.ctas?.signup || defaults.ctas.signup;
      if (signup && signup.enabled !== false) {
        signupEl.textContent = String(signup.text || defaults.ctas.signup.text);
        signupEl.setAttribute("href", resolveHref(signup.href || defaults.ctas.signup.href));
        signupEl.style.display = "";
      } else {
        signupEl.style.display = "none";
      }
    }
  };

  applyHeaderSettings();
  window.addEventListener("storage", (event) => {
    if (event.key === SETTINGS_KEY) applyHeaderSettings();
  });
})();
