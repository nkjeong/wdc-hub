// 카테고리별 상품 페이지 — 브랜드별 상품 페이지와 상품 목록/추천 로직은 동일하고,
// 선택 영역만 브랜드 칩 대신 1~3차 커스텀 드롭다운(select 태그 아님, div/section 기반)입니다.

const PRODUCTS_API = document.body.dataset.productsApi;

// 회원 등급별로 판매가1~3 중 하나만 보여줍니다 (관리자 페이지는 3개 다 보여주므로 대상 아님)
// NORMAL -> 판매가1, GOLD -> 판매가2, VIP -> 판매가3
const MEMBER_GRADE = document.body.dataset.memberGrade || 'NORMAL';
function gradeSellerPrice(p) {
  if (MEMBER_GRADE === 'GOLD') return p.sellerPrice2;
  if (MEMBER_GRADE === 'VIP') return p.sellerPrice3;
  return p.sellerPrice1;
}
const CATEGORY_MENU_API = document.body.dataset.categoryMenuApi;
const PAGE_SIZE = 15;

let allProducts = [];
let categoryTree = [];
let selectedCategory1 = null; // { id, name }
let selectedCategory2 = null;
let selectedCategory3 = null;
let currentPage = 1;

const tbody = document.getElementById('tbody');
const resultCountEl = document.getElementById('resultCount');
const paginationEl = document.getElementById('pagination');
const productListTitleEl = document.getElementById('productListTitle');
const featuredGridEl = document.getElementById('featuredGrid');
const featuredCountEl = document.getElementById('featuredCount');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const won = (n) => (n == null ? '-' : '₩' + Number(n).toLocaleString('ko-KR'));

/** 서버 ProductResponse를 목록 행이 쓰기 편한 모양으로 변환 (다른 상품 목록 페이지들과 동일) */
function mapProduct(p) {
  const sellerPrice = gradeSellerPrice(p);
  let margin = null;
  if (p.consumerPrice && sellerPrice != null && Number(p.consumerPrice) > 0) {
    margin = ((Number(p.consumerPrice) - Number(sellerPrice)) / Number(p.consumerPrice)) * 100;
  }

  const categoryPath = [p.category1Name, p.category2Name, p.category3Name].filter(Boolean).join(' > ');
  const unitInfo = [p.unit, p.unitQuantity != null ? `${p.unitQuantity}개` : null, p.packQuantity != null ? `입수 ${p.packQuantity}` : null]
    .filter(Boolean).join(' · ');

  return {
    raw: p,
    name: p.productName,
    barcode: p.barcode,
    productNumber: p.productNumber,
    categoryPath,
    brandName: p.brandName,
    countryOfOrigin: p.countryOfOrigin,
    unitInfo,
    consumerPrice: p.consumerPrice,
    recommendedPrice: p.recommendedPrice,
    sellerPrice,
    margin,
    date: p.createdAt ? p.createdAt.slice(0, 10).replace(/-/g, '.') : '-',
    thumb: p.mainImageThumbUrl,
  };
}

function statusPills(p) {
  const pills = [];
  if (p.newRegisteredYn) pills.push('<span class="status-pill newin">신규등록</span>');
  if (p.newProductYn) pills.push('<span class="status-pill newin">신상품</span>');
  if (p.stockOutYn) pills.push('<span class="status-pill soldout">품절</span>');
  if (p.discontinuedYn) pills.push('<span class="status-pill discontinued">단종</span>');
  if (p.bundleYn) pills.push('<span class="status-pill etc">번들상품</span>');
  if (p.importedYn) pills.push('<span class="status-pill etc">수입상품</span>');
  if (pills.length === 0) pills.push('<span class="status-pill ok">판매중</span>');
  return pills.join('');
}

function optionCell(p) {
  const hasOption = p.raw.hasOptionYn && p.raw.options && p.raw.options.length > 0;
  if (!hasOption) return '<span class="status-pill option-no">없음</span>';
  return `<button type="button" class="status-pill option-yes" data-product-id="${p.raw.id}">있음</button>`;
}

