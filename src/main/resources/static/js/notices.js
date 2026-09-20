// 공지사항관리 페이지 — 조회(페이징)·등록·수정·삭제 (관리자 전용)
// 대시보드 위젯(최근 4개)과 공지사항 전체보기 화면이 여기서 등록한 내용을 그대로 보여줍니다.
// CSRF는 현재 프로젝트 설정상 꺼져있는 상태라 별도 토큰 헤더 없이 fetch 호출합니다.

const API_BASE = document.body.dataset.apiBase; // /admin/notices
const PAGE_SIZE = 10;

let allNotices = [];
let currentPage = 1;
let editingId = null; // null이면 등록 모드, 값이 있으면 수정 모드

const tableBody = document.getElementById('noticeTableBody');
const noticeCountEl = document.getElementById('noticeCount');
const paginationEl = document.getElementById('noticePagination');
const formPanel = document.getElementById('noticeFormPanel');
const formTitle = document.getElementById('noticeFormTitle');
const noticeForm = document.getElementById('noticeForm');

const TAG_LABELS = { UPDATE: '업데이트', MAINT: '점검', NOTICE: '안내', NEW: '신규', PRICE: '소비자가', PRICE_UP: '단가인상' };

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

// ── 공지사항 목록 ──────────────────────────────

async function loadNotices() {
  tableBody.innerHTML = '<tr class="empty-row"><td colspan="4">불러오는 중...</td></tr>';
  try {
    allNotices = await fetchJSON(`${API_BASE}/list`);
    currentPage = 1;
    renderTable();
    renderPagination();
  } catch (e) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="4">${escapeHtml(e.message)}</td></tr>`;
  }
}

function renderTable() {
  noticeCountEl.textContent = allNotices.length + '건';

  if (allNotices.length === 0) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="4">등록된 공지사항이 없어요. 위의 "공지 등록" 버튼으로 추가해보세요.</td></tr>';
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allNotices.slice(start, start + PAGE_SIZE);

  tableBody.innerHTML = pageItems.map((n) => `
    <tr>
      <td><span class="notice-tag ${n.tag.toLowerCase()}">${escapeHtml(n.tagLabel)}</span></td>
      <td>
        <button type="button" class="notice-title-link" data-id="${n.id}" style="background:none;border:none;padding:0;color:var(--text);font-family:inherit;font-size:inherit;text-align:left;cursor:pointer;">
          ${escapeHtml(n.title)}
        </button>
      </td>
      <td class="muted mono">${n.createdAt ? n.createdAt.slice(0, 10) : '-'}</td>
      <td><button type="button" class="btn-del-row" data-id="${n.id}">삭제</button></td>
    </tr>
  `).join('');
}

tableBody.addEventListener('click', (e) => {
  const titleBtn = e.target.closest('.notice-title-link');
  const delBtn = e.target.closest('.btn-del-row');

  if (titleBtn) {
    const notice = allNotices.find((n) => n.id === Number(titleBtn.dataset.id));
    if (notice) openEditForm(notice);
  } else if (delBtn) {
    handleDelete(Number(delBtn.dataset.id));
  }
});

async function handleDelete(id) {
  if (!confirm('이 공지사항을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
  try {
    await fetchJSON(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (editingId === id) closeForm();
    await loadNotices();
  } catch (e) {
    alert(e.message);
  }
}

// ── 페이지네이션 ──────────────────────────────

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(allNotices.length / PAGE_SIZE));
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
  const totalPages = Math.max(1, Math.ceil(allNotices.length / PAGE_SIZE));
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTable();
  renderPagination();
}

// ── 등록/수정 폼 ──────────────────────────────

function resetForm() {
  noticeForm.reset();
  document.getElementById('noticeId').value = '';
}

function openCreateForm() {
  editingId = null;
  resetForm();
  formTitle.textContent = '공지 등록';
  formPanel.style.display = 'block';
  formPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openEditForm(notice) {
  editingId = notice.id;
  resetForm();
  document.getElementById('noticeId').value = notice.id;
  document.getElementById('noticeTag').value = notice.tag;
  document.getElementById('noticeTitle').value = notice.title;
  formTitle.textContent = '공지 수정 — ' + notice.title;
  formPanel.style.display = 'block';
  formPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeForm() {
  editingId = null;
  resetForm();
  formPanel.style.display = 'none';
}

document.getElementById('btnAddNotice').addEventListener('click', openCreateForm);
document.getElementById('btnCloseNoticeForm').addEventListener('click', closeForm);

noticeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    tag: document.getElementById('noticeTag').value,
    title: document.getElementById('noticeTitle').value.trim(),
  };

  try {
    if (editingId) {
      await fetchJSON(`${API_BASE}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetchJSON(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    closeForm();
    await loadNotices();
  } catch (err) {
    alert(err.message);
  }
});

// ── 초기 로드 ──────────────────────────────

loadNotices();
