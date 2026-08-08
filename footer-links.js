(() => {
  const styles = [
    ['./premium-theme.css?v=20260809-0330', 'lvgPremiumTheme'],
    ['./legacy-red-gold.css?v=20260809-0330', 'lvgLegacyRedGold']
  ];
  if (document.body.classList.contains('admin-page')) styles.push(['./admin-red-gold.css?v=20260809-0330', 'lvgAdminRedGold']);
  for (const [href, marker] of styles) {
    if (document.querySelector(`link[data-${marker.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[marker] = '1';
    document.head.appendChild(link);
  }

  const markDashboard = () => {
    const enabled = !!document.querySelector('.game-sidebar');
    document.body.classList.toggle('lvg-dashboard-shell', enabled);
    return enabled;
  };
  if (!markDashboard()) {
    const observer = new MutationObserver(() => { if (markDashboard()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('#logoutProfile,[data-lvg-logout]')) window.LVGSession?.logout?.();
  }, true);
})();

document.addEventListener("DOMContentLoaded", () => {
  const supportLinks = {
    "Trung tâm trợ giúp": "./help.html",
    "Điều khoản sử dụng": "./terms.html",
    "Chính sách bảo mật": "./privacy.html",
    "Liên hệ đối tác": "./partners.html"
  };

  const enhanceFooter = () => {
    document.querySelectorAll(".site-footer a").forEach(link => {
      const href = supportLinks[link.textContent.trim()];
      if (href) link.href = href;
    });

    const columns = [...document.querySelectorAll(".site-footer .footer-column")];
    const platform = columns.find(c => c.querySelector("h4")?.textContent.trim() === "Khám phá" || c.querySelector("h4")?.textContent.trim() === "Nền tảng");
    if (platform && !platform.querySelector('a[href="./wishlist.html"]')) {
      const library = [...platform.querySelectorAll("a")].find(a => a.textContent.trim() === "Thư viện");
      const link = document.createElement("a"); link.href = "./wishlist.html"; link.textContent = "Yêu thích";
      library?.insertAdjacentElement("afterend", link);
    }

    const support = columns.find(c => c.querySelector("h4")?.textContent.trim() === "Hỗ trợ");
    if (support && !support.querySelector('a[href="./refund.html"]')) {
      support.insertAdjacentHTML("beforeend", '<a href="./refund.html">Chính sách hoàn tiền</a><a href="./publisher-terms.html">Điều khoản nhà phát hành</a><a href="./content-policy.html">Chính sách nội dung</a>');
    }
  };

  enhanceFooter();
  window.addEventListener("load", enhanceFooter, { once: true });
  setTimeout(enhanceFooter, 250);
});