// ── 브랜드마다 랜덤 상품 1개씩, 최대 10개 추천 (브랜드별 상품 페이지와 동일 로직) ──────

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderFeaturedProducts() {
  // 브랜드가 아니라 "1차 카테고리" 기준으로 묶어서, 카테고리를 랜덤으로 뽑고 그 카테고리 안에서 상품을 랜덤으로 뽑습니다.
  const byCategory1 = new Map(); // category1Id -> { name, products: [] }
  allProducts.forEach((p) => {
    if (p.raw.category1Id == null) return;
    const id = p.raw.category1Id;
    if (!byCategory1.has(id)) byCategory1.set(id, { name: p.raw.category1Name, products: [] });
    byCategory1.get(id).products.push(p);
  });

  const pickedIds = shuffle(Array.from(byCategory1.keys())).slice(0, 10);
  const featured = pickedIds.map((id) => {
    const { products } = byCategory1.get(id);
    return products[Math.floor(Math.random() * products.length)];
  });

  featuredCountEl.textContent = featured.length + '개';

  if (featured.length === 0) {
    featuredGridEl.innerHTML = '<div class="brand-chip-empty">추천할 상품이 아직 없어요.</div>';
    return;
  }

  featuredGridEl.innerHTML = featured.map((p) => {
    // 공급가: 로그인한 회원 등급에 맞는 판매가 (mapProduct에서 이미 계산됨)
    const supplyPrice = p.sellerPrice;
    return `
      <button type="button" class="featured-card"
        data-category1-id="${p.raw.category1Id ?? ''}" data-category1-name="${escapeHtml(p.raw.category1Name || '')}">
        <div class="featured-image${p.thumb ? '' : ' featured-image-empty'}">
          ${p.thumb ? `<img src="/${escapeHtml(p.thumb)}" alt="">` : ''}
        </div>
        <div class="featured-name">${escapeHtml(p.name)}</div>
        <div class="featured-brand">${escapeHtml(p.raw.category1Name || '')}</div>
        <div class="featured-price-row">
          <span class="featured-price-consumer">${won(p.consumerPrice)}</span>
          <span class="featured-price-supply">${won(supplyPrice)}</span>
        </div>
      </button>
    `;
  }).join('');
}

