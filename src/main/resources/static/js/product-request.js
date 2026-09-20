// 상품정보 수정 요청 — 공용 팝업
// 1) 상품 상세창의 '정보수정 요청' 버튼(data-pd-request)과
// 2) '상품정보수정 요청' 페이지의 상품 목록 버튼이 모두 이 팝업을 엽니다.
// topbar 프래그먼트에서 모든 페이지에 자동 포함됩니다. 열기 전에는 아무것도 하지 않습니다.
//
// 사용: 버튼에 data-pd-request, data-product-id, data-product-name(encodeURIComponent), data-product-barcode(encodeURIComponent)
//       또는 window.openProductRequestModal({ productId, productName, barcode })
// 요청이 접수되면 document에 'product-request:created' 이벤트를 보냅니다 (내 요청 내역 새로고침용).

(function () {
  'use strict';

  var FIELDS = [
    ['PRICE', '가격'], ['NAME', '상품명'], ['IMAGE', '이미지'],
    ['OPTION', '옵션'], ['STOCK', '재고·품절'], ['ETC', '기타'],
  ];
  var MAX_LEN = 2000;
  var STYLE_ID = 'productRequestStyle';
  var current = null; // { overlay, busy, onKey }

  var csrfToken = (document.querySelector('meta[name="_csrf"]') || {}).content;
  var csrfHeader = (document.querySelector('meta[name="_csrf_header"]') || {}).content;

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML.replace(/"/g, '&quot;');
  }

  function decode(v) {
    try { return decodeURIComponent(v || ''); } catch (e) { return v || ''; }
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      /* '이 상품 다운로드'(.pd-download-btn)와 같은 모양, 색만 주황 */
      '.pd-request-btn{ display:flex; align-items:center; justify-content:center; gap:7px; width:100%;',
      '  box-sizing:border-box; padding:9px; border-radius:7px; border:1px solid #F0913A; background:rgba(240,145,58,.08);',
      '  color:#F0913A; font-family:inherit; font-size:12.5px; font-weight:700; margin-top:8px; cursor:pointer; }',
      '.pd-request-btn:hover{ background:#F0913A; color:#241203; }',

      '.pr-overlay{ position:fixed; inset:0; z-index:3000; background:rgba(0,0,0,.62);',
      '  display:flex; align-items:center; justify-content:center; padding:16px; }',
      '.pr-dialog{ width:min(520px,100%); max-height:92vh; overflow-y:auto; background:var(--surface);',
      '  color:var(--text); border:1px solid var(--line); border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,.5); }',
      '.pr-head{ display:flex; align-items:center; justify-content:space-between; padding:16px 20px;',
      '  border-bottom:1px solid var(--line-soft); }',
      '.pr-title{ font-size:15px; font-weight:700; }',
      '.pr-close{ width:28px; height:28px; border-radius:6px; border:1px solid var(--line); background:var(--surface-2);',
      '  color:var(--text-dim); font-size:14px; line-height:1; cursor:pointer; }',
      '.pr-close:hover{ border-color:var(--gold); color:var(--gold); }',
      '.pr-body{ padding:18px 20px; display:flex; flex-direction:column; gap:14px; }',
      '.pr-product{ padding:10px 12px; border-radius:8px; background:var(--surface-2); border:1px solid var(--line); }',
      '.pr-product-name{ font-size:13.5px; font-weight:700; word-break:break-word; }',
      '.pr-product-sub{ margin-top:3px; font-size:11.5px; color:var(--text-faint); font-family:var(--mono); }',
      '.pr-field label{ display:block; font-size:12px; font-weight:600; color:var(--text-dim); margin-bottom:6px; }',
      '.pr-input, .pr-textarea{ width:100%; background:var(--bg-raise); border:1px solid var(--line); border-radius:7px;',
      '  color:var(--text); font-size:13px; font-family:inherit; padding:9px 11px; box-sizing:border-box; }',
      '.pr-textarea{ min-height:150px; resize:vertical; line-height:1.6; }',
      '.pr-input:focus, .pr-textarea:focus{ outline:none; border-color:var(--gold); }',
      '.pr-count{ margin-top:4px; text-align:right; font-size:11px; color:var(--text-faint); font-family:var(--mono); }',
      '.pr-error{ display:none; padding:9px 12px; border-radius:6px; background:rgba(240,97,91,.12);',
      '  color:var(--red); font-size:12.5px; }',
      '.pr-foot{ display:flex; justify-content:flex-end; gap:8px; padding:0 20px 18px; }',
      '.pr-foot .btn{ padding:9px 20px; }',
      '.pr-foot .btn:disabled{ opacity:.5; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function close() {
    if (!current) return;
    document.removeEventListener('keydown', current.onKey, true);
    if (current.overlay.parentNode) current.overlay.parentNode.removeChild(current.overlay);
    current = null;
  }

  function open(info) {
    if (!info || !info.productName) return;
    close();
    injectStyle();

    var overlay = document.createElement('div');
    overlay.className = 'pr-overlay';
    overlay.innerHTML =
      '<div class="pr-dialog" role="dialog" aria-modal="true" aria-labelledby="prTitle">' +
        '<div class="pr-head">' +
          '<div class="pr-title" id="prTitle">상품정보 수정 요청</div>' +
          '<button type="button" class="pr-close" data-pr-close aria-label="닫기">✕</button>' +
        '</div>' +
        '<div class="pr-body">' +
          '<div class="pr-product">' +
            '<div class="pr-product-name">' + esc(info.productName) + '</div>' +
            '<div class="pr-product-sub">바코드 ' + esc(info.barcode || '-') + '</div>' +
          '</div>' +
          '<div class="pr-field">' +
            '<label for="prField">수정하고 싶은 항목</label>' +
            '<select id="prField" class="pr-input">' +
              FIELDS.map(function (f) { return '<option value="' + f[0] + '">' + f[1] + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="pr-field">' +
            '<label for="prContent">수정 내용</label>' +
            '<textarea id="prContent" class="pr-textarea" maxlength="' + MAX_LEN + '" ' +
              'placeholder="어떤 정보가 어떻게 바뀌어야 하는지 구체적으로 적어 주세요. (예: 소비자가가 12,900원으로 변경됨)"></textarea>' +
            '<div class="pr-count"><span id="prCount">0</span> / ' + MAX_LEN + '</div>' +
          '</div>' +
          '<div class="pr-error" id="prError" role="alert"></div>' +
        '</div>' +
        '<div class="pr-foot">' +
          '<button type="button" class="btn" data-pr-close>취소</button>' +
          '<button type="button" class="btn gold" id="prSubmit">요청 보내기</button>' +
        '</div>' +
      '</div>';

    // 상세창(Offcanvas)이 열려 있으면 그 안에 붙입니다. Bootstrap이 창 밖 요소로 포커스가 나가는 걸 막아서
    // body에 붙이면 입력칸에 글자를 칠 수 없게 되기 때문이에요.
    var host = document.querySelector('.offcanvas.show') || document.body;
    host.appendChild(overlay);

    var state = { overlay: overlay, busy: false, onKey: null };
    state.onKey = function (e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!state.busy) close();
      }
    };
    document.addEventListener('keydown', state.onKey, true);
    current = state;

    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay && !state.busy) close();
    });
    overlay.querySelectorAll('[data-pr-close]').forEach(function (b) {
      b.addEventListener('click', function () { if (!state.busy) close(); });
    });

    var textarea = overlay.querySelector('#prContent');
    var counter = overlay.querySelector('#prCount');
    var errBox = overlay.querySelector('#prError');
    var submit = overlay.querySelector('#prSubmit');

    textarea.addEventListener('input', function () { counter.textContent = String(textarea.value.length); });
    setTimeout(function () { textarea.focus(); }, 30);

    function showError(msg) { errBox.textContent = msg; errBox.style.display = 'block'; }

    submit.addEventListener('click', async function () {
      if (state.busy) return;
      errBox.style.display = 'none';

      var content = textarea.value.trim();
      if (!content) { showError('수정을 원하는 내용을 입력해 주세요.'); textarea.focus(); return; }

      state.busy = true;
      submit.disabled = true;
      submit.textContent = '보내는 중...';

      var headers = { 'Content-Type': 'application/json' };
      if (csrfToken && csrfHeader) headers[csrfHeader] = csrfToken;

      try {
        var res = await fetch('/product-requests', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            productId: info.productId || null,
            productName: info.productName,
            productBarcode: info.barcode || null,
            fieldType: overlay.querySelector('#prField').value,
            content: content,
          }),
        });
        if (!res.ok) {
          var msg = '요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
          try { var t = await res.text(); if (t && t.length < 300) msg = t; } catch (e) { /* ignore */ }
          throw new Error(msg);
        }
        state.busy = false;
        close();
        window.alert('수정 요청을 접수했어요.\n처리 상황은 사이드바의 \'상품정보수정 요청\' 메뉴에서 확인할 수 있어요.');
        document.dispatchEvent(new CustomEvent('product-request:created'));
      } catch (err) {
        state.busy = false;
        submit.disabled = false;
        submit.textContent = '요청 보내기';
        showError(err.message);
      }
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pd-request]');
    if (!btn) return;
    e.preventDefault();
    open({
      productId: Number(btn.dataset.productId) || null,
      productName: decode(btn.dataset.productName),
      barcode: decode(btn.dataset.productBarcode),
    });
  });

  window.openProductRequestModal = open;

  // 상세창의 '정보수정 요청' 버튼은 팝업을 열기 전부터 보이므로 스타일을 미리 넣어둡니다.
  injectStyle();
})();
