// 대시보드 "주요 브랜드" 영역 — 관리자가 브랜드관리에서 고른 브랜드를 로고+이름으로 보여줍니다.
// 누르면 그 브랜드의 상품 목록(/products/by-brand)으로 이동합니다.
(function () {
  'use strict';

  var grid = document.getElementById('featuredBrandGrid');
  if (!grid) return; // 이 화면에 영역이 없으면 조용히 넘어갑니다.

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  function initial(name) {
    return (name || '').trim().charAt(0) || '?';
  }

  fetch('/featured-brands', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
    .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
    .then(function (list) {
      var panel = grid.closest('.panel');
      if (!list || !list.length) { if (panel) panel.style.display = 'none'; return; } // 고른 브랜드가 없으면 영역 자체를 숨김
      grid.innerHTML = list.map(function (b) {
        var logo = b.logoImageUrl
          ? '<img src="' + esc(b.logoImageUrl) + '" alt="">'
          : '<span class="featured-brand-fallback">' + esc(initial(b.brandNameKr)) + '</span>';
        return '<a class="featured-brand-item" href="/products/by-brand?brandId=' + encodeURIComponent(b.brandId) + '">' +
                 '<span class="featured-brand-logo">' + logo + '</span>' +
                 '<span class="featured-brand-name">' + esc(b.brandNameKr) + '</span>' +
               '</a>';
      }).join('');
    })
    .catch(function () {
      var panel = grid.closest('.panel');
      if (panel) panel.style.display = 'none'; // 못 불러오면 조용히 숨김 (대시보드의 다른 부분에는 영향 없음)
    });
})();
