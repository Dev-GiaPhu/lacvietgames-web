document.addEventListener("DOMContentLoaded", () => {
  const supportLinks = {
    "Trung tâm trợ giúp": "./help.html",
    "Điều khoản sử dụng": "./terms.html",
    "Chính sách bảo mật": "./privacy.html",
    "Liên hệ đối tác": "./partners.html"
  };
  document.querySelectorAll(".site-footer a").forEach(link => {
    const href = supportLinks[link.textContent.trim()];
    if (href) link.href = href;
  });
});
