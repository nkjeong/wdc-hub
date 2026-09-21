// 브랜드 선택 (검색 + 레이어)
//
// 상품 등록/수정 화면의 브랜드 <select>를 "눌러서 여는 검색 레이어"로 바꿉니다.
// 브랜드가 수백~수천 개로 늘어나도 검색으로 바로 찾을 수 있어요.
//   - 브랜드명(국문/영문), 제조사, 수입사, 브랜드코드를 띄어쓰기 AND 검색으로 찾아요.
//   - 영문 오타(한글 키보드 상태)는 한글로 바꿔서 제안해요.
//   - ↑ ↓ 로 이동, Enter로 선택, Esc로 닫기.
//
// 원래의 <select id="regBrand"> / <select id="editBrand">는 화면에서만 숨기고 그대로 남겨 둡니다.
// 그래서 기존 코드(select.value 읽기/쓰기, 옵션 목록, 자동 매칭 등)는 하나도 바꾸지 않아도 계속 동작하고,
// 값이 바뀌면(코드로 바꿔도) 화면의 버튼 글자도 알아서 따라 바뀝니다.
//
// 사용: <select data-brand-picker> 를 만들어 두면 자동으로 바뀝니다.
//       BrandPicker.setDetails(brandList) 로 브랜드 상세(영문명, 제조사, 수입사)를 알려 주면 검색이 더 풍부해져요.

