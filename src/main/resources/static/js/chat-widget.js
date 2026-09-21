// 상단 채팅 아이콘 (벨 아이콘 옆) — 회원 ↔ 관리자 1:1 문의 채팅
// - 회원: 아이콘을 누르면 관리자와의 대화창이 열려요.
// - 관리자: 회원별 대화 목록이 먼저 나오고, 하나를 누르면 그 회원과의 대화가 열려요.
// - 새 메시지는 창이 열려 있을 때 3초마다, 닫혀 있을 때는 30초마다 확인합니다.
// topbar 프래그먼트에서 모든 페이지에 자동 포함됩니다.

(function () {
  'use strict';

  var btn = document.getElementById('chatBtn');
  if (!btn) return;

  var badge = document.getElementById('chatBadge');
  var STYLE_ID = 'chatWidgetStyle';
  var SUMMARY_MS = 30 * 1000;
  var CONV_MS = 3 * 1000;
  var ROOMS_MS = 5 * 1000;
  var MAX_LEN = 2000;

  var csrfToken = (document.querySelector('meta[name="_csrf"]') || {}).content;
  var csrfHeader = (document.querySelector('meta[name="_csrf_header"]') || {}).content;

  var isAdmin = false;
  var unread = 0;
  var stopped = false;

  var panel = null;
  var view = 'conv';          // 'rooms'(관리자 목록) | 'conv'(대화)
  var roomId = null;          // 관리자가 열어 둔 채팅방 id
  var lastId = 0;             // 마지막으로 받은 메시지 id
  var seen = {};              // 이미 그린 메시지 id
  var lastDay = '';           // 마지막으로 그린 날짜(날짜 구분선용)
  var convTimer = null;
  var roomsTimer = null;
  var summaryTimer = null;
  var sending = false;

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.chat-btn{ position:relative; cursor:pointer; }',
      '.chat-btn .notif-badge{ position:absolute; top:-5px; right:-5px; min-width:16px; height:16px; padding:0 4px; box-sizing:border-box;',
      '  border-radius:8px; background:var(--red); color:#fff; font-family:var(--mono); font-size:10px; font-weight:700;',
      '  line-height:16px; text-align:center; pointer-events:none; }',

      '.cw-panel{ position:fixed; z-index:2500; width:380px; max-width:calc(100vw - 24px); height:min(560px, 78vh);',
      '  display:flex; flex-direction:column; background:var(--surface); color:var(--text);',
      '  border:1px solid var(--line); border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.5); overflow:hidden; }',
      '.cw-head{ display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid var(--line-soft); flex-shrink:0; }',
      '.cw-title{ flex:1; min-width:0; font-size:14px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.cw-iconbtn{ width:28px; height:28px; border-radius:6px; border:1px solid var(--line); background:var(--surface-2);',
      '  color:var(--text-dim); font-size:13px; line-height:1; cursor:pointer; flex-shrink:0; }',
      '.cw-iconbtn:hover{ border-color:var(--gold); color:var(--gold); }',

      '.cw-body{ flex:1; min-height:0; display:flex; flex-direction:column; }',

      /* 관리자: 채팅방 목록 */
      '.cw-rooms{ flex:1; overflow-y:auto; }',
      '.cw-room{ display:flex; gap:10px; width:100%; text-align:left; padding:12px 16px; background:none; border:none;',
      '  border-bottom:1px solid var(--line-soft); color:inherit; font-family:inherit; cursor:pointer; }',
      '.cw-room:hover, .cw-room:focus-visible{ background:var(--surface-2); outline:none; }',
      '.cw-room-main{ flex:1; min-width:0; }',
      '.cw-room-name{ font-size:13px; font-weight:700; }',
      '.cw-room-last{ margin-top:3px; font-size:12.5px; color:var(--text-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.cw-room-side{ display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }',
      '.cw-room-time{ font-size:11px; color:var(--text-faint); font-family:var(--mono); }',
      '.cw-room-unread{ min-width:18px; height:18px; padding:0 5px; box-sizing:border-box; border-radius:9px; background:var(--red);',
      '  color:#fff; font-size:10.5px; font-weight:700; line-height:18px; text-align:center; font-family:var(--mono); }',

      /* 대화 */
      '.cw-messages{ flex:1; overflow-y:auto; padding:14px 14px 6px; display:flex; flex-direction:column; gap:8px; }',
      '.cw-empty{ margin:auto; padding:0 24px; text-align:center; color:var(--text-faint); font-size:13px; line-height:1.6; }',
      '.cw-day{ align-self:center; margin:6px 0; padding:2px 10px; border-radius:10px; background:var(--surface-2);',
      '  color:var(--text-faint); font-size:11px; }',
      '.cw-row{ display:flex; align-items:flex-end; gap:6px; }',
      '.cw-row.own{ flex-direction:row-reverse; }',
      '.cw-bubble{ max-width:76%; padding:8px 12px; border-radius:14px; font-size:13px; line-height:1.55;',
      '  white-space:pre-wrap; word-break:break-word; background:var(--surface-2); border:1px solid var(--line); }',
      '.cw-row.own .cw-bubble{ background:rgba(212,166,42,.16); border-color:var(--gold-dim); }',
      '.cw-time{ font-size:10.5px; color:var(--text-faint); font-family:var(--mono); flex-shrink:0; }',

      '.cw-composer{ display:flex; gap:8px; align-items:flex-end; padding:10px 12px; border-top:1px solid var(--line-soft); flex-shrink:0; }',
      '.cw-input{ flex:1; min-width:0; resize:none; max-height:110px; background:var(--bg-raise); border:1px solid var(--line);',
      '  border-radius:8px; color:var(--text); font-family:inherit; font-size:13px; line-height:1.5; padding:8px 10px; box-sizing:border-box; }',
      '.cw-input:focus{ outline:none; border-color:var(--gold); }',
      '.cw-send{ flex-shrink:0; padding:9px 14px; border-radius:8px; border:1px solid var(--gold); background:var(--gold);',
      '  color:#1A1400; font-size:12.5px; font-weight:700; cursor:pointer; }',
      '.cw-send:disabled{ opacity:.5; cursor:default; }',
      '.cw-error{ padding:6px 14px; font-size:12px; color:var(--red); flex-shrink:0; }',
      '.cw-hint{ padding:0 14px 8px; font-size:11px; color:var(--text-faint); flex-shrink:0; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── 통신 ────────────────────────────────
  function headers(extra) {
    var h = extra || {};
    if (csrfToken && csrfHeader) h[csrfHeader] = csrfToken;
    return h;
  }

  async function getJSON(url) {
    var res = await fetch(url, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
    var type = res.headers.get('content-type') || '';
    if (!res.ok || res.redirected || type.indexOf('json') === -1) throw new Error('bad-response');
    return res.json();
  }

  async function postJSON(url, body) {
    var res = await fetch(url, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var msg = '메시지를 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
      try { var t = await res.text(); if (t && t.length < 200) msg = t; } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    return res.json();
  }

  // ── 요약(배지) ──────────────────────────
  function renderBadge() {
    if (!badge) return;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.display = '';
      btn.setAttribute('aria-label', '채팅 안 읽은 메시지 ' + unread + '개');
    } else {
      badge.style.display = 'none';
      btn.setAttribute('aria-label', '채팅');
    }
  }

  async function fetchSummary() {
    if (stopped) return;
    try {
      var d = await getJSON('/chat/summary');
      isAdmin = !!d.admin;
      unread = d.unread || 0;
      renderBadge();
    } catch (e) {
      // 로그인이 풀렸거나 서버 오류: 더 이상 확인하지 않습니다.
      stopped = true;
      if (summaryTimer) clearInterval(summaryTimer);
    }
  }

  // ── 시간 표시 ───────────────────────────
  function toDate(v) {
    if (!v) return null;
    var d = Array.isArray(v) ? new Date(v[0], v[1] - 1, v[2], v[3] || 0, v[4] || 0, v[5] || 0) : new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function hhmm(v) { var d = toDate(v); return d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : ''; }
  function dayKey(v) { var d = toDate(v); return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) : ''; }
  function dayLabel(v) { var d = toDate(v); return d ? d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일' : ''; }
  function listTime(v) {
    var d = toDate(v);
    if (!d) return '';
    var now = new Date();
    if (dayKey(v) === now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())) return hhmm(v);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  // ── 패널 골격 ───────────────────────────
  function positionPanel() {
    if (!panel) return;
    var r = btn.getBoundingClientRect();
    panel.style.top = Math.round(r.bottom + 10) + 'px';
    panel.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
  }

  function setTitle(text, showBack) {
    panel.querySelector('.cw-title').textContent = text;
    panel.querySelector('[data-cw-back]').style.display = showBack ? '' : 'none';
  }

  function stopTimers() {
    if (convTimer) { clearInterval(convTimer); convTimer = null; }
    if (roomsTimer) { clearInterval(roomsTimer); roomsTimer = null; }
  }

  function openPanel() {
    if (panel) return;
    injectStyle();
    panel = document.createElement('div');
    panel.className = 'cw-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '채팅');
    panel.innerHTML =
      '<div class="cw-head">' +
        '<button type="button" class="cw-iconbtn" data-cw-back aria-label="목록으로" style="display:none;">←</button>' +
        '<div class="cw-title">채팅</div>' +
        '<button type="button" class="cw-iconbtn" data-cw-close aria-label="닫기">✕</button>' +
      '</div>' +
      '<div class="cw-body"></div>';
    document.body.appendChild(panel);
    positionPanel();
    btn.setAttribute('aria-expanded', 'true');

    panel.querySelector('[data-cw-close]').addEventListener('click', closePanel);
    panel.querySelector('[data-cw-back]').addEventListener('click', function () { showRooms(); });
    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', positionPanel);

    if (isAdmin) showRooms(); else showConversation(null, '관리자와 채팅');
  }

  function closePanel() {
    if (!panel) return;
    stopTimers();
    document.removeEventListener('mousedown', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', positionPanel);
    panel.parentNode.removeChild(panel);
    panel = null;
    roomId = null;
    btn.setAttribute('aria-expanded', 'false');
    fetchSummary();
  }

  function onDocClick(e) {
    if (panel && !panel.contains(e.target) && !btn.contains(e.target)) closePanel();
  }
  function onKey(e) {
    if (e.key === 'Escape') { closePanel(); btn.focus(); }
  }

  // ── 관리자: 채팅방 목록 ─────────────────
  function showRooms() {
    stopTimers();
    view = 'rooms';
    roomId = null;
    setTitle('채팅 문의', false);
    var body = panel.querySelector('.cw-body');
    body.innerHTML = '<div class="cw-rooms" id="cwRooms"><div class="cw-empty">불러오는 중...</div></div>';
    loadRooms();
    roomsTimer = setInterval(function () { if (!document.hidden) loadRooms(); }, ROOMS_MS);
  }

  async function loadRooms() {
    if (!panel || view !== 'rooms') return;
    var box = panel.querySelector('#cwRooms');
    if (!box) return;
    try {
      var rooms = await getJSON('/admin/chat/rooms');
      if (view !== 'rooms') return;
      if (!rooms.length) { box.innerHTML = '<div class="cw-empty">아직 들어온 채팅 문의가 없어요.</div>'; return; }
      box.innerHTML = '';
      rooms.forEach(function (r) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cw-room';
        b.innerHTML =
          '<span class="cw-room-main">' +
            '<div class="cw-room-name">' + esc(r.companyName) + '</div>' +
            '<div class="cw-room-last">' + esc(r.lastMessage || '') + '</div>' +
          '</span>' +
          '<span class="cw-room-side">' +
            '<span class="cw-room-time">' + esc(listTime(r.lastMessageAt)) + '</span>' +
            (r.unread > 0 ? '<span class="cw-room-unread">' + (r.unread > 99 ? '99+' : r.unread) + '</span>' : '') +
          '</span>';
        b.addEventListener('click', function () { showConversation(r.id, r.companyName); });
        box.appendChild(b);
      });
    } catch (e) {
      box.innerHTML = '<div class="cw-empty">목록을 불러오지 못했어요.</div>';
    }
  }

  // ── 대화 ────────────────────────────────
  function showConversation(id, title) {
    stopTimers();
    view = 'conv';
    roomId = id;
    lastId = 0;
    seen = {};
    lastDay = '';
    setTitle(title, isAdmin);

    var body = panel.querySelector('.cw-body');
    body.innerHTML =
      '<div class="cw-messages" id="cwMessages"></div>' +
      '<div class="cw-error" id="cwError" style="display:none;"></div>' +
      '<div class="cw-composer">' +
        '<textarea class="cw-input" id="cwInput" rows="1" maxlength="' + MAX_LEN + '" placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"></textarea>' +
        '<button type="button" class="cw-send" id="cwSend">전송</button>' +
      '</div>';

    var input = body.querySelector('#cwInput');
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
    });
    body.querySelector('#cwSend').addEventListener('click', sendMessage);

    fetchMessages(true).then(function () { input.focus(); });
    convTimer = setInterval(function () { if (!document.hidden) fetchMessages(false); }, CONV_MS);
  }

  function messagesUrl() {
    return isAdmin
      ? '/admin/chat/rooms/' + roomId + '/messages?after=' + lastId
      : '/chat/messages?after=' + lastId;
  }

  async function fetchMessages(initial) {
    if (!panel || view !== 'conv') return;
    try {
      var data = await getJSON(messagesUrl());
      if (!panel || view !== 'conv') return;
      if (!isAdmin && data.roomId) roomId = data.roomId;
      appendMessages(data.messages || [], initial);
      if (initial) fetchSummary(); // 읽음 처리됐으니 배지 갱신
    } catch (e) { /* 다음 주기에 다시 시도 */ }
  }

  function appendMessages(list, forceScroll) {
    var box = panel.querySelector('#cwMessages');
    if (!box) return;

    var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    var added = false;

    list.forEach(function (m) {
      if (seen[m.id]) return;
      seen[m.id] = true;
      if (m.id > lastId) lastId = m.id;
      added = true;

      var empty = box.querySelector('.cw-empty');
      if (empty) empty.parentNode.removeChild(empty);

      var key = dayKey(m.createdAt);
      if (key && key !== lastDay) {
        lastDay = key;
        var sep = document.createElement('div');
        sep.className = 'cw-day';
        sep.textContent = dayLabel(m.createdAt);
        box.appendChild(sep);
      }

      var own = isAdmin ? m.sender === 'ADMIN' : m.sender === 'MEMBER';
      var row = document.createElement('div');
      row.className = 'cw-row' + (own ? ' own' : '');
      var bubble = document.createElement('div');
      bubble.className = 'cw-bubble';
      bubble.textContent = m.content; // 사용자 입력은 항상 텍스트로만 표시
      var time = document.createElement('span');
      time.className = 'cw-time';
      time.textContent = hhmm(m.createdAt);
      row.appendChild(bubble);
      row.appendChild(time);
      box.appendChild(row);
    });

    if (!box.querySelector('.cw-row') && !box.querySelector('.cw-empty')) {
      box.innerHTML = '<div class="cw-empty">' + (isAdmin
        ? '아직 대화가 없어요.'
        : '궁금한 점을 남겨 주세요.<br>관리자가 확인하는 대로 답변드려요.') + '</div>';
    }
    if (added && (nearBottom || forceScroll)) box.scrollTop = box.scrollHeight;
  }

  async function sendMessage() {
    if (sending || !panel) return;
    var input = panel.querySelector('#cwInput');
    var errBox = panel.querySelector('#cwError');
    var sendBtn = panel.querySelector('#cwSend');
    var text = input.value.trim();
    if (!text) return;

    sending = true;
    sendBtn.disabled = true;
    errBox.style.display = 'none';
    try {
      var url = isAdmin ? '/admin/chat/rooms/' + roomId + '/messages' : '/chat/messages';
      var msg = await postJSON(url, { content: text });
      input.value = '';
      input.style.height = 'auto';
      appendMessages([msg], true);
    } catch (e) {
      errBox.textContent = e.message;
      errBox.style.display = 'block';
    } finally {
      sending = false;
      if (panel) { sendBtn.disabled = false; input.focus(); }
    }
  }

  // 관리자인지 회원인지는 첫 요약 응답으로 알 수 있으므로, 그 응답을 기다린 뒤에 창을 엽니다.
  var ready = null;
  async function toggle() {
    if (panel) { closePanel(); return; }
    if (ready) await ready;
    openPanel();
  }

  btn.addEventListener('click', toggle);
  btn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  injectStyle();
  ready = fetchSummary();
  summaryTimer = setInterval(function () { if (!document.hidden && !panel) fetchSummary(); }, SUMMARY_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !panel) fetchSummary(); });
})();
