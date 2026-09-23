// 주문확인(관리자) — 상태별 탭 목록, 상세/처리(상태·송장 저장), 엑셀 다운로드
(function () {
  'use strict';

  var API = '/admin/orders';
  var csrfToken = (document.querySelector('meta[name="_csrf"]') || {}).content;
  var csrfHeader = (document.querySelector('meta[name="_csrf_header"]') || {}).content;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function won(n) { return Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원'; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(v) {
    if (!v) return '';
    if (Array.isArray(v)) return v[0] + '-' + pad(v[1]) + '-' + pad(v[2]) + ' ' + pad(v[3] || 0) + ':' + pad(v[4] || 0);
    return String(v).replace('T', ' ').slice(0, 16);
  }
  function headers(extra) { var h = extra || {}; if (csrfToken && csrfHeader) h[csrfHeader] = csrfToken; return h; }

  async function request(url, options) {
    var res = await fetch(url, options);
    if (!res.ok) {
      var msg = '요청 처리 중 오류가 발생했어요. (상태코드 ' + res.status + ')';
      try { var t = await res.text(); if (t) msg = t; } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    var text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  var all = [];
  var currentStatus = '';
  var selectedId = null;

  // ── 상태 탭 ──────────────────────────────
  var tabs = document.querySelectorAll('#orderStatusTabs .tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.toggle('active', x === t); });
      currentStatus = t.dataset.status;
      load();
      toggleLogPanel();
    });
  });

  function toggleLogPanel() {
    var show = currentStatus === 'RECEIVED';
    $('aoLogPanel').style.display = show ? '' : 'none';
    if (show) loadExportLog();
  }

  async function loadExportLog() {
    var body = $('aoLogBody');
    try {
      var list = await request(API + '/export-log', { headers: { Accept: 'application/json' } });
      if (!list.length) { body.innerHTML = '<tr><td colspan="4" class="ao-log-empty">아직 다운로드한 내역이 없어요.</td></tr>'; return; }
      body.innerHTML = list.map(function (l) {
        return '<tr><td class="ao-mono">' + esc(fmt(l.exportedAt)) + '</td><td>' + l.orderCount + '건</td>' +
          '<td>' + esc(l.adminUsername || '-') + '</td>' +
          '<td class="ao-log-codes" title="' + esc(l.orderCodes || '').replace(/"/g, '&quot;') + '">' + esc(l.orderCodes || '') + '</td></tr>';
      }).join('');
    } catch (e) {
      body.innerHTML = '<tr><td colspan="4" class="ao-log-empty">불러오지 못했어요.</td></tr>';
    }
  }

  async function load() {
    $('aoBody').innerHTML = '<tr class="empty-row"><td colspan="7">불러오는 중...</td></tr>';
    try {
      var url = API + '/list' + (currentStatus ? '?status=' + currentStatus : '');
      all = await request(url, { headers: { Accept: 'application/json' } });
      render();
    } catch (e) {
      $('aoBody').innerHTML = '<tr class="empty-row"><td colspan="7">' + esc(e.message) + '</td></tr>';
    }
  }

  function filtered() {
    var kw = (($('topbarSearchInput') || {}).value || '').trim().toLowerCase();
    if (!kw) return all;
    return all.filter(function (o) {
      var itemNames = o.items.map(function (i) { return i.productName; }).join(' ');
      return [o.orderCode, o.companyName, o.requesterUsername, o.requesterName, itemNames]
        .some(function (v) { return (v || '').toLowerCase().indexOf(kw) !== -1; });
    });
  }

  function render() {
    var rows = filtered();
    $('aoCount').textContent = rows.length + '건';
    var body = $('aoBody');
    body.innerHTML = '';
    if (!rows.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="7">' + (all.length ? '조건에 맞는 주문이 없어요.' : '접수된 주문이 없어요.') + '</td></tr>';
      return;
    }
    rows.forEach(function (o) {
      var itemNames = o.items.map(function (i) { return i.productName + (i.optionName ? '(' + i.optionName + ')' : '') + ' x' + i.quantity; }).join(', ');
      var tr = document.createElement('tr');
      tr.className = 'ao-row' + (o.id === selectedId ? ' selected' : '');
      tr.innerHTML =
        '<td><span class="ao-pill ' + esc(o.status) + '">' + esc(o.statusLabel) + '</span></td>' +
        '<td class="ao-mono">' + esc(o.orderCode) + '</td>' +
        '<td class="ao-mono">' + esc(fmt(o.createdAt)) + '</td>' +
        '<td>' + esc(o.companyName || '-') + '<div class="ao-sub">' + esc(o.requesterUsername || '') + '</div></td>' +
        '<td class="ao-items-cell" title="' + esc(itemNames).replace(/"/g, '&quot;') + '">' + esc(itemNames) + '</td>' +
        '<td class="ao-mono">' + won(o.totalAmount) + '</td>' +
        '<td class="ao-mono">' + (o.trackingNumber ? esc(o.carrier || '') + ' ' + esc(o.trackingNumber) : '-') + '</td>';
      tr.addEventListener('click', function () { openDetail(o.id); });
      body.appendChild(tr);
    });
  }

  function openDetail(id) {
    var o = all.find(function (x) { return x.id === id; });
    if (!o) return;
    selectedId = id;
    $('dCode').textContent = o.orderCode;
    $('dDate').textContent = fmt(o.createdAt);
    $('dMember').textContent = (o.companyName || '-') + ' (' + (o.requesterUsername || '-') + ')';
    $('dReceiver').textContent = o.requesterName + ' · ' + o.requesterPhone;
    $('dAddress').textContent = (o.zonecode ? '(' + o.zonecode + ') ' : '') + o.address + ' ' + (o.addressDetail || '');
    $('dMessage').textContent = o.deliveryMessage || '-';
    $('dItemsBody').innerHTML = o.items.map(function (i) {
      return '<tr><td>' + esc(i.productName) + (i.optionName ? '<br><span style="color:var(--text-faint);">' + esc(i.optionName) + '</span>' : '') + '</td>' +
        '<td>' + i.quantity + '개</td><td style="text-align:right;">' + won(i.lineTotal) + '</td></tr>';
    }).join('');
    $('dTotal').textContent = won(o.totalAmount);

    $('fStatus').value = o.status;
    $('fCarrier').value = o.carrier || '';
    $('fTracking').value = o.trackingNumber || '';
    $('fMemo').value = o.adminMemo || '';
    toggleTrackingRequired();

    var panel = $('aoFormPanel');
    panel.style.display = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    render();
  }

  function closeDetail() { selectedId = null; $('aoFormPanel').style.display = 'none'; render(); }

  function toggleTrackingRequired() {
    $('fTrackReq').style.display = $('fStatus').value === 'SHIPPED' ? '' : 'none';
  }
  $('fStatus').addEventListener('change', toggleTrackingRequired);

  async function save() {
    if (selectedId == null) return;
    var btn = $('aoSaveBtn');
    btn.disabled = true;
    try {
      var id = selectedId;
      await request(API + '/' + id + '/status', {
        method: 'PUT',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          status: $('fStatus').value,
          carrier: $('fCarrier').value.trim(),
          trackingNumber: $('fTracking').value.trim(),
          adminMemo: $('fMemo').value.trim(),
        }),
      });
      await load();
      var saved = all.find(function (x) { return x.id === id; });
      if (saved) { openDetail(id); alert('저장했어요.\n처리 상태: ' + saved.statusLabel); }
    } catch (e) {
      alert(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  $('aoCloseBtn').addEventListener('click', closeDetail);
  $('aoSaveBtn').addEventListener('click', save);
  var topSearch = $('topbarSearchInput');
  if (topSearch) topSearch.addEventListener('input', render);

  // ── 엑셀 다운로드 ────────────────────────
  // "주문접수" 탭: 서버에 먼저 확인을 받아, 이미 받은 적 있는 주문이 섞여 있으면 되물은 뒤 내려받고,
  //              성공하면 그 주문들이 자동으로 "주문확인"으로 바뀌고 다운로드 내역에 한 줄 남아요.
  // 그 밖의 탭: 지금 보이는 목록을 그대로 내려받기만 해요 (상태는 바뀌지 않아요).

  function buildSheetRows(orders) {
    var rows = [];
    orders.forEach(function (o) {
      o.items.forEach(function (i, idx) {
        rows.push({
          주문번호: idx === 0 ? o.orderCode : '',
          주문일: idx === 0 ? fmt(o.createdAt) : '',
          상태: idx === 0 ? o.statusLabel : '',
          회사명: idx === 0 ? (o.companyName || '') : '',
          아이디: idx === 0 ? (o.requesterUsername || '') : '',
          받는분: idx === 0 ? o.requesterName : '',
          연락처: idx === 0 ? o.requesterPhone : '',
          주소: idx === 0 ? ((o.zonecode ? '(' + o.zonecode + ') ' : '') + o.address + ' ' + (o.addressDetail || '')) : '',
          배송메시지: idx === 0 ? (o.deliveryMessage || '') : '',
          상품명: i.productName,
          옵션: i.optionName || '',
          수량: i.quantity,
          단가: Number(i.unitPrice),
          금액: Number(i.lineTotal),
          택배사: idx === 0 ? (o.carrier || '') : '',
          송장번호: idx === 0 ? (o.trackingNumber || '') : '',
          주문합계: idx === 0 ? Number(o.totalAmount) : '',
        });
      });
    });
    return rows;
  }

  function writeExcelFile(sheetRows) {
    var ws = XLSX.utils.json_to_sheet(sheetRows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '주문목록');
    var stamp = new Date();
    var name = '주문목록_' + stamp.getFullYear() + pad(stamp.getMonth() + 1) + pad(stamp.getDate()) + '_' + pad(stamp.getHours()) + pad(stamp.getMinutes()) + '.xlsx';
    XLSX.writeFile(wb, name);
  }

  // 서버에 다운로드를 신청합니다. 이미 받은 주문이 섞여 있으면(force=false일 때) 409와 함께 그 주문번호 목록을 돌려줘요.
  async function requestExport(ids, force) {
    var res = await fetch(API + '/export', {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ orderIds: ids, force: force }),
    });
    if (res.status === 409) {
      var conflict = await res.json();
      var err = new Error('confirm-needed');
      err.conflictCodes = conflict.alreadyDownloadedOrderCodes || [];
      throw err;
    }
    if (!res.ok) {
      var msg = '요청 처리 중 오류가 발생했어요. (상태코드 ' + res.status + ')';
      try { var t = await res.text(); if (t) msg = t; } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    var text = await res.text();
    return text ? JSON.parse(text) : [];
  }

  async function exportFromReceivedTab(rows) {
    var ids = rows.map(function (o) { return o.id; });
    try {
      var updated = await requestExport(ids, false);
      finishExport(updated);
    } catch (e) {
      if (!e.conflictCodes) { alert(e.message); return; }
      var codes = e.conflictCodes;
      var msg = '확인된 주문건입니다. (이미 한 번 다운로드한 주문 ' + codes.length + '건 포함: ' + codes.join(', ') + ')\n다시 다운로드하시겠습니까?';
      if (!confirm(msg)) return; // 취소 → 아무 것도 바뀌지 않음
      try {
        var updated2 = await requestExport(ids, true);
        finishExport(updated2);
      } catch (e2) {
        alert(e2.message);
      }
    }
  }

  function finishExport(updatedOrders) {
    // 서버 쪽 상태 전환은 이미 끝난 상태라, 엑셀 파일 만들기가 실패해도(예: 네트워크 문제) 화면은 최신 상태로 맞춰 둡니다.
    load();          // 주문확인으로 넘어간 주문은 "주문접수" 탭 목록에서 빠집니다
    loadExportLog();  // 다운로드 내역에 새 줄이 보이도록 새로고침
    try {
      writeExcelFile(buildSheetRows(updatedOrders));
    } catch (e) {
      alert('주문은 정상적으로 확인 처리됐지만, 엑셀 파일을 만드는 중 문제가 있었어요. 다운로드 내역에서 다시 시도해 주세요.');
    }
  }

  $('aoExportBtn').addEventListener('click', function () {
    var rows = filtered();
    if (!rows.length) { alert('다운로드할 주문이 없어요.'); return; }

    if (currentStatus === 'RECEIVED') {
      exportFromReceivedTab(rows);
    } else {
      writeExcelFile(buildSheetRows(rows)); // 상태는 바꾸지 않고 지금 보이는 목록만 그대로 내려받아요
    }
  });

  load();
})();
