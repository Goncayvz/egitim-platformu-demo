(() => {
  "use strict";

  const COURSES_KEY = "demo_courses_v1";
  const SETTINGS_KEY = "demo_site_settings_v1";
  const CART_PAGE = "odeme_page.html";
  const AUTH_KEY = "demo_current_user_v1";

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function getSettings() {
    const s = safeJsonParse(localStorage.getItem(SETTINGS_KEY), {});
    return s && typeof s === "object" ? s : {};
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
    return `${String(prefix || "course")}_${Date.now().toString(36)}_${rand}`;
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
        imageDataUrl: "",
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
        imageDataUrl: "",
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
        imageDataUrl: "",
        vatRate: 0.20,
        published: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  function ensureDefaultPricesOnce() {
    // Kullanıcı daha önce kursları fiyat etiketsiz kaydettiyse,
    // kurs sayfasında görünmesi için boş olanlara varsayılan fiyat ata (1 kere).
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
      const vat = Number(c?.vatRate);
      const patch = {};
      if (!price) {
        patch.priceLabel = pickDefaultPrice(c);
        changed = true;
      }
      if (!Number.isFinite(vat)) {
        patch.vatRate = 0.20;
        changed = true;
      }
      return Object.keys(patch).length ? { ...c, ...patch, updatedAt: now } : c;
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

  function getCartApi() {
    try {
      return window.DemoCart || null;
    } catch (_e) {
      return null;
    }
  }

  function getStoredAuthUser() {
    try {
      const user = safeJsonParse(sessionStorage.getItem(AUTH_KEY), null) || safeJsonParse(localStorage.getItem(AUTH_KEY), null);
      if (!user || typeof user !== "object") return null;
      const role = String(user.role || user.roleLabel || "").trim();
      if (!role) return null;
      return user;
    } catch (_e) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getStoredAuthUser();
  }

  function getCurrentPageHtml() {
    try {
      const file = String(window.location.pathname.split("/").pop() || "").trim();
      if (/^[A-Za-z0-9_.-]+\.html$/i.test(file)) return file;
      return "";
    } catch (_e) {
      return "";
    }
  }

  function redirectToLogin() {
    const next = getCurrentPageHtml() || "kurslar.html";
    window.location.href = `giris.html?next=${encodeURIComponent(next)}`;
  }

  function requireLoginOrRedirect(event) {
    if (isLoggedIn()) return true;
    try {
      event?.preventDefault?.();
      event?.stopPropagation?.();
    } catch (_e) {}
    redirectToLogin();
    return false;
  }

  function setCartButtonState(btn, inCart) {
    if (!btn) return;
    const on = !!inCart;
    btn.dataset.inCart = on ? "1" : "0";

    if (!isLoggedIn()) {
      btn.textContent = "Giriş Yap";
      if (btn.id === "course-add-to-cart") {
        btn.className =
          "bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-95 transition";
      } else {
        btn.className =
          "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-extrabold bg-slate-900 text-white hover:opacity-95 transition";
      }
      return;
    }

    btn.textContent = on ? "Sepette" : "Sepete Ekle";
    if (btn.id === "course-add-to-cart") {
      btn.className = on
        ? "border border-emerald-500/30 px-6 py-3 rounded-xl font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 hover:opacity-95 transition"
        : "border border-primary/30 px-6 py-3 rounded-xl font-semibold hover:bg-primary/10 transition";
      return;
    }

    btn.className = on
      ? "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 dark:bg-emerald-500/10 border border-emerald-500/20"
      : "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-extrabold bg-primary text-white hover:opacity-95 transition";
  }

  function renderCoursesGrid() {
    const grid = document.getElementById("courses-grid");
    const empty = document.getElementById("courses-empty");
    if (!grid) return;

    ensureSeed();
    ensureDefaultPricesOnce();

    const settings = getSettings();
    const enabled = settings?.sections?.coursesPageEnabled !== false;
    if (!enabled) {
      grid.innerHTML = "";
      if (empty) {
        empty.classList.remove("hidden");
        empty.querySelector("[data-empty-title]")?.replaceChildren(document.createTextNode("Kurslar şu an kapalı"));
        empty.querySelector("[data-empty-desc]")?.replaceChildren(
          document.createTextNode("Kurslar sayfası geçici olarak devre dışı. Daha sonra tekrar deneyin.")
        );
      }
      return;
    }

    ensureSeed();
    const list = getList()
      .filter((x) => x && typeof x === "object")
      .filter((x) => x.published !== false)
      .slice()
      .sort(byDateDesc);

    if (!list.length) {
      grid.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }

    empty?.classList.add("hidden");
    grid.innerHTML = list
      .map((c) => {
        const title = escapeHtml(c.title || "Kurs");
        const excerpt = escapeHtml(c.excerpt || "");
        const instructor = escapeHtml(c.instructor || "");
        const meta = [c.level ? `Seviye: ${escapeHtml(c.level)}` : "", c.duration ? `Süre: ${escapeHtml(c.duration)}` : ""]
          .filter(Boolean)
          .join(" • ");

        return `
          <article class="bg-white dark:bg-white/5 border border-primary/10 rounded-2xl p-4 flex flex-col">
            <div class="flex items-start justify-between gap-3">
              <h2 class="font-black text-base md:text-lg leading-snug">${title}</h2>
              ${c.priceLabel ? `<span class="text-[11px] font-extrabold bg-primary/10 text-primary px-2 py-1 rounded-full">${escapeHtml(c.priceLabel)}</span>` : ""}
            </div>
            ${excerpt ? `<p class="text-sm text-slate-500 mt-2">${excerpt}</p>` : ""}
            ${meta ? `<p class="text-[11px] text-slate-500 mt-3 font-semibold">${meta}</p>` : ""}
            ${instructor ? `<p class="text-[11px] text-slate-500 mt-1 font-semibold">Eğitmen: ${instructor}</p>` : ""}
            <div class="mt-4 flex items-center justify-between gap-3">
              <a href="kurs_detay.html?id=${encodeURIComponent(c.id || "")}" class="inline-flex text-primary font-extrabold">
                Detaya Git
              </a>
              <button type="button" class="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-extrabold bg-primary text-white hover:opacity-95 transition"
                data-action="add-to-cart" data-course-id="${escapeHtml(c.id || "")}">
                Sepete Ekle
              </button>
            </div>
          </article>
        `.trim();
      })
      .join("");

    // Bind add-to-cart buttons (event delegation)
    const cart = getCartApi();
    if (cart) {
      grid.querySelectorAll('[data-action="add-to-cart"][data-course-id]').forEach((btn) => {
        const id = btn.getAttribute("data-course-id") || "";
        setCartButtonState(btn, isLoggedIn() ? cart.isInCart(id) : false);
      });
    }

    if (!grid.dataset.cartBound) {
      grid.dataset.cartBound = "1";
      grid.addEventListener("click", (e) => {
        const btn = e.target?.closest?.('button[data-action="add-to-cart"][data-course-id]');
        if (!btn) return;
        if (!requireLoginOrRedirect(e)) return;
        const id = String(btn.getAttribute("data-course-id") || "").trim();
        const cart2 = getCartApi();
        if (!cart2 || !id) return;
        if (cart2.isInCart(id)) {
          window.location.href = CART_PAGE;
          return;
        }
        const course = cart2.getCourseById(id);
        cart2.addCourse(course || { id, title: btn.closest("article")?.querySelector("h2")?.textContent || "Kurs" });
        setCartButtonState(btn, true);
        try { cart2.bindBadge({ badgeId: "site-cart-badge", buttonId: "site-cart-btn", href: CART_PAGE }); } catch (_e) {}
      });
    }

    // Update header badge if present
    try {
      getCartApi()?.bindBadge?.({ badgeId: "site-cart-badge", buttonId: "site-cart-btn", href: CART_PAGE });
    } catch (_e) {}

    // Checkout links require login (kurslar sayfası)
    try {
      document.getElementById("site-cart-btn")?.addEventListener("click", (ev) => requireLoginOrRedirect(ev));
      document.querySelectorAll(`a[href="${CART_PAGE}"]`).forEach((a) => a.addEventListener("click", (ev) => requireLoginOrRedirect(ev)));
    } catch (_e) {}
  }

  function renderCourseDetail() {
    const root = document.getElementById("course-detail");
    if (!root) return;

    ensureSeed();
    ensureDefaultPricesOnce();
    const params = new URLSearchParams(window.location.search || "");
    const id = String(params.get("id") || "").trim();

    const titleEl = document.getElementById("course-title");
    const descEl = document.getElementById("course-desc");
    const levelEl = document.getElementById("course-level");
    const durationEl = document.getElementById("course-duration");
    const instructorEl = document.getElementById("course-instructor");
    const notFoundEl = document.getElementById("course-not-found");

    const list = getList();
    const item = id ? list.find((x) => x && x.id === id) : null;

    if (!item) {
      root.classList.add("hidden");
      notFoundEl?.classList.remove("hidden");
      return;
    }

    if (item.published === false) {
      root.classList.add("hidden");
      if (notFoundEl) {
        notFoundEl.classList.remove("hidden");
        notFoundEl.querySelector("[data-empty-title]")?.replaceChildren(document.createTextNode("Bu kurs yayında değil"));
        notFoundEl.querySelector("[data-empty-desc]")?.replaceChildren(
          document.createTextNode("Bu kurs şu an kapalı. Kurs listesine dönüp diğer kurslara göz atabilirsin.")
        );
      }
      return;
    }

    notFoundEl?.classList.add("hidden");
    root.classList.remove("hidden");

    if (titleEl) titleEl.textContent = String(item.title || "Kurs");
    if (descEl) descEl.textContent = String(item.description || item.excerpt || "");
    if (levelEl) levelEl.textContent = `Seviye: ${String(item.level || "-")}`;
    if (durationEl) durationEl.textContent = `Süre: ${String(item.duration || "-")}`;
    if (instructorEl) instructorEl.textContent = `Eğitmen: ${String(item.instructor || "-")}`;

    // Cart controls on detail page
    try {
      const cart = getCartApi();
      cart?.bindBadge?.({ badgeId: "site-cart-badge", buttonId: "site-cart-btn", href: CART_PAGE });
      const addBtn = document.getElementById("course-add-to-cart");
      if (addBtn && cart) {
        setCartButtonState(addBtn, isLoggedIn() ? cart.isInCart(item.id) : false);
        addBtn.onclick = () => {
          if (!requireLoginOrRedirect()) return;
          if (cart.isInCart(item.id)) {
            window.location.href = CART_PAGE;
            return;
          }
          cart.addCourse(item, 1);
          setCartButtonState(addBtn, true);
        };
      }
      const buyNow = document.getElementById("course-buy-now");
      if (buyNow && cart) {
        buyNow.onclick = (ev) => {
          if (!requireLoginOrRedirect(ev)) return;
          try {
            // Ensure it's in cart before checkout
            if (!cart.isInCart(item.id)) cart.addCourse(item, 1);
          } catch (_e) {}
        };
      }
    } catch (_e) {}
  }

  function boot() {
    renderCoursesGrid();
    renderCourseDetail();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.addEventListener("storage", (e) => {
    if (!e) return;
    if (e.key === COURSES_KEY || e.key === SETTINGS_KEY) boot();
  });
})();
