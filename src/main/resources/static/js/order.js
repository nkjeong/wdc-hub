// 주문하기 화면 — 상품 담기, 배송 정보 입력, 접수, 내 주문내역 조회
(function () {
  'use strict';

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

  async function fetchJSON(url, options) {
    var res = await fetch(url, Object.assign({ credentials: 'same-origin' }, options));
    if (!res.ok) {
      var msg = '요청 처리 중 오류가 발생했어요.';
      try { var t = await res.text(); if (t) msg = t; } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    var text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  function authedFetch(url, options) {
    var o = options || {};
    var headers = o.headers || {};
    if (csrfToken && csrfHeader) headers[csrfHeader] = csrfToken;
    o.headers = headers;
    return fetchJSON(url, o);
  }

  // ── 탭 ───────────────────────────────────
  var tabs = document.querySelectorAll('#orderTabs .tab');
  tabs.forEach(function (t) { t.addEventListener('click', function () { switchTab(t.dataset.tab); }); });
  function switchTab(name) {
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    $('orderNewPanel').style.display = name === 'new' ? 'block' : 'none';
    $('orderAddressPanel').style.display = name === 'new' ? 'block' : 'none';
    $('orderHistoryPanel').style.display = name === 'history' ? 'block' : 'none';
    if (name === 'history') loadHistory();
  }

  // ── 상품 검색 ────────────────────────────
  var searchInput = $('odSearchInput');
  var resultsBox = $('odResults');
  var searchTimer = null;

  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var kw = searchInput.value.trim();
    if (!kw) { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; return; }
    searchTimer = setTimeout(function () { runSearch(kw); }, 250);
  });
  searchInput.addEventListener('blur', function () { setTimeout(function () { resultsBox.style.display = 'none'; }, 200); });
  resultsBox.addEventListener('mousedown', function (e) { e.preventDefault(); });

  async function runSearch(kw) {
    try {
      var list = await fetchJSON('/orders/product-search?keyword=' + encodeURIComponent(kw));
      if (searchInput.value.trim() !== kw) return;
      if (!list.length) { resultsBox.innerHTML = '<div class="od-empty-hint">검색 결과가 없어요.</div>'; resultsBox.style.display = ''; return; }
      resultsBox.innerHTML = list.map(function (p) {
        return '<button type="button" class="od-result" data-id="' + p.id + '" data-name="' + esc(p.productName).replace(/"/g, '&quot;') + '"' +
          ' data-price="' + p.unitPrice + '" data-image="' + esc(p.mainImageThumbUrl || '') + '" data-has-option="' + (p.hasOptionYn ? '1' : '0') + '">' +
          (p.mainImageThumbUrl ? '<img src="' + esc(p.mainImageThumbUrl) + '" alt="">' : '<img alt="">') +
          '<span class="name">' + esc(p.productName) + '</span>' +
          '<span class="price">' + won(p.unitPrice) + '</span>' +
          '</button>';
      }).join('');
      resultsBox.style.display = '';
    } catch (e) {
      resultsBox.innerHTML = '<div class="od-empty-hint">검색하지 못했어요.</div>'; resultsBox.style.display = '';
    }
  }

  resultsBox.addEventListener('click', function (e) {
    var btn = e.target.closest('.od-result');
    if (!btn) return;
    var product = { id: Number(btn.dataset.id), productName: btn.dataset.name, unitPrice: Number(btn.dataset.price), mainImageThumbUrl: btn.dataset.image, hasOptionYn: btn.dataset.hasOption === '1' };
    resultsBox.style.display = 'none'; searchInput.value = '';
    if (product.hasOptionYn) openOptionPicker(product);
    else addToCart(product, null, 1);
  });

  // ── 옵션 선택 (간단한 모달) ──────────────
  async function openOptionPicker(product) {
    var options;
    try { options = await fetchJSON('/orders/products/' + product.id + '/options'); }
    catch (e) { alert('옵션을 불러오지 못했어요.'); return; }
    var usable = options.filter(function (o) { return !o.soldOutYn; });
    if (!usable.length) { alert('선택할 수 있는 옵션이 없어요. (품절)'); return; }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;">' +
        '<div style="font-weight:700;margin-bottom:12px;">' + esc(product.productName) + ' — 옵션 선택</div>' +
        '<select id="odOptSelect" class="calc-input" style="width:100%;margin-bottom:14px;">' +
          usable.map(function (o) {
            var label = (o.optionName ? o.optionName + ': ' : '') + o.optionValue + (o.additionalPrice > 0 ? ' (+' + won(o.additionalPrice) + ')' : '');
            return '<option value="' + o.id + '" data-add="' + (o.additionalPrice || 0) + '">' + esc(label) + '</option>';
          }).join('') +
        '</select>' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
          '<button type="button" class="btn" id="odOptCancel">취소</button>' +
          '<button type="button" class="btn gold" id="odOptOk">담기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('#odOptCancel').addEventListener('click', close);
    overlay.querySelector('#odOptOk').addEventListener('click', function () {
      var sel = overlay.querySelector('#odOptSelect');
      var chosen = usable.find(function (o) { return String(o.id) === sel.value; });
      close();
      addToCart(product, chosen, 1);
    });
  }

  // ── 장바구니 ─────────────────────────────
  var cart = []; // { key, productId, optionId, name, optionLabel, unitPrice, quantity, image }

  function cartKey(productId, optionId) { return productId + ':' + (optionId || 0); }

  function addToCart(product, option, qty) {
    var optionId = option ? option.id : null;
    var unitPrice = product.unitPrice + (option && option.additionalPrice ? option.additionalPrice : 0);
    var optionLabel = option ? ((option.optionName ? option.optionName + ': ' : '') + option.optionValue) : '';
    var key = cartKey(product.id, optionId);
    var existing = cart.find(function (c) { return c.key === key; });
    if (existing) existing.quantity = Math.min(999, existing.quantity + qty);
    else cart.push({ key: key, productId: product.id, optionId: optionId, name: product.productName, optionLabel: optionLabel, unitPrice: unitPrice, quantity: Math.min(999, qty), image: product.mainImageThumbUrl });
    renderCart();
  }

  function renderCart() {
    var box = $('odCart');
    if (!cart.length) {
      box.innerHTML = '<div class="od-cart-empty">아직 담은 상품이 없어요. 위에서 검색해서 담아 주세요.</div>';
      $('odCartTotal').style.display = 'none';
      return;
    }
    box.innerHTML = cart.map(function (c) {
      var lineTotal = c.unitPrice * c.quantity;
      return '<div class="od-cart-row" data-key="' + c.key + '">' +
        (c.image ? '<img src="' + esc(c.image) + '" alt="">' : '<img alt="">') +
        '<div class="od-cart-info"><div class="od-cart-name">' + esc(c.name) + '</div>' +
          (c.optionLabel ? '<div class="od-cart-opt">' + esc(c.optionLabel) + '</div>' : '') + '</div>' +
        '<div class="od-qty">' +
          '<button type="button" class="od-qty-down">−</button>' +
          '<input type="text" inputmode="numeric" class="od-qty-input" value="' + c.quantity + '">' +
          '<button type="button" class="od-qty-up">+</button>' +
        '</div>' +
        '<div class="od-line-total">' + won(lineTotal) + '</div>' +
        '<button type="button" class="od-cart-remove" aria-label="빼기">✕</button>' +
      '</div>';
    }).join('');
    var total = cart.reduce(function (s, c) { return s + c.unitPrice * c.quantity; }, 0);
    $('odCartTotalValue').textContent = won(total);
    $('odCartTotal').style.display = '';
  }

  $('odCart').addEventListener('click', function (e) {
    var row = e.target.closest('.od-cart-row');
    if (!row) return;
    var item = cart.find(function (c) { return c.key === row.dataset.key; });
    if (!item) return;
    if (e.target.closest('.od-cart-remove')) { cart = cart.filter(function (c) { return c.key !== item.key; }); renderCart(); return; }
    if (e.target.closest('.od-qty-up')) { item.quantity = Math.min(999, item.quantity + 1); renderCart(); return; }
    if (e.target.closest('.od-qty-down')) { item.quantity = Math.max(1, item.quantity - 1); renderCart(); return; }
  });
  $('odCart').addEventListener('change', function (e) {
    if (!e.target.classList.contains('od-qty-input')) return;
    var row = e.target.closest('.od-cart-row');
    var item = cart.find(function (c) { return c.key === row.dataset.key; });
    var n = Math.max(1, Math.min(999, Math.round(Number(e.target.value)) || 1));
    item.quantity = n; renderCart();
  });

  // ── 배송 정보 ────────────────────────────
  if (window.ORDER_DEFAULTS) { $('odName').value = window.ORDER_DEFAULTS.name || ''; $('odPhone').value = window.ORDER_DEFAULTS.phone || ''; }

  $('odFindAddr').addEventListener('click', function () {
    if (!window.kakao || !kakao.Postcode) { alert('주소 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); return; }
    new kakao.Postcode({
      oncomplete: function (data) {
        $('odZonecode').value = data.zonecode;
        $('odAddress').value = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        $('odAddressDetail').focus();
      }
    }).open();
  });

  function showError(msg) { var e = $('odError'); e.textContent = msg; e.style.display = 'block'; e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function clearError() { $('odError').style.display = 'none'; }

  $('odSubmit').addEventListener('click', async function () {
    clearError();
    if (!cart.length) { showError('담은 상품이 없어요. 상품을 먼저 담아 주세요.'); switchTab('new'); return; }
    if (!$('odAddress').value.trim()) { showError('배송 주소를 입력해 주세요.'); return; }

    var payload = {
      requesterName: $('odName').value.trim(),
      requesterPhone: $('odPhone').value.trim(),
      zonecode: $('odZonecode').value.trim(),
      address: $('odAddress').value.trim(),
      addressDetail: $('odAddressDetail').value.trim(),
      deliveryMessage: $('odMessage').value.trim(),
      items: cart.map(function (c) { return { productId: c.productId, optionId: c.optionId, quantity: c.quantity }; }),
    };

    var btn = $('odSubmit');
    btn.disabled = true;
    try {
      var order = await authedFetch('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      cart = []; renderCart();
      $('odAddressDetail').value = ''; $('odMessage').value = '';
      alert('주문이 접수됐어요.\n주문번호: ' + order.orderCode + '\n진행 상황은 주문내역 탭에서 확인할 수 있어요.');
      switchTab('history');
    } catch (e) {
      showError(e.message);
    } finally {
      btn.disabled = false;
    }
  });

  // ── 주문내역 ─────────────────────────────
  var STEP_ORDER = ['RECEIVED', 'CONFIRMED', 'PREPARING', 'SHIPPED'];
  var historyLoaded = false;

  async function loadHistory() {
    var box = $('odHistoryList');
    try {
      var list = await fetchJSON('/orders/list');
      historyLoaded = true;
      $('odHistoryCount').textContent = list.length + '건';
      if (!list.length) { box.innerHTML = '<div class="od-empty">아직 주문한 내역이 없어요.</div>'; return; }
      box.innerHTML = '';
      list.forEach(function (o) { box.appendChild(buildHistoryItem(o)); });
    } catch (e) {
      box.innerHTML = '<div class="od-empty">주문내역을 불러오지 못했어요. 새로고침해 주세요.</div>';
    }
  }

  function buildHistoryItem(o) {
    var d = document.createElement('details');
    d.className = 'od-item';
    var itemNames = o.items.map(function (i) { return i.productName + (i.optionName ? '(' + i.optionName + ')' : '') + ' ' + i.quantity + '개'; }).join(', ');

    var stepsHtml = '';
    if (o.status === 'CANCELED') {
      stepsHtml = '<div class="od-steps"><div class="od-step canceled">주문취소</div></div>';
    } else {
      var curIdx = STEP_ORDER.indexOf(o.status);
      stepsHtml = '<div class="od-steps">' + STEP_ORDER.map(function (s, i) {
        var labelMap = { RECEIVED: '주문접수', CONFIRMED: '주문확인', PREPARING: '상품준비중', SHIPPED: '발송완료' };
        return '<div class="od-step' + (i <= curIdx ? ' done' : '') + '">' + labelMap[s] + '</div>';
      }).join('') + '</div>';
    }

    var rows = o.items.map(function (i) {
      return '<tr><td>' + esc(i.productName) + (i.optionName ? '<br><span style="color:var(--text-faint);">' + esc(i.optionName) + '</span>' : '') + '</td>' +
        '<td>' + i.quantity + '개</td><td style="text-align:right;">' + won(i.lineTotal) + '</td></tr>';
    }).join('');

    var track = o.status === 'SHIPPED' && o.trackingNumber
      ? '<div class="od-track">📦 ' + esc(o.carrier || '') + ' ' + esc(o.trackingNumber) + '</div>' : '';

    d.innerHTML =
      '<summary>' +
        '<span class="od-pill ' + esc(o.status) + '">' + esc(o.statusLabel) + '</span>' +
        '<span class="od-code">' + esc(o.orderCode) + '</span>' +
        '<span class="od-summary-name">' + esc(itemNames) + '</span>' +
        '<span class="od-date">' + esc(fmt(o.createdAt)) + '</span>' +
      '</summary>' +
      '<div class="od-body">' +
        stepsHtml +
        '<table class="od-detail-table"><thead><tr><th>상품</th><th>수량</th><th style="text-align:right;">금액</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div style="text-align:right; margin-top:8px; font-weight:700;">합계 ' + won(o.totalAmount) + '</div>' +
        track +
        '<div class="od-addr">받는 분: ' + esc(o.requesterName) + ' · ' + esc(o.requesterPhone) + '<br>' +
          (o.zonecode ? '(' + esc(o.zonecode) + ') ' : '') + esc(o.address) + ' ' + esc(o.addressDetail || '') +
          (o.deliveryMessage ? '<br>배송 메시지: ' + esc(o.deliveryMessage) : '') +
        '</div>' +
      '</div>';
    return d;
  }

  switchTab('new');
})();
