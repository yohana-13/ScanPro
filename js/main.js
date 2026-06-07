async function runAnalysis() {
  const text = document.getElementById('proposalText').value.trim();
  if (!text) {
    alert('Harap masukkan teks proposal terlebih dahulu.');
    return;
  }

  const messages = [
    'Menginisialisasi Lexical Analyzer...',
    'Membangun DFA state transitions...',
    'Mengekstrak token dari teks...',
    'Menghitung Information Gain C4.5...',
    'Membangun Pohon Keputusan...',
    'Mengklasifikasikan kelayakan...',
  ];

  let mi = 0;
  setProgress(2);
  showLoading(messages);
  const iv = setInterval(() => {
    mi = (mi + 1) % messages.length;
    document.getElementById('loadingMsg').textContent = messages[mi];
  }, 500);

  await new Promise(r => setTimeout(r, 2000));
  clearInterval(iv);
  hideLoading();
  setProgress(3);

  const tokens        = dfaTokenize(text);
  const featureScores = extractFeatureScores(tokens, text);
  const trace         = buildDecisionTrace(tokens, text);
  const result        = c45Classify(featureScores, trace);
  const dfaTable      = buildDFATable(tokens);
  const dfaCounts     = buildDFADiagramData(tokens);

  setProgress(4);

  const vc = document.getElementById('verdictCard');
  vc.className = 'verdict-card ' + result.cls;
  document.getElementById('verdictText').textContent  = result.verdict;
  document.getElementById('verdictDesc').textContent  = result.desc;
  document.getElementById('verdictScore').textContent = result.score + '%';

  const fill = document.getElementById('verdictFill');
  fill.style.width      = '0%';
  fill.style.background = result.fillColor;
  setTimeout(() => { fill.style.width = result.score + '%'; }, 100);

  const kws  = tokens.filter(t => t.type === 'KEYWORD').length;
  const ids  = tokens.filter(t => t.type === 'IDENTIFIER').length;
  const nums = tokens.filter(t => t.type === 'NUMBER').length;
  document.getElementById('sTotal').textContent    = tokens.length;
  document.getElementById('sKeywords').textContent = kws;
  document.getElementById('sIdents').textContent   = ids;
  document.getElementById('sNumbers').textContent  = nums;

  const ts = document.getElementById('tokenStream');
  ts.innerHTML = '';
  tokens.slice(0, 60).forEach(t => {
    const s = document.createElement('span');
    s.className = 'token-chip ' + t.cls;
    s.innerHTML = `<span class="token-type-badge">${t.type}</span>${escHtml(t.val)}`;
    s.title = t.type;
    ts.appendChild(s);
  });
  if (tokens.length > 60) {
    const m = document.createElement('span');
    m.style.cssText = 'font-size:0.75rem;color:var(--fg-muted);align-self:center;padding:3px 9px;background:var(--bg2);border-radius:99px';
    m.textContent = `+${tokens.length - 60} token lainnya`;
    ts.appendChild(m);
  }

  renderDFADiagram(dfaCounts);

  document.getElementById('dfaTableBody').innerHTML = dfaTable.map(r => `
    <tr>
      <td><span class="mono">${escHtml(r.token)}</span></td>
      <td><span class="mono">${r.si}</span></td>
      <td><span class="mono">${r.sf}</span></td>
      <td><span class="state-badge state-${r.status}">${
        r.status === 'accept' ? 'Accepted' :
        r.status === 'reject' ? 'Rejected' : 'Inter'
      }</span></td>
    </tr>
  `).join('');

  const fb = document.getElementById('featureBars');
  fb.innerHTML = featureScores.map(f => `
    <div class="feature-row">
      <div class="feature-top">
        <span class="feature-name">${escHtml(f.name)}</span>
        <span class="feature-pct">${Math.round(f.score * 100)}%</span>
      </div>
      <div class="feature-track">
        <div class="feature-fill" data-pct="${Math.round(f.score * 100)}" style="width:0%"></div>
      </div>
    </div>
  `).join('');
  document.getElementById('entropyVal').textContent = result.entropy.toFixed(4);
  setTimeout(() => {
    document.querySelectorAll('.feature-fill[data-pct]').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 100);

  document.getElementById('decisionList').innerHTML = trace.map(t => `
    <li class="decision-item">
      <div class="decision-icon ${t.passed ? 'decision-pass' : 'decision-fail'}">
        ${t.passed ? 'L' : 'G'}
      </div>
      <span>${escHtml(t.rule)}</span>
    </li>
  `).join('');

  const sp = document.getElementById('suggestPanel');
  if (result.suggestions.length > 0) {
    sp.style.display = 'block';
    document.getElementById('suggestionList').innerHTML = result.suggestions.map(s => `
      <li class="suggestion-item">
        <div class="suggestion-bullet"></div>
        <span>${escHtml(s)}</span>
      </li>
    `).join('');
  } else {
    sp.style.display = 'none';
  }

  const kwSet = new Set(tokens.filter(t => t.type === 'KEYWORD').map(t => t.val.toLowerCase()));
  document.getElementById('kwChips').innerHTML =
    [...kwSet].map(k => `<span class="token-chip tk-kw">${escHtml(k)}</span>`).join('');

  document.getElementById('resultsEmpty').style.display   = 'none';
  document.getElementById('resultsContent').style.display = 'block';
  document.getElementById('exportBtn').style.display      = '';
  setTimeout(() => {
    document.getElementById('resultsContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  addToHistory({
    id:      Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name:    currentFile ? currentFile.name : 'Teks Manual',
    verdict: result.verdict,
    score:   result.score,
    time:    Date.now(),
    preview: text.slice(0, 400),
  });
}

async function runComparison() {
  const textA = document.getElementById('compareTextA').value.trim();
  const textB = document.getElementById('compareTextB').value.trim();
  if (!textA || !textB) {
    alert('Harap isi kedua proposal sebelum membandingkan.');
    return;
  }

  showLoading('Menganalisis kedua proposal...');
  await new Promise(r => setTimeout(r, 1800));
  hideLoading();

  const analyze = (text) => {
    const tokens        = dfaTokenize(text);
    const featureScores = extractFeatureScores(tokens, text);
    const trace         = buildDecisionTrace(tokens, text);
    const result        = c45Classify(featureScores, trace);
    return { tokens, featureScores, trace, result };
  };

  const dA = analyze(textA);
  const dB = analyze(textB);

  window._cmpDataA = { data: dA, text: textA, fileName: (typeof currentFileA !== 'undefined' && currentFileA) ? currentFileA.name : 'Proposal A (Teks Manual)' };
  window._cmpDataB = { data: dB, text: textB, fileName: (typeof currentFileB !== 'undefined' && currentFileB) ? currentFileB.name : 'Proposal B (Teks Manual)' };

  const setVerdictMini = (idSuffix, data) => {
    const card = document.getElementById('cmpVerdict' + idSuffix);
    card.className = 'compare-verdict-mini verdict-card ' + data.result.cls;
    document.getElementById('cmpVerdText'  + idSuffix).textContent = data.result.verdict;
    document.getElementById('cmpVerdScore' + idSuffix).textContent = data.result.score + '%';
  };

  setVerdictMini('A', dA);
  setVerdictMini('B', dB);

  const renderFeatBars = (containerId, featureScores, colorVar) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = featureScores.map(f => `
      <div class="compare-feat-row">
        <div class="compare-feat-name">${escHtml(f.name)}</div>
        <div class="compare-track">
          <div class="${colorVar === 'A' ? 'compare-fill-a' : 'compare-fill-b'}"
               style="width:${Math.round(f.score * 100)}%"></div>
        </div>
        <div class="compare-feat-vals">
          <span class="${colorVar === 'A' ? 'compare-val-a' : 'compare-val-b'}">${Math.round(f.score * 100)}%</span>
        </div>
      </div>
    `).join('');
  };

  renderFeatBars('cmpFeatA', dA.featureScores, 'A');
  renderFeatBars('cmpFeatB', dB.featureScores, 'B');

  const featureNames = dA.featureScores.map(f => f.name);
  const rowsHtml = featureNames.map((name, i) => {
    const va = Math.round(dA.featureScores[i].score * 100);
    const vb = Math.round(dB.featureScores[i].score * 100);
    const delta = vb - va;
    let deltaClass = 'diff-neu', deltaText = '=';
    if (delta > 0) { deltaClass = 'diff-pos'; deltaText = '+' + delta + '%'; }
    if (delta < 0) { deltaClass = 'diff-neg'; deltaText = delta + '%'; }
    return `
      <div class="diff-row">
        <span class="diff-label">${escHtml(name)}</span>
        <span class="diff-a">${va}%</span>
        <span class="diff-vs">vs</span>
        <span class="diff-b">${vb}%</span>
        <span class="diff-delta ${deltaClass}">${deltaText}</span>
      </div>
    `;
  });

  const scoreDelta = dB.result.score - dA.result.score;
  const scoreClass = scoreDelta > 0 ? 'diff-pos' : scoreDelta < 0 ? 'diff-neg' : 'diff-neu';
  const scoreText  = scoreDelta > 0 ? '+' + scoreDelta + '%' : scoreDelta + '%';
  rowsHtml.unshift(`
    <div class="diff-row" style="background:var(--primary-bg);border-left:3px solid var(--primary);margin-bottom:10px">
      <span class="diff-label" style="font-weight:600;color:var(--fg)">Skor Kelayakan Total</span>
      <span class="diff-a" style="font-size:1rem">${dA.result.score}%</span>
      <span class="diff-vs">vs</span>
      <span class="diff-b" style="font-size:1rem">${dB.result.score}%</span>
      <span class="diff-delta ${scoreClass}" style="font-size:0.8rem">${scoreText}</span>
    </div>
  `);

  document.getElementById('cmpDiffRows').innerHTML = rowsHtml.join('');
  document.getElementById('compareResults').style.display = 'block';
  document.getElementById('comparePdfBtn').style.display = '';
  document.getElementById('compareResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
  setupDropZone();
  setupCmpDropZones();
  renderHistory();
  setProgress(1);
});
