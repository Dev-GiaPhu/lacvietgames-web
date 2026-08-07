(() => {
  // Không cho click trực tiếp vào backdrop đóng modal. Nút X/Hủy vẫn hoạt động bình thường.
  // Dùng capture để chặn cả những handler cũ đã gắn trên chính overlay.
  window.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const isBackdrop = target.classList.contains("server-auth-modal") || target.classList.contains("admin-modal");
    if (!isBackdrop) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
