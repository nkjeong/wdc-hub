  // ---- ticker ----
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
  const renderTicks = () => tickItems.map(t =>
    `<div class="tick ${t.dir}"><b>${t.name}</b><span>공급가 ${t.delta}</span></div>`
  ).join('');
  track.innerHTML = renderTicks() + renderTicks();

  // ---- today date ----
  document.getElementById('todayDate').textContent =
    new Date(2026,8,8).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  // ---- product table ----
  const products = [
    { name:'무선 이어폰 번들 세트', sub:'충전케이스 + 파우치 포함', cat:'bundle', maker:'제조사 A', consumer:39900, supply:18500, margin:53.6, status:'sell', date:'2026.09.05' },
    { name:'프리미엄 스테인리스 텀블러 500ml', sub:'보온보냉 겸용', cat:'normal', maker:'제조사 B', consumer:15000, supply:6200, margin:58.7, status:'sell', date:'2026.09.04' },
    { name:'니베아 핸드크림 3종 세트', sub:'독일 정식 수입', cat:'import', maker:'Beiersdorf', consumer:24000, supply:11800, margin:50.8, status:'low', date:'2026.09.03' },
    { name:'캠핑 감성 랜턴 + 미니 테이블', sub:'2종 번들 구성', cat:'bundle', maker:'제조사 C', consumer:52000, supply:27300, margin:47.5, status:'sell', date:'2026.09.02' },
    { name:'이탈리아 정품 올리브오일 1L', sub:'De Cecco 정식 수입', cat:'import', maker:'De Cecco', consumer:18900, supply:9900, margin:47.6, status:'sell', date:'2026.09.01' },
    { name:'접이식 실리콘 여행용 파우치', sub:'방수 소재', cat:'normal', maker:'제조사 D', consumer:8900, supply:3100, margin:65.2, status:'new', date:'2026.08.31' },
    { name:'미니 가습기 + 디퓨저 번들', sub:'무드등 기능 포함', cat:'bundle', maker:'제조사 E', consumer:34000, supply:15700, margin:53.8, status:'sell', date:'2026.08.30' },
    { name:'프랑스산 유기농 티백 세트', sub:'Kusmi Tea 정식 수입', cat:'import', maker:'Kusmi Tea', consumer:21000, supply:10500, margin:50.0, status:'stop', date:'2026.08.29' },
  ];
  const catLabel = { bundle:['번들상품','cat-bundle'], import:['수입상품','cat-import'], normal:['일반상품','cat-normal'] };
  const statusLabel = { sell:['판매중','sell'], new:['신규','new'], low:['품절임박','low'], stop:['판매중지','stop'] };
  const won = n => '₩' + n.toLocaleString('ko-KR');

  function renderTable(filter){
    const tbody = document.getElementById('tbody');
    const rows = products.filter(p => filter === 'all' || p.cat === filter);
    tbody.innerHTML = rows.map(p => {
      const [cLabel, cClass] = catLabel[p.cat];
      const [sLabel, sClass] = statusLabel[p.status];
      return `<tr>
        <td><div class="p-name"><div class="p-thumb"></div><div><div class="p-name-tt">${p.name}</div><div class="p-name-sub">${p.sub}</div></div></div></td>
        <td><span class="cat-badge ${cClass}">${cLabel}</span></td>
        <td class="mono" style="color:var(--text-dim)">${p.maker}</td>
        <td class="mono">${won(p.consumer)}</td>
        <td class="mono">${won(p.supply)}</td>
        <td class="mono margin-up">${p.margin.toFixed(1)}%</td>
        <td><span class="status-badge ${sClass}">${sLabel}</span></td>
        <td class="mono" style="color:var(--text-faint)">${p.date}</td>
      </tr>`;
    }).join('');
  }
  renderTable('all');
  document.getElementById('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if(!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTable(tab.dataset.cat);
  });

  // ---- calendar (Sept 2026) ----
  (function(){
    const year = 2026, month = 8; // 0-indexed => September
    const today = 8;
    const events = { 15:'blue', 25:'blue' };
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const grid = document.getElementById('calGrid');
    let html = ['일','월','화','수','목','금','토'].map(d => `<div class="cal-dow">${d}</div>`).join('');
    for(let i=0;i<startDow;i++) html += `<div class="cal-cell faint">${'' }</div>`;
    for(let d=1; d<=daysInMonth; d++){
      const isToday = d === today;
      const ev = events[d] ? `<span class="ev" style="background:var(--blue)"></span>` : '';
      html += `<div class="cal-cell ${isToday ? 'today' : ''}">${d}${ev}</div>`;
    }
    grid.innerHTML = html;
  })();

  // ---- calculator ----
  function calc(){
    const supply = parseFloat(document.getElementById('calcSupply').value) || 0;
    const margin = parseFloat(document.getElementById('calcMargin').value) || 0;
    const fee = parseFloat(document.getElementById('calcFee').value) || 0;
    // price such that: price*(1-fee) - supply = price*margin/100 (profit relative to price)
    const price = supply / (1 - margin/100 - fee/100);
    const feeAmt = price * fee/100;
    const profit = price - feeAmt - supply;
    document.getElementById('rFee').textContent = '-' + won(Math.round(feeAmt));
    document.getElementById('rProfit').textContent = won(Math.round(profit));
    document.getElementById('rPrice').textContent = won(Math.round(price));
  }
  ['calcSupply','calcMargin','calcFee'].forEach(id => document.getElementById(id).addEventListener('input', calc));
  calc();
