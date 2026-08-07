(() => {
  if (document.body.dataset.page !== "publisher") return;

  const MAX_IMAGE_EDGE = 1920;
  const IMAGE_QUALITY = 0.82;
  const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
  const MAX_BUILD_BYTES = 2 * 1024 * 1024 * 1024;

  async function optimizeImage(file) {
    if (!file?.type?.startsWith("image/")) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "game-image";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  }

  function replaceInputFile(input, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch {}
  }

  document.addEventListener("change", async event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
    const file = input.files?.[0];
    if (!file) return;

    if (input.matches("[data-media-file]")) {
      if (file.type.startsWith("video/") && file.size > MAX_VIDEO_BYTES) {
        alert("Video tối đa 250 MB để tránh upload quá nặng. Hãy nén video trước khi tải lên.");
        input.value = "";
        return;
      }
      if (file.type.startsWith("image/")) {
        const oldName = file.name;
        try {
          const optimized = await optimizeImage(file);
          replaceInputFile(input, optimized);
          if (optimized !== file) {
            const saved = Math.max(0, file.size - optimized.size);
            const status = document.getElementById("publisherStatus");
            if (status) status.textContent = `Đã tối ưu ${oldName} thành WebP trước khi upload, giảm ${(saved / 1024 / 1024).toFixed(1)} MB.`;
          }
        } catch {}
      }
    }

    if (input.id === "downloadFile" && file.size > MAX_BUILD_BYTES) {
      alert("Build tối đa 2 GB cho luồng upload hiện tại.");
      input.value = "";
    }
  }, true);
})();
