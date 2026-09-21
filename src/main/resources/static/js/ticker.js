// 상단 티커 — 최근 공지사항 제목 5개가 오른쪽에서 왼쪽으로 흘러갑니다.
// dashboard.html, admin/members.html 등 티커(#tickerTrack)가 있는 모든 화면에서 공용으로 씁니다.
//
// 끊김 없이 이어지는 방법:
//  1) 공지 5개를 한 묶음으로 만들고, 묶음 폭이 화면보다 짧으면 화면을 채울 만큼 반복합니다. (끝에 빈 자리가 보이지 않게)
//  2) 그 묶음을 똑같이 2개 이어 붙이고, "묶음 하나의 폭"만큼만 이동한 뒤 처음으로 돌아갑니다.
//  3) 글꼴이 늦게 불러와져서 글자 폭이 바뀌면 이동 거리를 다시 잽니다.
(function () {
  'use strict';

  const track = document.getElementById('tickerTrack');
  if (!track) return; // 이 화면에 티커가 없으면 조용히 넘어갑니다.
  const ticker = track.parentElement;

  const API = '/notices/ticker';
  const SPEED = 55;               // 초당 이동 거리(px). 클수록 빨라요.
  const REFRESH_MS = 5 * 60 * 1000; // 5분마다 새 공지가 있는지 확인

  let signature = '';
  let observer = null;
  let resizeTimer = null;
  let current = [];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML.replace(/"/g, '&quot;');
  }

  // copyIndex가 0인 첫 번째 것만 키보드로 이동 가능하게 하고, 복사본은 건너뜁니다.
  function itemHtml(n, focusable) {
    const href = '/notices#notice-' + n.id;
    return '<a class="tick" href="' + href + '"' + (focusable ? '' : ' tabindex="-1"') + ' title="' + esc(n.title) + '">' +
             (n.tagLabel ? '<span class="tick-tag" data-label="' + esc(n.tagLabel) + '">' + esc(n.tagLabel) + '</span>' : '') +
             '<b>' + esc(n.title) + '</b>' +
           '</a>';
  }

  function groupHtml(items, repeat, primary) {
    let html = '';
    for (let r = 0; r < repeat; r++) {
      html += items.map(function (n) { return itemHtml(n, primary && r === 0); }).join('');
    }
    return '<div class="tick-group"' + (primary ? '' : ' aria-hidden="true"') + '>' + html + '</div>';
  }

  function showMessage(text) {
    if (observer) { observer.disconnect(); observer = null; }
    track.style.animation = 'none';
    track.style.removeProperty('--ticker-shift');
    track.style.removeProperty('--ticker-duration');
    track.innerHTML = '<div class="tick-group"><div class="tick"><b>' + esc(text) + '</b></div></div>';
  }

  function updateShift() {
    const first = track.firstElementChild;
    if (!first) return;
    const w = first.getBoundingClientRect().width;
    if (!w) return;
    track.style.setProperty('--ticker-shift', '-' + w.toFixed(3) + 'px');
    track.style.setProperty('--ticker-duration', (w / SPEED).toFixed(2) + 's');
  }

  function render(items) {
    if (!items.length) { showMessage('등록된 공지사항이 없습니다.'); return; }

    if (observer) { observer.disconnect(); observer = null; }
    track.style.animation = 'none';

    // 1) 한 묶음의 폭을 재고, 화면을 채울 때까지 반복 횟수를 늘립니다.
    track.innerHTML = groupHtml(items, 1, true);
    const oneWidth = track.firstElementChild.getBoundingClientRect().width || 1;
    const need = ticker.clientWidth + 120;
    let repeat = 1;
    while (oneWidth * repeat < need && repeat < 20) repeat++;

    // 2) 똑같은 묶음 2개를 이어 붙입니다.
    track.innerHTML = groupHtml(items, repeat, true) + groupHtml(items, repeat, false);
    updateShift();

    // 3) 글자 폭이 바뀌면(글꼴 로딩 등) 이동 거리를 다시 맞춥니다.
    if (window.ResizeObserver) {
      observer = new ResizeObserver(updateShift);
      observer.observe(track.firstElementChild);
    }

    track.style.animation = ''; // CSS의 animation을 다시 적용해서 처음부터 시작
  }

  async function load(force) {
    try {
      const res = await fetch(API, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || res.redirected || type.indexOf('json') === -1) throw new Error('bad-response');
      const items = await res.json();
      const sig = JSON.stringify(items.map(function (n) { return [n.id, n.title, n.tagLabel]; }));
      if (force || sig !== signature) {
        signature = sig;
        current = items;
        render(items);
      }
    } catch (e) {
      if (!signature) showMessage('공지사항을 불러오지 못했습니다.');
    }
  }

  // 창 크기가 바뀌면 화면을 채우는 데 필요한 반복 횟수가 달라질 수 있어서 다시 그립니다.
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (current.length) render(current); }, 250);
  });

  // 글꼴이 다 불러와진 뒤에 한 번 더 폭을 맞춥니다.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (current.length) render(current); });
  }

  load(true);
  setInterval(function () { if (!document.hidden) load(false); }, REFRESH_MS);
})();
