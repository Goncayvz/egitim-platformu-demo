(function () {
  "use strict";

  const API_BASE = window.location.pathname.includes("/pages/") ? "../api/" : "api/";
  const apiUrl = (path) => {
    const p = String(path || "").replace(/^\.?\//, "").replace(/^api\//, "");
    return `${API_BASE}${p}`;
  };

  const API_CREATE = apiUrl("payment_create.php");
  const INTEGRATIONS_KEY = "demo_payment_integration_v1";

  const safeText = (v) => String(v ?? "").trim();

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch (_e) {
      return null;
    }
  };

  const normalizeCurrency = (v) => {
    const raw = safeText(v).toUpperCase();
    return raw === "TRY" ? "TRY" : "TRY";
  };

  const buildAbsoluteUrl = (maybeRelative) => {
    const raw = safeText(maybeRelative);
    if (!raw) return "";
    try {
      return new URL(raw, window.location.href).toString();
    } catch (_e) {
      return raw;
    }
  };

  async function createCheckoutSession(payload) {
    const res = await fetch(API_CREATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      const message = safeText(data?.message) || `HTTP ${res.status}`;
      return { ok: false, code: safeText(data?.code) || "HTTP_ERROR", message, data };
    }
    if (!data || typeof data !== "object") {
      return { ok: false, code: "BAD_RESPONSE", message: "Beklenmeyen API cevabı.", data: null };
    }
    if (data.ok !== true) {
      return { ok: false, code: safeText(data.code) || "FAILED", message: safeText(data.message) || "Ödeme başlatılamadı.", data };
    }
    return { ok: true, data };
  }

  async function startCheckout(options) {
    const items = Array.isArray(options?.items) ? options.items : [];
    const total = Number(options?.total);
    const currency = normalizeCurrency(options?.currency || "TRY");
    const successUrl = buildAbsoluteUrl(options?.successUrl || "odeme_basarili.html?status=success");
    const failUrl = buildAbsoluteUrl(options?.failUrl || "odeme_basarili.html?status=failed");
    const cancelUrl = buildAbsoluteUrl(options?.cancelUrl || "odeme_basarili.html?status=cancelled");
    const paymentCard = options?.paymentCard && typeof options.paymentCard === "object" ? options.paymentCard : null;
    const buyer = options?.buyer && typeof options.buyer === "object" ? options.buyer : null;
    const billingAddress = options?.billingAddress && typeof options.billingAddress === "object" ? options.billingAddress : null;

    const integration = (() => {
      try {
        const raw = window.localStorage ? localStorage.getItem(INTEGRATIONS_KEY) : "";
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (_e) {
        return {};
      }
    })();

    const provider = safeText(integration?.provider);
    const mockStatus = safeText(integration?.mockStatus);

    const payload = {
      currency,
      total,
      items: items.map((x) => ({
        id: safeText(x?.id),
        title: safeText(x?.title),
        qty: Number(x?.qty) || 1,
        price: Number(x?.price),
        priceLabel: safeText(x?.priceLabel),
      })),
      successUrl,
      failUrl,
      cancelUrl,
      source: "odeme_page",
      paymentCard: paymentCard || undefined,
      buyer: buyer || undefined,
      billingAddress: billingAddress || undefined,
      provider: provider || undefined,
      mockStatus: mockStatus || undefined,
    };

    const result = await createCheckoutSession(payload);
    if (!result.ok) return result;

    const threeDSHtmlContent = safeText(result.data?.threeDSHtmlContent);
    if (threeDSHtmlContent) {
      try {
        if (window.sessionStorage) {
          sessionStorage.setItem(
            "demo_3ds_payload_v1",
            JSON.stringify({ provider: safeText(result.data?.provider), threeDSHtmlContent, createdAt: new Date().toISOString() })
          );
        }
      } catch (_e) {}
      window.location.href = "odeme_3ds.html";
      return { ok: true, redirected: true, threeDS: true };
    }

    const redirectUrl = safeText(result.data?.redirectUrl);
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return { ok: true, redirected: true };
    }

    return { ok: false, code: "NO_REDIRECT", message: "Ödeme başlatıldı ama yönlendirme URL'i dönmedi.", data: result.data };
  }

  window.DemoPayments = {
    API_CREATE,
    startCheckout,
    createCheckoutSession,
  };
})();
