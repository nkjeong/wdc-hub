// 브랜드관리 페이지 — 조회(페이징)·등록·수정·삭제 (관리자 전용)
// CSRF는 현재 프로젝트 설정상 꺼져있는 상태라 별도 토큰 헤더 없이 fetch 호출합니다.

const API_BASE = document.body.dataset.apiBase;           // /admin/brands
const CATEGORY1_API = document.body.dataset.category1Api; // /admin/categories/category1
const PAGE_SIZE = 10;

let allBrands = [];
let currentPage = 1;
let editingId = null; // null이면 등록 모드, 값이 있으면 수정 모드

const tableBody = document.getElementById('brandTableBody');
const brandCountEl = document.getElementById('brandCount');
const paginationEl = document.getElementById('brandPagination');
const formPanel = document.getElementById('brandFormPanel');
const formTitle = document.getElementById('brandFormTitle');
const editOnlyFields = document.getElementById('editOnlyFields');
const brandForm = document.getElementById('brandForm');
const category1Select = document.getElementById('brandCategory1');

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

// ── 1차 카테고리 드롭다운 ──────────────────────

async function loadCategory1Options() {
  try {
    const list = await fetchJSON(CATEGORY1_API);
    list.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.categoryName;
      category1Select.appendChild(opt);
    });
  } catch (e) {
    // 카테고리 목록을 못 불러와도 브랜드 관리 자체는 계속 쓸 수 있어야 하므로 조용히 무시
  }
}

// ── 브랜드 목록 ──────────────────────────────

async function loadBrands() {
  tableBody.innerHTML = '<tr class="empty-row"><td colspan="11">불러오는 중...</td></tr>';
  try {
    allBrands = await fetchJSON(`${API_BASE}/list`);
    currentPage = 1;
    renderTable();
    renderPagination();
  } catch (e) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="11">${escapeHtml(e.message)}</td></tr>`;
  }
}

function importTypeLabel(type) {
  if (type === 'OFFICIAL') return '<span class="type-pill official">정식수입</span>';
  if (type === 'PARALLEL') return '<span class="type-pill parallel">병행수입</span>';
  if (type === 'DIRECT_MANUFACTURE') return '<span class="type-pill direct">직접제조</span>';
  return '<span class="type-pill">-</span>';
}

function renderTable() {
  brandCountEl.textContent = allBrands.length + '건';

  if (allBrands.length === 0) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="11">등록된 브랜드가 없어요. 위의 "브랜드 등록" 버튼으로 추가해보세요.</td></tr>';
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allBrands.slice(start, start + PAGE_SIZE);

  tableBody.innerHTML = pageItems.map((b) => `
    <tr>
      <td class="mono">${escapeHtml(b.brandCode)}</td>
      <td>
        <button type="button" class="brand-name-link" data-id="${b.id}">${escapeHtml(b.brandNameKr)}</button>
        ${b.brandNameEn ? `<div class="brand-en">${escapeHtml(b.brandNameEn)}</div>` : ''}
      </td>
      <td>${escapeHtml(b.manufacturerName)}</td>
      <td>${b.importerName ? escapeHtml(b.importerName) : '<span class="member-sub">-</span>'}</td>
      <td class="brand-summary-cell" title="${escapeHtml(b.productSummary || '')}">${b.productSummary ? escapeHtml(b.productSummary) : '-'}</td>
      <td>${b.countryOfOrigin ? escapeHtml(b.countryOfOrigin) : '-'}</td>
      <td>${importTypeLabel(b.importType)}</td>
      <td>${b.category1Name ? escapeHtml(b.category1Name) : '<span class="member-sub">-</span>'}</td>
      <td class="mono">${b.sortOrder ?? '-'}</td>
      <td>${b.useYn ? '<span class="use-pill on">사용</span>' : '<span class="use-pill off">중지</span>'}</td>
      <td><button type="button" class="btn-del-row" data-id="${b.id}">삭제</button></td>
    </tr>
  `).join('');
}

tableBody.addEventListener('click', (e) => {
  const nameBtn = e.target.closest('.brand-name-link');
  const delBtn = e.target.closest('.btn-del-row');

  if (nameBtn) {
    const brand = allBrands.find((b) => b.id === Number(nameBtn.dataset.id));
    if (brand) openEditForm(brand);
  } else if (delBtn) {
    handleDelete(Number(delBtn.dataset.id));
  }
});

async function handleDelete(id) {
  if (!confirm('이 브랜드를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
  try {
    await fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (editingId === id) closeForm();
    await loadBrands();
  } catch (e) {
    alert(e.message);
  }
}

// ── 페이지네이션 ──────────────────────────────

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(allBrands.length / PAGE_SIZE));
  paginationEl.innerHTML = '';

  if (totalPages <= 1) return;

  const addBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-btn' + (opts.active ? ' active' : '');
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener('click', () => goToPage(page));
    paginationEl.appendChild(btn);
  };

  addBtn('‹', currentPage - 1, { disabled: currentPage === 1 });
  for (let p = 1; p <= totalPages; p++) {
    addBtn(String(p), p, { active: p === currentPage });
  }
  addBtn('›', currentPage + 1, { disabled: currentPage === totalPages });
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(allBrands.length / PAGE_SIZE));
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTable();
  renderPagination();
}

// ── 등록/수정 폼 ──────────────────────────────

function resetForm() {
  brandForm.reset();
  document.getElementById('brandId').value = '';
  category1Select.value = '';
  document.getElementById('useYn').checked = true;
  document.getElementById('brandNameDupWarning').textContent = '';
  brandNameConfirmedValue = null;
}

function openCreateForm() {
  editingId = null;
  resetForm();
  formTitle.textContent = '브랜드 등록';
  editOnlyFields.style.display = 'none';
  formPanel.style.display = 'block';
  formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openEditForm(brand) {
  editingId = brand.id;
  resetForm();
  formTitle.textContent = `브랜드 수정 — ${brand.brandNameKr}`;
  document.getElementById('brandId').value = brand.id;
  document.getElementById('brandNameKr').value = brand.brandNameKr || '';
  document.getElementById('brandNameEn').value = brand.brandNameEn || '';
  document.getElementById('manufacturerName').value = brand.manufacturerName || '';
  document.getElementById('importerName').value = brand.importerName || '';
  document.getElementById('productSummary').value = brand.productSummary || '';
  document.getElementById('countryOfOrigin').value = brand.countryOfOrigin || '';
  document.getElementById('importType').value = brand.importType || '';
  category1Select.value = brand.category1Id || '';
  document.getElementById('sortOrder').value = brand.sortOrder ?? '';
  document.getElementById('useYn').checked = !!brand.useYn;

  editOnlyFields.style.display = 'grid';
  formPanel.style.display = 'block';
  formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
  editingId = null;
  resetForm();
  formPanel.style.display = 'none';
}

document.getElementById('btnAddBrand').addEventListener('click', openCreateForm);
document.getElementById('btnCloseForm').addEventListener('click', closeForm);

brandForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const brandNameTyped = document.getElementById('brandNameKr').value.trim();
  if (brandNameConfirmedValue !== brandNameTyped) {
    alert('브랜드명 옆의 "사용" 버튼을 눌러 이름을 확정한 뒤 등록/수정해주세요.');
    document.getElementById('brandNameUseBtn').focus();
    return;
  }

  const basePayload = {
    brandNameKr: document.getElementById('brandNameKr').value.trim(),
    brandNameEn: document.getElementById('brandNameEn').value.trim() || null,
    manufacturerName: document.getElementById('manufacturerName').value.trim(),
    importerName: document.getElementById('importerName').value.trim() || null,
    productSummary: document.getElementById('productSummary').value.trim() || null,
    countryOfOrigin: document.getElementById('countryOfOrigin').value.trim() || null,
    importType: document.getElementById('importType').value || null,
    category1Id: category1Select.value ? Number(category1Select.value) : null,
  };

  try {
    if (editingId) {
      const payload = {
        ...basePayload,
        sortOrder: document.getElementById('sortOrder').value ? Number(document.getElementById('sortOrder').value) : null,
        useYn: document.getElementById('useYn').checked,
      };
      await fetchJSON(`${API_BASE}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      closeForm();
      await loadBrands();
    } else {
      const created = await fetchJSON(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      // 다른 페이지(예: 상품 등록 화면)에서 "브랜드등록" 버튼으로 새 창을 띄워 여기로 들어온 경우,
      // 부모 창에 새로 만든 브랜드를 알려주고 이 창은 자동으로 닫습니다.
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'brand-created', brandId: created.id, brandNameKr: created.brandNameKr }, window.location.origin);
        window.close();
        return;
      }

      closeForm();
      await loadBrands();
    }
  } catch (err) {
    alert(err.message);
  }
});

