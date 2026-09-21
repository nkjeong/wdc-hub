// G마켓용 엑셀 다운로드
//
// G마켓(ESM+) "NEW 일반상품" 일괄등록 양식(문서버전 NEW 2.0)의 8행부터 상품을 채워서 내려줍니다.
// 공식 양식 파일(/xlsx/gmarket_new_basic_bulk.xlsx)을 그대로 열어서 값만 채우기 때문에,
// 드롭다운, 병합 셀, 서식, 1~7행 안내가 그대로 유지됩니다. (엑셀을 새로 만들지 않아요)
//
// 채우는 칸
//   B  노출사이트   → G마켓
//   D  G 판매자ID   → 회원이 등록한 G마켓 아이디 (여러 개면 안내창에서 선택)
//   E  상품명       → 상품명
//   K  카테고리코드 → 상품에 지정한 ESM 카테고리 코드 (텍스트로 저장)
//   M  G 노출코드   → 상품에 지정한 G마켓 카테고리 코드
//   P  G 판매가     → 소비자가
//   Z  기본이미지   → 대표이미지 주소(URL)
//   AB 상품상세설명 → 상세이미지 주소(URL)를 <img> 태그로 이은 HTML
//   BA/BB/BC 원산지 → 상품타입(비어 있으면 '해당없음') / 지역타입 / 지역코드
//   W  옵션 타입    → 옵션명이 1개면 단독형, 2개면 2개조합형, 3개면 3개조합형 (옵션이 없으면 비움)
//   X  옵션명       → 등록된 옵션명 그대로 (조합형은 쉼표로 구분: 색상,사이즈)
//   Y  옵션 입력값  → 옵션 1개당 한 줄. 쉼표 사이에 띄어쓰기 없이  옵션값,옵션상태,노출여부,재고,재고
//                     예) 단독형: 블랙,정상,노출,100,100   2개조합형: 블랙,대형,정상,노출,100,100
// 그 밖의 칸(배송, 상품고시, 인증 등)은 비워 둡니다. 셀러가 G마켓에 올리기 전에 직접 입력합니다.
//
// 사용:
//   GmarketExport.download(rawProductList, fileNamePrefix)   // 안내창 → 파일 다운로드
//   GmarketExport.mountListButton({ anchorId, getList, getPrefix })   // 목록 화면의 엑셀 버튼 옆에 버튼 추가
//   GmarketExport.buttonHtml()                                // 상품 상세창에 넣을 버튼 HTML

