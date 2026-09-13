// 상단 시세 티커 — dashboard.html, admin/members.html 등 여러 화면에서 공용으로 씁니다.
(function () {
  const tickItems = [
    { name:'무선 이어폰 번들 세트', delta:'+4.2%', dir:'up' },
    { name:'니베아 핸드크림 3종', delta:'-1.8%', dir:'down' },
    { name:'스테인리스 텀블러 500ml', delta:'+2.1%', dir:'up' },
    { name:'올리브오일 1L (De Cecco)', delta:'0.0%', dir:'' },
    { name:'캠핑 랜턴 번들', delta:'+6.7%', dir:'up' },
    { name:'실리콘 여행 파우치', delta:'-3.0%', dir:'down' },
    { name:'가습기+디퓨저 번들', delta:'+1.4%', dir:'up' },
    { name:'유기농 티백 세트', delta:'-0.9%', dir:'down' },
  ];
  const track = document.getElementById('tickerTrack');
  if (!track) return; // 이 화면에 티커가 없으면 조용히 넘어갑니다.

  const renderTicks = () => tickItems.map(t =>
    `<div class="tick ${t.dir}"><b>${t.name}</b><span>공급가 ${t.delta}</span></div>`
  ).join('');
  track.innerHTML = renderTicks() + renderTicks();
})();
