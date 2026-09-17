// 대시보드 첫 번째 카드 — Super Flow(UI Initiative, Swiper 유료 이펙트) 초기화
// index.html 데모의 초기화 옵션을 그대로 따랐습니다.

if (document.getElementById('dashboardSuperFlow') && window.Swiper && window.EffectSuperFlow) {
  new Swiper('#dashboardSuperFlow', {
    direction: 'horizontal',
    modules: [EffectSuperFlow],
    effect: 'super-flow',
    slidesPerView: 1,
    loop: true,
    pagination: {
      el: '#dashboardSuperFlow .swiper-pagination',
    },
    superFlowEffect: {
      fragments: 0,
      fragmentBlur: true,
      fragmentBorderWidth: 2,
      scaleDuration: 4000,
      contentOffset: 5,
    },
    speed: 1000,
    grabCursor: true,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
  });
}
