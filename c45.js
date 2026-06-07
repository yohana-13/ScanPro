// FIX: FEATURE_DEFS as array of objects (was being spread wrong)
const FEATURE_DEFS = [
  { id: 'kw_density',     name: 'Kepadatan Keyword',        weight: 0.22 },
  { id: 'academic_ratio', name: 'Rasio Term Akademik',       weight: 0.20 },
  { id: 'has_structure',  name: 'Kelengkapan Struktur',      weight: 0.18 },
  { id: 'numeric_cons',   name: 'Konsistensi Numerik',       weight: 0.12 },
  { id: 'error_rate',     name: 'Ketiadaan Token Error',     weight: 0.14 },
  { id: 'vocab_rich',     name: 'Kekayaan Kosakata',         weight: 0.10 },
  { id: 'text_length',    name: 'Panjang Teks Cukup',        weight: 0.04 },
];

function entropy(p) {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}
 function extractFeatureScores(tokens, text) {
  const kws   = tokens.filter(t => t.type === 'KEYWORD').length;
  const ids   = tokens.filter(t => t.type === 'IDENTIFIER').length;
  const nums  = tokens.filter(t => t.type === 'NUMBER').length;
  const errs  = tokens.filter(t => t.type === 'ERROR').length;
  const total = tokens.length || 1;
  const lowerText = text.toLowerCase();

  const uniqueIds = new Set(
    tokens.filter(t => t.type === 'IDENTIFIER').map(t => t.val.toLowerCase())
  ).size;

  const hasBackground = lowerText.includes('latar') || lowerText.includes('belakang');
  const hasObjective  = lowerText.includes('tujuan');
  const hasMethod     = lowerText.includes('metodologi') || lowerText.includes('metode');
  const hasResult     = lowerText.includes('hasil') || lowerText.includes('pembahasan');
  const structureScore = [hasBackground, hasObjective, hasMethod, hasResult]
    .filter(Boolean).length / 4;

  const scores = [
    Math.min(kws / total * 5, 1),
    Math.min(kws / (kws + ids + 0.1), 1),
    structureScore,
    Math.min(nums / total * 8, 1),
    Math.max(0, 1 - errs / total * 10),
    Math.min(uniqueIds / (ids + 1) * 2, 1),
    Math.min(total / 140, 1),
  ];
  return FEATURE_DEFS.map((def, i) => ({ ...def, score: scores[i] }));
}

function buildDecisionTrace(tokens, text) {
  const lowerText = text.toLowerCase();
  const wordTokens = tokens.filter(t => t.type === 'KEYWORD' || t.type === 'IDENTIFIER');
  const kws = tokens.filter(t => t.type === 'KEYWORD');
  const uniqueKwSet = new Set(kws.map(t => t.val.toLowerCase()));
  const kwRatioPct = wordTokens.length
    ? ((kws.length / wordTokens.length) * 100).toFixed(1)
    : 0;

  return [
    { rule: `Jumlah kata ≥ 80 (${wordTokens.length} kata)`,                                          passed: wordTokens.length >= 80 },
    { rule: `Memuat bagian Latar Belakang`,                                                            passed: lowerText.includes('latar') || lowerText.includes('belakang') },
    { rule: `Memuat bagian Tujuan Penelitian`,                                                         passed: lowerText.includes('tujuan') },
    { rule: `Memuat bagian Metodologi atau Metode`,                                                    passed: lowerText.includes('metodologi') || lowerText.includes('metode') },
    { rule: `Memuat bagian Hasil atau Pembahasan`,                                                     passed: lowerText.includes('hasil') || lowerText.includes('pembahasan') },
    { rule: `Keragaman kata kunci ≥ 5 (${uniqueKwSet.size} unik)`,                                    passed: uniqueKwSet.size >= 5 },
    { rule: `Rasio kata kunci ≥ 4% (${kwRatioPct}%)`,                                                 passed: wordTokens.length > 0 && kws.length / wordTokens.length >= 0.04 },
  ];
}

function c45Classify(featureScores, trace) {
  let weightedSum = 0, totalWeight = 0;
  featureScores.forEach(f => {
    weightedSum += f.score * f.weight;
    totalWeight  += f.weight;
  });
  const score     = weightedSum / totalWeight;
  const ruleScore = trace.filter(t => t.passed).length / trace.length;
  const finalScore = score * 0.6 + ruleScore * 0.4;
  const pct = Math.round(finalScore * 100);
  const ent = entropy(finalScore);

  let verdict, cls, fillColor, desc;
  if (pct >= 80) {
    verdict = 'Layak';
    cls = 'verdict-layak'; fillColor = 'var(--layak)';
    desc = 'Proposal memenuhi standar kelayakan akademik. Struktur dan konten dinilai baik.';
  } else if (pct >= 55) {
    verdict = 'Layak dengan Revisi';
    cls = 'verdict-revisi'; fillColor = 'var(--revisi)';
    desc = 'Proposal memerlukan beberapa perbaikan sebelum dapat diterima secara akademik.';
  } else {
    verdict = 'Tidak Layak';
    cls = 'verdict-tidak'; fillColor = 'var(--tidak)';
    desc = 'Proposal belum memenuhi kriteria minimum kelayakan akademik.';
  }

  const suggestions = [];
  trace.forEach(t => {
    if (!t.passed) {
      if (t.rule.includes('80'))              suggestions.push('Perluas isi proposal hingga minimal 80 kata.');
      else if (t.rule.includes('Latar'))      suggestions.push('Tambahkan bagian Latar Belakang yang jelas dan komprehensif.');
      else if (t.rule.includes('Tujuan'))     suggestions.push('Tulis Tujuan Penelitian secara eksplisit dan terukur.');
      else if (t.rule.includes('Metodologi')) suggestions.push('Lengkapi bagian Metodologi penelitian secara rinci.');
      else if (t.rule.includes('Hasil'))      suggestions.push('Sertakan bagian Hasil dan Pembahasan penelitian.');
      else if (t.rule.includes('Keragaman'))  suggestions.push('Perkaya proposal dengan terminologi akademik yang lebih beragam.');
      else if (t.rule.includes('Rasio'))      suggestions.push('Pertajam fokus akademik — tingkatkan penggunaan istilah ilmiah.');
    }
  });

  const igRatios = featureScores.map(f => {
    const gain = f.weight * entropy(Math.max(0.01, Math.min(0.99, f.score)));
    return { ...f, igRatio: gain };
  });

  return { verdict, cls, fillColor, score: pct, entropy: ent, desc, suggestions, igRatios };
}
