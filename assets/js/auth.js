(function () {
  const AUTH_KEY = "demo_current_user_v1";

  const safeText = (v) => String(v ?? "").trim();
  const normalize = (v) => safeText(v).toLowerCase();

  const normalizeRole = (role) => {
    const r = normalize(role);
    if (r === "admin" || r === "yönetici" || r === "yonetici") return "admin";
    if (r === "eğitmen" || r === "egitmen" || r === "instructor") return "instructor";
    if (r === "öğrenci" || r === "ogrenci" || r === "student") return "student";
    return "";
  };

  const getStoredUser = () => {
    const read = (storage) => {
      try {
        const raw = storage.getItem(AUTH_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (_e) {
        return null;
      }
    };

    return read(sessionStorage) || read(localStorage);
  };

  const storeUser = (user, { remember } = {}) => {
    try {
      const data = JSON.stringify(user || {});
      const target = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      target.setItem(AUTH_KEY, data);
      other.removeItem(AUTH_KEY);
    } catch (_e) {
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user || {}));
      } catch (_e2) { }
    }
  };

  const clearUser = () => {
    try { localStorage.removeItem(AUTH_KEY); } catch (_e) { }
    try { sessionStorage.removeItem(AUTH_KEY); } catch (_e) { }
  };

  const redirectForRole = (role) => {
    if (role === "admin") return "s.adminpanel.html";
    if (role === "instructor") return "egitmenpanel.html";
    return "userpanel.html";
  };

  const buildLoginUrl = () => {
    try {
      const next = encodeURIComponent(window.location.pathname.split("/").pop() || "");
      return `giris.html?next=${next}`;
    } catch (_e) {
      return "giris.html";
    }
  };

  const mapUser = (user) => {
    const u = user && typeof user === "object" ? user : {};
    const roleKey = normalizeRole(u.role) || normalizeRole(u.roleLabel) || "";
    return {
      ...u,
      role: roleKey || (typeof u.role === "string" ? u.role : ""),
    };
  };

  const fetchMe = async () => {
    try {
      const resp = await fetch("./api/me.php", { method: "GET", credentials: "include" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data || !data.authenticated) return null;
      return mapUser(data.user || {});
    } catch (_e) {
      return null;
    }
  };

  const guard = async ({ requiredRole, allowRoles, redirectIfWrongRole, fetchSession = true } = {}) => {
    const required = requiredRole ? normalizeRole(requiredRole) : "";
    const allow = Array.isArray(allowRoles) ? allowRoles.map(normalizeRole).filter(Boolean) : null;
    const redirectWrong = redirectIfWrongRole !== false;

    let user = mapUser(getStoredUser());

    if ((!user || !user.role) && fetchSession) {
      const serverUser = await fetchMe();
      if (serverUser) {
        user = serverUser;
        storeUser(serverUser, { remember: true });
      }
    }

    if (!user || !user.role) {
      window.location.href = buildLoginUrl();
      return null;
    }

    const role = normalizeRole(user.role) || user.role;
    const roleOk = required ? role === required : (allow ? allow.includes(role) : true);

    if (!roleOk && redirectWrong) {
      window.location.href = redirectForRole(role);
      return null;
    }

    return user;
  };

  const logout = async ({ redirectTo = "giris.html" } = {}) => {
    try {
      await fetch("./api/logout.php", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
    } catch (_e) { }
    clearUser();
    if (redirectTo) window.location.href = redirectTo;
  };

  window.AngelAuth = {
    guard,
    logout,
    getStoredUser: () => mapUser(getStoredUser()),
    clearUser,
    storeUser,
  };
})();

