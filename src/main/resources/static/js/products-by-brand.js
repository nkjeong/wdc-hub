// 브랜드별 상품 페이지 — 브랜드 칩을 클릭하면 그 브랜드의 상품을 15개씩 페이징해서 보여줍니다.
// 상품 행 렌더링(컬럼 구성)은 "전체 상품" 페이지(products-list.js)와 동일하게 맞췄습니다.

const PRODUCTS_API = document.body.dataset.productsApi;
const BRANDS_API = document.body.dataset.brandsApi;

// 회원 등급별로 판매가1~3 중 하나만 보여줍니다 (관리자 페이지는 3개 다 보여주므로 대상 아님)
// NORMAL -> 판매가1, GOLD -> 판매가2, VIP -> 판매가3
const MEMBER_GRADE = document.body.dataset.memberGrade || 'NORMAL';
function gradeSellerPrice(p) {
  if (MEMBER_GRADE === 'GOLD') return p.sellerPrice2;
  if (MEMBER_GRADE === 'VIP') return p.sellerPrice3;
  return p.sellerPrice1;
}
const PAGE_SIZE = 15;

let allProducts = [];
let allBrands = [];
let selectedBrandName = null;
let currentPage = 1;

const tbody = document.getElementById('tbody');
const resultCountEl = document.getElementById('resultCount');
const paginationEl = document.getElementById('pagination');
const brandChipListEl = document.getElementById('brandChipList');
const brandChipCountEl = document.getElementById('brandChipCount');
const productListTitleEl = document.getElementById('productListTitle');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const won = (n) => (n == null ? '-' : '₩' + Number(n).toLocaleString('ko-KR'));

/** 서버 ProductResponse를 목록 행이 쓰기 편한 모양으로 변환 (products-list.js와 동일) */
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

// 등록일(createdAt) 기준으로 N일이 지나지 않았는지 확인합니다.
function isWithinDays(createdAt, days) {
  if (!createdAt) return false;
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return diffMs / (1000 * 60 * 60 * 24) <= days;
}

