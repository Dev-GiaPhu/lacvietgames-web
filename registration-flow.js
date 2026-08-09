(() => {
  const apiBaseUrl = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const COOKIE_SENTINEL = "cookie.session";

  // GitHub Pages and Railway are different sites. Prefer the HttpOnly partitioned cookie, but if
  // a browser/privacy mode refuses that cookie, retry only the login request in short-lived bearer
  // mode. This keeps login functional without making bearer storage the default path.
  if (apiBaseUrl && !window.__LVG_AUTH_TRANSPORT_FALLBACK__) {
    window.__LVG_AUTH_TRANSPORT_FALLBACK__ = true;
    const upstreamFetch = window.fetch.bind(window);

    window.fetch = async function(input, init = {}) {
      const url = typeof input === "string" ? input : input?.url || "";
      if (!url.includes("/api/store/auth/login")) return upstreamFetch(input, init);

      let headers;
      try { headers = new Headers(init?.headers || {}); } catch { headers = new Headers(); }
      if (headers.get("X-LVG-Session-Mode") === "bearer") return upstreamFetch(input, init);

      const response = await upstreamFetch(input, init);
      if (!response.ok) return response;
      const payload = await response.clone().json().catch(() => null);
      if (payload?.data?.token !== COOKIE_SENTINEL) return response;

      let cookieWorks = false;
      const probeController = new AbortController();
      const probeTimer = setTimeout(() => probeController.abort(), 2500);
      try {
        const probe = await upstreamFetch(`${apiBaseUrl}/api/store/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { "Accept": "application/json" },
          signal: probeController.signal
        });
        cookieWorks = probe.ok;
      } catch {
        cookieWorks = false;
      } finally {
        clearTimeout(probeTimer);
      }

      if (cookieWorks) return response;

      const retryHeaders = new Headers(headers);
      retryHeaders.set("X-LVG-Session-Mode", "bearer");
      return upstreamFetch(input, {
        ...(init || {}),
        credentials: "include",
        cache: "no-store",
        headers: retryHeaders
      });
    };
  }

  const form = document.getElementById("registerForm");
  if (!form) return;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const byId = (id) => document.getElementById(id);

  const headingCopy = form.querySelector(".form-heading p");
  if (headingCopy) {
    headingCopy.textContent = "Điền thông tin để nhận mã email. Tài khoản chỉ được tạo sau khi xác thực đúng.";
  }

  const submitLabel = form.querySelector("button[type=submit] span");
  if (submitLabel) submitLabel.textContent = "Gửi mã xác nhận";

  if (new URLSearchParams(window.location.search).get("tab") === "register") {
    byId("registerTab")?.click();
  }

  function showStatus(message, type = "error") {
    const box = byId("appStatus");
    if (!box) return;
    box.textContent = message;
    box.className = `status-message show ${type}`;
  }

  function clearStatus() {
    const box = byId("appStatus");
    if (!box) return;
    box.textContent = "";
    box.className = "status-message";
  }

  function clearErrors() {
    form.querySelectorAll("input").forEach((input) => input.classList.remove("invalid"));
    form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
    const termsError = byId("termsError");
    if (termsError) termsError.textContent = "";
  }

  function setError(input, message) {
    input.classList.add("invalid");
    const error = input.closest(".field")?.querySelector(".field-error");
    if (error) error.textContent = message;
  }

  async function handleRegistration(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearStatus();
    clearErrors();

    const name = byId("registerName");
    const email = byId("registerEmail");
    const password = byId("registerPassword");
    const confirm = byId("registerConfirm");
    const terms = byId("acceptTerms");
    const termsError = byId("termsError");

    let valid = true;
    if (name.value.trim().length < 2) {
      setError(name, "Họ và tên phải có ít nhất 2 ký tự.");
      valid = false;
    }
    if (!emailPattern.test(email.value.trim())) {
      setError(email, "Email không đúng định dạng.");
      valid = false;
    }
    if (password.value.length < 8) {
      setError(password, "Mật khẩu phải có ít nhất 8 ký tự.");
      valid = false;
    }
    if (confirm.value !== password.value) {
      setError(confirm, "Mật khẩu xác nhận không khớp.");
      valid = false;
    }
    if (!terms.checked) {
      termsError.textContent = "Bạn cần đồng ý với điều khoản sử dụng.";
      valid = false;
    }
    if (!valid) return;

    if (!apiBaseUrl) {
      showStatus("Dịch vụ tài khoản tạm thời chưa sẵn sàng.");
      return;
    }

    const button = form.querySelector("button[type=submit]");
    const label = button.querySelector("span");
    button.disabled = true;
    button.classList.add("loading");
    if (label) label.textContent = "Đang gửi mã...";

    try {
      const response = await fetch(`${apiBaseUrl}/api/Accounts/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value.trim(),
          email: email.value.trim().toLowerCase(),
          password: password.value
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || "Không thể gửi mã xác nhận.");
      }

      const registrationToken = payload?.data?.registrationToken;
      if (!registrationToken) {
        throw new Error("Không thể tạo phiên xác thực. Vui lòng thử lại.");
      }

      sessionStorage.setItem("lacvietgamesPendingRegistration", JSON.stringify({
        name: name.value.trim(),
        email: payload.data.email || email.value.trim().toLowerCase(),
        registrationToken,
        expiresInMinutes: payload.data.expiresInMinutes || 15,
        startedAt: Date.now()
      }));

      window.location.assign("./verify.html");
    } catch (error) {
      showStatus(error.message || "Không thể gửi mã xác nhận.");
    } finally {
      button.disabled = false;
      button.classList.remove("loading");
      if (label) label.textContent = "Gửi mã xác nhận";
    }
  }

  form.addEventListener("submit", handleRegistration, true);
})();
