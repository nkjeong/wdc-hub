// 카테고리 전체보기 메가메뉴 — topbar의 "카테고리 전체보기" 버튼을 누르면 열립니다.
// 1차+2차는 한 번에 보여주고, 3차는 2차 항목에 마우스를 올렸을 때 오른쪽 살짝 아래에서 fade-in 됩니다
// (3차 fade-in 애니메이션은 category-menu.js가 아니라 dashboard.css의 .cat-mega-flyout에 CSS :hover로 구현되어 있습니다)

(function () {
  const wrap = document.querySelector('.category-menu-wrap');
  if (!wrap) return; // 이 페이지에는 카테고리 전체보기 버튼이 없음 (showCategoryBtn=false)

  const btn = document.getElementById('categoryAllBtn');
  const panel = document.getElementById('categoryMegaPanel');
  const apiUrl = wrap.dataset.menuApi;

  let loaded = false;
  let loading = false;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function renderMenu(category1List) {
    if (!category1List || category1List.length === 0) {
      panel.innerHTML = '<div class="cat-mega-empty">등록된 카테고리가 없어요.</div>';
      return;
    }

    panel.innerHTML = category1List.map((c1) => `
      <div class="cat-mega-col">
        <div class="cat-mega-col-title">${escapeHtml(c1.categoryName)}</div>
        <ul class="cat-mega-list">
          ${renderCategory2Items(c1.children)}
        </ul>
      </div>
    `).join('');
  }

  function renderCategory2Items(category2List) {
    if (!category2List || category2List.length === 0) {
      return '<li class="cat-mega-item cat-mega-item-empty">하위 카테고리 없음</li>';
    }
    return category2List.map((c2) => `
      <li class="cat-mega-item">
        <span>${escapeHtml(c2.categoryName)}</span>
        ${renderFlyout(c2.children)}
      </li>
    `).join('');
  }

  function renderFlyout(category3List) {
    if (!category3List || category3List.length === 0) return '';
    return `
      <div class="cat-mega-flyout">
        <ul class="cat-mega-flyout-list">
          ${category3List.map((c3) => `<li>${escapeHtml(c3.categoryName)}</li>`).join('')}
        </ul>
      </div>`;
  }

  async function loadMenu() {
    if (loaded || loading) return;
    loading = true;
    panel.innerHTML = '<div class="cat-mega-loading">불러오는 중...</div>';
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('카테고리를 불러오지 못했어요.');
      const data = await res.json();
      renderMenu(data);
      loaded = true;
    } catch (err) {
      panel.innerHTML = `<div class="cat-mega-empty">${escapeHtml(err.message)}</div>`;
    } finally {
      loading = false;
    }
  }

  function openMenu() {
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    loadMenu();
  }

  function closeMenu() {
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (wrap.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (wrap.classList.contains('open') && !wrap.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) {
      closeMenu();
    }
  });
})();
