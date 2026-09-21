// ================================================================
// 1) 숫자 3분할 입력 (휴대폰 / 사업자등록번호 / 회사 대표번호 / 팩스)
// ================================================================
function setupSegmentedInput(container) {
  const hiddenInput = document.getElementById(container.dataset.hidden);
  const boxes = Array.from(container.querySelectorAll('.seg-input'));

  // 유효성 검증 실패로 화면이 다시 그려진 경우, 히든 필드에 이미 값이 들어있을 수 있어요.
  // 그 값을 다시 3개의 박스에 나눠 채워줍니다.
  if (hiddenInput.value) {
    const parts = hiddenInput.value.split('-');
    boxes.forEach((box, i) => { if (parts[i]) box.value = parts[i]; });
  }

  function updateHidden() {
    const parts = boxes.map(b => b.value.trim()).filter(v => v.length > 0);
    hiddenInput.value = parts.join('-');
  }

  boxes.forEach((box, index) => {
    box.addEventListener('input', () => {
      // 숫자만 남기기
      box.value = box.value.replace(/[^0-9]/g, '');
      // 다 채워지면 다음 칸으로 자동 이동
      if (box.value.length >= box.maxLength && index < boxes.length - 1) {
        boxes[index + 1].focus();
      }
      updateHidden();
    });

    box.addEventListener('keydown', (e) => {
      // 빈 칸에서 백스페이스를 누르면 이전 칸으로 이동
      if (e.key === 'Backspace' && box.value.length === 0 && index > 0) {
        boxes[index - 1].focus();
      }
    });
  });

  updateHidden();
}

document.querySelectorAll('.segmented').forEach(setupSegmentedInput);

// ================================================================
// 2) 이메일 형식 검증 (입력 즉시 안내)
// ================================================================
const emailInput = document.getElementById('email');
const emailHint = document.getElementById('emailFormatHint');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (emailInput && emailHint) {
  emailInput.addEventListener('blur', () => {
    const value = emailInput.value.trim();
    if (value.length === 0) {
      emailHint.textContent = '';
      emailHint.className = 'hint';
      return;
    }
    if (EMAIL_REGEX.test(value)) {
      emailHint.textContent = '올바른 이메일 형식이에요.';
      emailHint.className = 'hint ok';
    } else {
      emailHint.textContent = '이메일 형식을 다시 확인해주세요. (예: example@company.co.kr)';
      emailHint.className = 'hint err';
    }
  });

  // 한 번 에러를 본 뒤에는 타이핑할 때마다 바로바로 갱신해줍니다.
  emailInput.addEventListener('input', () => {
    if (emailHint.classList.contains('err')) {
      emailInput.dispatchEvent(new Event('blur'));
    }
  });
}

// ================================================================
// 3) 카카오 우편번호 서비스로 주소 검색
// ================================================================
function openAddressSearch() {
  new kakao.Postcode({
    oncomplete: function (data) {
      const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;

      const zonecodeInput = document.getElementById('zonecode');
      const addressInput = document.getElementById('companyAddress');
      const detailInput = document.getElementById('addressDetail');

      zonecodeInput.value = data.zonecode;
      addressInput.value = addr;

      // 검색된 주소가 스르륵 올라오는 효과
      [zonecodeInput, addressInput].forEach((el) => {
        el.classList.remove('addr-fill-anim');
        void el.offsetWidth; // 애니메이션 재시작을 위한 리플로우
        el.classList.add('addr-fill-anim');
      });

      detailInput.focus();
    }
  }).open();
}

const findAddressBtn = document.getElementById('btnFindAddress');
if (findAddressBtn) {
  findAddressBtn.addEventListener('click', openAddressSearch);
}

// ================================================================
// 4) 사업자등록증 파일 선택 표시 + 간단한 클라이언트 검증
// ================================================================
const fileInput = document.getElementById('businessLicenseFile');
const fileNameEl = document.getElementById('fileUploadName');
const fileHintEl = document.getElementById('fileUploadHint');
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'pdf'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

