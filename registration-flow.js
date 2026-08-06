(() => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const apiBaseUrl = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const byId = (id) => document.getElementById(id);

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
      showStatus("Backend chưa được cấu hình.");
      return;
    }

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.classList.add("loading");

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
        throw new Error("Backend chưa cập nhật luồng xác thực mới. Hãy triển khai lại backend.");
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
    }
  }

  form.addEventListener("submit", handleRegistration, true);
})();
