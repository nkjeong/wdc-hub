  // ---- today date ----
  document.getElementById('todayDate').textContent =
    new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  // ---- 최근 등록 상품 (탭별 최근 10개 고정, 실제 데이터: /products/list) ----
  const PRODUCTS_API = document.body.dataset.productsApi;
  const RECENT_LIMIT = 11; // 페이지당 개수
  let recentPage = 1;

  // 회원 등급별로 판매가1~3 중 하나만 보여줍니다.
  // NORMAL -> 판매가1, GOLD -> 판매가2, VIP -> 판매가3
  const MEMBER_GRADE = document.body.dataset.memberGrade || 'NORMAL';
  function gradeSellerPrice(p) {
    if (MEMBER_GRADE === 'GOLD') return p.sellerPrice2;
    if (MEMBER_GRADE === 'VIP') return p.sellerPrice3;
    return p.sellerPrice1;
  }

  let products = [];

  const statusLabel = { sell:['판매중','sell'], new:['신규','new'], low:['품절','low'], stop:['판매중지','stop'] };
  const won = n => n == null ? '-' : '₩' + Number(n).toLocaleString('ko-KR');
  const catLabel = { bundle:['번들상품','cat-bundle'], import:['수입상품','cat-import'], normal:['일반상품','cat-normal'] };

  // 등록일(createdAt) 기준으로 N일이 지나지 않았는지 확인합니다 (신규등록 배지 7일 만료용).
  function isWithinDays(createdAt, days) {
    if (!createdAt) return false;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs / (1000 * 60 * 60 * 24) <= days;
  }

  /**
   * 서버 ProductResponse를 테이블이 기대하는 모양으로 변환합니다.
   * - 구분(cat): bundleYn/importedYn이 둘 다 켜져 있을 수도 있어서, 번들 > 수입 > 일반 순으로 하나만 대표로 보여줍니다.
   * - 재고상태(status): discontinuedYn > stockOutYn > newRegisteredYn(등록일 7일 이내) > 판매중 순으로 우선순위를 둡니다.
   */
  function mapProduct(p) {
    let cat = 'normal';
    if (p.bundleYn) cat = 'bundle';
    else if (p.importedYn) cat = 'import';

    let status = 'sell';
    if (p.discontinuedYn) status = 'stop';
    else if (p.stockOutYn) status = 'low';
    else if (p.newRegisteredYn && isWithinDays(p.createdAt, 7)) status = 'new';

    const sellerPrice = gradeSellerPrice(p);
    let margin = null;
    if (p.consumerPrice && sellerPrice != null && Number(p.consumerPrice) > 0) {
      margin = ((Number(p.consumerPrice) - Number(sellerPrice)) / Number(p.consumerPrice)) * 100;
    }

    return {
      id: p.id,
      raw: p,
      name: p.productName,
      sub: p.spec || p.keyword || '',
      cat,
      maker: p.brandName || '-',
      consumer: p.consumerPrice,
      supply: sellerPrice,
      margin,
      status,
      date: p.createdAt ? p.createdAt.slice(0, 10).replace(/-/g, '.') : '-',
      thumb: p.mainImageThumbUrl,
    };
  }

  function renderRows(rows) {
    const tbody = document.getElementById('tbody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-faint); padding:32px 16px;">표시할 상품이 없어요.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(p => {
      const [cLabel, cClass] = catLabel[p.cat];
      const [sLabel, sClass] = statusLabel[p.status];
      const thumbStyle = p.thumb ? `background-image:url('${p.thumb}'); background-size:cover; background-position:center;` : '';
      return `<tr data-id="${p.id}">
        <td><div class="p-name"><div class="p-thumb" style="${thumbStyle}"></div><div><div class="p-name-tt">${p.name}</div><div class="p-name-sub">${p.sub}</div></div></div></td>
        <td><span class="cat-badge ${cClass}">${cLabel}</span></td>
        <td class="mono" style="color:var(--text-dim)">${p.maker}</td>
        <td class="mono">${won(p.consumer)}</td>
        <td class="mono">${won(p.supply)}</td>
        <td class="mono margin-up">${p.margin != null ? p.margin.toFixed(1) + '%' : '-'}</td>
        <td><span class="status-badge ${sClass}">${sLabel}</span></td>
        <td class="mono" style="color:var(--text-faint)">${p.date}</td>
      </tr>`;
    }).join('');
  }

  // ── 상품 상세 Offcanvas ──────────────────────────

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function sanitizeFileName(str) {
    return String(str).replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  // 개별 상품 다운로드용 — 다른 상품 목록 페이지들과 같은 컬럼 구성
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

  function downloadSingleProductExcel(raw) {
    const worksheet = XLSX.utils.json_to_sheet([toExcelRow(raw)]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '상품상세');

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `${sanitizeFileName(raw.productName || '상품')}_${stamp}.xlsx`);
  }

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
      downloadSingleProductExcel(raw);
    });

    const offcanvasEl = document.getElementById('productDetailOffcanvas');
    bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).show();
  }

  document.getElementById('tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const product = products.find(p => p.id === Number(row.dataset.id));
    if (product) openProductDetailOffcanvas(product);
  });

  /** 선택된 탭 기준으로 필터링한 뒤, 페이지당 10개씩 페이징해서 보여줍니다 (전체 목록은 /products 페이지에서) */
  function updateView() {
    const activeTab = document.querySelector('#tabs .tab.active');
    const filter = activeTab ? activeTab.dataset.cat : 'all';
    const filtered = products.filter(p => filter === 'all' || p.cat === filter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / RECENT_LIMIT));
    if (recentPage > totalPages) recentPage = totalPages;

    const start = (recentPage - 1) * RECENT_LIMIT;
    renderRows(filtered.slice(start, start + RECENT_LIMIT));
    renderRecentPagination(totalPages);
  }

  function renderRecentPagination(totalPages) {
    const el = document.getElementById('dashRecentPagination');
    el.innerHTML = '';
    if (totalPages <= 1) return;

    const addBtn = (label, page, opts = {}) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn' + (opts.active ? ' active' : '');
      btn.textContent = label;
      btn.disabled = !!opts.disabled;
      btn.addEventListener('click', () => { recentPage = page; updateView(); });
      el.appendChild(btn);
    };

    addBtn('‹', recentPage - 1, { disabled: recentPage === 1 });
    for (let p = 1; p <= totalPages; p++) {
      addBtn(String(p), p, { active: p === recentPage });
    }
    addBtn('›', recentPage + 1, { disabled: recentPage === totalPages });
  }

  /** 번들상품 진열 — 번들상품 중 최신 10개 (/products/list가 이미 최신순이라 필터링만 하면 됨) */
  function renderNewArrivals() {
    const grid = document.getElementById('newArrivalsGrid');
    const countEl = document.getElementById('newArrivalsCount');
    const items = products.filter((p) => p.cat === 'bundle').slice(0, 10);

    countEl.textContent = items.length + '개';

    if (items.length === 0) {
      grid.innerHTML = '<div class="new-arrivals-empty">등록된 번들상품이 없어요.</div>';
      return;
    }

    grid.innerHTML = items.map((p) => `
      <button type="button" class="new-arrival-card" data-id="${p.id}">
        <div class="new-arrival-image">
          ${p.thumb ? `<img src="${escapeHtml(p.thumb)}" alt="">` : '<div class="new-arrival-image-empty">이미지 없음</div>'}
        </div>
        <div class="new-arrival-name">${escapeHtml(p.name)}</div>
        <div class="new-arrival-brand">${escapeHtml(p.maker)}</div>
        <div class="new-arrival-price">${won(p.supply)}</div>
      </button>
    `).join('');

    grid.querySelectorAll('.new-arrival-card').forEach((card) => {
      card.addEventListener('click', () => {
        const product = products.find((p) => p.id === Number(card.dataset.id));
        if (product) openProductDetailOffcanvas(product);
      });
    });
  }

  async function loadProducts() {
    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-faint); padding:32px 16px;">불러오는 중...</td></tr>';
    try {
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error('상품 목록을 불러오지 못했어요.');
      const list = await res.json(); // /products/list는 이미 최신 등록순으로 정렬돼서 옵니다
      products = list.map(mapProduct);
      updateView();
      renderNewArrivals();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-faint); padding:32px 16px;">${e.message}</td></tr>`;
    }
  }

  document.getElementById('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if(!tab) return;
    document.querySelectorAll('#tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    recentPage = 1;
    updateView();
  });

  // ── 카드광고1 (관리자가 상품관리에서 고른 상품 최대 5개, fade in/out으로 순환) ──
  async function loadCardAd1() {
    const panel = document.getElementById('cardAd1Panel');
    const slidesEl = document.getElementById('cardAd1Slides');
    try {
      const res = await fetch('/card-ads/card-ad-1');
      if (!res.ok) throw new Error('카드광고를 불러오지 못했어요.');
      const items = await res.json();
      if (!items || items.length === 0) {
        panel.style.display = 'none';
        return;
      }

      panel.style.display = 'block';
      slidesEl.innerHTML = items.map((p, idx) => `
        <button type="button" class="card-ad-slide${idx === 0 ? ' active' : ''}" data-id="${p.id}">
          <div class="card-ad-image">
            ${p.mainImageDetailUrl || p.mainImageMediumUrl || p.mainImageThumbUrl
              ? `<img src="${escapeHtml(p.mainImageDetailUrl || p.mainImageMediumUrl || p.mainImageThumbUrl)}" alt="">`
              : ''}
          </div>
          <div class="card-ad-info">
            <div class="card-ad-name">${escapeHtml(p.productName)}</div>
            <div class="card-ad-price">${won(p.consumerPrice)}</div>
          </div>
        </button>
      `).join('');

      const slideEls = Array.from(slidesEl.querySelectorAll('.card-ad-slide'));
      slideEls.forEach((slideEl, idx) => {
        slideEl.addEventListener('click', () => openProductDetailOffcanvas({ raw: items[idx] }));
      });

      if (slideEls.length > 1) {
        let current = 0;
        setInterval(() => {
          slideEls[current].classList.remove('active');
          current = (current + 1) % slideEls.length;
          slideEls[current].classList.add('active');
        }, 3500);
      }
    } catch (e) {
      panel.style.display = 'none';
    }
  }

  loadCardAd1();

  loadProducts();

  // ---- calendar ----
  // "오늘"은 클라이언트 PC 시계가 아니라 서버가 내려준 날짜(data-server-today) 기준입니다.
  (function(){
    const serverTodayStr = document.body.dataset.serverToday; // "2026-09-18" 형식
    const serverToday = serverTodayStr ? new Date(serverTodayStr + 'T00:00:00') : new Date();

    const todayYear = serverToday.getFullYear();
    const todayMonth = serverToday.getMonth();
    const todayDate = serverToday.getDate();

    let viewYear = todayYear;
    let viewMonth = todayMonth;
    let animating = false;

    const events = { 15:'blue', 25:'blue' };
    const grid = document.getElementById('calGrid');
    const monthLabel = document.getElementById('calMonth');

    function buildGridHTML(year, month) {
      const first = new Date(year, month, 1);
      const startDow = first.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let html = ['일','월','화','수','목','금','토'].map(d => `<div class="cal-dow">${d}</div>`).join('');
      for (let i = 0; i < startDow; i++) html += `<div class="cal-cell faint"></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const isToday = year === todayYear && month === todayMonth && d === todayDate;
        const ev = events[d] ? `<span class="ev" style="background:var(--blue)"></span>` : '';
        html += `<div class="cal-cell ${isToday ? 'today' : ''}">${d}${ev}</div>`;
      }
      return html;
    }

    function renderCalendar() {
      monthLabel.textContent = `${viewYear}. ${String(viewMonth + 1).padStart(2, '0')}`;
      grid.innerHTML = buildGridHTML(viewYear, viewMonth);
    }

    function goToMonth(delta) {
      animate(delta, () => {
        viewMonth += delta;
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        else if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      });
    }

    function goToYear(delta) {
      animate(delta, () => { viewYear += delta; }); // 월은 그대로 두고 연도만 이동
    }

    /** delta의 부호로 슬라이드 방향을 정하고, updateFn으로 viewYear/viewMonth를 바꾼 뒤 같은 전환 애니메이션을 재사용합니다 */
    function animate(delta, updateFn) {
      if (animating) return; // 애니메이션 도중 연타 방지
      animating = true;

      const dir = delta > 0 ? 1 : -1;
      grid.style.setProperty('--cal-out-x', (-dir * 16) + 'px');
      grid.classList.add('cal-anim-out'); // 1) 지금 보이는 달을 fade-out + slide-out

      setTimeout(() => {
        updateFn();
        renderCalendar(); // 2) 새 내용으로 교체

        grid.classList.remove('cal-anim-out');
        grid.style.setProperty('--cal-in-x', (dir * 16) + 'px');
        grid.classList.add('cal-anim-in'); // 3) 반대편에 안 보이는 상태로 배치(트랜지션 없이 순간 이동)

        // 다음 프레임에 'in' 상태를 해제해서, 트랜지션이 살아있는 채로 제자리로 fade-in + slide-in 되게 함
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            grid.classList.remove('cal-anim-in');
            animating = false;
          });
        });
      }, 220); // CSS 트랜지션 시간과 맞춤
    }

    document.getElementById('calPrevBtn').addEventListener('click', () => goToMonth(-1));
    document.getElementById('calNextBtn').addEventListener('click', () => goToMonth(1));
    document.getElementById('calYearPrevBtn').addEventListener('click', () => goToYear(-1));
    document.getElementById('calYearNextBtn').addEventListener('click', () => goToYear(1));

    renderCalendar();
  })();

  // ---- calculator ----
  function calc(){
    const supply = parseFloat(document.getElementById('calcSupply').value) || 0;
    const margin = parseFloat(document.getElementById('calcMargin').value) || 0;
    const fee = parseFloat(document.getElementById('calcFee').value) || 0;
    const price = supply / (1 - margin/100 - fee/100);
    const feeAmt = price * fee/100;
    const profit = price - feeAmt - supply;
    document.getElementById('rFee').textContent = '-' + won(Math.round(feeAmt));
    document.getElementById('rProfit').textContent = won(Math.round(profit));
    document.getElementById('rPrice').textContent = won(Math.round(price));
  }
  ['calcSupply','calcMargin','calcFee'].forEach(id => document.getElementById(id).addEventListener('input', calc));
  calc();
