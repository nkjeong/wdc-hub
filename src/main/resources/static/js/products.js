// 상품관리 페이지 — 탭 전환, 목록 조회, 등록, 수정(Offcanvas), 삭제 (관리자 전용)
// 대표이미지는 원본 1장만 선택하면 서버가 썸네일/미디엄/원본 3개를 만들어 저장합니다.
// 상세이미지는 리사이즈 없이 원본 그대로 여러 장 저장됩니다.
// 업로드 진행률은 fetch가 아니라 XMLHttpRequest로 전송해야 표시할 수 있어서 XHR을 사용합니다.
// CSRF는 현재 프로젝트 설정상 꺼져있는 상태라 별도 토큰 헤더 없이 전송합니다.

const API_BASE = document.body.dataset.apiBase;                 // /admin/products
const CATEGORY_API_BASE = document.body.dataset.categoryApiBase; // /admin/categories
const CATEGORY_MENU_API = document.body.dataset.categoryMenuApi; // /categories/menu (매칭 기능용 — 1~3차 전체 트리)
const BRAND_API = document.body.dataset.brandApi;                 // /admin/brands/list

let allProducts = [];

// ── 공용 유틸 ──────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = '요청 처리 중 오류가 발생했습니다.';
    try {
      const text = await res.text();
      if (text) message = text;
    } catch (e) { /* ignore */ }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function setVal(id, value) {
  document.getElementById(id).value = value ?? '';
}

function numOrNull(id) {
  const v = document.getElementById(id).value;
  return v === '' ? null : Number(v);
}

function strOrNull(id) {
  const v = document.getElementById(id).value.trim();
  return v === '' ? null : v;
}

/** 서버에 저장된 상대 경로(예: uploads/product-images/xxx.jpg)를 실제 접근 가능한 웹 경로로 변환 */
function toWebUrl(path) {
  if (!path) return '';
  // 이제 서버가 http(s)로 시작하는 절대 URL을 내려주므로 그대로 씁니다.
  // 혹시 옛날 방식(상대경로)이 섞여 있어도 안전하게 동작하도록 남겨둔 처리입니다.
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

// ── 탭 전환 ──────────────────────────────────

const tabs = document.querySelectorAll('#productTabs .tab');
tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

function switchTab(name) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.getElementById('productListPanel').style.display = name === 'list' ? 'block' : 'none';
  document.getElementById('productRegisterPanel').style.display = name === 'register' ? 'block' : 'none';
  document.getElementById('productCardAd1Panel').style.display = name === 'cardad1' ? 'block' : 'none';
  const bannerPanel = document.getElementById('productBannerPanel');
  if (bannerPanel) bannerPanel.style.display = name === 'banner' ? 'block' : 'none';
  if (name === 'cardad1') loadCardAd1();
  if (name === 'banner' && window.loadBanners) window.loadBanners();
}

// ── 카테고리 1→2→3 계단식 선택 ──────────────────

function resetSelect(selectEl, placeholderText) {
  selectEl.innerHTML = `<option value="">${placeholderText}</option>`;
}

function addOption(selectEl, value, label) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  selectEl.appendChild(opt);
}

async function loadCategory1Options(selectEl) {
  try {
    const list = await fetchJSON(`${CATEGORY_API_BASE}/category1`);
    list.forEach((c) => addOption(selectEl, c.id, c.categoryName));
  } catch (e) { /* 카테고리 못 불러와도 상품관리 자체는 계속 쓸 수 있어야 함 */ }
}

function setupCategoryCascade(prefix) {
  const c1 = document.getElementById(`${prefix}Category1`);
  const c2 = document.getElementById(`${prefix}Category2`);
  const c3 = document.getElementById(`${prefix}Category3`);

  loadCategory1Options(c1);

  c1.addEventListener('change', async () => {
    resetSelect(c2, c1.value ? '불러오는 중...' : '1차 먼저 선택');
    resetSelect(c3, '2차 먼저 선택');
    c2.disabled = !c1.value;
    c3.disabled = true;
    if (!c1.value) return;
    const list = await fetchJSON(`${CATEGORY_API_BASE}/category1/${c1.value}/category2`);
    resetSelect(c2, '선택 안함');
    list.forEach((c) => addOption(c2, c.id, c.categoryName));
  });

  c2.addEventListener('change', async () => {
    resetSelect(c3, c2.value ? '불러오는 중...' : '2차 먼저 선택');
    c3.disabled = !c2.value;
    if (!c2.value) return;
    const list = await fetchJSON(`${CATEGORY_API_BASE}/category2/${c2.value}/category3`);
    resetSelect(c3, '선택 안함');
    list.forEach((c) => addOption(c3, c.id, c.categoryName));
  });
}

/** 수정 폼을 기존 상품 값으로 채울 때, change 이벤트 없이 1→2→3차를 순서대로 세팅합니다 */
async function setCategorySelection(prefix, c1Id, c2Id, c3Id) {
  const c1 = document.getElementById(`${prefix}Category1`);
  const c2 = document.getElementById(`${prefix}Category2`);
  const c3 = document.getElementById(`${prefix}Category3`);

  resetSelect(c2, '1차 먼저 선택'); c2.disabled = true;
  resetSelect(c3, '2차 먼저 선택'); c3.disabled = true;
  c1.value = c1Id ?? '';
  if (!c1Id) return;

  const list2 = await fetchJSON(`${CATEGORY_API_BASE}/category1/${c1Id}/category2`);
  resetSelect(c2, '선택 안함');
  list2.forEach((c) => addOption(c2, c.id, c.categoryName));
  c2.disabled = false;
  c2.value = c2Id ?? '';
  if (!c2Id) return;

  const list3 = await fetchJSON(`${CATEGORY_API_BASE}/category2/${c2Id}/category3`);
  resetSelect(c3, '선택 안함');
  list3.forEach((c) => addOption(c3, c.id, c.categoryName));
  c3.disabled = false;
  c3.value = c3Id ?? '';
}

function resetCategorySelection(prefix) {
  const c2 = document.getElementById(`${prefix}Category2`);
  const c3 = document.getElementById(`${prefix}Category3`);
  document.getElementById(`${prefix}Category1`).value = '';
  resetSelect(c2, '1차 먼저 선택'); c2.disabled = true;
  resetSelect(c3, '2차 먼저 선택'); c3.disabled = true;
}

// ── 브랜드 드롭다운 ──────────────────────────

async function loadBrandOptions(selectEl) {
  try {
    const list = await fetchJSON(BRAND_API);
    list.forEach((b) => addOption(selectEl, b.id, b.brandNameKr));
  } catch (e) { /* 브랜드 못 불러와도 상품관리 자체는 계속 쓸 수 있어야 함 */ }
}

// ── 이미지 미리보기 (로컬에서 선택한 파일 기준) ──────

