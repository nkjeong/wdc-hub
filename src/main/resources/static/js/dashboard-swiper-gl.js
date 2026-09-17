// 대시보드 오른쪽 카드 — Swiper GL(UI Initiative, WebGL 셰이더 전환 효과) 초기화
// main.js 데모의 초기화 옵션을 기반으로 했고, 카드 안에서 자동 재생되도록 autoplay만 추가했습니다.

if (document.getElementById('dashboardSwiperGL') && window.Swiper && window.SwiperGL) {
  new Swiper('#dashboardSwiperGL', {
    modules: [SwiperGL],
    speed: 1000,
    effect: 'gl',
    loop: true,
    gl: {
      shader: 'random', // 슬라이드마다 랜덤한 셰이더 전환 효과 (dots, wave-x, pixelize 등)
    },
    navigation: {
      prevEl: '#dashboardSwiperGL .swiper-button-prev',
      nextEl: '#dashboardSwiperGL .swiper-button-next',
    },
    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
    },
  });
}