featuredGridEl.addEventListener('click', (e) => {
  const card = e.target.closest('.featured-card');
  if (!card || !card.dataset.category1Id) return;
  selectCategory1({ id: Number(card.dataset.category1Id), categoryName: card.dataset.category1Name }, true);
  productListTitleEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ── 커스텀 드롭다운 (select 태그 아님, div/section 기반) ──────

function closeAllDropdowns() {
  document.querySelectorAll('.cat-dropdown.open').forEach((el) => el.classList.remove('open'));
}

function positionDropdownMenu(dropdownEl) {
  const trigger = dropdownEl.querySelector('.cat-dropdown-trigger');
  const menu = dropdownEl.querySelector('.cat-dropdown-menu');
  const rect = trigger.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.width = `${rect.width}px`;
}

function toggleDropdown(dropdownEl) {
  const isOpen = dropdownEl.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    positionDropdownMenu(dropdownEl);
    dropdownEl.classList.add('open');
  }
}

window.addEventListener('scroll', () => closeAllDropdowns(), true);
window.addEventListener('resize', () => closeAllDropdowns());

document.addEventListener('click', (e) => {
  if (!e.target.closest('.cat-dropdown')) closeAllDropdowns();
});

let categoryCounts = { c1: new Map(), c2: new Map(), c3: new Map() };

function buildCategoryCounts() {
  const c1 = new Map(), c2 = new Map(), c3 = new Map();
  allProducts.forEach((p) => {
    const r = p.raw;
    if (r.category1Id != null) c1.set(r.category1Id, (c1.get(r.category1Id) || 0) + 1);
    if (r.category2Id != null) c2.set(r.category2Id, (c2.get(r.category2Id) || 0) + 1);
    if (r.category3Id != null) c3.set(r.category3Id, (c3.get(r.category3Id) || 0) + 1);
  });
  categoryCounts = { c1, c2, c3 };
}

function renderDropdownMenu(menuEl, items, selectedId, onSelect, allLabel, countsMap, allCount) {
  const countsSafe = countsMap || new Map();
  const allItem = `<button type="button" class="cat-dropdown-item all-option${selectedId == null ? ' selected' : ''}" data-id="">${allLabel} <span class="cat-dropdown-count">[${allCount ?? 0}]</span></button>`;
  const itemsHtml = items.map((it) => `
    <button type="button" class="cat-dropdown-item${it.id === selectedId ? ' selected' : ''}" data-id="${it.id}">${escapeHtml(it.categoryName)} <span class="cat-dropdown-count">[${countsSafe.get(it.id) || 0}]</span></button>
  `).join('');
  menuEl.innerHTML = items.length ? allItem + itemsHtml : '<div class="cat-dropdown-empty">하위 카테고리가 없어요</div>';

  menuEl.querySelectorAll('.cat-dropdown-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id ? Number(btn.dataset.id) : null;
      const item = id != null ? items.find((it) => it.id === id) : null;
      onSelect(item);
      closeAllDropdowns();
    });
  });
}

function selectCategory1(item) {
  selectedCategory1 = item;
  selectedCategory2 = null;
  selectedCategory3 = null;

  document.getElementById('cat1Value').textContent = item ? item.categoryName : '전체';
  document.getElementById('cat2Value').textContent = item ? '전체' : '1차 먼저 선택';
  document.getElementById('cat3Value').textContent = '2차 먼저 선택';
  document.getElementById('cat2Trigger').disabled = !item;
  document.getElementById('cat3Trigger').disabled = true;
  document.getElementById('cat3Menu').innerHTML = '';

  const node = item ? categoryTree.find((c) => c.id === item.id) : null;
  renderDropdownMenu(document.getElementById('cat1Menu'), categoryTree, item ? item.id : null, (it) => selectCategory1(it), '전체', categoryCounts.c1, allProducts.length);
  renderDropdownMenu(document.getElementById('cat2Menu'), node ? node.children : [], null, (it) => selectCategory2(it), '전체', categoryCounts.c2, item ? (categoryCounts.c1.get(item.id) || 0) : 0);

  currentPage = 1;
  renderProductList();
}

function selectCategory2(item) {
  selectedCategory2 = item;
  selectedCategory3 = null;

  document.getElementById('cat2Value').textContent = item ? item.categoryName : '전체';
  document.getElementById('cat3Value').textContent = item ? '전체' : '2차 먼저 선택';
  document.getElementById('cat3Trigger').disabled = !item;

  const parentNode = categoryTree.find((c) => c.id === selectedCategory1.id);
  const node = item ? parentNode.children.find((c) => c.id === item.id) : null;
  renderDropdownMenu(document.getElementById('cat2Menu'), parentNode.children, item ? item.id : null, (it) => selectCategory2(it), '전체', categoryCounts.c2, categoryCounts.c1.get(selectedCategory1.id) || 0);
  renderDropdownMenu(document.getElementById('cat3Menu'), node ? node.children : [], null, (it) => selectCategory3(it), '전체', categoryCounts.c3, item ? (categoryCounts.c2.get(item.id) || 0) : 0);

  currentPage = 1;
  renderProductList();
}