function showMainImagePreview(prefix, url) {
  const preview = document.getElementById(`${prefix}MainImagePreview`);
  const img = preview.querySelector('img');
  if (url) {
    img.src = url;
    img.style.display = 'block';
    preview.classList.remove('empty');
  } else {
    img.style.display = 'none';
    preview.classList.add('empty');
  }
}

function showDetailImagePreview(prefix, urls, emptyMessage) {
  const preview = document.getElementById(`${prefix}DetailImagePreview`);
  if (!urls || urls.length === 0) {
    preview.innerHTML = `<div class="detail-image-scroll-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }
  preview.innerHTML = urls.map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy">`).join('');
}

function wireImageFileInputs(prefix, emptyMessage) {
  document.getElementById(`${prefix}MainImageFile`).addEventListener('change', (e) => {
    const file = e.target.files[0];
    showMainImagePreview(prefix, file ? URL.createObjectURL(file) : null);
  });

  document.getElementById(`${prefix}DetailImageFiles`).addEventListener('change', (e) => {
    const urls = Array.from(e.target.files).map((f) => URL.createObjectURL(f));
    showDetailImagePreview(prefix, urls, emptyMessage);
  });
}

wireImageFileInputs('reg', '선택한 이미지가 여기에 미리보기로 표시돼요');
wireImageFileInputs('edit', '현재 등록된 상세이미지가 없어요');

// ── 옵션 (동적 행 추가/삭제) ──────────────────────

function createOptionRow(prefix, values) {
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <input type="text" class="calc-input opt-name" placeholder="옵션명 (예: 색상)">
    <input type="text" class="calc-input opt-value" placeholder="옵션값 (예: 빨강)">
    <input type="text" class="calc-input opt-barcode" placeholder="옵션별 바코드">
    <input type="number" class="calc-input opt-price" placeholder="추가금액">
    <input type="number" class="calc-input opt-stock" placeholder="재고수량">
    <button type="button" class="btn-del-option" title="삭제">✕</button>
  `;
  if (values) {
    row.querySelector('.opt-name').value = values.optionName ?? '';
    row.querySelector('.opt-value').value = values.optionValue ?? '';
    row.querySelector('.opt-barcode').value = values.optionBarcode ?? '';
    row.querySelector('.opt-price').value = values.additionalPrice ?? '';
    row.querySelector('.opt-stock').value = values.stockQuantity ?? '';
  }
  document.getElementById(`${prefix}OptionRows`).appendChild(row);
}

function setupOptionUI(prefix) {
  const radios = document.querySelectorAll(`input[name="${prefix}HasOptionYn"]`);
  const fieldsWrap = document.getElementById(`${prefix}OptionFields`);
  const rowsWrap = document.getElementById(`${prefix}OptionRows`);

  radios.forEach((r) => r.addEventListener('change', () => {
    const isYes = document.querySelector(`input[name="${prefix}HasOptionYn"]:checked`).value === 'Y';
    fieldsWrap.style.display = isYes ? 'block' : 'none';
    if (isYes && rowsWrap.children.length === 0) createOptionRow(prefix);
  }));

  document.getElementById(`${prefix}AddOptionBtn`).addEventListener('click', () => createOptionRow(prefix));

  rowsWrap.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.btn-del-option');
    if (delBtn) delBtn.closest('.option-row').remove();
  });
}

function resetOptionUI(prefix) {
  document.querySelector(`input[name="${prefix}HasOptionYn"][value="N"]`).checked = true;
  document.getElementById(`${prefix}OptionFields`).style.display = 'none';
  document.getElementById(`${prefix}OptionRows`).innerHTML = '';
}

function collectOptions(prefix) {
  const hasOption = document.querySelector(`input[name="${prefix}HasOptionYn"]:checked`).value === 'Y';
  if (!hasOption) return { hasOptionYn: false, options: [] };

  const options = Array.from(document.querySelectorAll(`#${prefix}OptionRows .option-row`))
    .map((row) => ({
      optionName: row.querySelector('.opt-name').value.trim(),
      optionValue: row.querySelector('.opt-value').value.trim(),
      optionBarcode: row.querySelector('.opt-barcode').value.trim() || null,
      additionalPrice: row.querySelector('.opt-price').value ? Number(row.querySelector('.opt-price').value) : 0,
      stockQuantity: row.querySelector('.opt-stock').value ? Number(row.querySelector('.opt-stock').value) : null,
    }))
    .filter((o) => o.optionName && o.optionValue);

  return { hasOptionYn: true, options };
}

function fillOptionUI(prefix, product) {
  resetOptionUI(prefix);
  const hasOption = !!product.hasOptionYn && product.options && product.options.length > 0;
  document.querySelector(`input[name="${prefix}HasOptionYn"][value="${hasOption ? 'Y' : 'N'}"]`).checked = true;
  document.getElementById(`${prefix}OptionFields`).style.display = hasOption ? 'block' : 'none';
  if (hasOption) {
    product.options.forEach((o) => createOptionRow(prefix, o));
  }
}

setupOptionUI('reg');
setupOptionUI('edit');

// ── 업로드 진행률 바 ──────────────────────────

function showProgress(prefix) {
  document.getElementById(`${prefix}ProgressWrap`).style.display = 'block';
  updateProgress(prefix, 0);
}

function updateProgress(prefix, pct) {
  document.getElementById(`${prefix}ProgressBar`).style.width = pct + '%';
  document.getElementById(`${prefix}ProgressLabel`).textContent = `업로드 중... ${pct}%`;
}

function hideProgress(prefix) {
  document.getElementById(`${prefix}ProgressWrap`).style.display = 'none';
}

// ── 인증사항 (라디오: 해당사항없음/인증사항입력) ──────────

function syncCertVisibility(prefix) {
  const mode = document.querySelector(`input[name="${prefix}CertMode"]:checked`)?.value || 'none';
  const inputEl = document.getElementById(`${prefix}CertificationInput`);
  inputEl.style.display = mode === 'input' ? 'block' : 'none';
}

function getCertificationValue(prefix) {
  const mode = document.querySelector(`input[name="${prefix}CertMode"]:checked`)?.value || 'none';
  if (mode === 'input') {
    return document.getElementById(`${prefix}CertificationInput`).value.trim() || '해당사항없음';
  }
  return '해당사항없음';
}

/** 서버 값을 보고 라디오/입력란 상태를 맞춥니다 (수정 화면 채우기, 복사 기능에서 사용) */
function setCertificationUI(prefix, certification) {
  const hasValue = certification && certification.trim() !== '' && certification.trim() !== '해당사항없음';
  document.querySelector(`input[name="${prefix}CertMode"][value="${hasValue ? 'input' : 'none'}"]`).checked = true;
  document.getElementById(`${prefix}CertificationInput`).value = hasValue ? certification : '';
  syncCertVisibility(prefix);
}

