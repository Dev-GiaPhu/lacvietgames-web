const queryApi = new URLSearchParams(window.location.search).get("api");
if (queryApi) localStorage.setItem("lacvietgamesApiBaseUrl", queryApi);

const API_BASE_URL = (
  queryApi ||
  localStorage.getItem("lacvietgamesApiBaseUrl") ||
  window.APP_CONFIG?.API_BASE_URL ||
  ""
).replace(/\/$/, "");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const panels = ["authPanel", "verifyPanel", "forgotPanel", "resetPanel", "accountPanel"];
let modalPrimaryAction = null;

class ApiError extends Error {
  constructor(message, payload, status) {
    super(message);
    this.payload = payload;
    this.status = status;
  }
}

const byId = (id) => document.getElementById(id);

function showStatus(message, type = "info") {
  const box = byId("appStatus");
  box.textContent = message;
  box.className = `status-message show ${type}`;
}

function clearStatus() {
  const box = byId("appStatus");
  box.textContent = "";
  box.className = "status-message";
}

function showPanel(panelId) {
  panels.forEach((id) => {
    byId(id).hidden = id !== panelId;
  });
  clearStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAuth(type = "login") {
  showPanel("authPanel");
  const login = type === "login";
  byId("loginTab").classList.toggle("active", login);
  byId("registerTab").classList.toggle("active", !login);
  byId("loginTab").setAttribute("aria-selected", String(login));
  byId("registerTab").setAttribute("aria-selected", String(!login));
  byId("loginForm").classList.toggle("active", login);
  byId("registerForm").classList.toggle("active", !login);
}

function showVerification(email) {
  byId("verifyEmail").value = email;
  byId("verifyEmailLabel").textContent = email;
  byId("verifyCode").value = "";
  showPanel("verifyPanel");
  byId("verifyCode").focus();
}

function setError(input, message) {
  input.classList.add("invalid");
  const error = input.closest(".field")?.querySelector(".field-error");
  if (error) error.textContent = message;
}

function clearError(input) {
  input.classList.remove("invalid");
  const error = input.closest(".field")?.querySelector(".field-error");
  if (error) error.textContent = "";
}

function clearFormErrors(form) {
  form.querySelectorAll("input").forEach(clearError);
}

function validateEmail(input) {
  const value = input.value.trim();
  if (!value) {
    setError(input, "Vui lòng nhập email.");
    return false;
  }
  if (!emailPattern.test(value)) {
    setError(input, "Email không đúng định dạng.");
    return false;
  }
  return true;
}

function validatePassword(input, label = "Mật khẩu") {
  if (input.value.length < 8) {
    setError(input, `${label} phải có ít nhất 8 ký tự.`);
    return false;
  }
  return true;
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.classList.toggle("loading", loading);
}

function extractApiMessage(payload, fallback) {
  if (payload?.message) return payload.message;
  if (payload?.errors) {
    const first = Object.values(payload.errors).flat()[0];
    if (first) return first;
  }
  return fallback;
}

async function api(path, options = {}) {
  if (!API_BASE_URL) {
    throw new ApiError("Backend LacVietGames chưa được cấu hình.", null, 0);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new ApiError(
      "Không thể kết nối máy chủ LacVietGames. Backend có thể đang khởi động hoặc chưa cấu hình CORS.",
      null,
      0
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      extractApiMessage(payload, "Không thể xử lý yêu cầu. Vui lòng thử lại."),
      payload,
      response.status
    );
  }
  return payload;
}

function openSuccessModal(title, message, primaryText, primaryAction) {
  byId("successTitle").textContent = title;
  byId("successMessage").textContent = message;
  byId("successPrimary").querySelector("span").textContent = primaryText;
  modalPrimaryAction = primaryAction;
  byId("successModal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
  byId("successModal").hidden = true;
  document.body.style.overflow = "";
}

function saveSession(account, remember) {
  const session = {
    id: account.accId,
    name: account.accName,
    email: account.accEmail,
    verified: account.isEmailVerified,
    loginAt: new Date().toISOString()
  };
  localStorage.removeItem("lacvietgamesSession");
  sessionStorage.removeItem("lacvietgamesSession");
  (remember ? localStorage : sessionStorage).setItem("lacvietgamesSession", JSON.stringify(session));
  return session;
}

function readSession() {
  try {
    const raw = localStorage.getItem("lacvietgamesSession") || sessionStorage.getItem("lacvietgamesSession");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("lacvietgamesSession");
  sessionStorage.removeItem("lacvietgamesSession");
}

function showAccount(session) {
  byId("accountName").textContent = session.name;
  byId("accountEmail").textContent = session.email;
  byId("accountAvatar").textContent = (session.name || "LV").trim().charAt(0).toUpperCase();
  showPanel("accountPanel");
}

byId("loginTab").addEventListener("click", () => showAuth("login"));
byId("registerTab").addEventListener("click", () => showAuth("register"));

document.querySelectorAll("[data-show]").forEach((button) => {
  button.addEventListener("click", () => showAuth(button.dataset.show));
});

document.querySelectorAll("[data-back-login]").forEach((button) => {
  button.addEventListener("click", () => showAuth("login"));
});

document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", () => clearError(input));
});

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const input = byId(button.dataset.target);
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.textContent = reveal ? "Ẩn" : "Hiện";
  });
});

