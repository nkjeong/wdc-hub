// 공용 검색 도구 (topbar를 쓰는 모든 화면에 자동으로 포함됩니다)
//
// 1) AND 검색: 검색어를 띄어쓰기 기준으로 나눠서 "모든 단어가 들어 있는" 항목만 찾습니다.
//    예) "삼성 냉장고" → 이름/브랜드/바코드 등에 '삼성'도 있고 '냉장고'도 있는 상품
//    (단어가 서로 다른 칸에 나뉘어 있어도 찾아요. 대소문자는 구분하지 않아요.)
//      SearchUtils.matches(query, [필드1, 필드2, ...])   → true/false
//      SearchUtils.matcher(query)                       → 같은 검색어로 여러 항목을 검사할 때 (더 빠름)
//
// 2) 한영 오타 변환 제안: 한글 키보드 상태에서 영문으로 잘못 입력했을 때 한글로 바꿔서 제안합니다.
//    예) "xjaqmfj" → "텀블러". 제안을 누르면 검색어가 바뀌고, 검색이 바로 다시 실행돼요.
//      SearchUtils.engToKor("dkssud")                   → "안녕"
//      SearchUtils.attach(inputElement)                 → 입력창 아래에 제안 표시
//    아래 입력창에는 자동으로 붙습니다: #prSearch, #cardAd1SearchInput, .esm-search-input, .esm-origin-input,
//    그리고 data-hangul-suggest 속성이 있는 입력창. (상단바 검색창은 topbar-search.js가 따로 처리합니다)

