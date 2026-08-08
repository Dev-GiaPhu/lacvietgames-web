(() => {
  if (document.body?.dataset.page !== 'publisher') return;

  const apiBase = (window.APP_CONFIG?.API_BASE_URL || '').replace(/\/$/, '');
  const $ = id => document.getElementById(id);
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('vi-VN');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let submissions = [];
  let media = [];
  let downloadMode = 'file';
  let versionDownloadMode = 'file';
  let editingOriginalMediaUrls = [];
  let editingOriginalDownloadUrl = '';
  let submitLocked = false;

  function readSession() {
    if (window.LVGSession?.read) return window.LVGSession.read();
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem('lacvietgamesStoreSession');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  async function api(path, options = {}) {
    const session = readSession();
    if (!session?.token) throw Object.assign(new Error('Bạn cần đăng nhập.'), { status: 401 });
    const response = await fetch(`${apiBase}${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      throw Object.assign(new Error(payload?.message || 'Không thể xử lý yêu cầu.'), { status: response.status, code: payload?.code });
    }
    return payload;
  }

  function setStatus(message = '', error = false) {
    const el = $('publisherStatus');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', error);
  }

  function setSubmitProgress(show, text = '', value = 0) {
    const wrap = $('publisherSubmitProgress');
    const label = $('publisherSubmitProgressText');
    const bar = $('publisherSubmitProgressBar');
    if (!wrap) return;
    wrap.hidden = !show;
    if (label) label.textContent = text;
    if (bar) bar.value = Math.max(0, Math.min(100, Number(value || 0)));
  }

  function sanitizeStorageStatus() {
    const el = $('webglStorageStatus');
    if (!el) return;
    const state = el.dataset.state;
    const target = state === 'ready'
      ? '✓ Hệ thống lưu trữ sẵn sàng.'
      : state === 'error'
        ? '⚠ Hệ thống lưu trữ hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
        : 'Đang kiểm tra hệ thống lưu trữ...';
    if (el.textContent !== target) el.textContent = target;
  }

  function installStorageSanitizer() {
    const el = $('webglStorageStatus');
    if (!el) return;
    sanitizeStorageStatus();
    const observer = new MutationObserver(() => sanitizeStorageStatus());
    observer.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
  }

  function defaultRequirements(web) {
    if (!$('reqOs').value) $('reqOs').value = web ? 'Trình duyệt hiện đại' : 'Windows 10';
    if (!$('reqCpu').value) $('reqCpu').value = web ? 'Bất kỳ' : 'Intel i5 hoặc tương đương';
    if (!$('reqRam').value) $('reqRam').value = web ? '2 GB' : '8 GB';
    if (!$('reqGpu').value) $('reqGpu').value = web ? 'WebGL' : 'GTX 1050 hoặc tương đương';
    if (!$('reqStorage').value) $('reqStorage').value = web ? 'Không cần cài đặt' : '2 GB';
  }

  function syncType(resetRequirements = false) {
    const web = $('gameType').value === 'web';
    $('playUrlLabel').hidden = !web;
    $('downloadUrlLabel').hidden = web;
    if (resetRequirements) {
      $('reqOs').value = '';
      $('reqCpu').value = '';
      $('reqRam').value = '';
      $('reqGpu').value = '';
      $('reqStorage').value = '';
    }
    defaultRequirements(web);
  }

  function setDownloadMode(mode) {
    downloadMode = mode === 'url' ? 'url' : 'file';
    document.querySelectorAll('[data-download-mode]').forEach(button => button.classList.toggle('active', button.dataset.downloadMode === downloadMode));
    $('downloadFilePanel').hidden = downloadMode !== 'file';
    $('downloadUrlPanel').hidden = downloadMode !== 'url';
  }

  function setVersionDownloadMode(mode) {
    versionDownloadMode = mode === 'url' ? 'url' : 'file';
    document.querySelectorAll('[data-version-download-mode]').forEach(button => button.classList.toggle('active', button.dataset.versionDownloadMode === versionDownloadMode));
    $('versionDownloadFilePanel').hidden = versionDownloadMode !== 'file';
    $('versionDownloadUrlPanel').hidden = versionDownloadMode !== 'url';
  }

  function revokePreview(item) {
    if (item?.previewUrl?.startsWith('blob:')) {
      try { URL.revokeObjectURL(item.previewUrl); } catch {}
    }
    if (item) item.previewUrl = '';
  }

  function newMediaItem(type = 'image') {
    return { type, source: 'file', url: '', file: null, previewUrl: '', originalUrl: '', persisted: false };
  }

  function addMedia(item) {
    media.push(item || newMediaItem('image'));
    renderMedia();
  }

  function mediaPreview(item) {
    const src = item.previewUrl || item.url || item.originalUrl || '';
    if (!src) return '<span>Chưa chọn nội dung.</span>';
    if (item.type === 'video') return `<video src="${esc(src)}" muted controls></video><span>${item.source === 'file' ? 'Video đã chọn · chưa upload' : 'Video'}</span>`;
    return `<img src="${esc(src)}" alt="preview"><span>${item.source === 'file' ? 'Ảnh đã chọn · chưa upload' : 'Ảnh'}</span>`;
  }

  function sourceButtons(index, source) {
    return `<div class="source-switch"><button type="button" data-media-source="file" data-media-source-index="${index}" class="${source === 'file' ? 'active' : ''}">Chọn file</button><button type="button" data-media-source="url" data-media-source-index="${index}" class="${source === 'url' ? 'active' : ''}">Dùng URL</button></div>`;
  }

  function renderMedia() {
    const root = $('mediaBuilder');
    if (!root) return;
    root.innerHTML = media.map((item, index) => {
      const typeSelect = `<select data-media-type data-media-index-value="${index}"><option value="image" ${item.type === 'image' ? 'selected' : ''}>Ảnh</option><option value="video" ${item.type === 'video' ? 'selected' : ''}>Video</option></select>`;
      let sourceBody = '';
      if (item.source === 'existing') {
        sourceBody = `<div class="selected-file"><strong>Media hiện tại đã lưu</strong><span>Chỉ thay đổi nếu bạn chọn nguồn mới.</span></div><div class="webgl-actions"><button class="mini-btn" type="button" data-media-replace-file="${index}">Thay bằng file</button><button class="mini-btn" type="button" data-media-replace-url="${index}">Thay bằng URL</button></div>`;
      } else if (item.source === 'url') {
        sourceBody = `${sourceButtons(index, 'url')}<input data-media-url data-media-url-index="${index}" type="url" value="${esc(item.url || '')}" placeholder="https://example.com/image.jpg"><div class="smart-note">URL được dùng trực tiếp, không upload lại.</div>`;
      } else {
        const accept = item.type === 'video' ? 'video/*' : 'image/*';
        sourceBody = `${sourceButtons(index, 'file')}<input data-media-file data-media-file-index="${index}" type="file" accept="${accept}">${item.file ? `<div class="selected-file"><strong>${esc(item.file.name)}</strong><span>${(item.file.size / 1024 / 1024).toFixed(1)} MB · chỉ upload khi gửi game</span></div>` : '<div class="smart-note">File chỉ được giữ tạm trên trình duyệt, chưa upload.</div>'}`;
      }
      return `<article class="media-item" data-media-row="${index}"><div class="media-kind">${typeSelect}<small class="smart-note">Media ${index + 1}</small></div><div class="media-source-body">${sourceBody}<div class="media-preview" data-media-preview="${index}">${mediaPreview(item)}</div></div><button class="mini-btn media-remove" type="button" data-remove-media="${index}">Xóa</button></article>`;
    }).join('') || '<div class="portal-empty">Chưa có media.</div>';
  }

  function updateMediaPreview(index) {
    const el = document.querySelector(`[data-media-preview="${index}"]`);
    if (el && media[index]) el.innerHTML = mediaPreview(media[index]);
  }

  async function prepareMediaFile(index, file) {
    if (!file || !media[index]) return;
    try {
      const prepared = window.LVGMediaOptimize?.prepareFile ? await window.LVGMediaOptimize.prepareFile(file) : file;
      revokePreview(media[index]);
      media[index].file = prepared;
      media[index].source = 'file';
      media[index].url = '';
      media[index].type = prepared.type.startsWith('video/') ? 'video' : 'image';
      media[index].previewUrl = URL.createObjectURL(prepared);
      renderMedia();
      setStatus('File đã được chuẩn bị. Chưa có dữ liệu nào được upload.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function validHttpUrl(value) {
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
  }

  function validateLocalForm() {
    const name = $('gameName').value.trim();
    if (!name) throw new Error('Hãy nhập tên game.');
    if (!$('description').value.trim()) throw new Error('Hãy nhập mô tả game.');
    const usable = media.filter(item => {
      if (item.type !== 'image') return false;
      if (item.source === 'file') return !!item.file;
      if (item.source === 'existing') return validHttpUrl(item.originalUrl || item.url);
      return validHttpUrl(item.url);
    });
    if (usable.length < 3) throw new Error('Mỗi game cần ít nhất 3 ảnh hợp lệ.');
    if ($('gameType').value === 'download' && downloadMode === 'url' && !validHttpUrl($('downloadExternalUrl').value.trim())) throw new Error('URL tải game không hợp lệ.');
  }

  async function uploadFileDirect(file, area) {
    if (!file) throw new Error('Chưa chọn file.');
    const ticket = await api('/api/store/uploads/presign', {
      method: 'POST',
      body: { fileName: file.name, contentType: file.type || 'application/octet-stream', area, size: file.size }
    });
    const data = ticket.data || {};
    const response = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    if (!response.ok) throw new Error(`Không thể upload file (${response.status}). Vui lòng thử lại.`);
    return data;
  }

  async function deleteUploadedObject(item) {
    if (!item) return;
    try {
      await api('/api/store/uploads/object', { method: 'DELETE', body: { objectKey: item.objectKey || null, publicUrl: item.publicUrl || item.url || null } });
    } catch {}
  }

  async function cleanupUploaded(items) {
    await Promise.allSettled((items || []).map(deleteUploadedObject));
  }

  async function buildMediaPayload(uploadedThisSubmit) {
    const result = [];
    const totalFiles = Math.max(1, media.filter(item => item.source === 'file' && item.file).length);
    let uploadedCount = 0;
    for (let index = 0; index < media.length; index++) {
      const item = media[index];
      if (item.source === 'file') {
        if (!item.file) continue;
        setSubmitProgress(true, `Đang upload media ${uploadedCount + 1}/${totalFiles}: ${item.file.name}`, 8 + (uploadedCount / totalFiles) * 35);
        const ticket = await uploadFileDirect(item.file, 'game-media');
        if (!ticket.publicUrl) throw new Error('Hệ thống chưa tạo được URL cho media.');
        uploadedThisSubmit.push(ticket);
        result.push({ type: item.type, url: ticket.publicUrl, thumbnailUrl: null, sortOrder: result.length });
        uploadedCount++;
      } else {
        const url = item.source === 'existing' ? (item.originalUrl || item.url) : item.url;
        if (!validHttpUrl(url)) continue;
        result.push({ type: item.type, url, thumbnailUrl: null, sortOrder: result.length });
      }
    }
    return result;
  }

  async function waitForManagedUrl(inputId, statusId, timeoutMs = 30 * 60 * 1000) {
    const input = $(inputId);
    const statusEl = $(statusId);
    const started = Date.now();
    let previous = input?.value?.trim() || '';
    while (Date.now() - started < timeoutMs) {
      const value = input?.value?.trim() || '';
      if (value && value !== previous) return value;
      if (value && !previous) return value;
      const text = statusEl?.textContent || '';
      const looksBad = /thất bại|không |lỗi|từ chối/i.test(text) && !/không cần|không có/i.test(text);
      if (looksBad && statusEl?.style?.color) throw new Error(text);
      await sleep(250);
    }
    throw new Error('Upload build quá thời gian chờ. Vui lòng thử lại.');
  }

  async function ensureMainWebgl() {
    if ($('playUrl').value.trim()) return $('playUrl').value.trim();
    const info = $('webglBuildInfo')?.textContent || '';
    if (/chưa chọn build/i.test(info)) throw new Error('Hãy chọn ZIP hoặc thư mục WebGL trước khi gửi game.');
    setSubmitProgress(true, 'Đang upload build WebGL...', 48);
    $('uploadWebglBuild').click();
    return waitForManagedUrl('playUrl', 'webglBuildStatus');
  }

  async function ensureVersionWebgl() {
    if ($('newVersionPlayUrl').value.trim()) return $('newVersionPlayUrl').value.trim();
    const info = $('versionWebglInfo')?.textContent || '';
    if (/chưa chọn build/i.test(info)) throw new Error('Hãy chọn ZIP WebGL cho version mới.');
    $('uploadVersionWebglBuild').click();
    return waitForManagedUrl('newVersionPlayUrl', 'versionWebglStatus');
  }

  async function resolveDownloadUrl(uploadedThisSubmit) {
    if (downloadMode === 'url') return $('downloadExternalUrl').value.trim();
    const file = $('downloadFile').files?.[0];
    if (!file) {
      if ($('downloadUrl').value.trim()) return $('downloadUrl').value.trim();
      throw new Error('Hãy chọn file game tải về.');
    }
    const limit = window.LVGMediaOptimize?.maxBuildBytes || 2 * 1024 * 1024 * 1024;
    if (file.size > limit) throw new Error('File game vượt quá giới hạn 2 GB.');
    setSubmitProgress(true, `Đang upload file game: ${file.name}`, 48);
    const ticket = await uploadFileDirect(file, 'game-builds');
    uploadedThisSubmit.push(ticket);
    return `r2:${ticket.objectKey}`;
  }

  function collectBasePayload(mediaPayload, playUrl, downloadUrl) {
    const type = $('gameType').value;
    const firstImage = mediaPayload.find(item => item.type === 'image')?.url || '';
    return {
      name: $('gameName').value.trim(),
      publisherName: $('publisherName').value.trim(),
      type,
      priceCoins: Number($('priceCoins').value || 0),
      shortDescription: $('shortDescription').value.trim(),
      description: $('description').value.trim(),
      coverUrl: firstImage,
      icon: $('gameIcon').value.trim() || '🎮',
      badge: $('badge').value.trim(),
      theme: $('theme').value.trim() || 'default',
      playUrl: type === 'web' ? playUrl : '',
      downloadUrl: type === 'download' ? downloadUrl : '',
      releaseDate: $('releaseDate').value || null,
      tags: $('tags').value.split(',').map(v => v.trim()).filter(Boolean),
      media: mediaPayload,
      versionName: $('versionName').value.trim() || '1.0.0',
      changelog: $('changelog').value.trim() || 'Cập nhật game',
      recommendedOs: $('reqOs').value.trim(),
      recommendedCpu: $('reqCpu').value.trim(),
      recommendedRam: $('reqRam').value.trim(),
      recommendedGpu: $('reqGpu').value.trim(),
      recommendedStorage: $('reqStorage').value.trim()
    };
  }

  function showSuccess(title, message) {
    $('publisherSuccessTitle').textContent = title;
    $('publisherSuccessMessage').textContent = message;
    $('publisherSuccessModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function hideSuccess() {
    $('publisherSuccessModal').hidden = true;
    document.body.style.overflow = '';
  }

  async function deleteRemovedMedia(finalMediaUrls) {
    const removed = editingOriginalMediaUrls.filter(url => !finalMediaUrls.includes(url));
    await Promise.allSettled(removed.map(url => deleteUploadedObject({ publicUrl: url })));
  }

  async function deleteReplacedDownload(finalDownloadUrl) {
    const old = editingOriginalDownloadUrl || '';
    if (!old || old === finalDownloadUrl || !old.startsWith('r2:')) return;
    await deleteUploadedObject({ objectKey: old.slice(3) });
  }

  function clearMediaState() {
    media.forEach(revokePreview);
    media = [];
    editingOriginalMediaUrls = [];
  }

  function resetForm() {
    const form = $('gameSubmissionForm');
    clearMediaState();
    form.reset();
    $('editPublisherGameId').value = '';
    $('publisherFormTitle').textContent = 'Gửi game mới';
    $('cancelEditGame').hidden = true;
    $('submitGameButton').textContent = 'Gửi game để Admin duyệt';
    $('publisherName').value = readSession()?.effectiveDisplayName || readSession()?.displayName || readSession()?.name || '';
    $('gameType').value = 'web';
    $('gameIcon').value = '🎮';
    $('theme').value = 'default';
    $('versionName').value = '1.0.0';
    $('changelog').value = 'Bản phát hành đầu tiên';
    $('coverUrl').value = '';
    $('playUrl').value = '';
    $('downloadUrl').value = '';
    $('downloadExternalUrl').value = '';
    $('reqOs').value = '';
    $('reqCpu').value = '';
    $('reqRam').value = '';
    $('reqGpu').value = '';
    $('reqStorage').value = '';
    editingOriginalDownloadUrl = '';
    setDownloadMode('file');
    media = [newMediaItem('image'), newMediaItem('image'), newMediaItem('image')];
    renderMedia();
    syncType(false);
    setSubmitProgress(false);
    setStatus('');
  }

  async function submitGame(event) {
    event.preventDefault();
    if (submitLocked) return;
    submitLocked = true;
    const button = $('submitGameButton');
    const oldText = button.textContent;
    const uploadedThisSubmit = [];
    button.disabled = true;
    button.textContent = 'Đang gửi...';
    setStatus('');
    try {
      validateLocalForm();
      setSubmitProgress(true, 'Đang chuẩn bị media...', 5);
      const mediaPayload = await buildMediaPayload(uploadedThisSubmit);
      if (mediaPayload.filter(item => item.type === 'image').length < 3) throw new Error('Mỗi game cần ít nhất 3 ảnh hợp lệ.');

      let playUrl = '';
      let downloadUrl = '';
      if ($('gameType').value === 'web') playUrl = await ensureMainWebgl();
      else downloadUrl = await resolveDownloadUrl(uploadedThisSubmit);

      setSubmitProgress(true, 'Đang lưu thông tin game...', 88);
      const payload = collectBasePayload(mediaPayload, playUrl, downloadUrl);
      const id = Number($('editPublisherGameId').value || 0);
      const result = await api(id ? `/api/store/publisher/games/${id}` : '/api/store/publisher/games', { method: id ? 'PUT' : 'POST', body: payload });

      if (id) {
        await deleteRemovedMedia(mediaPayload.map(item => item.url));
        await deleteReplacedDownload(downloadUrl);
      }

      setSubmitProgress(true, 'Hoàn tất.', 100);
      const title = id ? 'Đã cập nhật game thành công' : 'Đã gửi game thành công';
      const message = result.message || (id ? 'Game đã được cập nhật và gửi lại để duyệt.' : 'Game của bạn đã được gửi để quản trị viên duyệt.');
      await Promise.all([loadSubmissions(), loadAnalytics()]);
      resetForm();
      showSuccess(title, message);
    } catch (error) {
      await cleanupUploaded(uploadedThisSubmit);
      setSubmitProgress(false);
      setStatus(error.message || 'Không thể gửi game.', true);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
      submitLocked = false;
    }
  }

  function editGame(id) {
    const item = submissions.find(x => Number(x.game?.id ?? x.id) === Number(id));
    if (!item) return;
    resetForm();
    const game = item.game || item;
    $('editPublisherGameId').value = game.id;
    $('publisherFormTitle').textContent = `Sửa: ${game.name}`;
    $('cancelEditGame').hidden = false;
    $('submitGameButton').textContent = 'Lưu & gửi lại để duyệt';
    $('gameName').value = game.name || '';
    $('publisherName').value = game.publisherName || '';
    $('gameType').value = game.type || 'web';
    $('priceCoins').value = game.originalPriceCoins ?? game.priceCoins ?? 0;
    $('shortDescription').value = game.shortDescription || '';
    $('description').value = game.description || '';
    $('gameIcon').value = game.icon || '🎮';
    $('badge').value = game.badge || '';
    $('theme').value = game.theme || 'default';
    $('playUrl').value = game.playUrl || '';
    $('downloadUrl').value = game.downloadUrl || '';
    $('releaseDate').value = game.releaseDate ? String(game.releaseDate).slice(0, 10) : '';
    $('tags').value = (game.tags || []).join(', ');
    $('reqOs').value = game.requirements?.os || '';
    $('reqCpu').value = game.requirements?.cpu || '';
    $('reqRam').value = game.requirements?.ram || '';
    $('reqGpu').value = game.requirements?.gpu || '';
    $('reqStorage').value = game.requirements?.storage || '';

    media.forEach(revokePreview);
    media = (item.media || []).map(m => ({ type: m.type === 'video' ? 'video' : 'image', source: 'existing', url: m.url || '', originalUrl: m.url || '', file: null, previewUrl: '', persisted: true }));
    editingOriginalMediaUrls = media.map(m => m.originalUrl).filter(Boolean);
    editingOriginalDownloadUrl = game.downloadUrl || '';
    if (!media.length) media = [newMediaItem('image'), newMediaItem('image'), newMediaItem('image')];
    renderMedia();

    if (game.type === 'download') {
      if (/^https?:\/\//i.test(game.downloadUrl || '')) {
        setDownloadMode('url');
        $('downloadExternalUrl').value = game.downloadUrl;
      } else setDownloadMode('file');
    }
    syncType(false);
    window.scrollTo({ top: $('publisherFormCard').offsetTop - 80, behavior: 'smooth' });
  }

  async function resubmit(id) {
    try {
      const response = await api(`/api/store/publisher/games/${id}/resubmit`, { method: 'POST' });
      await loadSubmissions();
      showSuccess('Đã gửi lại game', response.message || 'Game đã được gửi lại để quản trị viên duyệt.');
    } catch (error) { setStatus(error.message, true); }
  }

  function openVersion(id) {
    const item = submissions.find(x => Number(x.game?.id ?? x.id) === Number(id));
    const game = item?.game || item;
    if (!game) return;
    $('versionGameId').value = id;
    $('newVersionName').value = '';
    $('newVersionChangelog').value = '';
    $('newVersionPlayUrl').value = '';
    $('newVersionDownloadUrl').value = '';
    $('versionWebglZip').value = '';
    $('versionDownloadFile').value = '';
    $('versionDownloadExternalUrl').value = '';
    $('versionStatus').textContent = '';
    $('versionWebSection').hidden = game.type !== 'web';
    $('versionDownloadSection').hidden = game.type !== 'download';
    setVersionDownloadMode('file');
    $('versionModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeVersion() {
    $('versionModal').hidden = true;
    document.body.style.overflow = '';
  }

  async function submitVersion(event) {
    event.preventDefault();
    const id = Number($('versionGameId').value);
    const item = submissions.find(x => Number(x.game?.id ?? x.id) === id);
    const game = item?.game || item;
    if (!game) return;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const uploaded = [];
    button.disabled = true;
    try {
      let playUrl = null;
      let downloadUrl = null;
      if (game.type === 'web') playUrl = await ensureVersionWebgl();
      else if (versionDownloadMode === 'url') {
        const value = $('versionDownloadExternalUrl').value.trim();
        if (!validHttpUrl(value)) throw new Error('URL tải bản cập nhật không hợp lệ.');
        downloadUrl = value;
      } else {
        const file = $('versionDownloadFile').files?.[0];
        if (!file) throw new Error('Hãy chọn file bản cập nhật.');
        const ticket = await uploadFileDirect(file, 'game-builds');
        uploaded.push(ticket);
        downloadUrl = `r2:${ticket.objectKey}`;
      }
      const response = await api(`/api/store/publisher/games/${id}/versions`, {
        method: 'POST',
        body: { versionName: $('newVersionName').value.trim(), changelog: $('newVersionChangelog').value.trim(), playUrl, downloadUrl }
      });
      closeVersion();
      await loadSubmissions();
      showSuccess('Đã gửi bản cập nhật', response.message || 'Version mới đang chờ quản trị viên duyệt.');
    } catch (error) {
      await cleanupUploaded(uploaded);
      $('versionStatus').textContent = error.message;
      $('versionStatus').classList.add('error');
    } finally { button.disabled = false; }
  }

  async function loadAnalytics() {
    try {
      const response = await api('/api/store/publisher/analytics');
      const data = response.data || {};
      $('pubTotal').textContent = fmt(data.totalGames);
      $('pubPublished').textContent = fmt(data.published);
      $('pubPending').textContent = fmt(data.pending);
      $('pubPurchases').textContent = fmt(data.purchases);
      $('pubRevenue').textContent = `${fmt(data.revenueCoins)} LC`;
    } catch {}
  }

  function typeLabel(type) { return type === 'download' ? 'Game tải về' : 'Web game'; }

  async function loadSubmissions() {
    const list = $('submissionList');
    list.innerHTML = '<div class="portal-empty">Đang tải...</div>';
    try {
      const response = await api('/api/store/publisher/games');
      submissions = response.data || [];
      list.innerHTML = submissions.length ? submissions.map(item => {
        const game = item.game || item;
        const versions = item.versions || [];
        return `<article class="publisher-game-card"><div class="submission-top"><div><h3>${esc(game.icon || '🎮')} ${esc(game.name)}</h3><div class="meta">${typeLabel(game.type)} · ${fmt(game.priceCoins)} LC · ${(item.media || []).length} media</div></div><span class="status-chip ${String(game.status).toLowerCase()}">${esc(game.status)}</span></div>${game.rejectionReason ? `<p style="color:#ff9dab">Lý do: ${esc(game.rejectionReason)}</p>` : ''}<div class="version-list">${versions.length ? `Version: ${versions.slice(0, 3).map(v => `${esc(v.version)} (${esc(v.status)})`).join(' · ')}` : 'Chưa có version'}</div><div class="publisher-game-actions">${game.status !== 'Published' ? `<button class="mini-btn" data-edit-publisher-game="${game.id}">Sửa game</button>` : ''}${game.status === 'Rejected' ? `<button class="mini-btn primary" data-resubmit="${game.id}">Gửi lại</button>` : ''}${game.status === 'Published' ? `<button class="mini-btn primary" data-new-version="${game.id}">+ Version mới</button>` : ''}</div></article>`;
      }).join('') : '<div class="portal-empty">Bạn chưa gửi game nào.</div>';
    } catch (error) {
      list.innerHTML = `<div class="portal-empty" style="color:#ff9dab">${esc(error.message)}</div>`;
    }
  }

  async function boot() {
    const session = readSession();
    $('publisherLoginRequired').hidden = !!session?.token;
    $('publisherContent').hidden = !session?.token;
    if (!session?.token) return;
    resetForm();
    installStorageSanitizer();
    await Promise.all([loadAnalytics(), loadSubmissions()]);
  }

  $('gameType')?.addEventListener('change', () => syncType(true));
  $('addMedia')?.addEventListener('click', () => addMedia());
  $('gameSubmissionForm')?.addEventListener('submit', submitGame);
  $('refreshSubmissions')?.addEventListener('click', () => Promise.all([loadAnalytics(), loadSubmissions()]));
  $('cancelEditGame')?.addEventListener('click', resetForm);
  $('versionForm')?.addEventListener('submit', submitVersion);
  $('versionModal')?.addEventListener('click', event => { if (event.target.closest('[data-close-version]')) closeVersion(); });

  $('webglZipFile')?.addEventListener('change', () => { $('playUrl').value = ''; });
  $('webglFolderFiles')?.addEventListener('change', () => { $('playUrl').value = ''; });
  $('versionWebglZip')?.addEventListener('change', () => { $('newVersionPlayUrl').value = ''; });
  $('downloadFile')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    $('downloadFileInfo').innerHTML = file ? `<strong>${esc(file.name)}</strong><span>${(file.size / 1024 / 1024).toFixed(1)} MB · chưa upload</span>` : 'Chưa chọn file. File chỉ được upload khi gửi game.';
    if (file) $('downloadUrl').value = '';
  });

  document.addEventListener('click', event => {
    const download = event.target.closest('[data-download-mode]');
    if (download) return setDownloadMode(download.dataset.downloadMode);
    const versionDownload = event.target.closest('[data-version-download-mode]');
    if (versionDownload) return setVersionDownloadMode(versionDownload.dataset.versionDownloadMode);

    const source = event.target.closest('[data-media-source]');
    if (source) {
      const index = Number(source.dataset.mediaSourceIndex);
      const item = media[index];
      if (!item) return;
      revokePreview(item);
      item.source = source.dataset.mediaSource === 'url' ? 'url' : 'file';
      item.file = null;
      item.url = '';
      renderMedia();
      return;
    }
    const replaceFile = event.target.closest('[data-media-replace-file]');
    if (replaceFile) {
      const item = media[Number(replaceFile.dataset.mediaReplaceFile)];
      if (item) { item.source = 'file'; item.file = null; item.url = ''; renderMedia(); }
      return;
    }
    const replaceUrl = event.target.closest('[data-media-replace-url]');
    if (replaceUrl) {
      const item = media[Number(replaceUrl.dataset.mediaReplaceUrl)];
      if (item) { item.source = 'url'; item.file = null; item.url = ''; renderMedia(); }
      return;
    }
    const remove = event.target.closest('[data-remove-media]');
    if (remove) {
      const index = Number(remove.dataset.removeMedia);
      revokePreview(media[index]);
      media.splice(index, 1);
      renderMedia();
      return;
    }
    const edit = event.target.closest('[data-edit-publisher-game]');
    if (edit) return editGame(Number(edit.dataset.editPublisherGame));
    const resubmitButton = event.target.closest('[data-resubmit]');
    if (resubmitButton) return resubmit(Number(resubmitButton.dataset.resubmit));
    const version = event.target.closest('[data-new-version]');
    if (version) return openVersion(Number(version.dataset.newVersion));
  });

  document.addEventListener('change', event => {
    const fileInput = event.target.closest('[data-media-file]');
    if (fileInput) return prepareMediaFile(Number(fileInput.dataset.mediaFileIndex), fileInput.files?.[0]);
    const typeInput = event.target.closest('[data-media-type]');
    if (typeInput) {
      const index = Number(typeInput.dataset.mediaIndexValue);
      if (media[index]) {
        media[index].type = typeInput.value === 'video' ? 'video' : 'image';
        renderMedia();
      }
    }
  });

  document.addEventListener('input', event => {
    const urlInput = event.target.closest('[data-media-url]');
    if (!urlInput) return;
    const index = Number(urlInput.dataset.mediaUrlIndex);
    if (!media[index]) return;
    media[index].url = urlInput.value.trim();
    updateMediaPreview(index);
  });

  $('publisherSuccessView')?.addEventListener('click', () => {
    hideSuccess();
    $('publisherSubmissionPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('publisherSuccessNew')?.addEventListener('click', () => {
    hideSuccess();
    $('publisherFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('lvg:session-hydrated', () => { if ($('publisherContent').hidden) boot(); });
  setTimeout(boot, 0);
})();
