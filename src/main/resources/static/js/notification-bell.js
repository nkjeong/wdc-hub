// 상단 벨 아이콘 알림
// - 안 읽은 알림 개수를 벨 위에 숫자로 보여주고, 누르면 최근 알림 목록이 펼쳐집니다.
// - 알림을 누르면 읽음 처리하고 해당 화면으로 이동합니다.
// - 1분마다, 그리고 다른 탭에서 돌아왔을 때 새 알림을 확인합니다.
// topbar 프래그먼트에서 모든 페이지에 자동 포함됩니다.

(function () {
  'use strict';

  var bell = document.getElementById('notifBell');
  if (!bell) return;

  var API = '/notifications';
  var POLL_MS = 60 * 1000;
  var STYLE_ID = 'notifBellStyle';

  var csrfToken = (document.querySelector('meta[name="_csrf"]') || {}).content;
  var csrfHeader = (document.querySelector('meta[name="_csrf_header"]') || {}).content;

  var badge = document.getElementById('notifBadge');
  var panel = null;
  var items = [];
  var unread = 0;
  var pollTimer = null;
  var stopped = false;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.notif-bell{ position:relative; cursor:pointer; }',
      '.notif-badge{ position:absolute; top:-5px; right:-5px; min-width:16px; height:16px; padding:0 4px; box-sizing:border-box;',
      '  border-radius:8px; background:var(--red); color:#fff; font-family:var(--mono); font-size:10px; font-weight:700;',
      '  line-height:16px; text-align:center; pointer-events:none; }',

      '.nb-panel{ position:fixed; z-index:2500; width:360px; max-width:calc(100vw - 24px); max-height:70vh;',
      '  display:flex; flex-direction:column; background:var(--surface); color:var(--text);',
      '  border:1px solid var(--line); border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.5); overflow:hidden; }',
      '.nb-head{ display:flex; align-items:center; justify-content:space-between; padding:13px 16px;',
      '  border-bottom:1px solid var(--line-soft); }',
      '.nb-title{ font-size:14px; font-weight:700; }',
      '.nb-readall{ background:none; border:none; color:var(--gold); font-size:12px; font-weight:600; cursor:pointer; padding:2px 4px; }',
      '.nb-readall:hover{ text-decoration:underline; }',
      '.nb-readall:disabled{ color:var(--text-faint); cursor:default; text-decoration:none; }',
      '.nb-list{ overflow-y:auto; }',
      '.nb-empty{ padding:36px 16px; text-align:center; color:var(--text-faint); font-size:13px; }',
      '.nb-item{ display:flex; gap:10px; width:100%; text-align:left; padding:12px 16px; background:none; border:none;',
      '  border-bottom:1px solid var(--line-soft); color:inherit; font-family:inherit; cursor:pointer; }',
      '.nb-item:last-child{ border-bottom:none; }',
      '.nb-item:hover, .nb-item:focus-visible{ background:var(--surface-2); outline:none; }',
      '.nb-dot{ flex-shrink:0; width:8px; height:8px; margin-top:6px; border-radius:50%; background:transparent; }',
      '.nb-item.unread .nb-dot{ background:var(--gold); }',
      '.nb-body{ flex:1; min-width:0; }',
      '.nb-item-title{ font-size:13px; font-weight:700; }',
      '.nb-item.read .nb-item-title{ font-weight:500; color:var(--text-dim); }',
      '.nb-item-msg{ margin-top:3px; font-size:12.5px; color:var(--text-dim); word-break:break-word; line-height:1.45; }',
      '.nb-item-time{ margin-top:4px; font-size:11px; color:var(--text-faint); font-family:var(--mono); }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function headers(extra) {
    var h = extra || {};
    if (csrfToken && csrfHeader) h[csrfHeader] = csrfToken;
    return h;
  }

  function timeAgo(v) {
    if (!v) return '';
    var d;
    if (Array.isArray(v)) d = new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0, v[5] || 0);
    else d = new Date(String(v));
    if (isNaN(d.getTime())) return '';
    var sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return '방금 전';
    if (sec < 3600) return Math.floor(sec / 60) + '분 전';
    if (sec < 86400) return Math.floor(sec / 3600) + '시간 전';
    if (sec < 86400 * 7) return Math.floor(sec / 86400) + '일 전';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function renderBadge() {
    if (!badge) return;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.display = '';
      bell.setAttribute('aria-label', '알림 ' + unread + '개 안 읽음');
    } else {
      badge.style.display = 'none';
      bell.setAttribute('aria-label', '알림');
    }
  }

  async function fetchList() {
    if (stopped) return;
    try {
      var res = await fetch(API, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      var type = res.headers.get('content-type') || '';
      // 로그인이 풀려서 로그인 화면으로 넘어간 경우 등: 더 이상 확인하지 않습니다.
      if (!res.ok || res.redirected || type.indexOf('json') === -1) { stopPolling(); return; }
      var data = await res.json();
      items = data.items || [];
      unread = data.unreadCount || 0;
      renderBadge();
      if (panel) renderPanel();
    } catch (e) { /* 네트워크 오류는 다음 주기에 다시 시도 */ }
  }

  function stopPolling() {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
  }

  // ── 패널 ─────────────────────────────────
  function positionPanel() {
    if (!panel) return;
    var r = bell.getBoundingClientRect();
    panel.style.top = Math.round(r.bottom + 10) + 'px';
    var right = Math.max(12, Math.round(window.innerWidth - r.right));
    panel.style.right = right + 'px';
  }

  function renderPanel() {
    if (!panel) return;
    var list = panel.querySelector('.nb-list');
    panel.querySelector('.nb-readall').disabled = unread === 0;

    if (!items.length) {
      list.innerHTML = '<div class="nb-empty">새 알림이 없어요.</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nb-item ' + (n.read ? 'read' : 'unread');
      b.innerHTML =
        '<span class="nb-dot" aria-hidden="true"></span>' +
        '<span class="nb-body">' +
          '<div class="nb-item-title">' + esc(n.title) + '</div>' +
          (n.message ? '<div class="nb-item-msg">' + esc(n.message) + '</div>' : '') +
          '<div class="nb-item-time">' + esc(timeAgo(n.createdAt)) + '</div>' +
        '</span>';
      b.addEventListener('click', function () { openItem(n); });
      list.appendChild(b);
    });
  }

  async function openItem(n) {
    if (!n.read) {
      try { await fetch(API + '/' + n.id + '/read', { method: 'POST', headers: headers(), credentials: 'same-origin' }); }
      catch (e) { /* 읽음 처리에 실패해도 이동은 계속 */ }
    }
    if (n.linkUrl) window.location.href = n.linkUrl;
    else { closePanel(); fetchList(); }
  }

  async function readAll() {
    try {
      await fetch(API + '/read-all', { method: 'POST', headers: headers(), credentials: 'same-origin' });
    } catch (e) { /* ignore */ }
    fetchList();
  }

  function onDocClick(e) {
    if (panel && !panel.contains(e.target) && !bell.contains(e.target)) closePanel();
  }
  function onKey(e) {
    if (e.key === 'Escape') { closePanel(); bell.focus(); }
  }

  function openPanel() {
    if (panel) return;
    injectStyle();
    panel = document.createElement('div');
    panel.className = 'nb-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '알림');
    panel.innerHTML =
      '<div class="nb-head"><span class="nb-title">알림</span>' +
      '<button type="button" class="nb-readall">모두 읽음</button></div>' +
      '<div class="nb-list"></div>';
    document.body.appendChild(panel);
    panel.querySelector('.nb-readall').addEventListener('click', readAll);
    positionPanel();
    renderPanel();
    bell.setAttribute('aria-expanded', 'true');

    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', positionPanel);
    fetchList(); // 열 때 한 번 더 최신으로
  }

  function closePanel() {
    if (!panel) return;
    document.removeEventListener('mousedown', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', positionPanel);
    panel.parentNode.removeChild(panel);
    panel = null;
    bell.setAttribute('aria-expanded', 'false');
  }

  function toggle() { panel ? closePanel() : openPanel(); }

  bell.addEventListener('click', toggle);
  bell.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  injectStyle(); // 숫자 배지 스타일은 패널을 열기 전에도 필요합니다.
  fetchList();
  pollTimer = setInterval(fetchList, POLL_MS);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) fetchList();
  });
})();
