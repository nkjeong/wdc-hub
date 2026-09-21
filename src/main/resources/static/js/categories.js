// 카테고리관리 페이지 — 1차/2차/3차 카테고리 조회·등록·수정·삭제 (관리자 전용)
// CSRF는 현재 프로젝트 설정상 꺼져있는 상태라 별도 토큰 헤더 없이 fetch 호출합니다.
// (운영 전환 시 CSRF를 다시 켜면 이 부분도 토큰을 함께 보내도록 수정해야 합니다.)

const API_BASE = document.body.dataset.apiBase;

const state = { category1Id: null, category2Id: null };
let treeCache = null;     // 검색에 쓰는 1~3차 전체 트리 (등록/수정/삭제하면 비워서 다시 받아옵니다)
let treeLoadedAt = 0;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function fetchJSON(url, options) {
  if (options && options.method && options.method !== 'GET') treeCache = null;   // 카테고리가 바뀌면 검색용 트리도 다시 받아오게
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

function buildRow(c, selectable) {
  const li = document.createElement('li');
  li.className = 'cat-row';

  const selectHtml = selectable
    ? `<button type="button" class="cat-select" data-id="${c.id}">
         <span class="cat-code">${escapeHtml(c.categoryCode)}</span>
         <span class="cat-name">${escapeHtml(c.categoryName)}</span>
       </button>`
    : `<div class="cat-select" style="cursor:default;">
         <span class="cat-code">${escapeHtml(c.categoryCode)}</span>
         <span class="cat-name">${escapeHtml(c.categoryName)}</span>
       </div>`;

  li.innerHTML = `
    ${selectHtml}
    <div class="cat-actions">
      <button type="button" class="cat-edit" data-id="${c.id}" data-name="${escapeHtml(c.categoryName)}" title="이름 수정">✎</button>
      <button type="button" class="cat-del" data-id="${c.id}" title="삭제">✕</button>
    </div>`;
  return li;
}

// ── 1차 카테고리 ──────────────────────────────

async function loadCategory1() {
  const list = await fetchJSON(`${API_BASE}/category1`);
  renderCategory1(list);
}

function renderCategory1(list) {
  const ul = document.getElementById('cat1List');
  document.getElementById('cat1Count').textContent = list.length + '건';
  ul.innerHTML = '';

  if (list.length === 0) {
    ul.innerHTML = '<li class="cat-empty">등록된 카테고리가 없어요.</li>';
    return;
  }

  list.forEach((c) => {
    const li = buildRow(c, true);
    if (c.id === state.category1Id) li.classList.add('active');
    ul.appendChild(li);
  });
}

document.getElementById('cat1List').addEventListener('click', async (e) => {
  const selectBtn = e.target.closest('.cat-select');
  const editBtn = e.target.closest('.cat-edit');
  const delBtn = e.target.closest('.cat-del');

  if (selectBtn) {
    state.category1Id = Number(selectBtn.dataset.id);
    state.category2Id = null;
    await loadCategory1();
    await onCategory1Selected(state.category1Id);
  } else if (editBtn) {
    const newName = prompt('새 카테고리명을 입력하세요.', editBtn.dataset.name);
    if (!newName || !newName.trim()) return;
    await fetchJSON(`${API_BASE}/category1/${editBtn.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: newName.trim(), sortOrder: null, useYn: null }),
    });
    await loadCategory1();
  } else if (delBtn) {
    if (!confirm('이 카테고리를 삭제할까요? 삭제하면 되돌릴 수 없어요. (하위 2차 카테고리가 있으면 삭제되지 않아요)')) return;
    try {
      await fetchJSON(`${API_BASE}/category1/${delBtn.dataset.id}`, { method: 'DELETE' });
      if (state.category1Id === Number(delBtn.dataset.id)) {
        state.category1Id = null;
        state.category2Id = null;
        resetCategory2();
        resetCategory3();
      }
      await loadCategory1();
    } catch (err) {
      alert(err.message);
    }
  }
});

document.getElementById('cat1AddForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('cat1NameInput');
  const name = input.value.trim();
  if (!name) return;
  try {
    await fetchJSON(`${API_BASE}/category1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: name }),
    });
    input.value = '';
    await loadCategory1();
  } catch (err) {
    alert(err.message);
  }
});

// ── 2차 카테고리 ──────────────────────────────

async function onCategory1Selected(category1Id) {
  document.getElementById('cat2Hint').style.display = 'none';
  document.getElementById('cat2AddForm').style.display = 'flex';
  await loadCategory2(category1Id);
  resetCategory3();
}

function resetCategory2() {
  document.getElementById('cat2Hint').style.display = 'block';
  document.getElementById('cat2AddForm').style.display = 'none';
  document.getElementById('cat2List').innerHTML = '';
  document.getElementById('cat2Count').textContent = '0건';
}