if (fileInput && fileNameEl && fileHintEl) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) {
      fileNameEl.textContent = '선택된 파일이 없습니다';
      fileNameEl.classList.remove('picked');
      fileHintEl.textContent = '';
      fileHintEl.className = 'hint';
      return;
    }

    fileNameEl.textContent = file.name;
    fileNameEl.classList.add('picked');

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      fileHintEl.textContent = 'JPG, PNG, PDF 파일만 업로드할 수 있어요.';
      fileHintEl.className = 'hint err';
      fileInput.value = '';
      fileNameEl.textContent = '선택된 파일이 없습니다';
      fileNameEl.classList.remove('picked');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      fileHintEl.textContent = '파일 크기는 10MB를 넘을 수 없어요.';
      fileHintEl.className = 'hint err';
      fileInput.value = '';
      fileNameEl.textContent = '선택된 파일이 없습니다';
      fileNameEl.classList.remove('picked');
      return;
    }

    fileHintEl.textContent = '파일이 선택되었어요.';
    fileHintEl.className = 'hint ok';
  });
}

// ================================================================
// 5) 폼 제출 시 사업자등록증 첨부 필수 검증
//    (지금까지는 파일이 없어도 그냥 넘어갔는데, 이제 반드시 첨부해야 제출됩니다)
// ================================================================
const signupFormEl = document.getElementById('signupForm');

if (signupFormEl && fileInput && fileHintEl) {
  signupFormEl.addEventListener('submit', (e) => {
    if (!fileInput.files || fileInput.files.length === 0) {
      e.preventDefault();
      fileHintEl.textContent = '사업자등록증 파일을 첨부해주세요.';
      fileHintEl.className = 'hint err';
      fileInput.closest('.field').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}


// ================================================================
// 6) 오픈마켓 판매자 아이디 (선택 입력) — 줄 추가/삭제
//    - 처음에는 1줄이 보이고, '+ 아이디 추가'로 늘립니다. 아이디를 안 적은 줄은 서버에서 무시됩니다.
//    - 한 사이트에 아이디가 여러 개일 수 있어서 같은 사이트를 여러 줄로 고를 수 있어요.
//    - 폼 필드 이름은 marketAccounts[0].site / marketAccounts[0].accountId 처럼 번호가 붙고,
//      줄을 추가/삭제할 때마다 번호를 0부터 다시 매깁니다.
// ================================================================
(function setupMarketAccounts() {
  const wrap = document.getElementById('marketRows');
  const addBtn = document.getElementById('btnAddMarket');
  const errEl = document.getElementById('marketError');
  if (!wrap || !addBtn) return;

  const MAX_ROWS = 30;
  const rows = () => Array.from(wrap.querySelectorAll('.mk-row'));
  const siteOf = (row) => row.querySelector('select');
  const idOf = (row) => row.querySelector('input[type="text"]');

  function reindex() {
    rows().forEach((row, i) => {
      siteOf(row).name = `marketAccounts[${i}].site`;
      siteOf(row).id = `marketAccounts${i}.site`;
      idOf(row).name = `marketAccounts[${i}].accountId`;
      idOf(row).id = `marketAccounts${i}.accountId`;
    });
    addBtn.disabled = rows().length >= MAX_ROWS;
  }

  function clearRow(row) {
    siteOf(row).value = '';
    idOf(row).value = '';
  }

  function addRow() {
    const list = rows();
    if (list.length >= MAX_ROWS) return;
    const clone = list[list.length - 1].cloneNode(true);
    clearRow(clone);
    wrap.appendChild(clone);
    reindex();
    siteOf(clone).focus();
  }

  addBtn.addEventListener('click', addRow);

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.mk-remove');
    if (!btn) return;
    const row = btn.closest('.mk-row');
    if (rows().length <= 1) {   // 마지막 한 줄은 없애지 않고 내용만 비웁니다
      clearRow(row);
      return;
    }
    row.remove();
    reindex();
  });

  // 아이디 칸에는 허용된 문자만 남깁니다 (영문, 숫자, . _ - @)
  wrap.addEventListener('input', (e) => {
    if (e.target.matches('input[type="text"]')) {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9._@-]/g, '');
      if (errEl) errEl.style.display = 'none';
    }
  });

  // 제출 전 확인: 아이디는 적었는데 사이트를 안 골랐다면 알려 줍니다.
  // (서버에서 다시 그려지면 비밀번호 칸이 비워져서, 가능하면 미리 막는 게 편해요)
  const form = document.getElementById('signupForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      const bad = rows().find((row) => idOf(row).value.trim() && !siteOf(row).value);
      if (bad) {
        e.preventDefault();
        if (errEl) {
          errEl.textContent = '오픈마켓 아이디를 입력한 줄은 사이트를 선택해 주세요.';
          errEl.style.display = 'block';
        }
        bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        siteOf(bad).focus();
      }
    });
  }

  reindex();
})();
