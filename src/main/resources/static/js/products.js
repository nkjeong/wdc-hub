// 상품관리 페이지 — 탭 전환, 목록 조회, 등록, 수정(Offcanvas), 삭제 (관리자 전용)
// 대표이미지는 원본 1장만 선택하면 서버가 썸네일/미디엄/원본 3개를 만들어 저장합니다.
// 상세이미지는 리사이즈 없이 원본 그대로 여러 장 저장됩니다.
// 업로드 진행률은 fetch가 아니라 XMLHttpRequest로 전송해야 표시할 수 있어서 XHR을 사용합니다.
// CSRF는 현재 프로젝트 설정상 꺼져있는 상태라 별도 토큰 헤더 없이 전송합니다.

const API_BASE = document.body.dataset.apiBase;                 // /admin/products
const CATEGORY_API_BASE = document.body.dataset.categoryApiBase; // /admin/categories
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
  return path.startsWith('/') ? path : `/${path}`;
}

// ── 탭 전환 ──────────────────────────────────

const tabs = document.querySelectorAll('#productTabs .tab');
tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

function switchTab(name) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.getElementById('productListPanel').style.display = name === 'list' ? 'block' : 'none';
  document.getElementById('productRegisterPanel').style.display = name === 'register' ? 'block' : 'none';
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
    <input type="number" class="calc-input opt-price" placeholder="추가금액">
    <input type="number" class="calc-input opt-stock" placeholder="재고수량">
    <button type="button" class="btn-del-option" title="삭제">✕</button>
  `;
  if (values) {
    row.querySelector('.opt-name').value = values.optionName ?? '';
    row.querySelector('.opt-value').value = values.optionValue ?? '';
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

function statusPills(p) {
  const pills = [];
  if (p.newRegisteredYn) pills.push('<span class="status-pill newin">신규등록</span>');
  if (p.newProductYn) pills.push('<span class="status-pill newin">신상품</span>');
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

function renderTable() {
  productCountEl.textContent = allProducts.length + '건';

  if (allProducts.length === 0) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="10">등록된 상품이 없어요. "상품 등록" 탭에서 추가해보세요.</td></tr>';
    return;
  }

  tableBody.innerHTML = allProducts.map((p) => `
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
          <button type="button" class="btn-edit-row" data-id="${p.id}">수정</button>
          <button type="button" class="btn-del-row" data-id="${p.id}">삭제</button>
        </div>
      </td>
    </tr>
  `).join('');
}

tableBody.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.btn-edit-row');
  const delBtn = e.target.closest('.btn-del-row');

  if (editBtn) {
    const product = allProducts.find((p) => p.id === Number(editBtn.dataset.id));
    if (product) openEditOffcanvas(product);
  } else if (delBtn) {
    handleDelete(Number(delBtn.dataset.id));
  }
});

async function handleDelete(id) {
  if (!confirm('이 상품을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
  try {
    await fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' });
    await loadProducts();
  } catch (e) {
    alert(e.message);
  }
}

// ── 상품 등록 ──────────────────────────────

function resetRegisterForm() {
  document.getElementById('registerForm').reset(); // file input도 함께 비워집니다
  resetCategorySelection('reg');
  showMainImagePreview('reg', null);
  showDetailImagePreview('reg', [], '선택한 이미지가 여기에 미리보기로 표시돼요');
  resetOptionUI('reg');
  hideProgress('reg');
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await submitProductForm('reg', 'POST', API_BASE);
    resetRegisterForm();
    switchTab('list');
    await loadProducts();
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

// ── 초기 로드 ──────────────────────────────

setupCategoryCascade('reg');
setupCategoryCascade('edit');
loadBrandOptions(document.getElementById('regBrand'));
loadBrandOptions(document.getElementById('editBrand'));
loadProducts();