function selectCategory3(item) {
  selectedCategory3 = item;
  document.getElementById('cat3Value').textContent = item ? item.categoryName : '전체';

  const parent1 = categoryTree.find((c) => c.id === selectedCategory1.id);
  const parent2 = parent1.children.find((c) => c.id === selectedCategory2.id);
  renderDropdownMenu(document.getElementById('cat3Menu'), parent2.children, item ? item.id : null, (it) => selectCategory3(it), '전체', categoryCounts.c3, categoryCounts.c2.get(selectedCategory2.id) || 0);

  currentPage = 1;
  renderProductList();
}

document.getElementById('cat1Trigger').addEventListener('click', () => toggleDropdown(document.getElementById('cat1Dropdown')));
document.getElementById('cat2Trigger').addEventListener('click', () => toggleDropdown(document.getElementById('cat2Dropdown')));
document.getElementById('cat3Trigger').addEventListener('click', () => toggleDropdown(document.getElementById('cat3Dropdown')));

// ── 상품 목록 (선택된 카테고리 기준, 15개씩 페이징) ──────

function getFilteredProductsByCategory() {
  if (!selectedCategory1) return [];
  if (selectedCategory3) return allProducts.filter((p) => p.raw.category3Id === selectedCategory3.id);
  if (selectedCategory2) return allProducts.filter((p) => p.raw.category2Id === selectedCategory2.id);
  return allProducts.filter((p) => p.raw.category1Id === selectedCategory1.id);
}

function renderProductList() {
  const label = [selectedCategory1 && selectedCategory1.categoryName, selectedCategory2 && selectedCategory2.categoryName, selectedCategory3 && selectedCategory3.categoryName].filter(Boolean).join(' > ');
  productListTitleEl.childNodes[0].textContent = label ? `${label} 상품 목록` : '상품 목록';

  const pathLabelEl = document.getElementById('categoryPathLabel');
  if (label) {
    pathLabelEl.textContent = label;
    pathLabelEl.classList.add('active');
  } else {
    pathLabelEl.textContent = '선택 안 됨';
    pathLabelEl.classList.remove('active');
  }

  if (!selectedCategory1) {
    resultCountEl.textContent = '0건';
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">카테고리를 선택하면 상품 목록이 나타나요.</td></tr>';
    paginationEl.innerHTML = '';
    return;
  }

  const filtered = getFilteredProductsByCategory();

  resultCountEl.textContent = filtered.length + '건';

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  renderTable(pageItems);
  renderPagination(totalPages);
}

