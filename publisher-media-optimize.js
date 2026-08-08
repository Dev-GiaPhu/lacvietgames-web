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

  async function prepareFile(file) {
    if (!file) throw new Error("Chưa chọn file.");
    if (file.type.startsWith("video/") && file.size > MAX_VIDEO_BYTES) {
      throw new Error("Video tối đa 250 MB. Hãy nén video trước khi gửi.");
    }
    if (file.type.startsWith("image/")) return optimizeImage(file);
    return file;
  }

  window.LVGMediaOptimize = {
    prepareFile,
    maxVideoBytes: MAX_VIDEO_BYTES,
    maxBuildBytes: MAX_BUILD_BYTES
  };
})();
