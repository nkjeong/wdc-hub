// 검색창 한영 오타 변환 제안 — 한글 IME를 안 켜고 영문 자판 그대로 입력했을 때
// (예: "durqn" 처럼) 2벌식 자판 기준으로 한글을 추정해서 "혹시 이거 찾으세요?" 제안을 보여줍니다.
// topbar 프래그먼트에 포함되어 모든 페이지의 상단 검색창에서 동작합니다.

(function () {
  const input = document.getElementById('topbarSearchInput');
  if (!input) return; // 이 페이지에는 검색창이 없음

  const suggestEl = document.getElementById('searchSuggest');
  if (!suggestEl) return;

  // ── 2벌식 자판 매핑 ──────────────────────────

  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  const KEYMAP = {
    q:'ㅂ', w:'ㅈ', e:'ㄷ', r:'ㄱ', t:'ㅅ', y:'ㅛ', u:'ㅕ', i:'ㅑ', o:'ㅐ', p:'ㅔ',
    a:'ㅁ', s:'ㄴ', d:'ㅇ', f:'ㄹ', g:'ㅎ', h:'ㅗ', j:'ㅓ', k:'ㅏ', l:'ㅣ',
    z:'ㅋ', x:'ㅌ', c:'ㅊ', v:'ㅍ', b:'ㅠ', n:'ㅜ', m:'ㅡ',
    Q:'ㅃ', W:'ㅉ', E:'ㄸ', R:'ㄲ', T:'ㅆ', O:'ㅒ', P:'ㅖ',
  };

  const DOUBLE_JUNG = { 'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ' };
  const DOUBLE_JONG = { 'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ' };

  /** 영문 자판 입력을 2벌식 기준 한글로 추정 변환합니다. 완벽한 IME 재현은 아니고, 검색 제안용 최선 추정치입니다. */
  function engToKor(text) {
    let result = '';
    let cho = null, jung = null, jong = null;

    function flush() {
      if (cho === null && jung === null) {
        if (jong !== null) { result += JONG[jong] || ''; jong = null; }
        return;
      }
      if (cho !== null && jung !== null) {
        result += String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28 + (jong || 0));
      } else if (cho !== null) {
        result += CHO[cho];
      } else if (jung !== null) {
        result += JUNG[jung];
      }
      cho = null; jung = null; jong = null;
    }

    for (const ch of text) {
      const jamo = KEYMAP[ch];
      if (!jamo) { flush(); result += ch; continue; }

      const choIdx = CHO.indexOf(jamo);
      const jungIdx = JUNG.indexOf(jamo);

      if (choIdx !== -1 && jungIdx === -1) {
        // 자음
        if (cho === null) {
          cho = choIdx;
        } else if (jung === null) {
          flush();
          cho = choIdx;
        } else if (jong === null) {
          const jongIdx = JONG.indexOf(jamo);
          if (jongIdx > 0) {
            jong = jongIdx;
          } else {
            // ㄸ/ㅃ/ㅉ처럼 받침으로 쓸 수 없는 자음이면 새 글자를 시작합니다
            flush();
            cho = choIdx;
          }
        } else {
          const combined = DOUBLE_JONG[JONG[jong] + jamo];
          if (combined) {
            jong = JONG.indexOf(combined);
          } else {
            flush();
            cho = choIdx;
          }
        }
      } else if (jungIdx !== -1) {
        // 모음
        if (cho === null && jung === null) {
          jung = jungIdx;
        } else if (jung === null) {
          jung = jungIdx;
        } else if (jong === null) {
          const combined = DOUBLE_JUNG[JUNG[jung] + jamo];
          if (combined) {
            jung = JUNG.indexOf(combined);
          } else {
            flush();
            jung = jungIdx;
          }
        } else {
          // 종성이 있는데 모음이 또 오면, 종성을 다음 글자의 초성으로 넘깁니다
          const movedJongJamo = JONG[jong];
          jong = null;
          flush();
          cho = CHO.indexOf(movedJongJamo);
          jung = jungIdx;
        }
      }
    }
    flush();
    return result;
  }

  function looksLikeMistypedKorean(text) {
    // 영문자로만 이루어져 있고(숫자/공백/특수문자 없이) 2자 이상일 때만 제안합니다
    return /^[a-zA-Z]+$/.test(text) && text.length >= 2;
  }

  const searchWrap = input.closest('.search');
  const searchNavUrl = searchWrap ? searchWrap.dataset.searchNav : null;

  if (searchNavUrl) {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      const url = q ? `${searchNavUrl}?q=${encodeURIComponent(q)}` : searchNavUrl;
      window.location.href = url;
    });
  }

  input.addEventListener('input', () => {
    const value = input.value.trim();

    if (!looksLikeMistypedKorean(value)) {
      suggestEl.style.display = 'none';
      return;
    }

    const converted = engToKor(value);
    if (converted && converted !== value && /[가-힣]/.test(converted)) {
      suggestEl.innerHTML = `혹시 <button type="button" class="search-suggest-btn">${converted}</button>(으)로 검색하려던 거 아닌가요?`;
      suggestEl.style.display = 'block';
    } else {
      suggestEl.style.display = 'none';
    }
  });

  suggestEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.search-suggest-btn');
    if (!btn) return;
    input.value = btn.textContent;
    suggestEl.style.display = 'none';
    if (searchNavUrl) {
      window.location.href = `${searchNavUrl}?q=${encodeURIComponent(btn.textContent)}`;
      return;
    }
    input.dispatchEvent(new Event('input', { bubbles: true })); // 페이지별 검색 로직도 같이 갱신되도록
    input.focus();
  });

  input.addEventListener('blur', () => {
    // 제안 버튼 클릭이 먼저 처리되도록 살짝 지연 후 닫습니다
    setTimeout(() => { suggestEl.style.display = 'none'; }, 150);
  });
})();
