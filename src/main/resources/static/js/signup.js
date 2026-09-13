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
