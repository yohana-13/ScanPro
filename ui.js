let analysisHistory = [];
try {
  analysisHistory = JSON.parse(localStorage.getItem('kelayakan_history') || '[]');
} catch(e) { analysisHistory = []; }

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === page);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'about') renderDatasetTable();
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('tabcontent-' + tab).classList.add('active');
}

function setProgress(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('pstep' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    else if (i === step) el.classList.add('active');
  }
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('pline' + i);
    if (el) el.classList.toggle('done', i < step);
  }
}

function showLoading(msgOrArray) {
  const msg = Array.isArray(msgOrArray) ? msgOrArray[0] : msgOrArray;
  document.getElementById('loadingMsg').textContent = msg || 'Memproses...';
  document.getElementById('loadingScreen').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingScreen').classList.remove('active');
}

function addToHistory(entry) {
  analysisHistory.unshift(entry);
  if (analysisHistory.length > 10) analysisHistory.pop();
  try { localStorage.setItem('kelayakan_history', JSON.stringify(analysisHistory)); } catch(e) {}
  renderHistory();
}

function clearHistory() {
  analysisHistory = [];
  try { localStorage.removeItem('kelayakan_history'); } catch(e) {}
  renderHistory();
}

function renderHistory() {
  const list  = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (!list) return;
  if (analysisHistory.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = analysisHistory.map(h => `
    <li class="history-item">
      <div class="history-info">
        <div class="history-name">${escHtml(h.name)}</div>
        <div class="history-meta">
          ${new Date(h.time).toLocaleString('id-ID')}
          &mdash; <span class="history-verdict">${escHtml(h.verdict)}</span> (${h.score}%)
        </div>
      </div>
      <button class="history-action" onclick="loadFromHistory('${h.id}')">Muat</button>
      <button class="history-action" onclick="removeFromHistory('${h.id}')">&#215;</button>
    </li>
  `).join('');
}

function loadFromHistory(id) {
  const entry = analysisHistory.find(h => h.id === id);
  if (entry) {
    document.getElementById('proposalText').value = entry.preview;
    switchTab('single');
    navigate('analyze');
  }
}

function removeFromHistory(id) {
  analysisHistory = analysisHistory.filter(h => h.id !== id);
  try { localStorage.setItem('kelayakan_history', JSON.stringify(analysisHistory)); } catch(e) {}
  renderHistory();
}

function exportPDF() {
  const verdict  = document.getElementById('verdictText').textContent;
  const score    = document.getElementById('verdictScore').textContent;
  const desc     = document.getElementById('verdictDesc').textContent;
  const total    = document.getElementById('sTotal').textContent;
  const kw       = document.getElementById('sKeywords').textContent;
  const ids      = document.getElementById('sIdents').textContent;
  const nums     = document.getElementById('sNumbers').textContent;
  const entropy  = document.getElementById('entropyVal').textContent;
  const dateStr  = new Date().toLocaleString('id-ID');

  const decItems = document.querySelectorAll('.decision-item');
  let decLines = '';
  decItems.forEach(el => {
    const icon = el.querySelector('.decision-icon');
    const txt  = el.querySelector('span');
    if (icon && txt) decLines += `<tr><td style="padding:5px 10px;color:${icon.classList.contains('decision-pass')?'#2D8A5E':'#C93030'};font-weight:600;font-size:11px">${icon.classList.contains('decision-pass') ? 'LULUS' : 'GAGAL'}</td><td style="padding:5px 10px;font-size:11px">${txt.textContent.trim()}</td></tr>`;
  });

  const sugItems = document.querySelectorAll('.suggestion-item span');
  let sugHtml = '';
  sugItems.forEach((el, i) => {
    sugHtml += `<li style="margin-bottom:6px;font-size:11px;color:#444">${i + 1}. ${el.textContent.trim()}</li>`;
  });

  const featRows = document.querySelectorAll('.feature-row');
  let featHtml = '';
  featRows.forEach(row => {
    const name = row.querySelector('.feature-name');
    const pct  = row.querySelector('.feature-pct');
    const fill = row.querySelector('.feature-fill');
    if (name && pct && fill) {
      const val = fill.dataset.pct || '0';
      featHtml += `<tr>
        <td style="padding:5px 10px;font-size:11px">${name.textContent}</td>
        <td style="padding:5px 10px;font-size:11px;font-family:monospace;color:#5A4A8A;font-weight:600">${pct.textContent}</td>
        <td style="padding:5px 10px">
          <div style="width:120px;height:6px;background:#DDD9EE;border-radius:99px;overflow:hidden">
            <div style="width:${val}%;height:100%;background:linear-gradient(90deg,#A89CC8,#E8756D);border-radius:99px"></div>
          </div>
        </td>
      </tr>`;
    }
  });

  const verdictColor = verdict === 'Layak' ? '#2D8A5E' : verdict === 'Tidak Layak' ? '#C93030' : '#C47D1A';
  const verdictBg    = verdict === 'Layak' ? '#E4F4EC' : verdict === 'Tidak Layak' ? '#FBEBEB' : '#FDF2E0';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Laporan Kelayakan Proposal - ScanPro</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1E1A30; margin: 0; padding: 0; background: #fff; }
  .page { max-width: 740px; margin: 0 auto; padding: 48px 44px; }
  .header { border-bottom: 2px solid #5A4A8A; padding-bottom: 20px; margin-bottom: 28px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 22px; font-weight: 700; color: #5A4A8A; letter-spacing: -0.5px; }
  .brand span { color: #E8756D; }
  .meta { font-size: 10px; color: #6B6480; text-align: right; line-height: 1.7; }
  .title { font-size: 14px; font-weight: 600; color: #6B6480; margin-top: 8px; letter-spacing: 0.04em; text-transform: uppercase; }
  .verdict-block { background: ${verdictBg}; border: 1.5px solid ${verdictColor}; border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .verdict-main { font-size: 24px; font-weight: 700; color: ${verdictColor}; }
  .verdict-sub { font-size: 11px; color: #6B6480; margin-top: 4px; max-width: 340px; line-height: 1.55; }
  .verdict-score { font-size: 42px; font-weight: 700; color: ${verdictColor}; text-align: right; }
  .verdict-score-lbl { font-size: 10px; color: #6B6480; text-align: right; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5A4A8A; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #EBE8F5; }
  .stats-row { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat-box { flex: 1; background: #F7F6FC; border: 1px solid #DDD9EE; border-radius: 10px; padding: 12px 14px; }
  .stat-val { font-size: 22px; font-weight: 700; color: #5A4A8A; }
  .stat-lbl { font-size: 10px; color: #6B6480; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #5A4A8A; color: #fff; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 6px 10px; border-bottom: 1px solid #EBE8F5; }
  tr:last-child td { border-bottom: none; }
  .section-block { margin-bottom: 24px; }
  ul { margin: 0; padding: 0 0 0 16px; }
  .footer-bar { margin-top: 36px; padding-top: 14px; border-top: 1px solid #EBE8F5; display: flex; justify-content: space-between; font-size: 10px; color: #6B6480; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="brand">Scan<span>Pro</span></div>
        <div class="title">Laporan Evaluasi Kelayakan Proposal Akademik</div>
      </div>
      <div class="meta">
        Tanggal: ${dateStr}<br>
        Sistem: Lexical Analyzer DFA + C4.5<br>
        Institusi: Universitas Negeri Medan<br>
        Mata Kuliah: Pengantar Sains Komputasi
      </div>
    </div>
  </div>

  <div class="verdict-block">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:${verdictColor};opacity:0.75;margin-bottom:4px">Keputusan Klasifikasi C4.5</div>
      <div class="verdict-main">${verdict}</div>
      <div class="verdict-sub">${desc}</div>
    </div>
    <div>
      <div class="verdict-score">${score}</div>
      <div class="verdict-score-lbl">Skor Kelayakan</div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">Statistik Token (Lexical Analyzer DFA)</div>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-val">${total}</div><div class="stat-lbl">Total Token</div></div>
      <div class="stat-box"><div class="stat-val">${kw}</div><div class="stat-lbl">Kata Kunci</div></div>
      <div class="stat-box"><div class="stat-val">${ids}</div><div class="stat-lbl">Identifier</div></div>
      <div class="stat-box"><div class="stat-val">${nums}</div><div class="stat-lbl">Angka</div></div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">Bobot Fitur C4.5 (Information Gain) &mdash; Entropy H = ${entropy}</div>
    <table>
      <thead><tr><th>Fitur</th><th>Skor</th><th>Visualisasi</th></tr></thead>
      <tbody>${featHtml}</tbody>
    </table>
  </div>

  <div class="section-block">
    <div class="section-title">Pohon Keputusan C4.5 &mdash; Evaluasi Aturan</div>
    <table>
      <thead><tr><th>Status</th><th>Aturan</th></tr></thead>
      <tbody>${decLines}</tbody>
    </table>
  </div>

  ${sugHtml ? `<div class="section-block">
    <div class="section-title">Saran Perbaikan</div>
    <ul>${sugHtml}</ul>
  </div>` : ''}

  <div class="footer-bar">
    <span>ScanPro &mdash; Pengantar Sains Komputasi, Universitas Negeri Medan</span>
    <span>Dihasilkan otomatis oleh sistem DFA + C4.5</span>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

function exportComparePDF() {
  const cmpA = window._cmpDataA || {};
  const cmpB = window._cmpDataB || {};
  const dA = cmpA.data || {};
  const dB = cmpB.data || {};
  const fileNameA = cmpA.fileName || 'Proposal A';
  const fileNameB = cmpB.fileName || 'Proposal B';
  const textA = cmpA.text || '';
  const textB = cmpB.text || '';

  const verdA = (dA.result && dA.result.verdict) || '-';
  const verdB = (dB.result && dB.result.verdict) || '-';
  const scoreA = (dA.result && dA.result.score) || 0;
  const scoreB = (dB.result && dB.result.score) || 0;
  const descA = (dA.result && dA.result.desc) || '';
  const descB = (dB.result && dB.result.desc) || '';
  const entropyA = (dA.result && dA.result.entropy) ? dA.result.entropy.toFixed(4) : '-';
  const entropyB = (dB.result && dB.result.entropy) ? dB.result.entropy.toFixed(4) : '-';

  const tokensA = dA.tokens || [];
  const tokensB = dB.tokens || [];
  const kwA = tokensA.filter(t => t.type === 'KEYWORD').length;
  const kwB = tokensB.filter(t => t.type === 'KEYWORD').length;
  const idA = tokensA.filter(t => t.type === 'IDENTIFIER').length;
  const idB = tokensB.filter(t => t.type === 'IDENTIFIER').length;
  const numA = tokensA.filter(t => t.type === 'NUMBER').length;
  const numB = tokensB.filter(t => t.type === 'NUMBER').length;

  const featsA = dA.featureScores || [];
  const featsB = dB.featureScores || [];
  const traceA = dA.trace || [];
  const traceB = dB.trace || [];
  const sugA = (dA.result && dA.result.suggestions) || [];
  const sugB = (dB.result && dB.result.suggestions) || [];

  const verdColor = v => v === 'Layak' ? '#1A6B45' : v === 'Tidak Layak' ? '#9B1C1C' : '#92580A';
  const verdBg = v => v === 'Layak' ? '#ECFDF5' : v === 'Tidak Layak' ? '#FEF2F2' : '#FFFBEB';
  const verdBorder = v => v === 'Layak' ? '#6EE7B7' : v === 'Tidak Layak' ? '#FECACA' : '#FDE68A';

  const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const dateOnly = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const reportNo = 'SPR-CMP-' + Date.now().toString().slice(-8);

  const featTableRows = featsA.map((f, i) => {
    const va = Math.round(f.score * 100);
    const vb = featsB[i] ? Math.round(featsB[i].score * 100) : 0;
    const delta = vb - va;
    const deltaStr = delta > 0 ? '+' + delta + '%' : delta === 0 ? '0%' : delta + '%';
    const deltaColor = delta > 0 ? '#1A6B45' : delta < 0 ? '#9B1C1C' : '#555';
    const winner = delta > 0 ? 'B' : delta < 0 ? 'A' : '-';
    return `<tr>
      <td style="padding:7px 10px;font-size:10.5px;border-bottom:1px solid #EEE">${f.name}</td>
      <td style="padding:7px 10px;font-size:10.5px;font-weight:600;color:#3B2A7A;text-align:center;border-bottom:1px solid #EEE">${va}%</td>
      <td style="padding:7px 10px;font-size:10.5px;font-weight:600;color:#B84E47;text-align:center;border-bottom:1px solid #EEE">${vb}%</td>
      <td style="padding:7px 10px;font-size:10.5px;font-weight:700;color:${deltaColor};text-align:center;border-bottom:1px solid #EEE">${deltaStr}</td>
      <td style="padding:7px 10px;font-size:10.5px;font-weight:700;text-align:center;border-bottom:1px solid #EEE">${winner}</td>
    </tr>`;
  }).join('');

  const traceRows = (trace, label) => trace.map(t => `<tr>
    <td style="padding:6px 10px;font-size:10px;border-bottom:1px solid #EEE">${label}</td>
    <td style="padding:6px 10px;font-size:10px;font-weight:700;color:${t.passed ? '#1A6B45' : '#9B1C1C'};border-bottom:1px solid #EEE">${t.passed ? 'LULUS' : 'GAGAL'}</td>
    <td style="padding:6px 10px;font-size:10px;border-bottom:1px solid #EEE">${t.rule}</td>
  </tr>`).join('');

  const scoreDelta = scoreB - scoreA;
  const unggul = scoreDelta > 0 ? 'Proposal B' : scoreDelta < 0 ? 'Proposal A' : 'Keduanya setara';
  const unggulColor = scoreDelta > 0 ? '#B84E47' : scoreDelta < 0 ? '#3B2A7A' : '#555';

  const sugHtml = (sug, label) => sug.length === 0
    ? `<p style="font-size:10px;color:#888;font-style:italic">Tidak ada saran perbaikan untuk ${label}.</p>`
    : `<ol style="margin:0;padding-left:18px">${sug.map(s => `<li style="font-size:10px;color:#444;margin-bottom:5px">${s}</li>`).join('')}</ol>`;

  const kesimpulan = () => {
    const lines = [];
    if (verdA === verdB) {
      lines.push(`Kedua proposal memperoleh klasifikasi yang sama, yaitu <strong>${verdA}</strong>, dengan skor masing-masing ${scoreA}% (Proposal A) dan ${scoreB}% (Proposal B).`);
    } else {
      lines.push(`Proposal A diklasifikasikan sebagai <strong>${verdA}</strong> (${scoreA}%), sedangkan Proposal B diklasifikasikan sebagai <strong>${verdB}</strong> (${scoreB}%).`);
    }
    if (scoreDelta !== 0) {
      lines.push(`${unggul} menunjukkan performa lebih unggul dengan selisih skor ${Math.abs(scoreDelta)}%.`);
    }
    lines.push('Hasil ini merupakan keluaran otomatis sistem analisis berbasis Lexical Analyzer DFA dan Algoritma Pohon Keputusan C4.5.');
    return lines.join(' ');
  };

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Perbandingan Proposal - ScanPro</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1A1A2E; background: #fff; font-size: 11px; line-height: 1.6; }
  .page { max-width: 780px; margin: 0 auto; padding: 56px 52px; }
  .cover-header { border-bottom: 3px solid #3B2A7A; padding-bottom: 24px; margin-bottom: 32px; }
  .cover-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 24px; font-weight: 800; color: #3B2A7A; letter-spacing: -0.5px; }
  .brand span { color: #B84E47; }
  .meta-block { font-size: 9.5px; color: #555; text-align: right; line-height: 2; }
  .doc-title { margin-top: 20px; }
  .doc-title h1 { font-size: 15px; font-weight: 700; color: #1A1A2E; letter-spacing: 0.02em; text-transform: uppercase; margin-bottom: 4px; }
  .doc-title p { font-size: 10.5px; color: #666; }
  .doc-info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 24px 0 32px; }
  .info-cell { background: #F5F4FB; border: 1px solid #DDD8F0; border-radius: 8px; padding: 10px 14px; }
  .info-cell .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #3B2A7A; margin-bottom: 3px; }
  .info-cell .val { font-size: 10.5px; color: #1A1A2E; font-weight: 500; }
  .section { margin-bottom: 28px; }
  .section-head { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #3B2A7A; background: #F0EEF9; border-left: 4px solid #3B2A7A; padding: 7px 12px; margin-bottom: 14px; border-radius: 0 5px 5px 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .verdict-box { border-radius: 10px; padding: 16px 18px; border: 1.5px solid; }
  .verdict-box .col-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 6px; }
  .verdict-box .v-text { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .verdict-box .v-score { font-size: 36px; font-weight: 800; line-height: 1; }
  .verdict-box .v-score-lbl { font-size: 9px; color: #666; margin-top: 2px; }
  .verdict-box .v-desc { font-size: 9.5px; color: #555; margin-top: 8px; line-height: 1.55; }
  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
  .stat-mini { background: #F8F7FD; border: 1px solid #E5E1F4; border-radius: 7px; padding: 8px 10px; text-align: center; }
  .stat-mini .sv { font-size: 16px; font-weight: 700; color: #3B2A7A; }
  .stat-mini .sl { font-size: 8.5px; color: #888; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #3B2A7A; color: #fff; padding: 8px 10px; text-align: left; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  td { vertical-align: top; }
  .text-center { text-align: center; }
  .sig-block { display: flex; justify-content: flex-end; margin-top: 36px; }
  .sig-inner { text-align: center; width: 220px; }
  .sig-inner .sig-city { font-size: 10.5px; margin-bottom: 48px; }
  .sig-inner .sig-name { font-size: 10.5px; font-weight: 700; border-top: 1px solid #333; padding-top: 4px; }
  .sig-inner .sig-role { font-size: 9.5px; color: #666; }
  .footer-bar { margin-top: 40px; padding-top: 12px; border-top: 1px solid #E5E1F4; display: flex; justify-content: space-between; font-size: 9px; color: #888; }
  .disclaimer { margin-top: 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 7px; padding: 10px 14px; font-size: 9.5px; color: #78500A; line-height: 1.6; }
</style>
</head>
<body>
<div class="page">

  <div class="cover-header">
    <div class="cover-top">
      <div>
        <div class="brand">Scan<span>Pro</span></div>
        <div style="font-size:9.5px;color:#888;margin-top:2px">Sistem Evaluasi Kelayakan Proposal Akademik</div>
      </div>
      <div class="meta-block">
        No. Laporan&nbsp;:&nbsp;<strong>${reportNo}</strong><br>
        Tanggal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;${dateOnly}<br>
        Waktu&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;${dateStr.split(', ')[1] || dateStr}<br>
        Metode&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;DFA Lexical Analyzer + C4.5<br>
        Institusi&nbsp;&nbsp;&nbsp;:&nbsp;Universitas Negeri Medan
      </div>
    </div>
    <div class="doc-title">
      <h1>Laporan Evaluasi Perbandingan Proposal Akademik</h1>
      <p>Mata Kuliah Pengantar Sains Komputasi &mdash; Analisis Komparatif Dua Dokumen Proposal</p>
    </div>
  </div>

  <div class="doc-info-grid">
    <div class="info-cell"><div class="lbl">Dokumen Proposal A</div><div class="val">${fileNameA}</div></div>
    <div class="info-cell"><div class="lbl">Dokumen Proposal B</div><div class="val">${fileNameB}</div></div>
    <div class="info-cell"><div class="lbl">Jenis Analisis</div><div class="val">Perbandingan Komparatif</div></div>
    <div class="info-cell"><div class="lbl">Total Token (A)</div><div class="val">${tokensA.length} token</div></div>
    <div class="info-cell"><div class="lbl">Total Token (B)</div><div class="val">${tokensB.length} token</div></div>
    <div class="info-cell"><div class="lbl">Unggul</div><div class="val" style="color:${unggulColor};font-weight:700">${unggul}</div></div>
  </div>

  <div class="section">
    <div class="section-head">I. Ringkasan Eksekutif</div>
    <p style="font-size:10.5px;color:#333;line-height:1.75">${kesimpulan()}</p>
  </div>

  <div class="section">
    <div class="section-head">II. Hasil Klasifikasi C4.5</div>
    <div class="two-col">
      <div class="verdict-box" style="background:${verdBg(verdA)};border-color:${verdBorder(verdA)}">
        <div class="col-tag" style="color:${verdColor(verdA)}">Proposal A</div>
        <div class="v-text" style="color:${verdColor(verdA)}">${verdA}</div>
        <div class="v-score" style="color:${verdColor(verdA)}">${scoreA}%</div>
        <div class="v-score-lbl">Skor Kelayakan</div>
        <div class="v-desc">${descA}</div>
      </div>
      <div class="verdict-box" style="background:${verdBg(verdB)};border-color:${verdBorder(verdB)}">
        <div class="col-tag" style="color:${verdColor(verdB)}">Proposal B</div>
        <div class="v-text" style="color:${verdColor(verdB)}">${verdB}</div>
        <div class="v-score" style="color:${verdColor(verdB)}">${scoreB}%</div>
        <div class="v-score-lbl">Skor Kelayakan</div>
        <div class="v-desc">${descB}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-head">III. Statistik Tokenisasi DFA</div>
    <div class="two-col">
      <div>
        <p style="font-size:9.5px;font-weight:700;color:#3B2A7A;margin-bottom:8px">Proposal A &mdash; Entropy H = ${entropyA}</p>
        <div class="stat-row">
          <div class="stat-mini"><div class="sv">${tokensA.length}</div><div class="sl">Total Token</div></div>
          <div class="stat-mini"><div class="sv">${kwA}</div><div class="sl">Kata Kunci</div></div>
          <div class="stat-mini"><div class="sv">${idA}</div><div class="sl">Identifier</div></div>
          <div class="stat-mini"><div class="sv">${numA}</div><div class="sl">Angka</div></div>
        </div>
      </div>
      <div>
        <p style="font-size:9.5px;font-weight:700;color:#B84E47;margin-bottom:8px">Proposal B &mdash; Entropy H = ${entropyB}</p>
        <div class="stat-row">
          <div class="stat-mini"><div class="sv" style="color:#B84E47">${tokensB.length}</div><div class="sl">Total Token</div></div>
          <div class="stat-mini"><div class="sv" style="color:#B84E47">${kwB}</div><div class="sl">Kata Kunci</div></div>
          <div class="stat-mini"><div class="sv" style="color:#B84E47">${idB}</div><div class="sl">Identifier</div></div>
          <div class="stat-mini"><div class="sv" style="color:#B84E47">${numB}</div><div class="sl">Angka</div></div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-head">IV. Perbandingan Skor Fitur C4.5 (Information Gain)</div>
    <table>
      <thead>
        <tr>
          <th>Fitur</th>
          <th class="text-center" style="color:#A9D4FF">Proposal A</th>
          <th class="text-center" style="color:#FFB3AF">Proposal B</th>
          <th class="text-center">Selisih (B-A)</th>
          <th class="text-center">Unggul</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#F0EEF9">
          <td style="padding:7px 10px;font-size:10.5px;font-weight:700;border-bottom:1px solid #DDD">Skor Kelayakan Total</td>
          <td style="padding:7px 10px;font-size:10.5px;font-weight:700;color:#3B2A7A;text-align:center;border-bottom:1px solid #DDD">${scoreA}%</td>
          <td style="padding:7px 10px;font-size:10.5px;font-weight:700;color:#B84E47;text-align:center;border-bottom:1px solid #DDD">${scoreB}%</td>
          <td style="padding:7px 10px;font-size:10.5px;font-weight:700;color:${scoreDelta > 0 ? '#1A6B45' : scoreDelta < 0 ? '#9B1C1C' : '#555'};text-align:center;border-bottom:1px solid #DDD">${scoreDelta > 0 ? '+' + scoreDelta : scoreDelta}%</td>
          <td style="padding:7px 10px;font-size:10.5px;font-weight:700;text-align:center;border-bottom:1px solid #DDD">${scoreDelta > 0 ? 'B' : scoreDelta < 0 ? 'A' : '-'}</td>
        </tr>
        ${featTableRows}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-head">V. Evaluasi Pohon Keputusan C4.5</div>
    <table>
      <thead>
        <tr>
          <th>Proposal</th>
          <th>Status</th>
          <th>Aturan Keputusan</th>
        </tr>
      </thead>
      <tbody>
        ${traceRows(traceA, 'A')}
        ${traceRows(traceB, 'B')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-head">VI. Saran Perbaikan</div>
    <div class="two-col">
      <div>
        <p style="font-size:9.5px;font-weight:700;color:#3B2A7A;margin-bottom:8px">Proposal A</p>
        ${sugHtml(sugA, 'Proposal A')}
      </div>
      <div>
        <p style="font-size:9.5px;font-weight:700;color:#B84E47;margin-bottom:8px">Proposal B</p>
        ${sugHtml(sugB, 'Proposal B')}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-head">VII. Kesimpulan dan Rekomendasi</div>
    <p style="font-size:10.5px;color:#333;line-height:1.75;margin-bottom:10px">${kesimpulan()}</p>
    <p style="font-size:10.5px;color:#333;line-height:1.75">
      Berdasarkan analisis fitur menggunakan algoritma C4.5 dan tokenisasi berbasis Deterministic Finite Automata,
      sistem merekomendasikan agar pengusul memperhatikan fitur dengan skor rendah sebagaimana tercantum pada
      Bagian IV laporan ini. Perbaikan pada aspek kelengkapan struktur, kepadatan kata kunci akademik, dan konsistensi
      numerik dapat meningkatkan skor kelayakan proposal secara signifikan.
    </p>
  </div>

  <div class="disclaimer">
    <strong>Catatan:</strong> Laporan ini dihasilkan secara otomatis oleh sistem ScanPro menggunakan Lexical Analyzer berbasis Deterministic Finite Automata (DFA) dan Algoritma Pohon Keputusan C4.5. Hasil analisis bersifat indikatif dan merupakan alat bantu evaluasi, bukan pengganti penilaian akademik oleh dosen atau komite penilai yang berwenang.
  </div>

  <div class="sig-block">
    <div class="sig-inner">
      <div class="sig-city">Medan, ${dateOnly}</div>
      <div class="sig-name">Sistem ScanPro</div>
      <div class="sig-role">Evaluator Otomatis DFA + C4.5</div>
    </div>
  </div>

  <div class="footer-bar">
    <span>ScanPro &mdash; Pengantar Sains Komputasi, Universitas Negeri Medan</span>
    <span>No. Laporan: ${reportNo} &mdash; Dihasilkan: ${dateStr}</span>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

function submitContact() {
  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const msg     = document.getElementById('contactMsg').value.trim();
  if (!name || !email || !msg) {
    alert('Mohon lengkapi semua field yang wajib diisi (Nama, Email, Pesan).');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Format email tidak valid.');
    return;
  }
  alert(`Pesan Anda telah diterima, ${name}. Kami akan membalas ke ${email}.`);
  ['contactName','contactEmail','contactSubject','contactMsg'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function loadSample() {
  const sample = `Latar Belakang\nPenelitian ini bertujuan untuk mengembangkan sistem evaluasi proposal akademik secara otomatis menggunakan pendekatan komputasi modern. Metodologi yang digunakan adalah Deterministic Finite Automata sebagai lexical analyzer dan algoritma C4.5 sebagai pohon keputusan klasifikasi.\n\nRumusan Masalah\nBagaimana implementasi lexical analyzer berbasis DFA dan algoritma C4.5 dapat digunakan untuk evaluasi kelayakan proposal akademik secara efektif dan terukur?\n\nTujuan Penelitian\n1. Membangun lexer berbasis DFA untuk tokenisasi teks proposal.\n2. Menerapkan algoritma C4.5 untuk klasifikasi kelayakan.\n3. Mengevaluasi akurasi sistem dengan dataset proposal aktual.\n\nMetodologi\nPenelitian ini menggunakan pendekatan kuantitatif dengan metode eksperimen. Dataset terdiri dari 100 proposal akademik yang telah dikategorikan oleh pakar. Validasi dilakukan menggunakan 10-fold cross-validation. Analisis statistik menggunakan distribusi probabilitas dan information gain ratio.\n\nHasil dan Pembahasan\nImplementasi sistem menunjukkan hasil yang signifikan dengan akurasi klasifikasi mencapai 94.5%. Algoritma C4.5 berhasil mengidentifikasi fitur-fitur kritis dalam proposal akademik. Evaluasi menunjukkan bahwa variabel kepadatan keyword dan kelengkapan struktur merupakan fitur dengan information gain tertinggi.\n\nKesimpulan dan Saran\nSistem berhasil mengimplementasikan lexical analyzer DFA dan algoritma C4.5 untuk evaluasi kelayakan proposal. Pengembangan lebih lanjut dapat mencakup perluasan corpus keyword dan penambahan fitur semantik.`;
  document.getElementById('proposalText').value = sample;
  clearFile();
}

function loadSampleCompare(label) {
  const samples = {
    A: `Latar Belakang\nPenelitian ini bertujuan untuk mengembangkan sistem klasifikasi teks akademik menggunakan algoritma pembelajaran mesin. Metodologi yang digunakan meliputi preprocessing data, ekstraksi fitur, dan validasi model.\n\nTujuan Penelitian\nMengembangkan sistem klasifikasi otomatis dengan akurasi tinggi untuk proposal akademik. Mengevaluasi performa berbagai algoritma supervised learning terhadap dataset penelitian.\n\nMetodologi\nPenelitian menggunakan pendekatan kuantitatif eksperimen. Dataset berupa 200 proposal yang dilabeli oleh 3 pakar. Validasi menggunakan stratified k-fold cross-validation dengan k=10. Distribusi kelas seimbang untuk menghindari bias klasifikasi.\n\nHasil dan Pembahasan\nEkspcrimen menunjukkan akurasi 89.3% pada data pengujian. Analisis fitur menggunakan information gain mengidentifikasi kepadatan keyword sebagai fitur terpenting dengan gain ratio 0.412.`,
    B: `Penelitian ini membahas sistem rekomendasi berbasis konten. Data diambil dari platform akademik. Metode yang digunakan adalah collaborative filtering.\n\nHasil menunjukkan presisi rata-rata 72%. Akan dikembangkan lebih lanjut dengan pendekatan hybrid.`
  };
  document.getElementById('compareText' + label).value = samples[label];
}

function renderDFADiagram(typeCounts) {
  const container = document.getElementById('dfaDiagram');
  if (!container) return;
  const total = Object.values(typeCounts).reduce((a,b) => a + b, 0) || 1;
  const states = [
    { id:'q0',   label:'q0\nSTART',  x:65,  y:105, color:'var(--primary)',   textColor:'#fff' },
    { id:'q1',   label:'q1\nWORD',   x:195, y:45,  color:'var(--primary-l)', textColor:'var(--fg)' },
    { id:'q2',   label:'q2\nNUM',    x:195, y:105, color:'var(--primary-l)', textColor:'var(--fg)' },
    { id:'q3',   label:'q3\nOP',     x:195, y:165, color:'var(--primary-l)', textColor:'var(--fg)' },
    { id:'qacc', label:'q_acc\nKEY', x:335, y:45,  color:'var(--layak)',     textColor:'#fff' },
    { id:'qid',  label:'q_id\nIDENT',x:335, y:105, color:'var(--revisi)',    textColor:'var(--fg)' },
    { id:'qerr', label:'q_err\nERR', x:335, y:165, color:'var(--tidak)',     textColor:'#fff' },
  ];
  const edges = [
    { from:'q0', to:'q1',   label:'huruf' },
    { from:'q0', to:'q2',   label:'digit' },
    { from:'q0', to:'q3',   label:'op' },
    { from:'q1', to:'qacc', label:'keyword' },
    { from:'q1', to:'qid',  label:'identifier' },
    { from:'q1', to:'qerr', label:'>30 kar.' },
  ];
  const stateMap = Object.fromEntries(states.map(s => [s.id, s]));
  let svg = `<svg viewBox="0 0 420 215" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:215px">
  <defs>
    <marker id="arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
      <polygon points="0 0,7 2.5,0 5" fill="var(--fg-muted)"/>
    </marker>
  </defs>`;
  edges.forEach(e => {
    const s = stateMap[e.from], t = stateMap[e.to];
    if (!s || !t) return;
    const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2 - 11;
    svg += `<line x1="${s.x+28}" y1="${s.y}" x2="${t.x-28}" y2="${t.y}" stroke="var(--border)" stroke-width="1.5" marker-end="url(#arr)"/>
    <text x="${mx}" y="${my}" font-size="8.5" fill="var(--fg-muted)" text-anchor="middle" font-family="JetBrains Mono,monospace">${e.label}</text>`;
  });
  states.forEach(s => {
    const lines = s.label.split('\n');
    svg += `<circle cx="${s.x}" cy="${s.y}" r="26" fill="${s.color}" stroke="var(--border)" stroke-width="1.5"/>`;
    lines.forEach((ln, i) => {
      const dy = i === 0 ? -4 : 9;
      svg += `<text x="${s.x}" y="${s.y + dy}" font-size="${i===0?8.5:7}" fill="${s.textColor}" text-anchor="middle" font-weight="${i===0?'600':'400'}" font-family="JetBrains Mono,monospace">${ln}</text>`;
    });
    if (s.id === 'qacc') {
      svg += `<circle cx="${s.x}" cy="${s.y}" r="31" fill="none" stroke="${s.color}" stroke-width="1.5" opacity="0.45"/>`;
    }
  });
  svg += `</svg>`;
  container.innerHTML = svg;
}

function renderDatasetTable() {
  const tbody = document.getElementById('datasetBody');
  const igBody = document.getElementById('igTableBody');
  if (!tbody || !igBody) return;

  const DATASET = [
    { id:'P-001', excerpt:'Penelitian ini bertujuan mengembangkan model klasifikasi teks menggunakan algoritma supervised learning dengan validasi k-fold cross-validation...', f1:0.82, f2:0.74, f3:1.0,  f4:0.65, f5:1.0,  f6:0.78, f7:1.0,  label:'Layak' },
    { id:'P-002', excerpt:'Latar belakang penelitian menunjukkan kebutuhan analisis sentimen pada media sosial. Metodologi menggunakan preprocessing dan ekstraksi fitur TF-IDF...', f1:0.77, f2:0.69, f3:1.0,  f4:0.58, f5:0.95, f6:0.72, f7:1.0,  label:'Layak' },
    { id:'P-003', excerpt:'Implementasi algoritma C4.5 untuk evaluasi proposal akademik. Dataset berisi 150 sampel berlabel. Validasi menggunakan stratified k-fold...', f1:0.85, f2:0.80, f3:1.0,  f4:0.72, f5:1.0,  f6:0.81, f7:1.0,  label:'Layak' },
    { id:'P-004', excerpt:'Sistem rekomendasi berbasis collaborative filtering untuk platform e-learning. Evaluasi menggunakan metrik presisi, recall dan F1-score...', f1:0.71, f2:0.63, f3:0.75, f4:0.50, f5:0.98, f6:0.68, f7:1.0,  label:'Layak' },
    { id:'P-005', excerpt:'Deteksi anomali jaringan menggunakan metode unsupervised clustering. Latar belakang masalah keamanan siber. Tujuan membangun sistem real-time...', f1:0.68, f2:0.61, f3:1.0,  f4:0.44, f5:0.92, f6:0.65, f7:1.0,  label:'Layak' },
    { id:'P-006', excerpt:'Analisis sentimen menggunakan LSTM. Tujuan penelitian jelas. Metodologi mencakup preprocessing dan training model neural network...', f1:0.64, f2:0.58, f3:0.75, f4:0.40, f5:0.90, f6:0.61, f7:0.85, label:'Layak dengan Revisi' },
    { id:'P-007', excerpt:'Penelitian prediksi harga saham menggunakan time series. Latar belakang sudah ada. Perlu memperkuat bagian metodologi dan pembahasan...', f1:0.58, f2:0.52, f3:0.75, f4:0.62, f5:0.88, f6:0.55, f7:0.80, label:'Layak dengan Revisi' },
    { id:'P-008', excerpt:'Klasifikasi citra menggunakan Convolutional Neural Network untuk deteksi penyakit tanaman. Tujuan sudah ada namun metodologi kurang detail...', f1:0.60, f2:0.55, f3:0.75, f4:0.38, f5:0.94, f6:0.58, f7:0.90, label:'Layak dengan Revisi' },
    { id:'P-009', excerpt:'Sistem chatbot akademik berbasis NLP. Rumusan masalah ada. Perlu penambahan validasi dataset dan evaluasi performa secara kuantitatif...', f1:0.55, f2:0.50, f3:0.50, f4:0.35, f5:0.86, f6:0.52, f7:0.75, label:'Layak dengan Revisi' },
    { id:'P-010', excerpt:'Analisis big data pendidikan. Latar belakang singkat. Perlu diperluas metodologi, tambahkan bagian hasil dan pembahasan yang lebih komprehensif...', f1:0.52, f2:0.47, f3:0.50, f4:0.30, f5:0.84, f6:0.49, f7:0.70, label:'Layak dengan Revisi' },
    { id:'P-011', excerpt:'Penelitian tentang aplikasi mobile. Tidak ada metodologi jelas. Tidak ada tujuan terukur. Tidak ada latar belakang yang memadai...', f1:0.28, f2:0.24, f3:0.25, f4:0.15, f5:0.70, f6:0.30, f7:0.40, label:'Tidak Layak' },
    { id:'P-012', excerpt:'Studi kasus singkat tanpa struktur yang jelas. Kurang referensi akademik. Metodologi tidak disebutkan. Tujuan tidak terukur...', f1:0.22, f2:0.20, f3:0.0,  f4:0.10, f5:0.65, f6:0.25, f7:0.30, label:'Tidak Layak' },
    { id:'P-013', excerpt:'Proposal sangat singkat. Hanya ada judul dan deskripsi satu paragraf tanpa komponen akademik yang memenuhi standar minimum...', f1:0.18, f2:0.15, f3:0.0,  f4:0.05, f5:0.60, f6:0.20, f7:0.20, label:'Tidak Layak' },
    { id:'P-014', excerpt:'Rencana penelitian tanpa dasar teori. Tidak ada rumusan masalah eksplisit. Data penelitian tidak dijelaskan. Validasi tidak ada...', f1:0.32, f2:0.28, f3:0.25, f4:0.20, f5:0.72, f6:0.35, f7:0.45, label:'Tidak Layak' },
    { id:'P-015', excerpt:'Tulisan tidak terstruktur. Banyak token error. Tidak ada bagian wajib. Kosakata akademik sangat minim dan tidak memadai untuk penilaian...', f1:0.15, f2:0.12, f3:0.0,  f4:0.08, f5:0.40, f6:0.18, f7:0.25, label:'Tidak Layak' },
  ];

  const labelClass = { 'Layak': 'ds-layak', 'Layak dengan Revisi': 'ds-revisi', 'Tidak Layak': 'ds-tidak' };
  tbody.innerHTML = DATASET.map(d => `
    <tr>
      <td>${d.id}</td>
      <td><div class="ds-excerpt">${d.excerpt}</div></td>
      <td class="ds-score-cell">${(d.f1*100).toFixed(0)}%</td>
      <td class="ds-score-cell">${(d.f2*100).toFixed(0)}%</td>
      <td class="ds-score-cell">${(d.f3*100).toFixed(0)}%</td>
      <td class="ds-score-cell">${(d.f4*100).toFixed(0)}%</td>
      <td class="ds-score-cell">${(d.f5*100).toFixed(0)}%</td>
      <td class="ds-score-cell">${(d.f6*100).toFixed(0)}%</td>
      <td class="ds-score-cell">${(d.f7*100).toFixed(0)}%</td>
      <td><span class="ds-label-badge ${labelClass[d.label]}">${d.label}</span></td>
    </tr>
  `).join('');

  const IG_DATA = [
    { name:'F3 — Kelengkapan Struktur',   weight:0.18, ig:0.412, gr:0.394, role:'Simpul akar pohon (root node)' },
    { name:'F1 — Kepadatan Keyword',       weight:0.22, ig:0.387, gr:0.361, role:'Simpul level 2 kiri' },
    { name:'F2 — Rasio Term Akademik',     weight:0.20, ig:0.351, gr:0.328, role:'Simpul level 2 kanan' },
    { name:'F5 — Ketiadaan Token Error',   weight:0.14, ig:0.298, gr:0.271, role:'Simpul level 3' },
    { name:'F4 — Konsistensi Numerik',     weight:0.12, ig:0.244, gr:0.219, role:'Simpul level 3' },
    { name:'F6 — Kekayaan Kosakata',       weight:0.10, ig:0.187, gr:0.165, role:'Simpul level 4' },
    { name:'F7 — Panjang Teks Cukup',      weight:0.04, ig:0.098, gr:0.082, role:'Leaf node / terminal' },
  ];

  const maxIG = Math.max(...IG_DATA.map(d => d.ig));
  igBody.innerHTML = IG_DATA.map(d => `
    <tr>
      <td style="font-size:0.82rem">${d.name}</td>
      <td><span class="ds-score-cell">${d.weight.toFixed(2)}</span></td>
      <td><span class="ds-score-cell">${d.ig.toFixed(3)}</span></td>
      <td><span class="ds-score-cell">${d.gr.toFixed(3)}</span></td>
      <td style="font-size:0.78rem;color:var(--fg-muted)">${d.role}</td>
      <td>
        <div class="ig-bar-wrap">
          <div class="ig-bar-track">
            <div class="ig-bar-fill" style="width:${Math.round((d.ig/maxIG)*100)}%"></div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