byId("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  clearStatus();

  const name = byId("registerName");
  const email = byId("registerEmail");
  const password = byId("registerPassword");
  const confirm = byId("registerConfirm");
  const terms = byId("acceptTerms");
  const termsError = byId("termsError");
  termsError.textContent = "";

  let valid = true;
  if (name.value.trim().length < 2) {
    setError(name, "Họ và tên phải có ít nhất 2 ký tự.");
    valid = false;
  }
  if (!validateEmail(email)) valid = false;
  if (!validatePassword(password)) valid = false;
  if (confirm.value !== password.value) {
    setError(confirm, "Mật khẩu xác nhận không khớp.");
    valid = false;
  }
  if (!terms.checked) {
    termsError.textContent = "Bạn cần đồng ý với điều khoản sử dụng.";
    valid = false;
  }
  if (!valid) return;

  const button = form.querySelector("button[type=submit]");
  setLoading(button, true);
  try {
    const normalizedEmail = email.value.trim().toLowerCase();
    const result = await api("/api/Accounts/register", {
      method: "POST",
      body: { name: name.value.trim(), email: normalizedEmail, password: password.value }
    });
    const registeredEmail = result.data?.email || normalizedEmail;
    form.reset();
    openSuccessModal(
      "Đăng ký thành công!",
      result.message || `Mã xác nhận đã được gửi đến ${registeredEmail}.`,
      "Nhập mã xác nhận",
      () => showVerification(registeredEmail)
    );
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

byId("verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const code = byId("verifyCode");
  if (!/^\d{6}$/.test(code.value.trim())) {
    setError(code, "Mã xác nhận phải gồm 6 chữ số.");
    return;
  }

  const button = form.querySelector("button[type=submit]");
  setLoading(button, true);
  try {
    const result = await api("/api/Accounts/verify-email", {
      method: "POST",
      body: { email: byId("verifyEmail").value, code: code.value.trim() }
    });
    const verifiedEmail = byId("verifyEmail").value;
    byId("loginEmail").value = verifiedEmail;
    openSuccessModal("Email đã được xác minh!", result.message, "Đăng nhập ngay", () => showAuth("login"));
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

byId("resendCode").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const result = await api("/api/Accounts/resend-verification", {
      method: "POST",
      body: { email: byId("verifyEmail").value }
    });
    showStatus(result.message, "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

byId("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  clearStatus();
  const email = byId("loginEmail");
  const password = byId("loginPassword");
  let valid = validateEmail(email);
  if (!password.value) {
    setError(password, "Vui lòng nhập mật khẩu.");
    valid = false;
  }
  if (!valid) return;

  const button = form.querySelector("button[type=submit]");
  setLoading(button, true);
  try {
    const result = await api("/api/Accounts/login", {
      method: "POST",
      body: { email: email.value.trim().toLowerCase(), password: password.value }
    });
    const session = saveSession(result.data, byId("rememberMe").checked);
    form.reset();
    showAccount(session);
    showStatus(result.message, "success");
  } catch (error) {
    if (error.payload?.code === "EMAIL_NOT_VERIFIED") {
      showVerification(error.payload?.data?.email || email.value.trim().toLowerCase());
      showStatus(error.message, "info");
    } else {
      showStatus(error.message, "error");
    }
  } finally {
    setLoading(button, false);
  }
});

byId("forgotLink").addEventListener("click", () => {
  byId("forgotEmail").value = byId("loginEmail").value;
  showPanel("forgotPanel");
});

byId("forgotForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const email = byId("forgotEmail");
  if (!validateEmail(email)) return;

  const button = form.querySelector("button[type=submit]");
  setLoading(button, true);
  try {
    const normalizedEmail = email.value.trim().toLowerCase();
    const result = await api("/api/Accounts/forgot-password", {
      method: "POST",
      body: { email: normalizedEmail }
    });
    byId("resetEmail").value = normalizedEmail;
    showPanel("resetPanel");
    showStatus(result.message, "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

byId("resetForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const email = byId("resetEmail");
  const code = byId("resetCode");
  const password = byId("resetPassword");
  const confirm = byId("resetConfirm");

  let valid = validateEmail(email);
  if (!/^\d{6}$/.test(code.value.trim())) {
    setError(code, "Mã khôi phục phải gồm 6 chữ số.");
    valid = false;
  }
  if (!validatePassword(password, "Mật khẩu mới")) valid = false;
  if (confirm.value !== password.value) {
    setError(confirm, "Mật khẩu xác nhận không khớp.");
    valid = false;
  }
  if (!valid) return;

  const button = form.querySelector("button[type=submit]");
  setLoading(button, true);
  try {
    const normalizedEmail = email.value.trim().toLowerCase();
    const result = await api("/api/Accounts/reset-password", {
      method: "POST",
      body: { email: normalizedEmail, code: code.value.trim(), newPassword: password.value }
    });
    form.reset();
    byId("loginEmail").value = normalizedEmail;
    openSuccessModal("Mật khẩu đã được đặt lại", result.message, "Đăng nhập", () => showAuth("login"));
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

byId("changePasswordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const current = byId("currentPassword");
  const next = byId("newPassword");
  const confirm = byId("confirmNewPassword");

  let valid = true;
  if (!current.value) {
    setError(current, "Vui lòng nhập mật khẩu hiện tại.");
    valid = false;
  }
  if (!validatePassword(next, "Mật khẩu mới")) valid = false;
  if (confirm.value !== next.value) {
    setError(confirm, "Mật khẩu xác nhận không khớp.");
    valid = false;
  }
  if (!valid) return;

  const session = readSession();
  if (!session) {
    showAuth("login");
    return;
  }

  const button = form.querySelector("button[type=submit]");
  setLoading(button, true);
  try {
    const result = await api("/api/Accounts/change-password", {
      method: "POST",
      body: { accEmail: session.email, accPassword: current.value, newPassword: next.value }
    });
    form.reset();
    showStatus(result.message, "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

byId("logoutButton").addEventListener("click", () => {
  clearSession();
  showAuth("login");
  showStatus("Bạn đã đăng xuất.", "success");
});

byId("successPrimary").addEventListener("click", () => {
  closeSuccessModal();
  if (modalPrimaryAction) modalPrimaryAction();
});

byId("successSecondary").addEventListener("click", () => {
  closeSuccessModal();
  showAuth("login");
});

byId("successModal").querySelector(".modal-backdrop").addEventListener("click", closeSuccessModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !byId("successModal").hidden) closeSuccessModal();
});

const existingSession = readSession();
if (existingSession) showAccount(existingSession);
else showAuth("login");