(function () {
  'use strict';

  var TEMPLATE_URL = '/xlsx/gmarket_new_basic_bulk.xlsx';
  var META_URL = '/gmarket/export-meta';

  var FIRST_ROW = 8;               // 상품 입력 시작 행 (1~7행은 건드리지 않습니다)
  var MAX_ROWS = 500;              // 양식 한 파일에 넣을 수 있는 상품 수 (8~507행)
  var DETAIL_IMG_WIDTH = 712;      // 상세설명 이미지 가로(px) — 양식 예시와 같은 값
  var SITE_NAME = 'G마켓';
  var DEFAULT_ORIGIN_TYPE = '해당없음';
  var NAME_MAX_BYTES = 100;        // 상품명(+프로모션 문구) 100byte 제한
  var CELL_TEXT_MAX = 32000;       // 엑셀 셀 한 칸의 글자 수 한계(32,767)에 여유를 둔 값

  var templatePromise = null;
  var metaPromise = null;

  // ── 작은 도구들 ───────────────────────────
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function xmlEscape(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')   // XML에서 쓸 수 없는 제어문자 제거
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp() { var d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()); }
  function safeName(s) { return String(s || '상품').replace(/[\\/:*?"<>|]/g, '_').trim() || '상품'; }
  // 한글은 2byte, 그 밖은 1byte로 세어서 G마켓의 byte 제한을 미리 확인합니다
  function byteLength(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 127 ? 2 : 1; return n; }

  // ── ZIP 읽기/쓰기 (엑셀 파일은 ZIP이라서, 라이브러리 없이 필요한 만큼만 직접 다룹니다) ──
  async function inflateRaw(data) {
    if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저에서는 양식 파일을 열 수 없어요. 최신 크롬이나 엣지를 사용해 주세요.');
    var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZip(buffer) {
    var u8 = new Uint8Array(buffer);
    var dv = new DataView(buffer);
    var end = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('양식 파일을 읽지 못했어요.');
    var total = dv.getUint16(end + 10, true);
    var cd = dv.getUint32(end + 16, true);
    var decoder = new TextDecoder();
    var entries = [];
    for (var n = 0; n < total; n++) {
      if (dv.getUint32(cd, true) !== 0x02014b50) throw new Error('양식 파일 구조가 올바르지 않아요.');
      var method = dv.getUint16(cd + 10, true);
      var csize = dv.getUint32(cd + 20, true);
      var nlen = dv.getUint16(cd + 28, true);
      var elen = dv.getUint16(cd + 30, true);
      var clen = dv.getUint16(cd + 32, true);
      var lho = dv.getUint32(cd + 42, true);
      var name = decoder.decode(u8.subarray(cd + 46, cd + 46 + nlen));
      var dataStart = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      var data = u8.subarray(dataStart, dataStart + csize);
      if (method === 8) data = await inflateRaw(data);
      else if (method !== 0) throw new Error('지원하지 않는 압축 방식의 양식이에요.');
      entries.push({ name: name, data: data });
      cd += 46 + nlen + elen + clen;
    }
    return entries;
  }

  var crcTable = null;
  function crc32(u8) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = crcTable[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // 압축 없이 묶는 ZIP (엑셀, zip 모두 이 방식으로 만들어도 정상 파일입니다)
  function writeZip(entries) {
    var enc = new TextEncoder();
    var now = new Date();
    var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var parts = [], central = [], offset = 0;

    entries.forEach(function (e) {
      var nameB = enc.encode(e.name);
      var crc = crc32(e.data);
      var size = e.data.length;

      var lh = new Uint8Array(30 + nameB.length);
      var lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
      lv.setUint16(10, dosTime, true); lv.setUint16(12, dosDate, true); lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true); lv.setUint32(22, size, true); lv.setUint16(26, nameB.length, true); lv.setUint16(28, 0, true);
      lh.set(nameB, 30);
      parts.push(lh, e.data);

      var ch = new Uint8Array(46 + nameB.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true); cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true); cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true); cv.setUint32(24, size, true); cv.setUint16(28, nameB.length, true);
      cv.setUint32(42, offset, true);
      ch.set(nameB, 46);
      central.push(ch);
      offset += lh.length + size;
    });

    var cdSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var endRec = new Uint8Array(22);
    var ev = new DataView(endRec.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [endRec]));
  }

  // ── 양식 채우기 ───────────────────────────
  // 공유 문자열(엑셀이 글자를 모아 두는 표)에 새 글자를 덧붙이는 도우미
  function makeSharedStrings(xml) {
    var head = /<sst [^>]*>/.exec(xml);
    var next = (xml.match(/<si>/g) || []).length;
    var count = Number((/ count="(\d+)"/.exec(head ? head[0] : '') || [0, next])[1]);
    var map = new Map();
    var added = [];
    return {
      add: function (text) {
        count++;
        if (map.has(text)) return map.get(text);
        var idx = next++;
        map.set(text, idx);
        added.push('<si><t xml:space="preserve">' + xmlEscape(text) + '</t></si>');
        return idx;
      },
      toXml: function () {
        return xml.replace(/ count="\d+"/, ' count="' + count + '"')
          .replace(/ uniqueCount="\d+"/, ' uniqueCount="' + next + '"')
          .replace('</sst>', function () { return added.join('') + '</sst>'; });
      },
    };
  }

  // 빈 칸(<c r="E8" s="39"/>)에 값을 넣습니다. 서식(s="...")은 그대로 둡니다.
  function fillRow(rowXml, rowNo, record, ss) {
    Object.keys(record).forEach(function (col) {
      var val = record[col];
      if (val === null || val === undefined || val === '') return;
      var ref = col + rowNo;
      var re = new RegExp('<c r="' + ref + '"([^>]*?)/>');
      if (!re.test(rowXml)) throw new Error('양식의 구조가 예상과 달라요. (' + ref + ') 관리자에게 알려 주세요.');
      rowXml = rowXml.replace(re, function (m, attrs) {
        return typeof val === 'number'
          ? '<c r="' + ref + '"' + attrs + '><v>' + val + '</v></c>'
          : '<c r="' + ref + '"' + attrs + ' t="s"><v>' + ss.add(String(val)) + '</v></c>';
      });
    });
    return rowXml;
  }

  function fillSheetXml(xml, records, ss) {
    var s0 = xml.indexOf('<sheetData>');
    var s1 = xml.indexOf('</sheetData>');
    if (s0 < 0 || s1 < 0) throw new Error('양식의 구조가 예상과 달라요.');
    var bodyStart = s0 + '<sheetData>'.length;
    var body = xml.slice(bodyStart, s1).replace(/<row [^>]*>[\s\S]*?<\/row>/g, function (row) {
      var m = /^<row r="(\d+)"/.exec(row);
      if (!m) return row;
      var r = Number(m[1]);
      if (r < FIRST_ROW || r >= FIRST_ROW + records.length) return row;
      return fillRow(row, r, records[r - FIRST_ROW], ss);
    });
    return xml.slice(0, bodyStart) + body + xml.slice(s1);
  }

  function findEntry(entries, name) {
    for (var i = 0; i < entries.length; i++) if (entries[i].name === name) return entries[i];
    throw new Error('양식 파일에 ' + name + ' 이(가) 없어요.');
  }

  async function buildWorkbook(templateEntries, records) {
    var dec = new TextDecoder();
    var enc = new TextEncoder();
    var sheetXml = dec.decode(findEntry(templateEntries, 'xl/worksheets/sheet1.xml').data);
    var sstXml = dec.decode(findEntry(templateEntries, 'xl/sharedStrings.xml').data);
    var ss = makeSharedStrings(sstXml);
    var newSheet = fillSheetXml(sheetXml, records, ss);
    var newSst = ss.toXml();

    var entries = templateEntries.map(function (e) {
      if (e.name === 'xl/worksheets/sheet1.xml') return { name: e.name, data: enc.encode(newSheet) };
      if (e.name === 'xl/sharedStrings.xml') return { name: e.name, data: enc.encode(newSst) };
      return e;
    });
    return new Uint8Array(await writeZip(entries).arrayBuffer());
  }

  // ── 상품 하나 → 양식 한 줄 ────────────────
  function splitUrls(s) {
    return String(s || '').split(/[\r\n,]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function buildDetailHtml(raw) {
    var urls = splitUrls(raw.detailImageUrls);
    var html = urls.map(function (u) { return '<P><img src="' + escAttr(u) + '" width="' + DETAIL_IMG_WIDTH + '"></P>'; });
    var trimmed = false;
    while (html.join('').length > CELL_TEXT_MAX && html.length > 1) { html.pop(); trimmed = true; }
    if (!html.length && raw.description) {
      // 상세이미지가 없으면 상세설명 글이라도 넣어 줍니다
      html.push('<P>' + esc(String(raw.description)).replace(/\n/g, '<br>') + '</P>');
    }
    return { html: html.join(''), hasImages: urls.length > 0, trimmed: trimmed };
  }

  function mainImageOf(raw) {
    return raw.mainImageMediumUrl || raw.mainImageOriginalUrl || raw.mainImageDetailUrl || '';
  }

  function priceOf(raw) {
    var n = Number(raw.consumerPrice);
    return isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  // ── 옵션 변환 ─────────────────────────────
  // 우리 DB의 옵션은 (옵션명, 옵션값) 한 줄씩이라서, 옵션명별로 묶은 뒤 G마켓 형식으로 바꿉니다.
  //  옵션명 1개   → 단독형   한 줄: 옵션값,옵션상태,노출여부,재고,재고
  //  옵션명 2~3개 → 조합형   옵션값들의 모든 조합을 한 줄씩. 조합 재고는 각 옵션 재고 중 작은 값
  //  옵션명 4개 이상 → G마켓 양식이 지원하지 않아 옵션을 넣지 않음
  var OPTION_TYPE_LABEL = { 1: '단독형', 2: '2개조합형', 3: '3개조합형' };

  function cleanToken(text, flags) {
    var t = String(text == null ? '' : text).replace(/[\r\n]+/g, ' ').trim();
    if (t.indexOf(',') !== -1) { t = t.replace(/,/g, '/'); if (flags) flags.commaFixed = true; }   // 쉼표는 구분 기호라서 값 안에는 쓸 수 없어요
    return t;
  }

  function buildOptions(raw) {
    var result = { type: null, names: '', lines: '', flags: {} };
    var opts = Array.isArray(raw.options) ? raw.options : [];
    if (!raw.hasOptionYn || !opts.length) return result;

    var flags = result.flags;
    var nameOrder = [];
    var groups = {};
    opts.forEach(function (o) {
      var name = cleanToken(o.optionName, flags) || '옵션';
      var value = cleanToken(o.optionValue, flags);
      if (!value) return;
      if (!groups[name]) { groups[name] = []; nameOrder.push(name); }
      if (groups[name].some(function (g) { return g.value === value; })) return;   // 같은 옵션값은 한 번만
      var stock = o.stockQuantity == null ? null : Math.max(0, Math.round(Number(o.stockQuantity)) || 0);
      if (stock === null) flags.noStock = true;
      if (Number(o.additionalPrice) > 0) flags.priceDropped = true;
      groups[name].push({ value: value, stock: stock === null ? 0 : stock, sold: !!o.soldOutYn });
    });

    var n = nameOrder.length;
    if (n === 0) return result;
    if (n > 3) { flags.unsupported = true; return result; }

    var lists = nameOrder.map(function (nm) { return groups[nm]; });
    var lines = [];
    function walk(depth, picked) {
      if (depth === lists.length) {
        var stock = Math.min.apply(null, picked.map(function (p) { return p.stock; }));
        var sold = picked.some(function (p) { return p.sold; });
        lines.push(picked.map(function (p) { return p.value; }).concat([sold ? '품절' : '정상', '노출', stock, stock]).join(','));
        return;
      }
      lists[depth].forEach(function (item) { walk(depth + 1, picked.concat([item])); });
    }
    walk(0, []);

    if (n > 1) flags.combined = true;
    var text = lines.join('\n');
    while (text.length > CELL_TEXT_MAX && lines.length > 1) { lines.pop(); text = lines.join('\n'); flags.cut = true; }

    result.type = OPTION_TYPE_LABEL[n];
    result.names = nameOrder.join(',');
    result.lines = text;
    return result;
  }

  function buildRecord(raw, ctx) {
    var detail = buildDetailHtml(raw);
    var rec = {
      B: SITE_NAME,
      D: ctx.gmarketId || null,
      E: (raw.productName || '').trim(),
      K: raw.esmCategoryCode || null,
      M: raw.gmarketCategoryCode || null,
      P: priceOf(raw),
      Z: mainImageOf(raw) || null,
      AB: detail.html || null,
      BA: raw.originProductType || DEFAULT_ORIGIN_TYPE,
    };
    var opt = buildOptions(raw);
    if (opt.type) {
      rec.W = opt.type;
      rec.X = opt.names;
      rec.Y = opt.lines;
    }
    if (raw.originCode) {
      var region = ctx.originRegions[String(raw.originCode)];
      if (region) rec.BB = region;
      var num = Number(raw.originCode);
      rec.BC = isFinite(num) ? num : String(raw.originCode);
    }
    return rec;
  }

  // ── 미리 알려 줄 문제들 ───────────────────
  function inspect(list) {
    var r = { noCategory: 0, noPrice: 0, noMainImage: 0, noDetail: 0, longName: 0, trimmed: 0,
              optCombined: 0, optUnsupported: 0, optNoStock: 0, optPriceDropped: 0, optCommaFixed: 0, optCut: 0 };
    list.forEach(function (raw) {
      if (!raw.esmCategoryCode || !raw.gmarketCategoryCode) r.noCategory++;
      if (priceOf(raw) === null) r.noPrice++;
      if (!mainImageOf(raw)) r.noMainImage++;
      var d = buildDetailHtml(raw);
      if (!d.html) r.noDetail++;
      if (d.trimmed) r.trimmed++;
      if (byteLength((raw.productName || '').trim()) > NAME_MAX_BYTES) r.longName++;
      var o = buildOptions(raw).flags;
      if (o.combined) r.optCombined++;
      if (o.unsupported) r.optUnsupported++;
      if (o.noStock) r.optNoStock++;
      if (o.priceDropped) r.optPriceDropped++;
      if (o.commaFixed) r.optCommaFixed++;
      if (o.cut) r.optCut++;
    });
    return r;
  }

  // ── 서버에서 받아오는 것들 ────────────────
  function loadTemplate() {
    if (!templatePromise) {
      templatePromise = fetch(TEMPLATE_URL, { credentials: 'same-origin' }).then(function (res) {
        if (!res.ok) throw new Error('G마켓 양식 파일을 불러오지 못했어요. (' + res.status + ')');
        return res.arrayBuffer();
      }).then(readZip).catch(function (e) { templatePromise = null; throw e; });
    }
    return templatePromise;
  }

  function loadMeta() {
    if (!metaPromise) {
      metaPromise = fetch(META_URL, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' }).then(function (res) {
        if (!res.ok) throw new Error('meta');
        return res.json();
      }).catch(function () {
        metaPromise = null;
        return { gmarketIds: [], originRegions: {}, failed: true };
      });
    }
    return metaPromise;
  }

  // ── 안내창 ────────────────────────────────
  function injectStyles() {
    if (document.getElementById('gmarketExportStyle')) return;
    var st = document.createElement('style');
    st.id = 'gmarketExportStyle';
    st.textContent = [
      '.pd-gmarket-btn{ display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:9px; border-radius:7px;',
      '  border:1px solid var(--blue,#5B8CFF); background:rgba(91,140,255,.08); color:var(--blue,#5B8CFF); font-size:12.5px; font-weight:700; margin-top:4px; cursor:pointer; font-family:inherit; }',
      '.pd-gmarket-btn:hover{ background:var(--blue,#5B8CFF); color:#0b1430; }',
      '.gm-overlay{ position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; padding:20px; }',
      '.gm-dialog{ width:100%; max-width:520px; max-height:90vh; overflow-y:auto; background:var(--surface,#14171D); color:var(--text,#ECEDEF);',
      '  border:1px solid var(--line,#262B33); border-radius:12px; padding:22px 24px 18px; box-shadow:0 20px 60px rgba(0,0,0,.5); font-family:inherit; }',
      '.gm-dialog h2{ font-size:16px; font-weight:800; margin:0 0 4px; }',
      '.gm-sub{ font-size:12px; color:var(--text-dim,#9198A6); margin-bottom:14px; }',
      '.gm-list{ margin:0 0 12px; padding-left:18px; font-size:12.5px; line-height:1.75; color:var(--text,#ECEDEF); }',
      '.gm-list li::marker{ color:var(--gold,#D4A62A); }',
      '.gm-note{ font-size:11.5px; line-height:1.6; color:var(--text-dim,#9198A6); background:var(--surface-2,#1A1E25); border:1px solid var(--line-soft,#1D2129);',
      '  border-radius:8px; padding:9px 12px; margin-bottom:12px; }',
      '.gm-warn{ font-size:12px; line-height:1.65; color:var(--amber,#E0A63C); background:rgba(224,166,60,.09); border:1px solid rgba(224,166,60,.35);',
      '  border-radius:8px; padding:9px 12px; margin-bottom:12px; }',
      '.gm-warn b{ color:var(--amber,#E0A63C); }',
      '.gm-field{ margin-bottom:12px; font-size:12.5px; }',
      '.gm-field label{ display:block; font-size:11.5px; color:var(--text-dim,#9198A6); margin-bottom:5px; font-weight:600; }',
      '.gm-field select{ width:100%; padding:9px 10px; border-radius:8px; border:1px solid var(--line,#262B33); background:var(--bg-raise,#0F1216); color:var(--text,#ECEDEF); font-family:inherit; font-size:13px; }',
      '.gm-field a{ color:var(--gold,#D4A62A); font-weight:700; }',
      '.gm-actions{ display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }',
      '.gm-btn{ padding:9px 18px; border-radius:8px; border:1px solid var(--line,#262B33); background:var(--surface,#14171D); color:var(--text-dim,#9198A6); font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }',
      '.gm-btn:hover{ border-color:var(--gold,#D4A62A); color:var(--gold,#D4A62A); }',
      '.gm-btn.primary{ background:var(--gold,#D4A62A); border-color:var(--gold,#D4A62A); color:#1A1400; }',
      '.gm-btn.primary:hover{ filter:brightness(1.08); color:#1A1400; }',
      '.gm-btn:disabled{ opacity:.55; cursor:default; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function warningHtml(w, total) {
    var items = [];
    if (w.noCategory) items.push('<b>G마켓 카테고리가 지정되지 않은</b> 상품 ' + w.noCategory + '개 — 카테고리 코드 칸이 비어 있어요. (상품 수정에서 지정할 수 있어요)');
    if (w.noPrice) items.push('<b>소비자가가 없는</b> 상품 ' + w.noPrice + '개 — 판매가 칸이 비어 있어요.');
    if (w.noMainImage) items.push('<b>대표이미지가 없는</b> 상품 ' + w.noMainImage + '개');
    if (w.noDetail) items.push('<b>상세이미지(상세설명)가 없는</b> 상품 ' + w.noDetail + '개');
    if (w.trimmed) items.push('상세이미지가 너무 많아 <b>일부만 들어간</b> 상품 ' + w.trimmed + '개');
    if (w.longName) items.push('<b>상품명이 100byte(한글 약 50자)를 넘는</b> 상품 ' + w.longName + '개 — G마켓에서 오류가 날 수 있어요.');
    if (w.optUnsupported) items.push('<b>옵션명이 4개 이상인</b> 상품 ' + w.optUnsupported + '개 — G마켓 양식은 옵션을 3개 조합까지만 지원해서 옵션 칸을 비워 두었어요.');
    if (w.optCombined) items.push('<b>옵션명이 2~3개인</b> 상품 ' + w.optCombined + '개 — 옵션값의 모든 조합을 만들어 넣고, 조합 재고는 각 옵션 재고 중 작은 값으로 넣어요. 실제 조합별 재고와 다를 수 있어요.');
    if (w.optNoStock) items.push('<b>옵션 재고가 비어 있는</b> 상품 ' + w.optNoStock + '개 — 재고 0으로 들어가요.');
    if (w.optPriceDropped) items.push('<b>옵션 추가금액이 있는</b> 상품 ' + w.optPriceDropped + '개 — 이 양식에는 옵션 추가금액 칸이 없어서 들어가지 않아요.');
    if (w.optCommaFixed) items.push('옵션명/옵션값에 쉼표(,)가 있는 상품 ' + w.optCommaFixed + '개 — 쉼표는 구분 기호라서 /로 바꿔 넣었어요.');
    if (w.optCut) items.push('옵션 조합이 너무 많아 <b>일부만 들어간</b> 상품 ' + w.optCut + '개');
    if (!items.length) return '';
    return '<div class="gm-warn">확인해 주세요 (전체 ' + total + '개 중)<br>' + items.map(function (t) { return '· ' + t; }).join('<br>') + '</div>';
  }

  function showDialog(list, meta) {
    injectStyles();
    return new Promise(function (resolve) {
      var w = inspect(list);
      var files = Math.ceil(list.length / MAX_ROWS);
      var ids = meta.gmarketIds || [];

      var idField;
      if (ids.length > 1) {
        idField = '<div class="gm-field"><label for="gmIdSelect">G마켓 판매자 아이디</label><select id="gmIdSelect">' +
          ids.map(function (id) { return '<option value="' + escAttr(id) + '">' + esc(id) + '</option>'; }).join('') +
          '<option value="">선택 안 함 (비워 두기)</option></select></div>';
      } else if (ids.length === 1) {
        idField = '<div class="gm-field"><label>G마켓 판매자 아이디</label>' + esc(ids[0]) + '</div>';
      } else {
        idField = '<div class="gm-field"><label>G마켓 판매자 아이디</label>등록된 G마켓 아이디가 없어 이 칸은 비어 있어요. ' +
          '<a href="/mypage">회원정보</a>에서 등록해 두면 다음부터 자동으로 들어가요.</div>';
      }

      var overlay = document.createElement('div');
      overlay.className = 'gm-overlay';
      overlay.innerHTML =
        '<div class="gm-dialog" role="dialog" aria-modal="true" aria-labelledby="gmTitle">' +
          '<h2 id="gmTitle">G마켓용 엑셀 다운로드</h2>' +
          '<div class="gm-sub">선택한 상품 <b>' + list.length + '개</b>를 G마켓(옥션·G마켓 통합 ESM+) 상품 일괄등록 양식에 맞춰 내려받아요.' +
            (files > 1 ? ' 한 파일에는 500개까지만 들어가서 <b>' + files + '개 파일</b>로 나눠 zip으로 묶어 드려요.' : '') + '</div>' +
          '<ul class="gm-list">' +
            '<li>판매가에는 WDC-HUB의 <b>소비자가</b>가 그대로 들어가요.</li>' +
            '<li>대표이미지와 상세설명은 <b>이미지 주소(URL)</b>로 들어가요.</li>' +
            '<li>상품명, G마켓 카테고리, 원산지, <b>옵션(옵션명·옵션값·재고)</b>은 등록된 정보로 채워져요.</li>' +
            '<li>그 밖의 항목(배송, 상품고시, 인증 등)은 <b>비어 있어요.</b> G마켓에 올리기 전에 직접 입력해 주세요.</li>' +
          '</ul>' +
          idField +
          warningHtml(w, list.length) +
          '<div class="gm-note">옵션명은 G마켓의 카테고리별로 정해진 이름(예: 색상, 사이즈)이어야 해요. 다른 이름이면 업로드할 때 오류가 날 수 있어요.</div>' +
          '<div class="gm-note">G마켓은 판매가가 실제 판매되는 가격과 다르면 허위·과장 광고로 제재될 수 있다고 안내하고 있어요. 올리기 전에 가격을 꼭 확인해 주세요.</div>' +
          '<div class="gm-actions">' +
            '<button type="button" class="gm-btn" id="gmCancel">취소</button>' +
            '<button type="button" class="gm-btn primary" id="gmOk">확인하고 다운로드</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      var okBtn = overlay.querySelector('#gmOk');
      var cancelBtn = overlay.querySelector('#gmCancel');
      var prevFocus = document.activeElement;

      function close(result) {
        document.removeEventListener('keydown', onKey, true);
        overlay.parentNode && overlay.parentNode.removeChild(overlay);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(null); } }
      document.addEventListener('keydown', onKey, true);

      cancelBtn.addEventListener('click', function () { close(null); });
      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(null); });
      okBtn.addEventListener('click', function () {
        var sel = overlay.querySelector('#gmIdSelect');
        var id = sel ? sel.value : (ids.length === 1 ? ids[0] : '');
        close({ gmarketId: id });
      });
      okBtn.focus();
    });
  }

  // ── 파일 내려받기 ─────────────────────────
  function saveBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  var running = false;

  async function download(rawList, fileNamePrefix) {
    if (running) return;
    if (!rawList || !rawList.length) { alert('다운로드할 상품이 없어요.'); return; }
    running = true;
    try {
      var meta = await loadMeta();
      var choice = await showDialog(rawList, meta);
      if (!choice) return;

      var template = await loadTemplate();
      var ctx = { gmarketId: choice.gmarketId || '', originRegions: meta.originRegions || {} };
      var base = safeName(fileNamePrefix) + '_G마켓등록_' + stamp();

      var chunks = [];
      for (var i = 0; i < rawList.length; i += MAX_ROWS) chunks.push(rawList.slice(i, i + MAX_ROWS));

      var books = [];
      for (var c = 0; c < chunks.length; c++) {
        var records = chunks[c].map(function (raw) { return buildRecord(raw, ctx); });
        books.push(await buildWorkbook(template, records));
        await new Promise(function (r) { setTimeout(r, 0); });   // 큰 목록에서도 화면이 멈추지 않게 한 틱 양보
      }

      if (books.length === 1) {
        saveBlob(new Blob([books[0]], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), base + '.xlsx');
      } else {
        var zipEntries = books.map(function (data, idx) { return { name: base + '_' + (idx + 1) + '.xlsx', data: data }; });
        saveBlob(writeZip(zipEntries), base + '.zip');
      }
    } catch (e) {
      alert(e && e.message ? e.message : 'G마켓용 엑셀을 만들지 못했어요.');
    } finally {
      running = false;
    }
  }

  // ── 화면에 버튼 붙이기 ────────────────────
  function buttonHtml() {
    injectStyles();   // 상세창의 버튼 모양(CSS)이 먼저 준비되도록
    return '<button type="button" class="pd-gmarket-btn" id="pdGmarketBtn">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9"/><path d="M2 15h20l-2 5H4l-2-5z"/></svg>' +
      'G마켓용 엑셀 다운로드</button>';
  }

  // 목록 화면: 기존 "엑셀" 버튼 바로 옆에 같은 모양의 버튼을 붙입니다
  function mountListButton(opts) {
    injectStyles();
    var anchor = document.getElementById(opts.anchorId);
    if (!anchor || document.getElementById('gmarketDownloadBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'gmarketDownloadBtn';
    btn.className = anchor.className;
    btn.style.marginLeft = '8px';
    var icon = anchor.querySelector('svg');
    btn.innerHTML = (icon ? icon.outerHTML : '') + 'G마켓용 엑셀 다운로드';
    anchor.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', function () {
      var list = opts.getList();
      if (!list) return;   // getList가 이미 안내창을 띄운 경우
      download(list, opts.getPrefix());
    });
  }

  window.GmarketExport = { download: download, mountListButton: mountListButton, buttonHtml: buttonHtml, _internal: { buildRecord: buildRecord, buildOptions: buildOptions, inspect: inspect, byteLength: byteLength } };
})();
