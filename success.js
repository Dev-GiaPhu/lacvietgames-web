(() => {
  const successKey = "lacvietgamesRegistrationSuccess";

  try {
    const data = JSON.parse(sessionStorage.getItem(successKey) || "null");
    if (data) {
      document.getElementById("successName").textContent = data.name || "Tài khoản mới";
      document.getElementById("successEmail").textContent = data.email || "Đã xác minh";
    }
  } catch {
    // Giữ nội dung mặc định nếu dữ liệu phiên không hợp lệ.
  }

  sessionStorage.removeItem(successKey);
})();