(function () {
  'use strict';

  var LIMIT = 100;   // 한 번에 보여줄 최대 개수 (그 이상은 검색으로 좁혀 달라고 안내)
  var details = {};  // 브랜드 id → 상세

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  function setDetails(list) {
    details = {};
    (list || []).forEach(function (b) { details[String(b.id)] = b; });
  }

  function optionsOf(select) {
    return Array.prototype.slice.call(select.options)
      .filter(function (o) { return o.value !== ''; })
      .map(function (o) {
        var d = details[o.value] || {};
        return {
          id: o.value,
          name: o.textContent.trim(),
          en: d.brandNameEn || '',
          maker: d.manufacturerName || '',
          importer: d.importerName || '',
          code: d.brandCode || '',
        };
      });
  }

  function init(select) {
    if (!select || select.__brandPicker) return;
    select.__brandPicker = true;

    // ── 화면 구성 ─────────────────────────
    var wrap = document.createElement('div');
    wrap.className = 'brand-picker';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('brand-picker-native');   // 화면에서는 숨기지만, 필수 입력 검사는 그대로 동작합니다
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calc-input brand-picker-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    wrap.insertBefore(btn, select);

    // 레이어는 body에 붙여서, 스크롤되는 상자(수정 창 등) 안에서도 잘리지 않게 합니다
    var layer = document.createElement('div');
    layer.className = 'brand-picker-layer';
    layer.hidden = true;
    layer.innerHTML =
      '<input type="text" class="brand-picker-search" placeholder="브랜드명, 제조사, 수입사로 검색 (띄어쓰기로 여러 단어)" autocomplete="off" aria-label="브랜드 검색">' +
      '<ul class="brand-picker-list" role="listbox"></ul>' +
      '<div class="brand-picker-foot"></div>';
    document.body.appendChild(layer);

    var search = layer.querySelector('.brand-picker-search');
    var list = layer.querySelector('.brand-picker-list');
    var foot = layer.querySelector('.brand-picker-foot');
    var activeIndex = 0;
    var open = false;

    if (window.SearchUtils) window.SearchUtils.attach(search);   // 영문 오타 → 한글 제안

    // ── 선택된 값을 버튼에 표시 ───────────
    function refreshLabel() {
      var opt = select.options[select.selectedIndex];
      var has = opt && opt.value !== '';
      btn.innerHTML =
        '<span class="brand-picker-label' + (has ? '' : ' empty') + '">' + esc(has ? opt.textContent.trim() : '브랜드 검색 / 선택') + '</span>' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    }

    // 코드에서 select.value = ... 로 바꿔도 버튼 글자가 따라 바뀌게 합니다
    var desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) { desc.set.call(this, v); refreshLabel(); },
    });
    // 옵션 목록이 새로 채워지면(브랜드 등록 후 새로고침 등) 표시도 갱신
    new MutationObserver(function () { refreshLabel(); if (open) render(); }).observe(select, { childList: true });
    select.addEventListener('change', refreshLabel);

    // ── 목록 그리기 ───────────────────────
    function render() {
      var q = search.value.trim();
      var all = optionsOf(select);
      var match = window.SearchUtils ? window.SearchUtils.matcher(q) : function () { return true; };
      var hits = q ? all.filter(function (b) { return match([b.name, b.en, b.maker, b.importer, b.code]); }) : all;
      var shown = hits.slice(0, LIMIT);
      var current = select.value;

      var html = '';
      if (!q) {
        html += '<li class="brand-picker-item none" role="option" data-id="">선택 안함</li>';
      }
      html += shown.map(function (b) {
        var sub = [b.en, b.maker && b.maker !== b.name ? b.maker : ''].filter(Boolean).join(' · ');
        return '<li class="brand-picker-item' + (b.id === current ? ' selected' : '') + '" role="option" data-id="' + esc(b.id) + '">' +
          '<span class="n">' + esc(b.name) + '</span>' + (sub ? '<span class="s">' + esc(sub) + '</span>' : '') + '</li>';
      }).join('');
      if (!shown.length) html += '<li class="brand-picker-empty">' + (all.length ? '검색 결과가 없어요. 다른 검색어로 찾아 보세요.' : '등록된 브랜드가 없어요.') + '</li>';
      list.innerHTML = html;

      foot.textContent = !all.length ? '' :
        (q ? '검색 결과 ' + hits.length.toLocaleString('ko-KR') + '개' : '전체 ' + all.length.toLocaleString('ko-KR') + '개') +
        (hits.length > LIMIT ? ' 중 앞의 ' + LIMIT + '개만 보여요. 검색어를 더 입력해 보세요.' : '');

      var items = list.querySelectorAll('.brand-picker-item');
      // 선택된 항목이 있으면 그 위치에서 시작, 없으면 첫 번째
      activeIndex = 0;
      for (var i = 0; i < items.length; i++) { if (items[i].classList.contains('selected')) { activeIndex = i; break; } }
      if (q && items.length) activeIndex = 0;
      markActive(false);
    }

    function markActive(scroll) {
      var items = list.querySelectorAll('.brand-picker-item');
      Array.prototype.forEach.call(items, function (el, i) {
        el.classList.toggle('active', i === activeIndex);
        if (i === activeIndex && scroll) el.scrollIntoView({ block: 'nearest' });
      });
    }

    function choose(id) {
      select.value = id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      close(true);
    }

    // ── 열기 / 닫기 / 위치 ────────────────
    function position() {
      var r = btn.getBoundingClientRect();
      var width = Math.max(r.width, 340);
      var left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      layer.style.width = width + 'px';
      layer.style.left = left + 'px';
      var below = window.innerHeight - r.bottom - 12;
      var above = r.top - 12;
      if (below < 260 && above > below) {           // 아래 공간이 좁으면 위로 펼칩니다
        layer.style.top = '';
        layer.style.bottom = (window.innerHeight - r.top + 4) + 'px';
        layer.style.maxHeight = Math.min(380, above) + 'px';
      } else {
        layer.style.bottom = '';
        layer.style.top = (r.bottom + 4) + 'px';
        layer.style.maxHeight = Math.min(380, below) + 'px';
      }
    }

    function openLayer() {
      if (open) return;
      open = true;
      search.value = '';
      layer.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      render();
      position();
      search.focus();
      var sel = list.querySelector('.brand-picker-item.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function close(focusBtn) {
      if (!open) return;
      open = false;
      layer.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus();
    }

    btn.addEventListener('click', function () { open ? close(true) : openLayer(); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openLayer(); }
    });

    search.addEventListener('input', render);
    search.addEventListener('keydown', function (e) {
      var items = list.querySelectorAll('.brand-picker-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { activeIndex = Math.min(items.length - 1, activeIndex + 1); markActive(true); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { activeIndex = Math.max(0, activeIndex - 1); markActive(true); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[activeIndex]) choose(items[activeIndex].dataset.id); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') { close(false); }
    });

    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest('.brand-picker-item');
      if (!li) return;
      var items = Array.prototype.slice.call(list.querySelectorAll('.brand-picker-item'));
      var idx = items.indexOf(li);
      if (idx !== -1 && idx !== activeIndex) { activeIndex = idx; markActive(false); }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('.brand-picker-item');
      if (li) choose(li.dataset.id);
    });

    // 바깥을 누르면 닫기 (영문→한글 제안 상자를 누르는 건 바깥이 아님)
    document.addEventListener('mousedown', function (e) {
      if (!open) return;
      if (layer.contains(e.target) || wrap.contains(e.target) || e.target.closest('.su-suggest')) return;
      close(false);
    });
    window.addEventListener('resize', function () { if (open) position(); });
    window.addEventListener('scroll', function (e) {
      if (!open || layer.contains(e.target)) return;
      position();   // 화면이 스크롤되면 버튼을 따라다닙니다
    }, true);

    refreshLabel();
  }

  function autoInit() {
    Array.prototype.slice.call(document.querySelectorAll('select[data-brand-picker]')).forEach(init);
  }

  window.BrandPicker = { init: init, setDetails: setDetails };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();
})();