['reg', 'edit'].forEach((prefix) => {
  document.querySelectorAll(`input[name="${prefix}CertMode"]`).forEach((radio) => {
    radio.addEventListener('change', () => syncCertVisibility(prefix));
  });
});

// ── 등록/수정 공통 payload + multipart 전송 ──────────

function collectPayload(prefix) {
  return {
    barcode: strOrNull(`${prefix}Barcode`),
    productNumber: strOrNull(`${prefix}ProductNumber`),
    productName: document.getElementById(`${prefix}ProductName`).value.trim(),
    spec: strOrNull(`${prefix}Spec`),
    consumerPrice: numOrNull(`${prefix}ConsumerPrice`),
    recommendedPrice: numOrNull(`${prefix}RecommendedPrice`),
    unit: strOrNull(`${prefix}Unit`),
    unitQuantity: numOrNull(`${prefix}UnitQuantity`),
    packQuantity: numOrNull(`${prefix}PackQuantity`),
    category1Id: numOrNull(`${prefix}Category1`),
    category2Id: numOrNull(`${prefix}Category2`),
    category3Id: numOrNull(`${prefix}Category3`),
    brandId: numOrNull(`${prefix}Brand`),
    countryOfOrigin: strOrNull(`${prefix}CountryOfOrigin`),
    certification: getCertificationValue(prefix),
    sellerPrice1: numOrNull(`${prefix}SellerPrice1`),
    sellerPrice2: numOrNull(`${prefix}SellerPrice2`),
    sellerPrice3: numOrNull(`${prefix}SellerPrice3`),
    keyword: strOrNull(`${prefix}Keyword`),
    description: strOrNull(`${prefix}Description`),
    stockOutYn: document.getElementById(`${prefix}StockOutYn`).checked,
    discontinuedYn: document.getElementById(`${prefix}DiscontinuedYn`).checked,
    bundleYn: document.getElementById(`${prefix}BundleYn`).checked,
    importedYn: document.getElementById(`${prefix}ImportedYn`).checked,
    newRegisteredYn: document.getElementById(`${prefix}NewRegisteredYn`).checked,
    newProductYn: document.getElementById(`${prefix}NewProductYn`).checked,
    ...collectOptions(prefix),
  };
}

/** FormData + XHR로 전송하면서 진행률을 progress bar에 반영합니다 (fetch는 업로드 진행률을 못 줘서 XHR을 씁니다) */
function submitProductForm(prefix, method, url) {
  const payload = collectPayload(prefix);

  const formData = new FormData();
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

  const mainFile = document.getElementById(`${prefix}MainImageFile`).files[0];
  if (mainFile) formData.append('mainImageFile', mainFile);

  const detailFiles = document.getElementById(`${prefix}DetailImageFiles`).files;
  Array.from(detailFiles).forEach((f) => formData.append('detailImageFiles', f));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        updateProgress(prefix, Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
      } else {
        reject(new Error(xhr.responseText || '요청 처리 중 오류가 발생했습니다.'));
      }
    };
    xhr.onerror = () => reject(new Error('네트워크 오류로 전송에 실패했습니다.'));

    showProgress(prefix);
    xhr.send(formData);
  });
}

// ── 목록 ──────────────────────────────────

const tableBody = document.getElementById('productTableBody');
const productCountEl = document.getElementById('productCount');

async function loadProducts() {
  tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">불러오는 중...</td></tr>';
  try {
    allProducts = await fetchJSON(`${API_BASE}/list`);
    renderTable();
  } catch (e) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="10">${escapeHtml(e.message)}</td></tr>`;
  }
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
  // 위 6개가 전부 N이면, 그 자체로 "일반 판매중" 상태입니다 — 별도 값 없이 부재로 표현
  if (pills.length === 0) pills.push('<span class="status-pill ok">판매중</span>');
  return pills.join(' ');
}

function categoryLabel(p) {
  const parts = [p.category1Name, p.category2Name, p.category3Name].filter(Boolean);
  return parts.length ? escapeHtml(parts.join(' > ')) : '<span class="muted">-</span>';
}

let searchQuery = ''; // 상단바 검색창에서 입력한 검색어 (상품명/바코드/품번 대상)
const PAGE_SIZE = 10;
let currentPage = 1;
const productPaginationEl = document.getElementById('productPagination');

function getFilteredProducts() {
  if (!searchQuery) return allProducts;
  const q = searchQuery.toLowerCase();
  return allProducts.filter((p) =>
    (p.productName && p.productName.toLowerCase().includes(q)) ||
    (p.barcode && p.barcode.toLowerCase().includes(q)) ||
    (p.productNumber && p.productNumber.toLowerCase().includes(q))
  );
}

function renderTable() {
  const filtered = getFilteredProducts();
  productCountEl.textContent = filtered.length + '건';

  if (allProducts.length === 0) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">등록된 상품이 없어요. "상품 등록" 탭에서 추가해보세요.</td></tr>';
    productPaginationEl.innerHTML = '';
    return;
  }
  if (filtered.length === 0) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">검색 결과가 없어요.</td></tr>';
    productPaginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  tableBody.innerHTML = rows.map((p) => `
    <tr>
      <td>${p.mainImageThumbUrl
        ? `<img class="product-thumb" src="${escapeHtml(toWebUrl(p.mainImageThumbUrl))}" alt="">`
        : '<div class="product-thumb-empty"></div>'}
      </td>
      <td class="mono">${escapeHtml(p.barcode || '-')}<div class="muted">${escapeHtml(p.productNumber || '')}</div></td>
      <td>${escapeHtml(p.productName)}</td>
      <td>${categoryLabel(p)}</td>
      <td>${p.brandName ? escapeHtml(p.brandName) : '<span class="muted">-</span>'}</td>
      <td>${p.hasOptionYn ? '<span class="status-pill option-yes">있음</span>' : '<span class="status-pill option-no">없음</span>'}</td>
      <td class="mono">${p.sellerPrice1 != null ? Number(p.sellerPrice1).toLocaleString() : '-'}</td>
      <td>${statusPills(p)}</td>
      <td class="muted">${escapeHtml(p.createdAt || '-')}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn-copy-row" data-id="${p.id}">복사</button>
          <button type="button" class="btn-edit-row" data-id="${p.id}">수정</button>
          <button type="button" class="btn-del-row" data-id="${p.id}">삭제</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderProductPagination(totalPages);
}