async function loadCategory2(category1Id) {
  const list = await fetchJSON(`${API_BASE}/category1/${category1Id}/category2`);
  renderCategory2(list);
}

function renderCategory2(list) {
  const ul = document.getElementById('cat2List');
  document.getElementById('cat2Count').textContent = list.length + '건';
  ul.innerHTML = '';

  if (list.length === 0) {
    ul.innerHTML = '<li class="cat-empty">등록된 중간 카테고리가 없어요.</li>';
    return;
  }

  list.forEach((c) => {
    const li = buildRow(c, true);
    if (c.id === state.category2Id) li.classList.add('active');
    ul.appendChild(li);
  });
}

document.getElementById('cat2List').addEventListener('click', async (e) => {
  const selectBtn = e.target.closest('.cat-select');
  const editBtn = e.target.closest('.cat-edit');
  const delBtn = e.target.closest('.cat-del');

  if (selectBtn) {
    state.category2Id = Number(selectBtn.dataset.id);
    await loadCategory2(state.category1Id);
    await onCategory2Selected(state.category2Id);
  } else if (editBtn) {
    const newName = prompt('새 카테고리명을 입력하세요.', editBtn.dataset.name);
    if (!newName || !newName.trim()) return;
    await fetchJSON(`${API_BASE}/category2/${editBtn.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: newName.trim(), sortOrder: null, useYn: null }),
    });
    await loadCategory2(state.category1Id);
  } else if (delBtn) {
    if (!confirm('이 카테고리를 삭제할까요? 삭제하면 되돌릴 수 없어요. (하위 3차 카테고리가 있으면 삭제되지 않아요)')) return;
    try {
      await fetchJSON(`${API_BASE}/category2/${delBtn.dataset.id}`, { method: 'DELETE' });
      if (state.category2Id === Number(delBtn.dataset.id)) {
        state.category2Id = null;
        resetCategory3();
      }
      await loadCategory2(state.category1Id);
    } catch (err) {
      alert(err.message);
    }
  }
});

document.getElementById('cat2AddForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.category1Id) return;
  const input = document.getElementById('cat2NameInput');
  const name = input.value.trim();
  if (!name) return;
  try {
    await fetchJSON(`${API_BASE}/category2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: name, category1Id: state.category1Id }),
    });
    input.value = '';
    await loadCategory2(state.category1Id);
  } catch (err) {
    alert(err.message);
  }
});

// ── 3차 카테고리 ──────────────────────────────

async function onCategory2Selected(category2Id) {
  document.getElementById('cat3Hint').style.display = 'none';
  document.getElementById('cat3AddForm').style.display = 'flex';
  await loadCategory3(category2Id);
}

function resetCategory3() {
  document.getElementById('cat3Hint').style.display = 'block';
  document.getElementById('cat3AddForm').style.display = 'none';
  document.getElementById('cat3List').innerHTML = '';
  document.getElementById('cat3Count').textContent = '0건';
}

async function loadCategory3(category2Id) {
  const list = await fetchJSON(`${API_BASE}/category2/${category2Id}/category3`);
  renderCategory3(list);
}

function renderCategory3(list) {
  const ul = document.getElementById('cat3List');
  document.getElementById('cat3Count').textContent = list.length + '건';
  ul.innerHTML = '';

  if (list.length === 0) {
    ul.innerHTML = '<li class="cat-empty">등록된 최하위 카테고리가 없어요.</li>';
    return;
  }

  list.forEach((c) => {
    ul.appendChild(buildRow(c, false)); // 3차는 선택 대상이 없어서 클릭 불가
  });
}

document.getElementById('cat3List').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('.cat-edit');
  const delBtn = e.target.closest('.cat-del');

  if (editBtn) {
    const newName = prompt('새 카테고리명을 입력하세요.', editBtn.dataset.name);
    if (!newName || !newName.trim()) return;
    await fetchJSON(`${API_BASE}/category3/${editBtn.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: newName.trim(), sortOrder: null, useYn: null }),
    });
    await loadCategory3(state.category2Id);
  } else if (delBtn) {
    if (!confirm('이 카테고리를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
    try {
      await fetchJSON(`${API_BASE}/category3/${delBtn.dataset.id}`, { method: 'DELETE' });
      await loadCategory3(state.category2Id);
    } catch (err) {
      alert(err.message);
    }
  }
});

document.getElementById('cat3AddForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.category2Id) return;
  const input = document.getElementById('cat3NameInput');
  const name = input.value.trim();
  if (!name) return;
  try {
    await fetchJSON(`${API_BASE}/category3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: name, category2Id: state.category2Id }),
    });
    input.value = '';
    await loadCategory3(state.category2Id);
  } catch (err) {
    alert(err.message);
  }
});

