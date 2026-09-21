// 전체 상품 목록 페이지 — 카테고리 탭 + 검색어로 필터링, 20개씩 페이징
// 대시보드와 사이드바에서 여기로 넘어오며, ?filter=bundle&q=검색어 형태의 URL 파라미터를 읽어서 초기 상태를 맞춥니다.

const PRODUCTS_API = document.body.dataset.productsApi;

// 회원 등급별로 판매가1~3 중 하나만 보여줍니다 (관리자 페이지는 3개 다 보여주므로 대상 아님)
// NORMAL -> 판매가1, GOLD -> 판매가2, VIP -> 판매가3
const MEMBER_GRADE = document.body.dataset.memberGrade || 'NORMAL';
function gradeSellerPrice(p) {
  if (MEMBER_GRADE === 'GOLD') return p.sellerPrice2;
  if (MEMBER_GRADE === 'VIP') return p.sellerPrice3;
  return p.sellerPrice1;
}
const PAGE_SIZE = 20;

let allProducts = [];
let currentTab = 'all';
let currentQuery = '';
let currentPage = 1;

const tbody = document.getElementById('tbody');
const resultCountEl = document.getElementById('resultCount');
const searchInfoEl = document.getElementById('searchInfo');
const paginationEl = document.getElementById('pagination');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const won = (n) => (n == null ? '-' : '₩' + Number(n).toLocaleString('ko-KR'));

/** 서버 ProductResponse를 목록 행이 쓰기 편한 모양으로 변환 */
function mapProduct(p) {
  let cat = 'normal';
  if (p.bundleYn) cat = 'bundle';
  else if (p.importedYn) cat = 'import';

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
    cat,
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

// ── 데이터 로드 ──────────────────────────────

async function loadProducts() {
  tbody.innerHTML = '<tr class="empty-row"><td colspan="15">불러오는 중...</td></tr>';
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error('상품 목록을 불러오지 못했어요.');
    const list = await res.json();
    allProducts = list.map(mapProduct);
    render();
  } catch (e) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="15">${escapeHtml(e.message)}</td></tr>`;
  }
}

// ── 필터 + 페이징 + 렌더 ──────────────────────

function getFilteredProducts() {
  let rows = allProducts;

  if (currentTab !== 'all') {
    rows = rows.filter((p) => p.cat === currentTab);
  }
  if (currentQuery) {
    // 띄어쓰기로 나눈 모든 단어가 (상품명/브랜드/바코드 중) 들어 있는 상품만 (AND 검색)
    const match = window.SearchUtils ? SearchUtils.matcher(currentQuery) : null;
    const q = currentQuery.toLowerCase();
    rows = rows.filter((p) => match
      ? match([p.name, p.brandName, p.barcode])
      : ((p.name && p.name.toLowerCase().includes(q)) ||
         (p.brandName && p.brandName.toLowerCase().includes(q)) ||
         (p.barcode && p.barcode.toLowerCase().includes(q))));
  }
  return rows;
}

function render() {
  const filtered = getFilteredProducts();
  resultCountEl.textContent = filtered.length + '건';
  searchInfoEl.textContent = currentQuery ? `"${currentQuery}" 검색 결과` : '';

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  renderTable(pageItems);
  renderPagination(totalPages);
}

function renderTable(rows) {
  if (rows.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">조건에 맞는 상품이 없어요.</td></tr>';
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
    btn.addEventListener('click', () => { currentPage = page; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    paginationEl.appendChild(btn);
  };

  addBtn('‹', currentPage - 1, { disabled: currentPage === 1 });
  for (let p = 1; p <= totalPages; p++) {
    addBtn(String(p), p, { active: p === currentPage });
  }
  addBtn('›', currentPage + 1, { disabled: currentPage === totalPages });
}

// ── 탭 ──────────────────────────────────

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

  // 버튼 오른쪽에, 아래에서 위로 fade-in 되도록 시작 위치를 버튼 아래쪽에 맞춥니다.
  const rect = btn.getBoundingClientRect();
  const flyoutWidth = 280;
  let left = rect.right + 10;
  if (left + flyoutWidth > window.innerWidth - 12) {
    left = rect.left - flyoutWidth - 10; // 오른쪽 공간이 없으면 왼쪽으로
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
  const supplyPrice = gradeSellerPrice(raw); // 로그인한 회원 등급에 맞는 공급가
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
        ${window.GmarketExport ? GmarketExport.buttonHtml() : ''}
        <button type="button" class="pd-request-btn" data-pd-request
                data-product-id="${raw.id}"
                data-product-name="${encodeURIComponent(raw.productName || '')}"
                data-product-barcode="${encodeURIComponent(raw.barcode || '')}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          정보수정 요청
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

  const gmBtn = document.getElementById('pdGmarketBtn');
  if (gmBtn && window.GmarketExport) {
    gmBtn.addEventListener('click', () => {
      GmarketExport.download([raw], sanitizeFileName(raw.productName || '상품'));
    });
  }

  const offcanvasEl = document.getElementById('productDetailOffcanvas');
  bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
}

tbody.addEventListener('click', (e) => {
  if (e.target.closest('.option-yes')) return; // 옵션 배지 클릭은 별도 처리(위에서 이미 처리됨)
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

document.getElementById('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('#tabs .tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  currentTab = tab.dataset.cat;
  currentPage = 1;
  render();
});

// ── 검색창 연동 (실시간 필터 + URL의 ?q= 반영) ──────

const searchInput = document.getElementById('topbarSearchInput');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value.trim();
    currentPage = 1;
    render();
  });
}

// ── 초기 상태 (URL의 ?filter=, ?q= 반영) ──────

(function () {
  const params = new URLSearchParams(window.location.search);
  const filterParam = params.get('filter');
  const qParam = params.get('q');

  if (filterParam) {
    const targetTab = document.querySelector(`#tabs .tab[data-cat="${filterParam}"]`);
    if (targetTab) {
      document.querySelectorAll('#tabs .tab').forEach((t) => t.classList.remove('active'));
      targetTab.classList.add('active');
      currentTab = filterParam;
    }
  }

  if (qParam && searchInput) {
    searchInput.value = qParam;
    currentQuery = qParam;
  }
})();