function renderProductPagination(totalPages) {
  productPaginationEl.innerHTML = '';
  if (totalPages <= 1) return;

  const addBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-btn' + (opts.active ? ' active' : '');
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener('click', () => {
      currentPage = page;
      renderTable();
    });
    productPaginationEl.appendChild(btn);
  };

  addBtn('‹', currentPage - 1, { disabled: currentPage === 1 });
  for (let p = 1; p <= totalPages; p++) {
    addBtn(String(p), p, { active: p === currentPage });
  }
  addBtn('›', currentPage + 1, { disabled: currentPage === totalPages });
}

tableBody.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.btn-copy-row');
  const editBtn = e.target.closest('.btn-edit-row');
  const delBtn = e.target.closest('.btn-del-row');

  if (copyBtn) {
    const product = allProducts.find((p) => p.id === Number(copyBtn.dataset.id));
    if (product) copyToRegisterForm(product);
  } else if (editBtn) {
    const product = allProducts.find((p) => p.id === Number(editBtn.dataset.id));
    if (product) openEditOffcanvas(product);
  } else if (delBtn) {
    handleDelete(Number(delBtn.dataset.id));
  }
});

/** "복사" 버튼 — 기존 상품의 내용을 상품 등록 폼에 그대로 채워서, 비슷한 상품을 빠르게 새로 등록할 수 있게 합니다. */
async function copyToRegisterForm(p) {
  switchTab('register');
  resetRegisterForm(); // 먼저 폼을 비우고 시작 (이미지 미리보기, 바코드 확인 상태 등도 초기화됨)

  // 바코드는 복사하지 않아요 — 새 바코드를 직접 입력하고 "등록확인"을 눌러야 등록할 수 있어요.
  setVal('regProductNumber', p.productNumber);
  setVal('regProductName', p.productName);
  setVal('regSpec', p.spec);
  setVal('regCountryOfOrigin', p.countryOfOrigin);
  setCertificationUI('reg', p.certification);
  setVal('regUnit', p.unit);
  setVal('regUnitQuantity', p.unitQuantity);
  setVal('regPackQuantity', p.packQuantity);
  setVal('regConsumerPrice', p.consumerPrice);
  setVal('regRecommendedPrice', p.recommendedPrice);
  setVal('regSellerPrice1', p.sellerPrice1);
  setVal('regSellerPrice2', p.sellerPrice2);
  setVal('regSellerPrice3', p.sellerPrice3);
  setVal('regDescription', p.description);
  setVal('regKeyword', p.keyword);
  document.getElementById('regStockOutYn').checked = !!p.stockOutYn;
  document.getElementById('regDiscontinuedYn').checked = !!p.discontinuedYn;
  document.getElementById('regBundleYn').checked = !!p.bundleYn;
  document.getElementById('regImportedYn').checked = !!p.importedYn;
  document.getElementById('regNewRegisteredYn').checked = !!p.newRegisteredYn;
  document.getElementById('regNewProductYn').checked = !!p.newProductYn;
  document.getElementById('regBrand').value = p.brandId ?? '';
  fillOptionUI('reg', p);

  await setCategorySelection('reg', p.category1Id, p.category2Id, p.category3Id);

  // 바코드는 원본과 완전히 같은 값으로 복사돼서 그대로 두면 중복이에요.
  // 등록확인을 다시 눌러야 하는 상태(미확인)로 남겨둬서, 등록 전에 반드시 새 바코드로 바꾸도록 유도합니다.
  invalidateRegBarcodeCheck();

  alert(`"${p.productName}"의 내용을 복사했어요.\n\n이미지는 브라우저 보안 정책상 자동으로 옮길 수 없어서 다시 선택해주셔야 하고,\n바코드는 복사되지 않으니 새로 입력하고 "등록확인"을 눌러주셔야 등록할 수 있어요.`);
}

