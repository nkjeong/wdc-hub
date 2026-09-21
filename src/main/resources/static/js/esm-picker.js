// 상품 등록/수정 화면의 "G마켓 등록 정보" 선택 상자
//  - G마켓 카테고리: 1차 → 2차 → … 마지막 단계까지 이어지는 선택 상자 + 이름 검색
//    (G마켓 카테고리는 최대 5단계이고, 실제로 고를 수 있는 것은 마지막 단계뿐이에요)
//  - G마켓 원산지: 상품타입(농산물 등) + 원산지 이름 검색(국내 시/군/구, 해외 국가)
//
// 사용: products.js가 등록 폼('reg')과 수정 폼('edit')에 대해 아래 함수를 부릅니다.
//   EsmPicker.collect(prefix)  → 저장 요청에 넣을 { esmCategoryCode, gmarketCategoryCode, originProductType, originCode }
//   EsmPicker.set(prefix, p)   → 저장된 값으로 화면을 채움 (수정 창 열기, 상품 복사)
//   EsmPicker.reset(prefix)    → 비우기
//   EsmPicker.validate(prefix) → 잘못 선택된 게 있으면 안내 문구, 없으면 null

(function () {
  'use strict';

  var API = '/admin/esm';
  var ORIGIN_TYPES = ['농산물', '수산물', '가공식품', '해당없음', '상세설명표기'];

  var childCache = {};
  var detailCache = {};
  var origins = null;            // [{code,name,regionType,areaType}]
  var originByName = {};
  var originByCode = {};
  var originsPromise = null;
  var states = {};

  function block(prefix) { return document.getElementById(prefix + 'EsmBlock'); }
  function q(prefix, cls) { var b = block(prefix); return b ? b.querySelector('.' + cls) : null; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  async function getJSON(url) {
    var res = await fetch(url, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
    if (!res.ok) throw new Error('조회하지 못했어요. (' + res.status + ')');
    return res.json();
  }

  // ── 카테고리 조회 (캐시) ─────────────────
  async function loadChildren(parent) {
    var key = parent || '';
    if (!childCache[key]) {
      childCache[key] = await getJSON(API + '/category-children?parent=' + encodeURIComponent(key));
    }
    return childCache[key];
  }

  async function loadDetail(code) {
    if (!detailCache[code]) detailCache[code] = await getJSON(API + '/category/' + encodeURIComponent(code));
    return detailCache[code];
  }

  // ── 원산지 조회 (한 번만) ────────────────
  function loadOrigins() {
    if (!originsPromise) {
      originsPromise = getJSON(API + '/origins').then(function (list) {
        origins = list;
        var dl = document.getElementById('esmOriginList');
        if (dl) {
          dl.innerHTML = list.map(function (o) { return '<option value="' + esc(o.name).replace(/"/g, '&quot;') + '"></option>'; }).join('');
        }
        list.forEach(function (o) { originByName[o.name] = o; originByCode[o.code] = o; });
        return list;
      }).catch(function () { originsPromise = null; return []; });
    }
    return originsPromise;
  }

  // ── 카테고리 단계 선택 상자 ──────────────
  function buildSelect(prefix, level, items, selectedName) {
    var sel = document.createElement('select');
    sel.className = 'calc-input esm-level';
    sel.dataset.level = String(level);
    sel.setAttribute('aria-label', 'G마켓 ' + level + '차 카테고리');
    var html = '<option value="">' + level + '차 선택</option>';
    items.forEach(function (it) { html += '<option value="' + esc(it.name).replace(/"/g, '&quot;') + '">' + esc(it.name) + '</option>'; });
    sel.innerHTML = html;
    sel.value = selectedName || '';
    sel.addEventListener('change', function () { onLevelChange(prefix, level, sel.value); });
    return sel;
  }

  async function ensureRoot(prefix) {
    var box = q(prefix, 'esm-levels');
    if (!box) return;
    box.innerHTML = '';
    try {
      box.appendChild(buildSelect(prefix, 1, await loadChildren(''), ''));
    } catch (e) {
      box.innerHTML = '<span class="hint-text">G마켓 카테고리를 불러오지 못했어요. 새로고침해 주세요.</span>';
    }
  }

  function clearSelection(st) {
    st.path = [];
    st.esmCode = null;
    st.siteOptions = [];
    st.siteCode = '';
  }

  async function onLevelChange(prefix, level, name) {
    var st = states[prefix];
    var box = q(prefix, 'esm-levels');

    // 선택한 단계보다 깊은 상자와 선택값을 지웁니다
    Array.prototype.slice.call(box.querySelectorAll('.esm-level')).forEach(function (s) {
      if (Number(s.dataset.level) > level) s.parentNode.removeChild(s);
    });
    st.path = st.path.slice(0, level - 1);
    st.esmCode = null; st.siteOptions = []; st.siteCode = '';

    if (!name) { renderSite(prefix); renderSummary(prefix); return; }
    st.path.push(name);

    try {
      var parent = st.path.slice(0, -1).join('>');
      var item = (await loadChildren(parent)).find(function (i) { return i.name === name; });
      if (item && item.leaf) {
        await applyLeaf(prefix, item.esmCode, null);
      } else {
        box.appendChild(buildSelect(prefix, level + 1, await loadChildren(st.path.join('>')), ''));
        renderSite(prefix); renderSummary(prefix);
      }
    } catch (e) {
      renderSummary(prefix, '카테고리를 불러오지 못했어요.');
    }
  }

  // 마지막 단계에 도착했을 때: 대응하는 G마켓 카테고리 목록을 받아옵니다
  async function applyLeaf(prefix, esmCode, siteCode) {
    var st = states[prefix];
    var d = await loadDetail(esmCode);
    st.esmCode = d.esmCode;
    st.siteOptions = d.siteOptions || [];
    st.siteCode = siteCode || (st.siteOptions.length === 1 ? st.siteOptions[0].siteCode : '');
    renderSite(prefix);
    renderSummary(prefix);
  }

  // 저장된 코드/검색 결과로 단계 상자를 처음부터 다시 그립니다
  async function setSelection(prefix, esmCode, siteCode) {
    var st = states[prefix];
    var box = q(prefix, 'esm-levels');
    try {
      var d = await loadDetail(esmCode);
      var segs = d.namePath.split('>');
      box.innerHTML = '';
      for (var i = 0; i < segs.length; i++) {
        var items = await loadChildren(segs.slice(0, i).join('>'));
        box.appendChild(buildSelect(prefix, i + 1, items, segs[i]));
      }
      st.path = segs;
      await applyLeaf(prefix, d.esmCode, siteCode);
    } catch (e) {
      clearSelection(st);
      await ensureRoot(prefix);
      renderSite(prefix);
      renderSummary(prefix, '저장된 G마켓 카테고리를 찾지 못했어요. 다시 선택해 주세요.');
    }
  }

  function renderSummary(prefix, message) {
    var st = states[prefix];
    var el = q(prefix, 'esm-selected');
    var clear = q(prefix, 'esm-clear');
    if (!el) return;
    if (message) { el.className = 'esm-selected warn'; el.textContent = message; }
    else if (st.esmCode) {
      el.className = 'esm-selected ok';
      el.innerHTML = '선택됨: <b>' + esc(st.path.join(' > ')) + '</b> <span class="esm-code">' + esc(st.esmCode) + '</span>';
    } else if (st.path.length) {
      el.className = 'esm-selected warn';
      el.textContent = '끝 단계까지 선택해 주세요. (아래 단계를 계속 고르면 돼요)';
    } else {
      el.className = 'esm-selected'; el.textContent = '';
    }
    if (clear) clear.style.display = (st.path.length || st.esmCode) ? '' : 'none';
  }

  function renderSite(prefix) {
    var st = states[prefix];
    var wrap = q(prefix, 'esm-site-wrap');
    var sel = q(prefix, 'esm-site');
    var note = q(prefix, 'esm-site-note');
    if (!wrap) return;
    wrap.style.display = 'none'; note.textContent = '';
    if (!st.esmCode) return;

    if (st.siteOptions.length > 1) {
      // 한 ESM 카테고리에 G마켓 카테고리가 여러 개인 경우: 하나를 골라야 해요
      wrap.style.display = '';
      sel.innerHTML = '<option value="">G마켓 세부 카테고리 선택 (' + st.siteOptions.length + '개)</option>' +
        st.siteOptions.map(function (o) { return '<option value="' + esc(o.siteCode) + '">' + esc(o.siteName || o.siteCode) + '</option>'; }).join('');
      sel.value = st.siteCode || '';
    } else if (st.siteOptions.length === 1) {
      note.textContent = 'G마켓 카테고리: ' + (st.siteOptions[0].siteName || st.siteOptions[0].siteCode);
    } else {
      note.textContent = '이 카테고리는 G마켓에 대응하는 코드가 없어요. 다른 카테고리를 골라 주세요.';
    }
  }

  // ── 이름 검색 ────────────────────────────
  function wireSearch(prefix) {
    var input = q(prefix, 'esm-search-input');
    var results = q(prefix, 'esm-results');
    var timer = null;
    if (!input) return;

    input.addEventListener('input', function () {
      clearTimeout(timer);
      var kw = input.value.trim();
      if (kw.length < 2) { results.innerHTML = ''; results.style.display = 'none'; return; }
      timer = setTimeout(async function () {
        try {
          var list = await getJSON(API + '/category-search?keyword=' + encodeURIComponent(kw));
          if (input.value.trim() !== kw) return;
          if (!list.length) { results.innerHTML = '<div class="esm-result-empty">검색 결과가 없어요.</div>'; results.style.display = ''; return; }
          results.innerHTML = list.map(function (r) {
            return '<button type="button" class="esm-result" data-code="' + esc(r.esmCode) + '">' + esc(r.namePath.replace(/>/g, ' > ')) + '</button>';
          }).join('');
          results.style.display = '';
        } catch (e) {
          results.innerHTML = '<div class="esm-result-empty">검색하지 못했어요.</div>'; results.style.display = '';
        }
      }, 250);
    });

    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { results.innerHTML = ''; results.style.display = 'none'; } });   // Esc로도 닫을 수 있어요
    // 다른 곳을 누르면 후보 목록을 닫습니다 (목록을 누르는 순간에는 입력창이 포커스를 잃지 않게 막아 둡니다)
    input.addEventListener('blur', function () { setTimeout(function () { results.innerHTML = ''; results.style.display = 'none'; }, 200); });
    results.addEventListener('mousedown', function (e) { e.preventDefault(); });

    results.addEventListener('click', function (e) {
      var btn = e.target.closest('.esm-result');
      if (!btn) return;
      results.innerHTML = ''; results.style.display = 'none';
      input.value = '';
      var code = btn.dataset.code;
      enqueue(prefix, function () { return setSelection(prefix, code, null); });
    });
  }

  // ── 원산지 ───────────────────────────────
  function originInput(prefix) { return q(prefix, 'esm-origin-input'); }

  function wireOrigin(prefix) {
    var input = originInput(prefix);
    var typeSel = q(prefix, 'esm-origin-type');
    if (!input || !typeSel) return;
    typeSel.innerHTML = '<option value="">선택 안함</option>' + ORIGIN_TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');

    // 입력창 아래에 원산지 후보 목록을 띄웁니다. 띄어쓰기로 나눈 단어가 모두 들어 있는 것만 보여줘요. (예: "경기 수원")
    var wrap = document.createElement('div');
    wrap.className = 'esm-search esm-origin-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var results = document.createElement('div');
    results.className = 'esm-results';
    results.style.display = 'none';
    wrap.appendChild(results);

    function hideResults() { results.innerHTML = ''; results.style.display = 'none'; }

    async function showResults() {
      var v = input.value.trim();
      if (!v) { hideResults(); return; }
      await loadOrigins();
      var match = window.SearchUtils ? window.SearchUtils.matcher(v) : function (f) { return f[0].indexOf(v) !== -1; };
      var list = (origins || []).filter(function (o) { return match([o.name, o.regionType]); }).slice(0, 30);
      if (input.value.trim() !== v) return;
      if (!list.length) { results.innerHTML = '<div class="esm-result-empty">검색 결과가 없어요.</div>'; results.style.display = ''; return; }
      results.innerHTML = list.map(function (o) {
        return '<button type="button" class="esm-result" data-name="' + esc(o.name).replace(/"/g, '&quot;') + '">' +
          esc(o.name) + ' <span class="esm-code">' + esc(o.regionType) + ' · ' + esc(o.code) + '</span></button>';
      }).join('');
      results.style.display = '';
    }

    input.addEventListener('input', showResults);
    input.addEventListener('focus', function () { loadOrigins(); if (input.value.trim()) showResults(); });
    input.addEventListener('blur', function () { setTimeout(hideResults, 200); });
    results.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 목록을 누를 때 입력창이 포커스를 잃지 않게
    results.addEventListener('click', function (e) {
      var btn = e.target.closest('.esm-result');
      if (!btn) return;
      input.value = btn.dataset.name;
      hideResults();
      input.dispatchEvent(new Event('change'));
    });

    input.addEventListener('change', async function () {
      await loadOrigins();   // 목록이 아직 도착하기 전에 입력이 끝나도 정확히 확인하도록 기다립니다
      var v = input.value.trim();
      var hint = q(prefix, 'esm-origin-hint');
      if (!v) { hint.textContent = ''; return; }
      var o = originByName[v];
      hint.textContent = o ? (o.regionType + ' · 코드 ' + o.code) : '목록에 없는 원산지예요. 목록에서 골라 주세요.';
      hint.classList.remove('ok', 'err');   // className을 통째로 바꾸면 찾는 데 쓰는 esm-origin-hint 이름이 사라져서 classList로만 고칩니다
      hint.classList.add(o ? 'ok' : 'err');
    });

    // "원산지 / 제조국" 칸에 국가 이름만 적혀 있으면(예: 프랑스, 중국산) 비어 있는 G마켓 원산지에 대신 채워 줍니다
    var country = document.getElementById(prefix + 'CountryOfOrigin');
    if (country) {
      country.addEventListener('blur', async function () {
        if (input.value.trim()) return;
        await loadOrigins();
        var name = country.value.trim().replace(/산$/, '');
        if (name && originByName[name] && originByName[name].areaType === 'OVERSEAS') {
          input.value = name;
          input.dispatchEvent(new Event('change'));
        }
      });
    }
  }

  // ── 초기화 / 값 넣고 빼기 ────────────────
  function init(prefix) {
    if (!block(prefix) || states[prefix]) return;
    states[prefix] = { path: [], esmCode: null, siteOptions: [], siteCode: '', chain: Promise.resolve() };
    wireSearch(prefix);
    wireOrigin(prefix);

    q(prefix, 'esm-site').addEventListener('change', function (e) { states[prefix].siteCode = e.target.value; });
    q(prefix, 'esm-clear').addEventListener('click', function () { enqueue(prefix, function () { return resetCategoryNow(prefix); }); });

    ensureRoot(prefix);
    loadOrigins();          // 원산지 목록(523건)은 작아서 미리 받아 둡니다
    renderSummary(prefix);
    renderSite(prefix);
  }

  // 화면을 바꾸는 작업은 한 줄로 세워서 순서대로 실행합니다.
  // (예: 상품 복사 때 "비우기" 직후 "채우기"가 겹쳐서 서로 덮어쓰는 것을 막습니다)
  function enqueue(prefix, fn) {
    var st = states[prefix];
    st.chain = st.chain.then(fn, fn);
    return st.chain;
  }

  async function resetCategoryNow(prefix) {
    clearSelection(states[prefix]);
    var s = q(prefix, 'esm-search-input'); if (s) s.value = '';
    var r = q(prefix, 'esm-results'); if (r) { r.innerHTML = ''; r.style.display = 'none'; }
    await ensureRoot(prefix);
    renderSite(prefix); renderSummary(prefix);
  }

  function resetOrigin(prefix) {
    var t = q(prefix, 'esm-origin-type'); if (t) t.value = '';
    var i = originInput(prefix); if (i) i.value = '';
    var h = q(prefix, 'esm-origin-hint'); if (h) { h.textContent = ''; h.classList.remove('ok', 'err'); }
  }

  function reset(prefix) {
    if (!states[prefix]) return Promise.resolve();
    return enqueue(prefix, async function () {
      resetOrigin(prefix);
      await resetCategoryNow(prefix);
    });
  }

  function set(prefix, p) {
    if (!states[prefix]) return Promise.resolve();
    return enqueue(prefix, async function () {
      p = p || {};
      resetOrigin(prefix);

      if (p.esmCategoryCode) await setSelection(prefix, p.esmCategoryCode, p.gmarketCategoryCode || null);
      else await resetCategoryNow(prefix);

      if (p.originProductType) q(prefix, 'esm-origin-type').value = p.originProductType;
      if (p.originCode) {
        await loadOrigins();
        var o = originByCode[String(p.originCode)];
        if (o) { originInput(prefix).value = o.name; originInput(prefix).dispatchEvent(new Event('change')); }
      }
    });
  }

  function originCodeOf(prefix) {
    var v = originInput(prefix) ? originInput(prefix).value.trim() : '';
    return v && originByName[v] ? originByName[v].code : null;
  }

  function collect(prefix) {
    var st = states[prefix];
    if (!st) return {};
    var siteCode = st.siteOptions.length === 1 ? st.siteOptions[0].siteCode : (st.siteCode || null);
    var type = q(prefix, 'esm-origin-type').value || null;
    return {
      esmCategoryCode: st.esmCode || null,
      gmarketCategoryCode: st.esmCode ? siteCode : null,
      originProductType: type,
      originCode: originCodeOf(prefix),
    };
  }

  function validate(prefix) {
    var st = states[prefix];
    if (!st) return null;
    if (st.path.length && !st.esmCode) return 'G마켓 카테고리를 끝 단계까지 선택해 주세요. (선택하지 않으려면 "선택 해제"를 눌러 주세요)';
    if (st.esmCode && st.siteOptions.length > 1 && !st.siteCode) return 'G마켓 세부 카테고리를 선택해 주세요. 이 카테고리는 G마켓에 세부 카테고리가 여러 개 있어요.';
    if (st.esmCode && st.siteOptions.length === 0) return '선택한 카테고리는 G마켓에 대응하는 코드가 없어요. 다른 카테고리를 골라 주세요.';

    var typed = originInput(prefix) ? originInput(prefix).value.trim() : '';
    if (typed && !originByName[typed]) return 'G마켓 원산지는 목록에서 골라 주세요. (입력 중에 나오는 목록을 눌러 선택)';
    if (typed && !q(prefix, 'esm-origin-type').value) return 'G마켓 원산지를 선택했다면 원산지 상품타입도 함께 선택해 주세요.';
    return null;
  }

  window.EsmPicker = { init: init, collect: collect, set: set, reset: reset, validate: validate };

  document.addEventListener('DOMContentLoaded', function () { init('reg'); init('edit'); });
  if (document.readyState !== 'loading') { init('reg'); init('edit'); }
})();