function renderTable(rows) {
  if (rows.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">이 카테고리의 상품이 없어요.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((p) => `
    <tr data-id="${p.raw.id}">
      <td>${p.thumb
        ? `<img class="list-thumb" src="/${escapeHtml(p.thumb)}" alt="">`
        : '<div class="list-thumb-empty"></div>'}
      </td>
      <td class="mono">${escapeHtml(p.barcode || '-')}</td>
      <td class="mono">${escapeHtml(p.productNumber || '-')}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.categoryPath ? escapeHtml(p.categoryPath) : '<span class="muted">-</span>'}</td>
      <td>${p.brandName ? escapeHtml(p.brandName) : '<span class="muted">-</span>'}</td>
      <td>${optionCell(p)}</td>
      <td>${p.countryOfOrigin ? escapeHtml(p.countryOfOrigin) : '<span class="muted">-</span>'}</td>
      <td class="muted">${p.unitInfo ? escapeHtml(p.unitInfo) : '-'}</td>
      <td class="mono">${won(p.consumerPrice)}</td>
      <td class="mono">${won(p.recommendedPrice)}</td>
      <td class="mono">${won(p.sellerPrice)}</td>
      <td class="mono">${p.margin != null ? p.margin.toFixed(1) + '%' : '-'}</td>
      <td>${statusPills(p.raw)}</td>
      <td class="muted">${p.date}</td>
    </tr>
  `).join('');
}

function renderPagination(totalPages) {
  paginationEl.innerHTML = '';
  if (totalPages <= 1) return;

  const addBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-btn' + (opts.active ? ' active' : '');
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener('click', () => { currentPage = page; renderProductList(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    paginationEl.appendChild(btn);
  };

  addBtn('‹', currentPage - 1, { disabled: currentPage === 1 });
  for (let p = 1; p <= totalPages; p++) {
    addBtn(String(p), p, { active: p === currentPage });
  }
  addBtn('›', currentPage + 1, { disabled: currentPage === totalPages });
}

// ── 옵션 상세 레이어 (클릭 시 아래에서 위로 fade-in) ──────

const optionFlyout = document.getElementById('optionFlyout');
let openOptionProductId = null;

function renderOptionFlyoutContent(product) {
  const rows = product.options.map((o) => `
    <li class="option-flyout-row">
      <span class="name-value"><span class="name">${escapeHtml(o.optionName)}</span>${escapeHtml(o.optionValue)}</span>
      <span class="stock">${o.stockQuantity != null ? `재고 ${o.stockQuantity}` : '재고 미지정'}</span>
    </li>
  `).join('');
  optionFlyout.innerHTML = `
    <div class="option-flyout-title">${escapeHtml(product.productName)} — 옵션 ${product.options.length}건</div>
    <ul class="option-flyout-list">${rows}</ul>
  `;
}

function openOptionFlyout(btn, product) {
  renderOptionFlyoutContent(product);
  optionFlyout.classList.add('open');
  openOptionProductId = product.id;

  const rect = btn.getBoundingClientRect();
  const flyoutWidth = 280;
  let left = rect.right + 10;
  if (left + flyoutWidth > window.innerWidth - 12) {
    left = rect.left - flyoutWidth - 10;
  }
  optionFlyout.style.left = `${Math.max(12, left)}px`;
  optionFlyout.style.top = `${rect.top}px`;
}

function closeOptionFlyout() {
  optionFlyout.classList.remove('open');
  openOptionProductId = null;
}

tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('.option-yes');
  if (!btn) return;
  const productId = Number(btn.dataset.productId);

  if (openOptionProductId === productId) {
    closeOptionFlyout();
    return;
  }
  const item = allProducts.find((p) => p.raw.id === productId);
  if (item) openOptionFlyout(btn, item.raw);
});

// ── 상품 상세 Offcanvas ──────────────────────────

function buildProductDetailHTML(raw) {
  const mainImg = raw.mainImageDetailUrl || raw.mainImageMediumUrl || raw.mainImageThumbUrl;
  const supplyPrice = gradeSellerPrice(raw);
  const categoryPath = [raw.category1Name, raw.category2Name, raw.category3Name].filter(Boolean).join(' > ');
  const unitInfo = [raw.unit, raw.unitQuantity != null ? `${raw.unitQuantity}개` : null, raw.packQuantity != null ? `입수 ${raw.packQuantity}` : null]
    .filter(Boolean).join(' · ');

  const statusBadges = [];
  if (raw.newRegisteredYn) statusBadges.push('<span class="status-pill newin">신규등록</span>');
  if (raw.newProductYn) statusBadges.push('<span class="status-pill newin">신상품</span>');
  if (raw.stockOutYn) statusBadges.push('<span class="status-pill soldout">품절</span>');
  if (raw.discontinuedYn) statusBadges.push('<span class="status-pill discontinued">단종</span>');
  if (raw.bundleYn) statusBadges.push('<span class="status-pill etc">번들상품</span>');
  if (raw.importedYn) statusBadges.push('<span class="status-pill etc">수입상품</span>');
  if (statusBadges.length === 0) statusBadges.push('<span class="status-pill ok">판매중</span>');

  const optionsHtml = (raw.hasOptionYn && raw.options && raw.options.length)
    ? `<ul class="pd-options-list">${raw.options.map((o) => `
        <li><span><span class="pd-opt-name">${escapeHtml(o.optionName)}</span>${escapeHtml(o.optionValue)}</span>
        <span class="pd-opt-stock">${o.stockQuantity != null ? '재고 ' + o.stockQuantity : ''}</span></li>
      `).join('')}</ul>`
    : '<div class="pd-options-empty">등록된 옵션이 없어요</div>';

  const detailSource = raw.detailImageViewUrls || raw.detailImageUrls; // 회원 화면엔 520px 표시용 우선, 없으면 원본
  const detailUrls = detailSource ? detailSource.split('\n').filter(Boolean) : [];
  const detailImagesHtml = detailUrls.length
    ? detailUrls.map((u) => `<img src="/${escapeHtml(u)}" alt="" loading="lazy">`).join('')
    : '<div class="pd-detail-images-empty">등록된 상세이미지가 없어요</div>';

  return `
    <div class="product-detail-top">
      <div class="pd-image">
        ${mainImg ? `<img src="/${escapeHtml(mainImg)}" alt="">` : '<div class="pd-image-empty">이미지 없음</div>'}
      </div>
      <div class="pd-info">
        <div class="pd-status-row">${statusBadges.join('')}</div>
        <h3 class="pd-name">${escapeHtml(raw.productName)}</h3>

        <div class="pd-price-rows">
          <div class="pd-price-row"><span class="pd-label">소비자가</span><span class="pd-value">${won(raw.consumerPrice)}</span></div>
          <div class="pd-price-row"><span class="pd-label">공급가</span><span class="pd-value gold">${won(supplyPrice)}</span></div>
          <div class="pd-price-row"><span class="pd-label">권장판매가</span><span class="pd-value">${won(raw.recommendedPrice)}</span></div>
        </div>

        <div class="pd-section-title">옵션</div>
        ${optionsHtml}

        <div class="pd-meta-rows">
          <div class="pd-meta-row"><span class="pd-label">제조사</span><span class="pd-value">${raw.manufacturerName ? escapeHtml(raw.manufacturerName) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">수입사</span><span class="pd-value">${raw.importerName ? escapeHtml(raw.importerName) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">원산지</span><span class="pd-value">${raw.countryOfOrigin ? escapeHtml(raw.countryOfOrigin) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">바코드</span><span class="pd-value">${raw.barcode ? escapeHtml(raw.barcode) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">품번</span><span class="pd-value">${raw.productNumber ? escapeHtml(raw.productNumber) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">카테고리</span><span class="pd-value">${categoryPath ? escapeHtml(categoryPath) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">단위/수량</span><span class="pd-value">${unitInfo ? escapeHtml(unitInfo) : '-'}</span></div>
          <div class="pd-meta-row"><span class="pd-label">등록일</span><span class="pd-value">${raw.createdAt || '-'}</span></div>
        </div>

        <button type="button" class="pd-download-btn" id="pdDownloadBtn">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9"/><path d="M2 15h20l-2 5H4l-2-5z"/></svg>
          이 상품 다운로드
        </button>
      </div>
    </div>

    <div class="product-detail-keywords">
      <span class="pd-keyword-label">키워드</span>
      <span class="pd-keyword-value">${raw.keyword ? escapeHtml(raw.keyword) : '-'}</span>
    </div>

    <div class="product-detail-images">
      ${detailImagesHtml}
    </div>
  `;
}

function openProductDetailOffcanvas(product) {
  const raw = product.raw;
  document.getElementById('productDetailOffcanvasBody').innerHTML = buildProductDetailHTML(raw);
  document.getElementById('pdDownloadBtn').addEventListener('click', () => {
    downloadExcel([raw], sanitizeFileName(raw.productName || '상품'));
  });

  const offcanvasEl = document.getElementById('productDetailOffcanvas');
  bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
}

tbody.addEventListener('click', (e) => {
  if (e.target.closest('.option-yes')) return;
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  const product = allProducts.find((p) => p.raw.id === Number(row.dataset.id));
  if (product) openProductDetailOffcanvas(product);
});

document.addEventListener('click', (e) => {
  if (openOptionProductId !== null && !e.target.closest('.option-yes') && !e.target.closest('.option-flyout')) {
    closeOptionFlyout();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openOptionProductId !== null) closeOptionFlyout();
});

window.addEventListener('scroll', () => { if (openOptionProductId !== null) closeOptionFlyout(); }, true);

// ── 초기 로드 ──────────────────────────────

async function fetchCategoryTree() {
  try {
    categoryTree = await (await fetch(CATEGORY_MENU_API)).json();
  } catch (e) {
    categoryTree = [];
  }
}

async function fetchProducts() {
  featuredGridEl.innerHTML = '<div class="brand-chip-empty">불러오는 중...</div>';
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error('상품 목록을 불러오지 못했어요.');
    const list = await res.json();
    allProducts = list.map(mapProduct);
  } catch (e) {
    allProducts = [];
    featuredGridEl.innerHTML = `<div class="brand-chip-empty">${escapeHtml(e.message)}</div>`;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="15">${escapeHtml(e.message)}</td></tr>`;
  }
}

(async function init() {
  await Promise.all([fetchCategoryTree(), fetchProducts()]);
  buildCategoryCounts();
  renderDropdownMenu(document.getElementById('cat1Menu'), categoryTree, null, (it) => selectCategory1(it), '전체', categoryCounts.c1, allProducts.length);
  renderFeaturedProducts();
  renderProductList();
  waitForImagesThenPositionTooltip(featuredGridEl);
})();

// ── 엑셀 다운로드 (페이징으로 안 보이는 부분까지 포함해서, 현재 선택된 카테고리의 전체 데이터) ──────

const EXCEL_COLUMNS = [
  ['id', 'ID'], ['barcode', '바코드'], ['productNumber', '품번'], ['productName', '상품명'], ['spec', '규격'],
  ['category1Name', '1차카테고리'], ['category2Name', '2차카테고리'], ['category3Name', '3차카테고리'],
  ['brandName', '브랜드'], ['manufacturerName', '제조사'], ['importerName', '수입사'],
  ['countryOfOrigin', '원산지'], ['unit', '단위'], ['unitQuantity', '단위수량'], ['packQuantity', '입수량'],
  ['consumerPrice', '소비자가'], ['recommendedPrice', '권장판매가'], ['__supplyPrice', '공급가'],
  ['keyword', '키워드'], ['description', '상세설명'],
  ['stockOutYn', '품절여부'], ['discontinuedYn', '단종여부'], ['bundleYn', '번들여부'], ['importedYn', '수입여부'],
  ['newRegisteredYn', '신규등록여부'], ['newProductYn', '신상품여부'], ['hasOptionYn', '옵션여부'], ['options', '옵션목록'],
  ['mainImageThumbUrl', '대표이미지(썸네일)'], ['mainImageDetailUrl', '대표이미지(500px)'], ['mainImageMediumUrl', '대표이미지(중간)'], ['mainImageOriginalUrl', '대표이미지(원본)'], ['detailImageUrls', '상세이미지(원본)'], ['detailImageViewUrls', '상세이미지(520px)'],
  ['createdAt', '등록일'], ['updatedAt', '수정일'],
];

function toExcelRow(raw) {
  const row = {};
  EXCEL_COLUMNS.forEach(([key, label]) => {
    let value = raw[key];
    if (key === '__supplyPrice') {
      value = gradeSellerPrice(raw); // 회원 등급에 맞는 공급가 하나만 (판매가1~3 원본은 노출하지 않음)
    } else if (key === 'options') {
      value = Array.isArray(value) && value.length
        ? value.map((o) => `${o.optionName}:${o.optionValue}${o.stockQuantity != null ? '(재고 ' + o.stockQuantity + ')' : ''}`).join('; ')
        : '';
    } else if (typeof value === 'boolean') {
      value = value ? 'Y' : 'N';
    } else if (value == null) {
      value = '';
    }
    row[label] = value;
  });
  return row;
}

function showDownloadProgress() {
  document.getElementById('downloadProgressRow').style.display = 'flex';
  updateDownloadProgress(0);
}
function updateDownloadProgress(pct) {
  document.getElementById('downloadProgressBar').style.width = pct + '%';
  document.getElementById('downloadProgressPercent').textContent = pct + '%';
}
function hideDownloadProgress() {
  document.getElementById('downloadProgressRow').style.display = 'none';
}

function sanitizeFileName(str) {
  return String(str).replace(/[\\/:*?"<>|]/g, '_').trim();
}

function getExportFileNamePrefix() {
  const deepest = selectedCategory3 || selectedCategory2 || selectedCategory1;
  return sanitizeFileName(deepest ? deepest.categoryName : '카테고리별상품');
}

async function downloadExcel(dataList, fileNamePrefix) {
  if (!dataList || dataList.length === 0) {
    alert('다운로드할 데이터가 없어요.');
    return;
  }

  const excelBtn = document.getElementById('excelDownloadBtn');
  excelBtn.disabled = true;
  showDownloadProgress();

  const CHUNK_SIZE = 200;
  const rows = [];
  for (let i = 0; i < dataList.length; i += CHUNK_SIZE) {
    const chunk = dataList.slice(i, i + CHUNK_SIZE);
    chunk.forEach((p) => rows.push(toExcelRow(p)));
    const pct = Math.min(95, Math.round(((i + chunk.length) / dataList.length) * 95));
    updateDownloadProgress(pct);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  updateDownloadProgress(98);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '상품목록');

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  XLSX.writeFile(workbook, `${fileNamePrefix}_${stamp}.xlsx`);

  updateDownloadProgress(100);
  setTimeout(() => {
    hideDownloadProgress();
    excelBtn.disabled = false;
  }, 400);
}

document.getElementById('excelDownloadBtn').addEventListener('click', () => {
  if (!selectedCategory1) {
    alert('카테고리를 먼저 선택해주세요.');
    return;
  }
  downloadExcel(getFilteredProductsByCategory().map((p) => p.raw), getExportFileNamePrefix());
});

// ── 엑셀 버튼 위 안내 말풍선 위치 계산 ──────────────
// 부모 패널이 overflow:hidden이라 CSS만으로는 위로 못 튀어나가서, 버튼의 실제 화면 좌표를 계산해 고정 배치합니다.
// ── 엑셀 버튼 위 안내 말풍선 위치 계산 ──────────────
// "이런 상품은 어떠세요?" 추천 이미지가 fetch로 나중에 끼워넣어지는 거라 window.load로는 못 잡아서,
// 그 이미지들이 실제로 로드 완료된 시점을 직접 기다렸다가 계산합니다.
const excelTooltipEl = document.querySelector('.excel-tooltip');

function updateExcelTooltipPosition() {
  const btn = document.getElementById('excelDownloadBtn');
  if (!btn || !excelTooltipEl) return;
  const rect = btn.getBoundingClientRect();
  excelTooltipEl.style.left = `${rect.left + rect.width / 2}px`;
  excelTooltipEl.style.top = `${rect.top - 10}px`;
  excelTooltipEl.style.visibility = 'visible';
}

function waitForImagesThenPositionTooltip(container) {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) {
    updateExcelTooltipPosition();
    return;
  }
  let remaining = imgs.length;
  const onOneDone = () => {
    remaining -= 1;
    if (remaining <= 0) updateExcelTooltipPosition();
  };
  imgs.forEach((img) => {
    if (img.complete) {
      onOneDone();
    } else {
      img.addEventListener('load', onOneDone, { once: true });
      img.addEventListener('error', onOneDone, { once: true });
    }
  });
}

window.addEventListener('scroll', updateExcelTooltipPosition, true);
window.addEventListener('resize', updateExcelTooltipPosition);