async function handleDelete(id) {
  if (!confirm('이 상품을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
  try {
    await fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' });
    await loadProducts();
  } catch (e) {
    alert(e.message);
  }
}

// ── 바코드 등록확인 (신규 등록 화면 전용) ──────────────
// "등록확인"을 눌러서 이미 등록된 바코드가 아님을 확인해야만 등록할 수 있게 합니다.
// 바코드를 다시 고치면 확인 상태가 풀려서, 그 값 그대로 다시 확인해야 합니다.

let regBarcodeCheckedValue = null; // 마지막으로 "등록 가능"이 확인된 바코드 값 (null = 아직 확인 안 됨/무효화됨)

function invalidateRegBarcodeCheck() {
  regBarcodeCheckedValue = null;
  document.getElementById('regBarcodeCheckResult').className = 'match-result';
  document.getElementById('regBarcodeCheckResult').textContent = '';
}

document.getElementById('regBarcode').addEventListener('input', invalidateRegBarcodeCheck);

document.getElementById('regBarcodeCheckBtn').addEventListener('click', async () => {
  const barcodeInput = document.getElementById('regBarcode');
  const resultEl = document.getElementById('regBarcodeCheckResult');
  const barcode = barcodeInput.value.trim();

  if (!barcode) {
    resultEl.className = 'match-result none';
    resultEl.textContent = '바코드를 먼저 입력해주세요.';
    barcodeInput.focus();
    return;
  }

  resultEl.className = 'match-result';
  resultEl.textContent = '확인 중...';

  try {
    const result = await fetchJSON(`${API_BASE}/check-barcode?barcode=${encodeURIComponent(barcode)}`);
    if (result.exists) {
      regBarcodeCheckedValue = null;
      resultEl.className = 'match-result none';
      resultEl.textContent = '이미 등록된 바코드예요. 다른 바코드를 확인해주세요.';
    } else {
      regBarcodeCheckedValue = barcode;
      resultEl.className = 'match-result ok';
      resultEl.textContent = '등록 가능한 바코드예요.';
    }
  } catch (e) {
    regBarcodeCheckedValue = null;
    resultEl.className = 'match-result none';
    resultEl.textContent = '확인 중 오류가 발생했어요. 다시 시도해주세요.';
  }
});

// ── 상품 등록 ──────────────────────────────

function resetRegisterForm() {
  document.getElementById('registerForm').reset(); // file input도 함께 비워집니다 (라디오는 해당사항없음으로 되돌아감)
  syncCertVisibility('reg');
  resetCategorySelection('reg');
  showMainImagePreview('reg', null);
  showDetailImagePreview('reg', [], '선택한 이미지가 여기에 미리보기로 표시돼요');
  resetOptionUI('reg');
  hideProgress('reg');
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const barcode = document.getElementById('regBarcode').value.trim();
  if (!barcode) {
    alert('바코드는 필수 항목입니다. 입력 후 "등록확인" 버튼을 눌러주세요.');
    document.getElementById('regBarcode').focus();
    return;
  }
  if (regBarcodeCheckedValue !== barcode) {
    alert('먼저 "등록확인" 버튼으로 이미 등록된 바코드가 아닌지 확인해주세요.');
    document.getElementById('regBarcodeCheckBtn').focus();
    return;
  }

  try {
    const created = await submitProductForm('reg', 'POST', API_BASE);
    resetRegisterForm();
    invalidateRegBarcodeCheck();
    switchTab('list');
    await loadProducts();
    alert(`"${created.productName}" 상품이 등록되었습니다.`);
  } catch (err) {
    hideProgress('reg');
    alert(err.message);
  }
});

// ── 상품 수정 (Offcanvas) ──────────────────────

async function openEditOffcanvas(p) {
  setVal('editId', p.id);
  setVal('editBarcode', p.barcode);
  setVal('editProductNumber', p.productNumber);
  setVal('editProductName', p.productName);
  setVal('editSpec', p.spec);
  setVal('editCountryOfOrigin', p.countryOfOrigin);
  setCertificationUI('edit', p.certification);
  setVal('editUnit', p.unit);
  setVal('editUnitQuantity', p.unitQuantity);
  setVal('editPackQuantity', p.packQuantity);
  setVal('editConsumerPrice', p.consumerPrice);
  setVal('editRecommendedPrice', p.recommendedPrice);
  setVal('editSellerPrice1', p.sellerPrice1);
  setVal('editSellerPrice2', p.sellerPrice2);
  setVal('editSellerPrice3', p.sellerPrice3);
  setVal('editDescription', p.description);
  setVal('editKeyword', p.keyword);
  document.getElementById('editStockOutYn').checked = !!p.stockOutYn;
  document.getElementById('editDiscontinuedYn').checked = !!p.discontinuedYn;
  document.getElementById('editBundleYn').checked = !!p.bundleYn;
  document.getElementById('editImportedYn').checked = !!p.importedYn;
  document.getElementById('editNewRegisteredYn').checked = !!p.newRegisteredYn;
  document.getElementById('editNewProductYn').checked = !!p.newProductYn;
  document.getElementById('editBrand').value = p.brandId ?? '';
  fillOptionUI('edit', p);

  // 새로 선택한 파일이 남아있지 않도록 비우고, 서버에 저장된 현재 이미지를 미리보기로 보여줍니다
  document.getElementById('editMainImageFile').value = '';
  document.getElementById('editDetailImageFiles').value = '';
  showMainImagePreview('edit', p.mainImageMediumUrl ? toWebUrl(p.mainImageMediumUrl) : null);
  const detailUrls = p.detailImageUrls ? p.detailImageUrls.split('\n').filter(Boolean).map(toWebUrl) : [];
  showDetailImagePreview('edit', detailUrls, '현재 등록된 상세이미지가 없어요');

  hideProgress('edit');

  await setCategorySelection('edit', p.category1Id, p.category2Id, p.category3Id);

  const offcanvasEl = document.getElementById('productEditOffcanvas');
  bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
}

document.getElementById('btnSaveEdit').addEventListener('click', async () => {
  const id = document.getElementById('editId').value;
  if (!id) return;

  const productName = document.getElementById('editProductName').value.trim();
  if (!productName) {
    alert('상품명을 입력해주세요.');
    return;
  }

  try {
    await submitProductForm('edit', 'PUT', `${API_BASE}/${id}`);
    hideProgress('edit');
    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('productEditOffcanvas')).hide();
    await loadProducts();
  } catch (err) {
    hideProgress('edit');
    alert(err.message);
  }
});

// ── 상품명 → 브랜드/카테고리 자동 매칭 ──────────────
// 상품명 텍스트 안에 이미 등록된 브랜드명/카테고리명이 그대로 포함되어 있는지 비교하는
// 단순 텍스트 매칭입니다 (의미를 이해하는 AI 매칭이 아닙니다). 못 찾으면 안내만 하고 그대로 둡니다.

let categoryMenuTreeCache = null;

async function getCategoryMenuTree() {
  if (categoryMenuTreeCache) return categoryMenuTreeCache;
  categoryMenuTreeCache = await fetchJSON(CATEGORY_MENU_API);
  return categoryMenuTreeCache;
}

/** 후보 목록 중 상품명에 "포함되는" 것들을 찾아, 가장 긴 이름(=가장 구체적인 이름)을 우선으로 고릅니다 */
function findBestNameMatch(productName, candidates, nameOf) {
  const matched = candidates.filter((c) => nameOf(c) && productName.includes(nameOf(c)));
  if (matched.length === 0) return null;
  return matched.sort((a, b) => nameOf(b).length - nameOf(a).length)[0];
}

function matchBrand(prefix, productName) {
  const select = document.getElementById(`${prefix}Brand`);
  const candidates = Array.from(select.options).filter((o) => o.value !== '');
  const best = findBestNameMatch(productName, candidates, (o) => o.textContent.trim());
  if (best) {
    select.value = best.value;
    return best.textContent.trim();
  }
  return null;
}

async function matchCategory(prefix, productName) {
  const tree = await getCategoryMenuTree();

  let bestC1 = findBestNameMatch(productName, tree, (c) => c.categoryName);

  let bestC2 = null;
  const c2Candidates = tree.flatMap((c1) => (c1.children || []).map((c2) => ({ ...c2, __c1: c1 })));
  bestC2 = findBestNameMatch(productName, c2Candidates, (c) => c.categoryName);
  if (bestC2) bestC1 = bestC2.__c1; // 2차가 매칭되면 그 2차의 부모 1차로 맞춰줍니다

  let bestC3 = null;
  const c3Candidates = c2Candidates.flatMap((c2) => (c2.children || []).map((c3) => ({ ...c3, __c1: c2.__c1, __c2: c2 })));
  bestC3 = findBestNameMatch(productName, c3Candidates, (c) => c.categoryName);
  if (bestC3) { bestC1 = bestC3.__c1; bestC2 = bestC3.__c2; }

  if (!bestC1) return null;

  await setCategorySelection(prefix, bestC1.id, bestC2 ? bestC2.id : null, bestC3 ? bestC3.id : null);

  return [bestC1.categoryName, bestC2 && bestC2.categoryName, bestC3 && bestC3.categoryName].filter(Boolean).join(' > ');
}