// ── 브랜드명 실시간 중복 유사도 확인 + "사용" 확정 ──────────────
// 키를 눌렀다 뗄 때마다(keyup) 검사합니다. 3글자 이상 서로 겹치면(포함 관계면) 경고를 보여줍니다.
// "사용" 버튼을 눌러 확정한 이름으로만 등록/수정할 수 있고, 이름을 다시 고치면 확정이 풀립니다.
// 수정 모드에서는 지금 수정 중인 브랜드 자기 자신은 비교 대상에서 빼줍니다.

let brandNameConfirmedValue = null; // "사용" 버튼으로 마지막으로 확정된 이름 값 (null = 아직 확정 안 됨/무효화됨)

function checkBrandNameSimilarity() {
  const warningEl = document.getElementById('brandNameDupWarning');
  const typed = document.getElementById('brandNameKr').value.trim();

  if (typed.length < 3) {
    warningEl.className = 'match-result';
    warningEl.textContent = '';
    return;
  }

  const isSimilar = allBrands.some((b) => {
    if (!b.brandNameKr) return false;
    if (editingId && b.id === editingId) return false; // 수정 중인 자기 자신은 제외
    return b.brandNameKr.includes(typed) || typed.includes(b.brandNameKr);
  });

  warningEl.className = isSimilar ? 'match-result none' : 'match-result';
  warningEl.textContent = isSimilar ? '이미 등록된 업체인지 확인하세요.' : '';
}

document.getElementById('brandNameKr').addEventListener('keyup', () => {
  brandNameConfirmedValue = null; // 값이 바뀌면 이전 확정은 무효화
  checkBrandNameSimilarity();
});

document.getElementById('brandNameUseBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('brandNameKr');
  const warningEl = document.getElementById('brandNameDupWarning');
  const typed = nameInput.value.trim();

  if (!typed) {
    warningEl.className = 'match-result none';
    warningEl.textContent = '브랜드명을 먼저 입력해주세요.';
    nameInput.focus();
    return;
  }

  brandNameConfirmedValue = typed;
  warningEl.className = 'match-result ok';
  warningEl.textContent = `"${typed}"(으)로 사용하도록 확정했어요.`;
});

// ── 초기 로드 ──────────────────────────────

loadCategory1Options();
loadBrands();

// 다른 화면에서 "브랜드등록" 버튼으로 새 창을 띄울 때 ?action=create를 붙여서 여는데,
// 그 경우 목록 화면 대신 바로 등록 폼을 열어줍니다.
if (new URLSearchParams(window.location.search).get('action') === 'create') {
  openCreateForm();
}