// ── 상단바 검색 ───────────────────────────────
// 검색어를 띄어쓰기로 나눠서, 1차 > 2차 > 3차 경로에 모든 단어가 들어 있는 카테고리를 찾아 줍니다 (AND 검색).
// 예) "식품 사과" → 식품 > 과일 > 사과.  결과를 누르면 아래 1·2·3차 목록이 그 위치로 이동합니다.

const MENU_API = document.body.dataset.menuApi;   // /categories/menu (1~3차 전체 트리)
const SEARCH_LIMIT = 50;
const searchPanel = document.getElementById('catSearchPanel');
const searchList = document.getElementById('catSearchList');
const searchCountEl = document.getElementById('catSearchCount');
let searchTimer = null;

async function loadTree() {
  const fresh = treeCache && (Date.now() - treeLoadedAt < 30000);
  if (fresh) return treeCache;
  treeCache = await fetchJSON(MENU_API);
  treeLoadedAt = Date.now();
  return treeCache;
}

// 트리를 "경로 한 줄" 목록으로 펼칩니다. 더 내려갈 곳이 없는 카테고리(맨 아래 단계)마다 한 줄이에요.
function flattenTree(tree) {
  const rows = [];
  (tree || []).forEach((c1) => {
    const c2s = c1.children || [];
    if (!c2s.length) rows.push({ names: [c1.categoryName], c1: c1.id, c2: null, c3: null });
    c2s.forEach((c2) => {
      const c3s = c2.children || [];
      if (!c3s.length) rows.push({ names: [c1.categoryName, c2.categoryName], c1: c1.id, c2: c2.id, c3: null });
      c3s.forEach((c3) => rows.push({ names: [c1.categoryName, c2.categoryName, c3.categoryName], c1: c1.id, c2: c2.id, c3: c3.id }));
    });
  });
  return rows;
}

async function runSearch(query) {
  if (!query) {
    searchPanel.style.display = 'none';
    searchList.innerHTML = '';
    return;
  }

  let tree;
  try {
    tree = await loadTree();
  } catch (e) {
    searchPanel.style.display = '';
    searchCountEl.textContent = '';
    searchList.innerHTML = `<li class="cat-search-empty">${escapeHtml(e.message)}</li>`;
    return;
  }

  const input = document.getElementById('topbarSearchInput');
  if (input && input.value.trim() !== query) return;   // 그 사이 검색어가 또 바뀌었으면 이 결과는 버립니다

  const match = window.SearchUtils ? SearchUtils.matcher(query) : (f) => f[0].toLowerCase().includes(query.toLowerCase());
  const hits = flattenTree(tree).filter((row) => match([row.names.join(' ')]));

  searchPanel.style.display = '';
  searchCountEl.textContent = `${hits.length}건`;

  if (!hits.length) {
    searchList.innerHTML = '<li class="cat-search-empty">검색 결과가 없어요. 다른 검색어로 찾아 보세요.</li>';
    return;
  }

  const shown = hits.slice(0, SEARCH_LIMIT);
  searchList.innerHTML = shown.map((row) => `
    <li><button type="button" class="cat-search-item" data-c1="${row.c1}" data-c2="${row.c2 ?? ''}" data-c3="${row.c3 ?? ''}">
      ${row.names.map((n) => escapeHtml(n)).join('<span class="sep">›</span>')}<span class="lv">${row.names.length}차</span>
    </button></li>`).join('') +
    (hits.length > SEARCH_LIMIT ? `<li class="cat-search-more">${hits.length}건 중 앞의 ${SEARCH_LIMIT}건만 보여요. 검색어를 더 자세히 입력해 주세요.</li>` : '');
}

// 검색 결과를 누르면, 아래 1·2·3차 목록이 그 카테고리를 선택한 상태로 이동합니다
async function selectFromSearch(c1, c2, c3) {
  state.category1Id = c1;
  state.category2Id = c2 || null;
  await loadCategory1();
  await onCategory1Selected(c1);
  if (c2) {
    await loadCategory2(c1);
    await onCategory2Selected(c2);
  }
  if (c3) {
    const btn = document.querySelector(`#cat3List [data-id="${c3}"]`);
    const li = btn && btn.closest('.cat-row');
    if (li) li.classList.add('active');
  }
  const columns = document.getElementById('catColumns');
  if (columns) columns.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

searchList.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-search-item');
  if (!btn) return;
  selectFromSearch(Number(btn.dataset.c1), btn.dataset.c2 ? Number(btn.dataset.c2) : null, btn.dataset.c3 ? Number(btn.dataset.c3) : null)
    .catch((err) => alert(err.message));
});

const topSearchInput = document.getElementById('topbarSearchInput');
if (topSearchInput) {
  topSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = topSearchInput.value.trim();
    searchTimer = setTimeout(() => runSearch(q), 200);
  });
}

// ── 초기 로드 ──────────────────────────────

loadCategory1();