async function runMatch(prefix) {
  const nameInput = document.getElementById(`${prefix}ProductName`);
  const btn = document.querySelector(`.btn-match[data-match-prefix="${prefix}"]`);
  const resultEl = document.getElementById(`${prefix}MatchResult`);
  const productName = nameInput.value.trim();

  if (!productName) {
    resultEl.className = 'match-result none';
    resultEl.textContent = '상품명을 먼저 입력해주세요.';
    nameInput.focus();
    return;
  }

  btn.disabled = true;
  resultEl.className = 'match-result';
  resultEl.textContent = '매칭 중...';

  try {
    const brandName = matchBrand(prefix, productName);
    const categoryPath = await matchCategory(prefix, productName);

    if (brandName && categoryPath) {
      resultEl.className = 'match-result ok';
      resultEl.textContent = `브랜드 "${brandName}", 카테고리 "${categoryPath}"를 찾아서 선택했어요.`;
    } else if (brandName || categoryPath) {
      resultEl.className = 'match-result partial';
      const found = [brandName ? `브랜드 "${brandName}"` : null, categoryPath ? `카테고리 "${categoryPath}"` : null].filter(Boolean).join(', ');
      const notFound = !brandName ? '브랜드는' : '카테고리는';
      resultEl.textContent = `${found}는 찾았지만, ${notFound} 상품명에서 못 찾았어요. 직접 선택해주세요.`;
    } else {
      resultEl.className = 'match-result none';
      resultEl.textContent = '상품명에서 브랜드/카테고리를 찾지 못했어요. 직접 선택해주세요.';
    }
  } catch (e) {
    resultEl.className = 'match-result none';
    resultEl.textContent = '매칭 중 오류가 발생했어요. 직접 선택해주세요.';
  } finally {
    btn.disabled = false;
  }
}

document.querySelectorAll('.btn-match[data-match-prefix]').forEach((btn) => {
  btn.addEventListener('click', () => runMatch(btn.dataset.matchPrefix));
});

// ── 판매가1 필드에서 Enter로 빠르게 계산 ──────────────
// "-45"처럼 -로 시작하면: 소비자가의 (100-45)% = 55%를 계산해서 넣습니다.
// -가 없으면: 그냥 입력한 금액을 그대로 둡니다 (일반적인 숫자 입력).
function setupSellerPriceShortcut(consumerInputId, sellerInputId) {
  const sellerInput = document.getElementById(sellerInputId);
  const consumerInput = document.getElementById(consumerInputId);
  if (!sellerInput || !consumerInput) return;

  sellerInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;

    const raw = sellerInput.value.trim();
    if (!raw.startsWith('-')) return; // -가 없으면 그냥 입력한 금액 그대로 (아무 것도 안 함)

    e.preventDefault(); // 폼 안에 있는 필드라 Enter가 의도치 않게 폼을 제출하는 걸 막습니다

    const percentOff = Math.abs(parseFloat(raw));
    if (isNaN(percentOff)) return;

    const consumerPrice = parseFloat(consumerInput.value);
    if (!consumerInput.value || isNaN(consumerPrice)) {
      alert('소비자가를 먼저 입력해주세요.');
      consumerInput.focus();
      return;
    }

    sellerInput.value = Math.round(consumerPrice * (100 - percentOff) / 100);
  });
}

setupSellerPriceShortcut('regConsumerPrice', 'regSellerPrice1');
setupSellerPriceShortcut('regConsumerPrice', 'regSellerPrice2');
setupSellerPriceShortcut('regConsumerPrice', 'regSellerPrice3');
setupSellerPriceShortcut('editConsumerPrice', 'editSellerPrice1');
setupSellerPriceShortcut('editConsumerPrice', 'editSellerPrice2');
setupSellerPriceShortcut('editConsumerPrice', 'editSellerPrice3');

// ── 엑셀 대량등록 ──────────────────────────────
// 옵션 포함 상품을 엑셀 파일로 한 번에 등록합니다. 이미지는 엑셀에 담기 어려워서 이 기능으로는 다루지 않고,
// 등록 후 각 상품을 수정 화면에서 따로 올리면 됩니다.
//
// 엑셀 컬럼 순서(왼쪽부터): 바코드, 품번, 상품명, 규격, 소비자가, 권장판매가, 단위, 단위수량, 입수량,
// 1차카테고리, 2차카테고리, 3차카테고리, 브랜드, 원산지, 판매가1, 판매가2, 판매가3, 키워드, 상세설명,
// 품절여부(Y/N), 단종여부(Y/N), 번들여부(Y/N), 수입여부(Y/N), 신규등록여부(Y/N), 신상품여부(Y/N), 옵션
//
// 옵션 형식: "옵션명:옵션값:추가금액:재고수량"을 한 옵션으로 보고, 옵션이 여러 개면 | 로 이어붙입니다.
// 예) 색상:빨강:0:10|색상:파랑:0:5

const BULK_TEMPLATE_HEADERS = [
  '바코드', '품번', '상품명', '규격', '소비자가', '권장판매가', '단위', '단위수량', '입수량',
  '1차카테고리', '2차카테고리', '3차카테고리', '브랜드', '원산지',
  '판매가1', '판매가2', '판매가3', '키워드', '상세설명',
  '품절여부(Y/N)', '단종여부(Y/N)', '번들여부(Y/N)', '수입여부(Y/N)', '신규등록여부(Y/N)', '신상품여부(Y/N)',
  '옵션 (옵션명:옵션값:추가금액:재고수량, 여러개는 | 로 구분)',
];