// ── 엑셀 다운로드 (페이징으로 안 보이는 부분까지 포함해서, 현재 필터링된 전체 데이터) ──────

const EXCEL_COLUMNS = [
  ['id', 'ID'], ['barcode', '바코드'], ['productNumber', '품번'], ['productName', '상품명'], ['spec', '규격'],
  ['category1Name', '1차카테고리'], ['category2Name', '2차카테고리'], ['category3Name', '3차카테고리'],
  ['brandName', '브랜드'], ['manufacturerName', '제조사'], ['importerName', '수입사'],
  ['countryOfOrigin', '원산지'], ['certification', '인증사항'], ['unit', '단위'], ['unitQuantity', '단위수량'], ['packQuantity', '입수량'],
  ['consumerPrice', '소비자가'], ['recommendedPrice', '권장판매가'], ['__supplyPrice', '공급가'],
  ['keyword', '키워드'], ['description', '상세설명'],
  ['stockOutYn', '품절여부'], ['discontinuedYn', '단종여부'], ['bundleYn', '번들여부'], ['importedYn', '수입여부'],
  ['newRegisteredYn', '신규등록여부'], ['newProductYn', '신상품여부'], ['hasOptionYn', '옵션여부'], ['options', '옵션목록'],
  ['mainImageThumbUrl', '대표이미지(썸네일)'], ['mainImageDetailUrl', '대표이미지(500px)'], ['mainImageMediumUrl', '대표이미지(중간)'], ['mainImageOriginalUrl', '대표이미지(원본)'], ['detailImageUrls', '상세이미지(원본)'], ['detailImageViewUrls', '상세이미지(520px)'],
  ['createdAt', '등록일'], ['updatedAt', '수정일'],
];

// 엑셀 옵션목록 형식: 옵션명:옵션값[바코드],옵션값[바코드]  (옵션명이 여러 개면 ;로 구분, 공백 없음)
// 예) 색상:블랙[8801234000011],네이비[8801234000028]
// 옵션 바코드가 없으면 대괄호 없이 옵션값만 씁니다.
function formatOptionsForExcel(options) {
  const groups = new Map();
  options.forEach((o) => {
    const name = String(o.optionName ?? '').trim();
    const value = String(o.optionValue ?? '').trim();
    const barcode = String(o.optionBarcode ?? '').trim();
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(barcode ? `${value}[${barcode}]` : value);
  });
  return Array.from(groups, ([name, values]) => `${name}:${values.join(',')}`).join(';');
}

function toExcelRow(raw) {
  const row = {};
  EXCEL_COLUMNS.forEach(([key, label]) => {
    let value = raw[key];
    if (key === '__supplyPrice') {
      value = gradeSellerPrice(raw); // 회원 등급에 맞는 공급가 하나만 (판매가1~3 원본은 노출하지 않음)
    } else if (key === 'options') {
      value = Array.isArray(value) && value.length
        ? formatOptionsForExcel(value)
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
  if (currentQuery) return `검색_${sanitizeFileName(currentQuery)}`;
  const tabLabels = { all: '전체상품', bundle: '번들상품', import: '수입상품', normal: '일반상품' };
  return tabLabels[currentTab] || '전체상품';
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
    // 브라우저가 진행률 바를 실제로 그릴 시간을 한 틱 내줍니다 (대량 데이터에서도 화면이 안 멈추도록)
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
  downloadExcel(getFilteredProducts().map((p) => p.raw), getExportFileNamePrefix());
});

// "엑셀 다운로드" 바로 옆에 "G마켓용 엑셀 다운로드" 버튼 (현재 필터링된 전체 상품을 G마켓 양식으로)
if (window.GmarketExport) {
  GmarketExport.mountListButton({
    anchorId: 'excelDownloadBtn',
    getList: () => getFilteredProducts().map((p) => p.raw),
    getPrefix: () => getExportFileNamePrefix(),
  });
}

loadProducts();

// ── 엑셀 버튼 위 안내 말풍선 위치 계산 ──────────────
// 부모 패널이 overflow:hidden이라 CSS만으로는 위로 못 튀어나가서, 버튼의 실제 화면 좌표를 계산해 고정 배치합니다.
(function positionExcelTooltip() {
  const btn = document.getElementById('excelDownloadBtn');
  const tooltip = document.querySelector('.excel-tooltip');
  if (!btn || !tooltip) return;

  function update() {
    const rect = btn.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 10}px`;
    tooltip.style.visibility = 'visible'; // 위치를 계산한 뒤에야 보여줘서 "점프"가 안 보이게 함
  }

  // 이미지(특히 "이런 상품은 어떠세요?" 추천 영역)가 나중에 로드되면서 페이지 길이가 늘어날 수 있어서,
  // 이미 전부 로드된 상태(readyState complete)면 바로 계산하고, 아니면 window load(이미지까지 다 끝난 시점)를 기다립니다.
  if (document.readyState === 'complete') {
    update();
  } else {
    window.addEventListener('load', update);
  }
  window.addEventListener('scroll', update, true);
  window.addEventListener('resize', update);
})();
