// 회원관리 페이지 — "파일 보기"를 새 탭이 아니라 별도 창(팝업)으로 열고,
// 이미지라면 실제 해상도를 확인해서 창 크기를 맞춰줍니다.

function openBusinessLicensePopup(url) {
  // 먼저 기본 크기로 창부터 엽니다.
  // 클릭한 순간(동기적으로) window.open을 호출해야 브라우저의 팝업 차단을 피할 수 있어서,
  // 이미지 크기를 다 확인한 다음 열면 오히려 차단될 수 있어요.
  const popup = window.open(url, 'businessLicenseView', 'width=800,height=900,resizable=yes,scrollbars=yes');
  if (!popup) {
    alert('팝업이 차단되었습니다. 브라우저의 팝업 차단 설정을 확인해주세요.');
    return;
  }

  // 이미지 파일이면, 실제 가로/세로 크기를 읽어서 창 크기를 다시 맞춥니다.
  // PDF 등 이미지가 아닌 파일은 img.onload가 실행되지 않아서, 위에서 연 기본 크기 그대로 유지됩니다.
  const img = new Image();

  img.onload = function () {
    const screenW = window.screen.availWidth;
    const screenH = window.screen.availHeight;

    let w = img.naturalWidth;
    let h = img.naturalHeight;

    // 이미지가 화면 해상도보다 크면, 세로 크기를 화면 높이의 90%로 맞추고
    // 가로는 원본 비율에 맞춰 함께 줄입니다.
    if (w > screenW || h > screenH) {
      const ratio = w / h;
      h = Math.round(screenH * 0.9);
      w = Math.round(h * ratio);

      // 그래도 가로가 화면보다 크면, 가로 기준으로 한 번 더 맞춥니다.
      if (w > screenW) {
        w = Math.round(screenW * 0.9);
        h = Math.round(w / ratio);
      }
    }

    const left = Math.max(0, Math.round((screenW - w) / 2));
    const top = Math.max(0, Math.round((screenH - h) / 2));

    try {
      popup.resizeTo(w, h);
      popup.moveTo(left, top);
    } catch (e) {
      // 일부 브라우저는 스크립트로 창 크기 조절을 막아둘 수 있어요.
      // 이 경우 처음 연 기본 크기(800x900) 그대로 보여줍니다.
    }
  };

  img.src = url;
}

document.querySelectorAll('.file-view-link').forEach((link) => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    openBusinessLicensePopup(this.href);
  });
});
