(() => {
  "use strict";

  const CART_KEY = "demo_cart_v1";
  const COURSES_KEY = "demo_courses_v1";

  const safeJsonParse = (raw, fallback) => {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_e) {
      return fallback;
    }
  };

  const safeText = (v) => String(v ?? "").trim();

  const loadCourses = () => {
    const list = safeJsonParse(localStorage.getItem(COURSES_KEY), []);
    return Array.isArray(list) ? list : [];
  };

  const normalizeItems = (items) => {
    const out = [];
    const seen = new Set();
    (Array.isArray(items) ? items : []).forEach((x) => {
      const id = safeText(x?.id);
      if (!id || seen.has(id)) return;
      const qty = Math.max(1, Math.floor(Number(x?.qty) || 1));
      out.push({
        id,
        qty,
        title: safeText(x?.title),
        priceLabel: safeText(x?.priceLabel),
        addedAt: safeText(x?.addedAt) || new Date().toISOString(),
      });
      seen.add(id);
    });
    return out.slice(0, 100);
  };

  const loadCart = () => {
    const raw = safeJsonParse(localStorage.getItem(CART_KEY), null);
    const items = normalizeItems(raw?.items);
    return { items, updatedAt: safeText(raw?.updatedAt) || "" };
  };

  const saveCart = (cart) => {
    const next = {
      items: normalizeItems(cart?.items),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    try {
      window.dispatchEvent(new CustomEvent("demo-cart-updated", { detail: next }));
    } catch (_e) {}
    return next;
  };

  const getCourseById = (courseId) => {
    const id = safeText(courseId);
    if (!id) return null;
    const list = loadCourses();
    return list.find((x) => x && String(x.id || "") === id) || null;
  };

  const isInCart = (courseId) => {
    const id = safeText(courseId);
    if (!id) return false;
    const cart = loadCart();
    return cart.items.some((x) => x.id === id);
  };

  const addCourse = (course, qty = 1) => {
    const id = safeText(course?.id);
    if (!id) return loadCart();
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    const cart = loadCart();
    const existing = cart.items.find((x) => x.id === id);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + q);
    } else {
      cart.items.unshift({
        id,
        qty: Math.min(99, q),
        title: safeText(course?.title),
        priceLabel: safeText(course?.priceLabel),
        addedAt: new Date().toISOString(),
      });
    }
    return saveCart(cart);
  };

  const removeCourse = (courseId) => {
    const id = safeText(courseId);
    const cart = loadCart();
    cart.items = cart.items.filter((x) => x.id !== id);
    return saveCart(cart);
  };

  const clearCart = () => saveCart({ items: [] });

  const countItems = () => {
    const cart = loadCart();
    const total = cart.items.reduce((sum, x) => sum + (Number(x?.qty) || 0), 0);
    return Math.max(0, total);
  };

  const parseTryAmount = (label) => {
    const raw = safeText(label);
    if (!raw) return NaN;
    const cleaned = raw
      .replaceAll("TL", "")
      .replaceAll("tl", "")
      .replaceAll("₺", "")
      .replace(/\s+/g, "")
      .trim();
    if (!cleaned) return NaN;

    // "2.500,00" -> 2500.00 (tr-TR style)
    const tr = cleaned.replaceAll(".", "").replaceAll(",", ".");
    const n = Number(tr);
    return Number.isFinite(n) ? n : NaN;
  };

  const formatTry = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
    } catch (_e) {
      return `₺${n.toFixed(2)}`;
    }
  };

  const getDetailedItems = () => {
    const courses = loadCourses();
    const byId = new Map(courses.map((c) => [String(c?.id || ""), c]));
    const cart = loadCart();
    return cart.items.map((x) => {
      const live = byId.get(x.id) || {};
      const vatRate = Number(live?.vatRate);
      return {
        id: x.id,
        qty: x.qty,
        title: safeText(live.title) || x.title || "Kurs",
        priceLabel: safeText(live.priceLabel) || x.priceLabel || "",
        price: parseTryAmount(safeText(live.priceLabel) || x.priceLabel),
        vatRate: Number.isFinite(vatRate) ? vatRate : 0,
      };
    });
  };

  const getTotal = () => {
    const items = getDetailedItems();
    const total = items.reduce((sum, x) => {
      const p = Number(x.price);
      if (!Number.isFinite(p) || p <= 0) return sum;
      return sum + p * (Number(x.qty) || 1);
    }, 0);
    return total;
  };

  const bindBadge = ({ badgeEl, badgeId, buttonEl, buttonId, href } = {}) => {
    const badge = badgeEl || (badgeId ? document.getElementById(badgeId) : null);
    const btn = buttonEl || (buttonId ? document.getElementById(buttonId) : null);

    const render = () => {
      const c = countItems();
      if (badge) {
        badge.textContent = String(c);
        badge.classList.toggle("hidden", c <= 0);
      }
      if (btn && href) {
        btn.setAttribute("href", href);
      }
    };

    render();
    window.addEventListener("demo-cart-updated", render, { passive: true });
    window.addEventListener("storage", (e) => {
      if (!e || e.key !== CART_KEY) return;
      render();
    });
  };

  window.DemoCart = {
    CART_KEY,
    load: loadCart,
    save: saveCart,
    clear: clearCart,
    addCourse,
    removeCourse,
    isInCart,
    countItems,
    getDetailedItems,
    getTotal,
    formatTry,
    getCourseById,
    bindBadge,
  };
})();
