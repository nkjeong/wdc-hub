// 카테고리관리 페이지 — 1차/2차/3차 카테고리 조회·등록·수정·삭제 (관리자 전용)
// CSRF는 현재 프로젝트 설정상 꺼져있는 상태라 별도 토큰 헤더 없이 fetch 호출합니다.
// (운영 전환 시 CSRF를 다시 켜면 이 부분도 토큰을 함께 보내도록 수정해야 합니다.)

const API_BASE = document.body.dataset.apiBase;

const state = { category1Id: null, category2Id: null };

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

// ── 초기 로드 ──────────────────────────────

loadCategory1();