function downloadBulkTemplate() {
  const example = [
    '1234567890123', 'SAMPLE-001', '예시 상품명 (실제 상품명으로 바꿔주세요)', '1개입', 11000, 11000, '개', 1, 1,
    '번들상품', '필기구세트', '', '제브라', '한국',
    5000, 5000, 5000, '예시,키워드', '상세설명 예시입니다',
    'N', 'N', 'N', 'N', 'Y', 'Y',
    '색상:빨강:0:10|색상:파랑:0:5',
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([BULK_TEMPLATE_HEADERS, example]);
  worksheet['!cols'] = BULK_TEMPLATE_HEADERS.map(() => ({ wch: 16 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '상품업로드양식');
  XLSX.writeFile(workbook, '상품_대량등록_양식.xlsx');
}

function parseYn(v) {
  if (v == null) return false;
  const s = String(v).trim().toUpperCase();
  return s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1';
}

function parseNumberCell(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseTextCell(v) {
  const s = (v == null ? '' : String(v)).trim();
  return s === '' ? null : s;
}

function parseOptionsCell(v) {
  if (!v) return [];
  return String(v).split('|').map((chunk) => chunk.trim()).filter(Boolean).map((chunk) => {
    const parts = chunk.split(':').map((s) => (s ?? '').trim());
    return {
      optionName: parts[0] || '',
      optionValue: parts[1] || '',
      additionalPrice: parts[2] ? Number(parts[2]) : 0,
      stockQuantity: parts[3] ? Number(parts[3]) : null,
      optionBarcode: null,
      soldOutYn: false,
    };
  }).filter((o) => o.optionName && o.optionValue);
}

/** 엑셀 행(배열)들을 ProductRequest 배열로 바꿉니다. 카테고리/브랜드는 이름으로 적혀있어서 실제 등록된 것과 이름을 대조해서 id로 바꿉니다. */
async function buildBulkRequests(rows) {
  const [categoryTree, brands] = await Promise.all([getCategoryMenuTree(), fetchJSON(BRAND_API)]);

  const requests = [];
  const rowErrors = [];

  rows.forEach((row, idx) => {
    const excelRowNumber = idx + 2; // 1행은 헤더
    const productName = parseTextCell(row[2]);
    if (!productName) {
      rowErrors.push({ rowIndex: excelRowNumber, productName: '(상품명 없음)', success: false, message: '상품명이 비어있어서 건너뛰었어요.' });
      return;
    }

    const cat1Name = parseTextCell(row[9]);
    const cat2Name = parseTextCell(row[10]);
    const cat3Name = parseTextCell(row[11]);
    const brandName = parseTextCell(row[12]);

    let category1Id = null, category2Id = null, category3Id = null;
    if (cat1Name) {
      const c1 = categoryTree.find((c) => c.categoryName === cat1Name);
      if (!c1) { rowErrors.push({ rowIndex: excelRowNumber, productName, success: false, message: `1차카테고리 "${cat1Name}"를 찾을 수 없어요.` }); return; }
      category1Id = c1.id;

      if (cat2Name) {
        const c2 = (c1.children || []).find((c) => c.categoryName === cat2Name);
        if (!c2) { rowErrors.push({ rowIndex: excelRowNumber, productName, success: false, message: `2차카테고리 "${cat2Name}"를 찾을 수 없어요.` }); return; }
        category2Id = c2.id;

        if (cat3Name) {
          const c3 = (c2.children || []).find((c) => c.categoryName === cat3Name);
          if (!c3) { rowErrors.push({ rowIndex: excelRowNumber, productName, success: false, message: `3차카테고리 "${cat3Name}"를 찾을 수 없어요.` }); return; }
          category3Id = c3.id;
        }
      }
    }

    let brandId = null;
    if (brandName) {
      const b = brands.find((br) => br.brandNameKr === brandName);
      if (!b) { rowErrors.push({ rowIndex: excelRowNumber, productName, success: false, message: `브랜드 "${brandName}"를 찾을 수 없어요.` }); return; }
      brandId = b.id;
    }

    const options = parseOptionsCell(row[25]);

    requests.push({
      __rowIndex: excelRowNumber,
      barcode: parseTextCell(row[0]),
      productNumber: parseTextCell(row[1]),
      productName,
      spec: parseTextCell(row[3]),
      consumerPrice: parseNumberCell(row[4]),
      recommendedPrice: parseNumberCell(row[5]),
      unit: parseTextCell(row[6]),
      unitQuantity: parseNumberCell(row[7]),
      packQuantity: parseNumberCell(row[8]),
      category1Id, category2Id, category3Id, brandId,
      countryOfOrigin: parseTextCell(row[13]),
      sellerPrice1: parseNumberCell(row[14]),
      sellerPrice2: parseNumberCell(row[15]),
      sellerPrice3: parseNumberCell(row[16]),
      keyword: parseTextCell(row[17]),
      description: parseTextCell(row[18]),
      stockOutYn: parseYn(row[19]),
      discontinuedYn: parseYn(row[20]),
      bundleYn: parseYn(row[21]),
      importedYn: parseYn(row[22]),
      newRegisteredYn: parseYn(row[23]),
      newProductYn: parseYn(row[24]),
      hasOptionYn: options.length > 0,
      options,
    });
  });

  return { requests, rowErrors };
}

const BULK_BATCH_SIZE = 30; // 이 개수씩 나눠서 서버로 보내면서 진행률을 갱신합니다

function showBulkProgress(processed, total) {
  document.getElementById('bulkResultDone').style.display = 'none';
  document.getElementById('bulkProgressWrap').style.display = 'block';
  updateBulkProgress(processed, total);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('bulkResultModal')).show();
}

function updateBulkProgress(processed, total) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  document.getElementById('bulkProgressBar').style.width = pct + '%';
  document.getElementById('bulkProgressPercent').textContent = pct + '%';
  document.getElementById('bulkProgressLabel').textContent = `${processed} / ${total}건 처리 중...`;
}

function showBulkResult(successCount, failCount, rows) {
  document.getElementById('bulkProgressWrap').style.display = 'none';
  document.getElementById('bulkResultDone').style.display = 'block';
  document.getElementById('bulkResultSummary').innerHTML = `
    <span class="ok"><b>${successCount}</b>건 성공</span>
    <span class="fail"><b>${failCount}</b>건 실패</span>
  `;
  document.getElementById('bulkResultTableBody').innerHTML = rows.map((r) => `
    <tr class="${r.success ? 'bulk-result-row-ok' : 'bulk-result-row-fail'}">
      <td>${r.rowIndex}</td>
      <td>${escapeHtml(r.productName || '-')}</td>
      <td>${r.success ? '성공' : '실패'}</td>
      <td>${escapeHtml(r.message || '')}</td>
    </tr>
  `).join('');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('bulkResultModal')).show();
}

async function handleBulkUpload(file) {
  const btn = document.getElementById('bulkUploadBtn');
  const originalHtml = btn.innerHTML;
  btn.classList.add('is-loading');
  btn.textContent = '처리 중...';

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1); // 헤더 행 제외
    const rows = allRows.filter((r) => r && r.some((cell) => cell !== undefined && cell !== ''));

    if (rows.length === 0) {
      alert('엑셀에 등록할 데이터가 없어요. 양식을 다운로드해서 확인해주세요.');
      return;
    }

    const { requests, rowErrors } = await buildBulkRequests(rows);
    const total = rows.length; // 파싱 단계 실패 행도 포함한 전체 대상 건수

    let successCount = 0;
    let failCount = rowErrors.length;
    const resultRows = [...rowErrors];

    showBulkProgress(rowErrors.length, total); // 파싱 단계에서 걸러진 행은 이미 처리된 걸로 집계

    // BULK_BATCH_SIZE개씩 나눠서 순차적으로 서버에 보내고, 배치가 끝날 때마다 진행률을 갱신합니다.
    for (let i = 0; i < requests.length; i += BULK_BATCH_SIZE) {
      const batch = requests.slice(i, i + BULK_BATCH_SIZE);
      const payload = batch.map(({ __rowIndex, ...req }) => req);

      const serverResult = await fetchJSON(`${API_BASE}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      serverResult.rows.forEach((r, idx) => {
        r.rowIndex = batch[idx].__rowIndex;
        resultRows.push(r);
      });
      successCount += serverResult.successCount;
      failCount += serverResult.failCount;

      updateBulkProgress(rowErrors.length + i + batch.length, total);
    }

    resultRows.sort((a, b) => a.rowIndex - b.rowIndex);
    showBulkResult(successCount, failCount, resultRows);
    if (successCount > 0) loadProducts();
  } catch (err) {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('bulkResultModal')).hide();
    alert('엑셀 파일을 처리하는 중 오류가 발생했어요: ' + err.message);
  } finally {
    btn.classList.remove('is-loading');
    btn.innerHTML = originalHtml;
  }
}

document.getElementById('bulkTemplateBtn').addEventListener('click', downloadBulkTemplate);
document.getElementById('bulkUploadBtn').addEventListener('click', () => {
  document.getElementById('bulkUploadFileInput').click();
});
document.getElementById('bulkUploadFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 초기화
  if (file) handleBulkUpload(file);
});

// ── 카드광고1 관리 ──────────────────────────────
// 대시보드 카드광고 영역에 슬라이드로 노출할 상품을 최대 5개 고릅니다. 순서 = 저장한 순서 = 슬라이드 순서.

const CARD_AD_SLOT_KEY = 'card-ad-1';
let cardAd1Selected = []; // 지금 화면에서 고른 상품들 (ProductResponse 형태)

async function loadCardAd1() {
  try {
    cardAd1Selected = await fetchJSON(`/admin/card-ads/${CARD_AD_SLOT_KEY}`);
  } catch (e) {
    cardAd1Selected = [];
  }
  renderCardAd1Selected();
  document.getElementById('cardAd1SearchInput').value = '';
  document.getElementById('cardAd1SearchResults').innerHTML = '';
}

function renderCardAd1Selected() {
  const el = document.getElementById('cardAd1SelectedList');
  if (cardAd1Selected.length === 0) {
    el.innerHTML = '<div class="cardad-selected-empty">아직 선택된 상품이 없어요. 아래에서 검색해서 추가해주세요.</div>';
    return;
  }
  el.innerHTML = cardAd1Selected.map((p, idx) => `
    <div class="cardad-selected-row">
      <span class="cardad-selected-order">${idx + 1}</span>
      <div class="cardad-selected-thumb">
        ${p.mainImageThumbUrl ? `<img src="${escapeHtml(p.mainImageThumbUrl)}" alt="">` : ''}
      </div>
      <span class="cardad-selected-name">${escapeHtml(p.productName)}</span>
      <span class="cardad-selected-price">${p.consumerPrice != null ? '₩' + Number(p.consumerPrice).toLocaleString('ko-KR') : '-'}</span>
      <button type="button" class="cardad-remove-btn" data-id="${p.id}" title="빼기">✕</button>
    </div>
  `).join('');

  el.querySelectorAll('.cardad-remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      cardAd1Selected = cardAd1Selected.filter((p) => p.id !== Number(btn.dataset.id));
      renderCardAd1Selected();
      renderCardAd1SearchResults(document.getElementById('cardAd1SearchInput').value.trim());
    });
  });
}

function renderCardAd1SearchResults(query) {
  const resultsEl = document.getElementById('cardAd1SearchResults');
  if (!query) {
    resultsEl.innerHTML = '';
    return;
  }

  const q = query.toLowerCase();
  const selectedIds = new Set(cardAd1Selected.map((p) => p.id));
  const matches = allProducts.filter((p) => p.productName && p.productName.toLowerCase().includes(q)).slice(0, 20);

  if (matches.length === 0) {
    resultsEl.innerHTML = '<div class="cardad-selected-empty">검색 결과가 없어요.</div>';
    return;
  }

  resultsEl.innerHTML = matches.map((p) => {
    const already = selectedIds.has(p.id);
    const full = cardAd1Selected.length >= 5;
    return `
      <div class="cardad-search-row">
        <div class="cardad-search-thumb">${p.mainImageThumbUrl ? `<img src="${escapeHtml(p.mainImageThumbUrl)}" alt="">` : ''}</div>
        <span class="cardad-search-name">${escapeHtml(p.productName)}</span>
        <button type="button" class="cardad-add-btn" data-id="${p.id}" ${already || full ? 'disabled' : ''}>
          ${already ? '추가됨' : '추가'}
        </button>
      </div>
    `;
  }).join('');

  resultsEl.querySelectorAll('.cardad-add-btn:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = allProducts.find((p) => p.id === Number(btn.dataset.id));
      if (product && cardAd1Selected.length < 5 && !cardAd1Selected.some((p) => p.id === product.id)) {
        cardAd1Selected.push(product);
        renderCardAd1Selected();
        renderCardAd1SearchResults(query);
      }
    });
  });
}

document.getElementById('cardAd1SearchInput').addEventListener('keyup', (e) => {
  renderCardAd1SearchResults(e.target.value.trim());
});

document.getElementById('cardAd1SaveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('cardAd1SaveBtn');
  btn.disabled = true;
  try {
    await fetchJSON(`/admin/card-ads/${CARD_AD_SLOT_KEY}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: cardAd1Selected.map((p) => p.id) }),
    });
    alert('카드광고1을 저장했어요.');
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
});

