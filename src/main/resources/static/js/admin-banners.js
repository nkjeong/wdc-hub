// 상품관리 > 배너관리 탭 — 대시보드 슬라이드 배너 2개(왼쪽 Super Flow / 오른쪽 Swiper GL)를 한 화면에서 관리합니다.
// - 배너마다 이미지 최대 5장, 한 번에 올릴 수 있는 것도 최대 5장
// - 이미지는 시놀로지가 아니라 이 앱 서버(uploads/banners)에 저장됩니다.
// - 업로드 진행률은 fetch로는 못 보여서 XMLHttpRequest로 전송합니다.
// products.js가 탭을 바꿀 때 window.loadBanners()를 불러줍니다.

(function () {
  'use strict';

  var MAX_PER_SLOT = 5;
  var MAX_FILE_BYTES = 10 * 1024 * 1024;
  var ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  var API = '/admin/banners';

  var csrfToken = (document.querySelector('meta[name="_csrf"]') || {}).content;
  var csrfHeader = (document.querySelector('meta[name="_csrf_header"]') || {}).content;

  var root = document.getElementById('productBannerPanel');
  if (!root) return;

  var slots = {};      // slotKey -> { el, items, selectedFiles, previewUrls, busy }
  var loaded = false;

  root.querySelectorAll('.banner-slot').forEach(function (el) {
    slots[el.dataset.slot] = { el: el, items: [], selectedFiles: [], previewUrls: [], busy: false };
  });

  function q(slot, sel) { return slots[slot].el.querySelector(sel); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function ext(name) { var i = name.lastIndexOf('.'); return i < 0 ? '' : name.slice(i + 1).toLowerCase(); }
  function mb(bytes) { return (bytes / 1024 / 1024).toFixed(1) + 'MB'; }

  function authHeaders(extra) {
    var h = extra || {};
    if (csrfToken && csrfHeader) h[csrfHeader] = csrfToken;
    return h;
  }

  async function request(url, options) {
    var res = await fetch(url, options);
    if (!res.ok) {
      var msg = '요청 처리 중 오류가 발생했어요.';
      try { var t = await res.text(); if (t) msg = t; } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    var text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ── 목록 ──────────────────────────────────
  async function load() {
    try {
      var data = await request(API, { headers: { 'Accept': 'application/json' } });
      Object.keys(slots).forEach(function (slot) {
        slots[slot].items = (data && data[slot]) || [];
        renderSlot(slot);
      });
      loaded = true;
    } catch (e) {
      alert('배너 목록을 불러오지 못했어요.\n' + e.message);
    }
  }

  function renderSlot(slot) {
    var s = slots[slot];
    q(slot, '[data-count]').textContent = s.items.length + ' / ' + MAX_PER_SLOT;

    var box = q(slot, '[data-thumbs]');
    box.innerHTML = '';
    for (var i = 0; i < MAX_PER_SLOT; i++) {
      var item = s.items[i];
      var cell = document.createElement('div');
      if (!item) {
        cell.className = 'banner-thumb banner-thumb-empty';
        cell.textContent = '비어 있음';
        box.appendChild(cell);
        continue;
      }
      cell.className = 'banner-thumb';
      cell.innerHTML =
        '<img src="' + esc(item.imageUrl) + '" alt="' + (i + 1) + '번째 슬라이드">' +
        '<span class="banner-thumb-order">' + (i + 1) + '</span>' +
        '<div class="banner-thumb-actions">' +
          '<button type="button" data-act="left" title="앞으로"' + (i === 0 ? ' disabled' : '') + '>◀</button>' +
          '<button type="button" data-act="right" title="뒤로"' + (i === s.items.length - 1 ? ' disabled' : '') + '>▶</button>' +
          '<button type="button" data-act="del" title="삭제">✕</button>' +
        '</div>';
      cell.querySelector('[data-act="left"]').addEventListener('click', function (idx) { return function () { move(slot, idx, -1); }; }(i));
      cell.querySelector('[data-act="right"]').addEventListener('click', function (idx) { return function () { move(slot, idx, 1); }; }(i));
      cell.querySelector('[data-act="del"]').addEventListener('click', function (it) { return function () { remove(slot, it); }; }(item));
      box.appendChild(cell);
    }
    renderSelected(slot);
  }

  // ── 순서 변경 / 삭제 ──────────────────────
  async function move(slot, index, delta) {
    var s = slots[slot];
    var target = index + delta;
    if (target < 0 || target >= s.items.length) return;
    var ids = s.items.map(function (x) { return x.id; });
    var tmp = ids[index]; ids[index] = ids[target]; ids[target] = tmp;
    try {
      await request(API + '/' + slot + '/order', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids: ids }),
      });
      await load();
    } catch (e) { alert(e.message); }
  }

  async function remove(slot, item) {
    if (!window.confirm('이 이미지를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
    try {
      await request(API + '/' + item.id, { method: 'DELETE', headers: authHeaders() });
      await load();
    } catch (e) { alert(e.message); }
  }

  // ── 파일 선택 ─────────────────────────────
  function clearSelected(slot) {
    var s = slots[slot];
    s.previewUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    s.previewUrls = [];
    s.selectedFiles = [];
    q(slot, '[data-file]').value = '';
    renderSelected(slot);
  }

  function renderSelected(slot) {
    var s = slots[slot];
    s.previewUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    s.previewUrls = [];

    var box = q(slot, '[data-selected]');
    box.innerHTML = '';
    s.selectedFiles.forEach(function (f) {
      var url = URL.createObjectURL(f);
      s.previewUrls.push(url);
      var row = document.createElement('div');
      row.className = 'banner-selected-row';
      row.innerHTML = '<img src="' + url + '" alt=""><span class="banner-selected-name">' + esc(f.name) +
        '</span><span class="banner-selected-size">' + mb(f.size) + '</span>';
      box.appendChild(row);
    });

    var remaining = MAX_PER_SLOT - s.items.length;
    var msg = q(slot, '[data-remaining]');
    msg.textContent = remaining > 0 ? '지금 ' + remaining + '장 더 올릴 수 있어요.' : '5장이 모두 찼어요. 새 이미지를 올리려면 기존 이미지를 삭제해 주세요.';
    q(slot, '[data-file]').disabled = remaining <= 0 || s.busy;
    q(slot, '[data-upload]').disabled = s.selectedFiles.length === 0 || s.busy;
  }

  function onFilesChosen(slot, fileList) {
    var s = slots[slot];
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) { clearSelected(slot); return; }

    var remaining = MAX_PER_SLOT - s.items.length;
    if (files.length > MAX_PER_SLOT) {
      alert('한 번에 최대 ' + MAX_PER_SLOT + '장까지 올릴 수 있어요.');
      clearSelected(slot); return;
    }
    if (files.length > remaining) {
      alert('이 배너에는 ' + remaining + '장만 더 올릴 수 있어요. (최대 ' + MAX_PER_SLOT + '장)\n선택한 파일: ' + files.length + '장');
      clearSelected(slot); return;
    }
    for (var i = 0; i < files.length; i++) {
      if (ALLOWED_EXT.indexOf(ext(files[i].name)) < 0) {
        alert('jpg, png, webp, gif 이미지만 올릴 수 있어요.\n' + files[i].name);
        clearSelected(slot); return;
      }
      if (files[i].size > MAX_FILE_BYTES) {
        alert('이미지는 장당 10MB 이하만 올릴 수 있어요.\n' + files[i].name + ' (' + mb(files[i].size) + ')');
        clearSelected(slot); return;
      }
    }
    s.selectedFiles = files;
    renderSelected(slot);
  }

  // ── 업로드 (XHR로 진행률 표시) ────────────
  function upload(slot) {
    var s = slots[slot];
    if (s.busy || !s.selectedFiles.length) return Promise.resolve();

    return new Promise(function (resolve) {
      var fd = new FormData();
      s.selectedFiles.forEach(function (f) { fd.append('files', f); });

      var wrap = q(slot, '[data-progress]');
      var bar = q(slot, '[data-bar]');
      var label = q(slot, '[data-progress-label]');
      wrap.style.display = 'block';
      bar.style.width = '0%';
      label.textContent = '업로드 준비 중...';

      s.busy = true;
      renderSelected(slot);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', API + '/' + slot);
      if (csrfToken && csrfHeader) xhr.setRequestHeader(csrfHeader, csrfToken);

      xhr.upload.onprogress = function (e) {
        if (!e.lengthComputable) return;
        var pct = Math.round(e.loaded / e.total * 100);
        bar.style.width = pct + '%';
        label.textContent = pct >= 100 ? '서버에 저장하는 중...' : '업로드 중 ' + pct + '% (' + mb(e.loaded) + ' / ' + mb(e.total) + ')';
      };

      xhr.onload = function () {
        s.busy = false;
        if (xhr.status >= 200 && xhr.status < 300) {
          label.textContent = '업로드 완료';
          clearSelected(slot);
          load().then(function () { setTimeout(function () { wrap.style.display = 'none'; }, 1200); resolve(); });
        } else {
          label.textContent = '';
          wrap.style.display = 'none';
          renderSelected(slot);
          alert((xhr.responseText || '업로드하지 못했어요. (상태코드 ' + xhr.status + ')'));
          resolve();
        }
      };
      xhr.onerror = function () {
        s.busy = false;
        wrap.style.display = 'none';
        renderSelected(slot);
        alert('서버와 통신하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.');
        resolve();
      };
      xhr.send(fd);
    });
  }

  async function uploadAll() {
    var btn = document.getElementById('bannerUploadAllBtn');
    var targets = Object.keys(slots).filter(function (k) { return slots[k].selectedFiles.length > 0; });
    if (!targets.length) { alert('업로드할 이미지를 먼저 선택해 주세요.'); return; }
    btn.disabled = true;
    try {
      for (var i = 0; i < targets.length; i++) { await upload(targets[i]); }
    } finally { btn.disabled = false; }
  }

  // ── 이벤트 연결 ───────────────────────────
  Object.keys(slots).forEach(function (slot) {
    q(slot, '[data-file]').addEventListener('change', function (e) { onFilesChosen(slot, e.target.files); });
    q(slot, '[data-upload]').addEventListener('click', function () { upload(slot); });
  });
  document.getElementById('bannerUploadAllBtn').addEventListener('click', uploadAll);

  window.loadBanners = function () { load(); };
})();