(function (root) {
  'use strict';

  // ── 1) AND 검색 ───────────────────────────
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFC').toLowerCase();
  }

  function splitTerms(query) {
    var seen = {};
    return norm(query).split(/\s+/).filter(function (t) {
      if (!t || seen[t]) return false;
      seen[t] = true;
      return true;
    });
  }

  // 같은 검색어로 목록 전체를 검사할 때 쓰는 함수 (검색어 분리를 한 번만 합니다)
  function matcher(query) {
    var terms = splitTerms(query);
    if (!terms.length) return function () { return true; };
    return function (fields) {
      var hay = norm(Array.isArray(fields)
        ? fields.filter(function (f) { return f != null && f !== ''; }).join('\u0001')
        : fields);
      for (var i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) === -1) return false;
      }
      return true;
    };
  }

  function matches(query, fields) {
    return matcher(query)(fields);
  }

  // ── 2) 영문 → 한글 (두벌식 자판 기준) ─────
  var KEYMAP = {
    q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ',
    a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
    z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
    Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ',
  };
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var V2 = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  var F2 = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  var F2_SPLIT = {};
  Object.keys(F2).forEach(function (k) { F2_SPLIT[F2[k]] = [k.charAt(0), k.charAt(1)]; });

  function isVowel(j) { return JUNG.indexOf(j) !== -1; }

  function syllable(cho, jung, jong) {
    return String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28 + jong);
  }

  function engToKor(text) {
    var out = '';
    var cho = -1, jung = -1, jong = 0;   // 지금 만드는 글자 (초성, 중성, 종성 번호)

    function flush() {
      if (cho >= 0 && jung >= 0) out += syllable(cho, jung, jong);
      else if (cho >= 0) out += CHO.charAt(cho);
      else if (jung >= 0) out += JUNG.charAt(jung);
      cho = -1; jung = -1; jong = 0;
    }

    var s = String(text == null ? '' : text);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var j = KEYMAP[ch] || KEYMAP[ch.toLowerCase()];
      if (!j) { flush(); out += ch; continue; }   // 자판 글자가 아니면(숫자, 공백 등) 그대로 두고 글자 만들기를 끊습니다

      if (isVowel(j)) {
        if (cho < 0 && jung < 0) {                  // 모음만 있는 경우
          out += j;
        } else if (jung < 0) {                      // 초성 뒤의 모음
          jung = JUNG.indexOf(j);
        } else if (jong === 0) {                    // 이중모음 (ㅗ+ㅏ=ㅘ 등)
          var vv = V2[JUNG.charAt(jung) + j];
          if (vv) jung = JUNG.indexOf(vv);
          else { flush(); out += j; }
        } else {                                    // 받침 뒤에 모음이 오면 받침이 다음 글자의 초성이 됩니다
          var jc = JONG[jong];
          var keep = 0, move;
          if (F2_SPLIT[jc]) { keep = JONG.indexOf(F2_SPLIT[jc][0]); move = F2_SPLIT[jc][1]; }
          else move = jc;
          jong = keep;
          flush();
          cho = CHO.indexOf(move);
          jung = JUNG.indexOf(j);
        }
      } else {                                      // 자음
        if (cho < 0) {
          cho = CHO.indexOf(j);
          if (cho < 0) { out += j; }                // 초성이 될 수 없는 자음
        } else if (jung < 0) {                      // 자음이 연달아 오면 앞의 것은 단독으로 내보냅니다
          flush();
          cho = CHO.indexOf(j);
        } else if (jong === 0) {
          var jIdx = JONG.indexOf(j);
          if (jIdx > 0) jong = jIdx;                // 받침으로 쓸 수 있는 자음
          else { flush(); cho = CHO.indexOf(j); }
        } else {
          var combo = F2[JONG[jong] + j];           // 겹받침 (ㄹ+ㄱ=ㄺ 등)
          if (combo) jong = JONG.indexOf(combo);
          else { flush(); cho = CHO.indexOf(j); }
        }
      }
    }
    flush();
    return out;
  }

  // 검색어 안의 영문 덩어리(2글자 이상)를 한글로 바꾼 결과. 바꿀 게 없거나, 한글로 읽히지 않으면 null
  // 긴 영문 덩어리(5글자 이상)가 한글로 읽히지 않으면(예: samsung galaxy) 진짜 영어일 가능성이 커서 제안하지 않습니다.
  function suggestionFor(value) {
    var v = String(value == null ? '' : value);
    if (!/[A-Za-z]{2}/.test(v)) return null;
    var allOk = true;
    var result = v.replace(/[A-Za-z]{2,}/g, function (run) {
      var k = engToKor(run);
      var syl = (k.match(/[가-힣]/g) || []).length;
      if (syl >= 2 && syl / k.length >= 0.5) return k;   // 완성된 글자가 2개 이상이고 절반 이상이어야 한글로 봅니다
      if (run.length >= 5) allOk = false;   // 긴 영문이 한글로 안 읽히면 진짜 영어(예: samsung)라서 제안하지 않아요. 짧은 것(LG, TV, USB)은 그대로 둡니다
      return run;
    });
    return allOk && result !== v ? result : null;
  }

  // ── 제안 표시 ─────────────────────────────
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('suStyle')) return;
    var st = document.createElement('style');
    st.id = 'suStyle';
    st.textContent = [
      '.su-suggest{ position:fixed; z-index:3000; display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px;',
      '  background:var(--surface,#14171D); border:1px solid var(--gold,#D4A62A); box-shadow:0 8px 22px rgba(0,0,0,.35);',
      '  font-size:12.5px; color:var(--text-dim,#9198A6); font-family:inherit; max-width:min(92vw,420px); }',
      '.su-apply{ padding:3px 10px; border-radius:6px; border:1px solid var(--gold,#D4A62A); background:rgba(212,166,42,.12);',
      '  color:var(--gold,#D4A62A); font-weight:700; font-size:12.5px; cursor:pointer; font-family:inherit; word-break:break-all; text-align:left; }',
      '.su-apply:hover, .su-apply:focus-visible{ background:var(--gold,#D4A62A); color:#1A1400; outline:none; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function attach(input) {
    if (typeof document === 'undefined' || !input || input.__suAttached) return;
    input.__suAttached = true;
    injectStyle();

    var box = document.createElement('div');
    box.className = 'su-suggest';
    box.style.display = 'none';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);

    var current = null;

    function position() {
      var r = input.getBoundingClientRect();
      box.style.left = Math.max(8, r.left) + 'px';
      box.style.top = (r.bottom + 4) + 'px';
    }
    function hide() { box.style.display = 'none'; current = null; }
    function show() { position(); box.style.display = 'flex'; }

    function update() {
      var sug = suggestionFor(input.value);
      if (!sug) { hide(); return; }
      current = sug;
      box.innerHTML = '<span>혹시 이렇게 찾으세요?</span><button type="button" class="su-apply">' + escapeHtml(sug) + '</button>';
      show();
    }

    function apply() {
      if (!current) return;
      input.value = current;
      hide();
      // 이 입력창을 듣고 있는 검색 기능이 바로 다시 실행되도록 입력 이벤트를 보냅니다
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('keyup', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }

    // 버튼을 누를 때 입력창이 포커스를 잃어 제안이 사라지지 않도록 합니다
    box.addEventListener('mousedown', function (e) { e.preventDefault(); });
    box.addEventListener('click', function (e) { if (e.target.closest('.su-apply')) apply(); });

    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('blur', function () { setTimeout(hide, 150); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
      else if (e.key === 'Tab' && current && box.style.display !== 'none' && e.altKey) { e.preventDefault(); apply(); }
    });
    window.addEventListener('scroll', function () { if (current) position(); }, true);
    window.addEventListener('resize', function () { if (current) position(); });
  }

  function autoAttach() {
    if (typeof document === 'undefined') return;
    var selectors = ['#prSearch', '#cardAd1SearchInput', '.esm-search-input', '.esm-origin-input', 'input[data-hangul-suggest]'];
    selectors.forEach(function (sel) {
      Array.prototype.slice.call(document.querySelectorAll(sel)).forEach(attach);
    });
  }

  root.SearchUtils = {
    terms: splitTerms,
    matches: matches,
    matcher: matcher,
    engToKor: engToKor,
    suggestionFor: suggestionFor,
    attach: attach,
    autoAttach: autoAttach,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoAttach);
    else autoAttach();
  }
})(typeof window !== 'undefined' ? window : globalThis);