// ── 초기 로드 ──────────────────────────────

setupCategoryCascade('reg');
setupCategoryCascade('edit');
loadBrandOptions(document.getElementById('regBrand'));

// ── 브랜드등록 팝업 연동 ──────────────────────────────
// "브랜드등록" 버튼 -> 새 창에서 브랜드관리 페이지를 등록 폼이 바로 열린 상태로 띄우고,
// 그 창에서 등록이 끝나면 postMessage로 알려줘서 이 페이지는 브랜드 select만 새로고침합니다.

function reloadBrandSelect(selectToId) {
  const selectEl = document.getElementById('regBrand');
  const placeholder = selectEl.querySelector('option[value=""]');
  selectEl.innerHTML = '';
  selectEl.appendChild(placeholder || new Option('선택 안함', ''));
  loadBrandOptions(selectEl).then(() => {
    if (selectToId != null) selectEl.value = String(selectToId);
  });
}

document.getElementById('regOpenBrandRegisterBtn').addEventListener('click', () => {
  window.open('/admin/brands?action=create', 'brandRegisterPopup', 'width=900,height=820');
});

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  if (e.data && e.data.type === 'brand-created') {
    reloadBrandSelect(e.data.brandId);
  }
});
loadBrandOptions(document.getElementById('editBrand'));

// 상단바 검색창(searchNavUrl이 없으면 페이지가 직접 처리하는 구조 — topbar-search.js 참고)
// 키를 눌렀다 뗄 때마다(keyup) 바로 목록에 반영됩니다. 한영 오타 제안을 클릭했을 때는
// topbar-search.js가 input 이벤트를 대신 쏴주기 때문에 그것도 같이 받아줍니다.
function handleTopbarSearchChange(e) {
  searchQuery = e.target.value.trim();
  currentPage = 1;
  renderTable();
}
document.getElementById('topbarSearchInput').addEventListener('keyup', handleTopbarSearchChange);
document.getElementById('topbarSearchInput').addEventListener('input', handleTopbarSearchChange);

loadProducts();