function statusPills(p) {
  const pills = [];
  // 신규등록/신상품 배지는 담당자가 켜뒀더라도, 등록일 기준 일정 기간이 지나면 자동으로 사라집니다.
  if (p.newRegisteredYn && isWithinDays(p.createdAt, 7)) pills.push('<span class="status-pill newin">신규등록</span>');
  if (p.newProductYn && isWithinDays(p.createdAt, 30)) pills.push('<span class="status-pill newin">신상품</span>');
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

// ── 브랜드 칩 목록 ──────────────────────────────

function renderBrandChips() {
  const counts = new Map(); // brandName -> count
  allProducts.forEach((p) => {
    if (!p.brandName) return;
    counts.set(p.brandName, (counts.get(p.brandName) || 0) + 1);
  });

  // 상품이 0개라도, 브랜드관리에 등록된 브랜드는 전부 칩으로 보여줍니다.
  const brands = allBrands
    .map((b) => ({ name: b.brandNameKr, count: counts.get(b.brandNameKr) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  brandChipCountEl.textContent = brands.length + '개';

  if (brands.length === 0) {
    brandChipListEl.innerHTML = '<div class="brand-chip-empty">등록된 브랜드가 없어요.</div>';
    return;
  }

  brandChipListEl.innerHTML = brands.map(({ name, count }) => `
    <button type="button" class="brand-chip${name === selectedBrandName ? ' active' : ''}" data-brand="${escapeHtml(name)}">
      ${escapeHtml(name)} <span class="count">[${count}]</span>
    </button>
  `).join('');
}

brandChipListEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.brand-chip');
  if (!chip) return;
  selectedBrandName = chip.dataset.brand;
  currentPage = 1;
  renderBrandChips();
  renderProductList();
  productListTitleEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ── 상품 목록 (선택된 브랜드 기준, 15개씩 페이징) ──────

function renderProductList() {
  productListTitleEl.childNodes[0].textContent = selectedBrandName ? `${selectedBrandName} 상품 목록` : '상품 목록';

  if (!selectedBrandName) {
    resultCountEl.textContent = '0건';
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">브랜드를 선택하면 상품 목록이 나타나요.</td></tr>';
    paginationEl.innerHTML = '';
    return;
  }

  const filtered = allProducts.filter((p) => p.brandName === selectedBrandName);
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
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">이 브랜드는 등록된 상품이 없어요.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((p) => `
    <tr data-id="${p.raw.id}">
      <td>${p.thumb
        ? `<img class="list-thumb" src="${escapeHtml(p.thumb)}" alt="">`
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

  const optionsHtml = (raw.hasOptionYn && raw.options && raw.options.length)
    ? `<ul class="pd-options-list">${raw.options.map((o) => `
        <li><span><span class="pd-opt-name">${escapeHtml(o.optionName)}</span>${escapeHtml(o.optionValue)}</span>
        <span class="pd-opt-stock">${o.stockQuantity != null ? '재고 ' + o.stockQuantity : ''}</span></li>
      `).join('')}</ul>`
    : '<div class="pd-options-empty">등록된 옵션이 없어요</div>';

  const detailSource = raw.detailImageViewUrls || raw.detailImageUrls; // 회원 화면엔 520px 표시용 우선, 없으면 원본
  const detailUrls = detailSource ? detailSource.split('\n').filter(Boolean) : [];
  const detailImagesHtml = detailUrls.length
    ? detailUrls.map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy">`).join('')
    : '<div class="pd-detail-images-empty">등록된 상세이미지가 없어요</div>';

  return `
    <div class="product-detail-top">
      <div class="pd-image">
        ${mainImg ? `<img src="${escapeHtml(mainImg)}" alt="">` : '<div class="pd-image-empty">이미지 없음</div>'}
      </div>
      <div class="pd-info">
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
  document.getElementById('productDetailOffcanvasLabel').textContent = raw.productName;
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

// ── 브랜드마다 랜덤 상품 1개씩, 최대 10개 추천 ──────────

const featuredGridEl = document.getElementById('featuredGrid');
const featuredCountEl = document.getElementById('featuredCount');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderFeaturedProducts() {
  // 브랜드별로 상품을 묶고, 브랜드 10개를 랜덤으로 뽑은 뒤 각 브랜드에서 상품 1개씩 랜덤으로 뽑습니다.
  const byBrand = new Map();
  allProducts.forEach((p) => {
    if (!p.brandName) return;
    if (!byBrand.has(p.brandName)) byBrand.set(p.brandName, []);
    byBrand.get(p.brandName).push(p);
  });

  const pickedBrands = shuffle(Array.from(byBrand.keys())).slice(0, 10);
  const featured = pickedBrands.map((brandName) => {
    const products = byBrand.get(brandName);
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
      <button type="button" class="featured-card" data-brand="${escapeHtml(p.brandName)}">
        <div class="featured-image${p.thumb ? '' : ' featured-image-empty'}">
          ${p.thumb ? `<img src="${escapeHtml(p.thumb)}" alt="">` : ''}
        </div>
        <div class="featured-name">${escapeHtml(p.name)}</div>
        <div class="featured-brand">${escapeHtml(p.brandName)}</div>
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
  if (!card) return;
  selectedBrandName = card.dataset.brand;
  currentPage = 1;
  renderBrandChips();
  renderProductList();
  productListTitleEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ── 초기 로드 ──────────────────────────────

async function fetchBrands() {
  try {
    const res = await fetch(BRANDS_API);
    if (!res.ok) throw new Error('브랜드 목록을 불러오지 못했어요.');
    allBrands = await res.json();
  } catch (e) {
    allBrands = []; // 브랜드 목록을 못 불러와도 상품 목록 자체는 계속 쓸 수 있어야 함
  }
}

async function fetchProducts() {
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error('상품 목록을 불러오지 못했어요.');
    const list = await res.json();
    allProducts = list.map(mapProduct);
  } catch (e) {
    allProducts = [];
    throw e;
  }
}

async function loadProducts() {
  brandChipListEl.innerHTML = '<div class="brand-chip-empty">불러오는 중...</div>';
  try {
    await Promise.all([fetchBrands(), fetchProducts()]);
    renderFeaturedProducts();
    renderBrandChips();
    renderProductList();
    waitForImagesThenPositionTooltip(featuredGridEl);
  } catch (e) {
    brandChipListEl.innerHTML = `<div class="brand-chip-empty">${escapeHtml(e.message)}</div>`;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="15">${escapeHtml(e.message)}</td></tr>`;
  }
}

// ── 엑셀 다운로드 (페이징으로 안 보이는 부분까지 포함해서, 현재 선택된 브랜드의 전체 데이터) ──────

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
  if (!selectedBrandName) {
    alert('브랜드를 먼저 선택해주세요.');
    return;
  }
  const filtered = allProducts.filter((p) => p.brandName === selectedBrandName);
  downloadExcel(filtered.map((p) => p.raw), sanitizeFileName(selectedBrandName));
});

loadProducts();

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
  excelTooltipEl.style.visibility = 'visible'; // 위치를 계산한 뒤에야 보여줘서 "점프"가 안 보이게 함
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
