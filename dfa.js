const KEYWORDS_DFA = new Set([
  'penelitian','metodologi','hipotesis','analisis','tujuan','dataset',
  'model','evaluasi','pelatihan','akurasi','referensi','abstrak',
  'variabel','populasi','sampel','implementasi','algoritma','klasifikasi',
  'regresi','clustering','validasi','pengujian','eksperimen','kesimpulan',
  'saran','rumusan','masalah','literatur','sitasi','kerangka','teori',
  'konseptual','sistematis','kuantitatif','kualitatif','deskriptif',
  'studi','kasus','survei','observasi','wawancara','dokumentasi',
  'reliabilitas','validitas','inferensi','korelasi','signifikansi',
  'distribusi','probabilitas','entropi','informasi','gain',
  'preprocessing','normalisasi','ekstraksi','seleksi','komponen',
  'supervised','unsupervised','pembelajaran','jaringan','arsitektur',
  'semantik','sintaksis','leksikon','ontologi','corpus','dokumen',
  'teks','bahasa','natural','data','basis','struktur','desain','sistem',
  'latar','belakang','metode','tinjauan','pustaka','pendahuluan',
  'pembahasan','hasil','anggaran','jadwal','manfaat','penulisan',
]);

// DFA States
const S = { START: 0, IN_WORD: 1, IN_NUMBER: 2, IN_OP: 3 };

// DFA state transition labels for display
const STATE_LABELS = {
  [S.START]: 'q0',
  [S.IN_WORD]: 'q1',
  [S.IN_NUMBER]: 'q2',
  [S.IN_OP]: 'q3',
};

function dfaTokenize(text) {
  const tokens = [];
  let state = S.START;
  let buf = '';
  let start = 0;
  const input = text + '\n';

  function flush() {
    if (!buf) return;
    let type, cls;
    if (/^\d+(\.\d+)?$/.test(buf)) {
      type = 'NUMBER'; cls = 'tk-num';
    } else if (KEYWORDS_DFA.has(buf.toLowerCase())) {
      type = 'KEYWORD'; cls = 'tk-kw';
    } else if (/^[A-Za-z_\u00C0-\u024F][A-Za-z0-9_\u00C0-\u024F]*$/.test(buf)) {
      if (buf.length > 30) { type = 'ERROR'; cls = 'tk-err'; }
      else { type = 'IDENTIFIER'; cls = 'tk-id'; }
    } else if (/^[+\-*/=<>!&|^%]+$/.test(buf)) {
      type = 'OPERATOR'; cls = 'tk-op';
    } else {
      type = 'ERROR'; cls = 'tk-err';
    }
    tokens.push({ val: buf, type, cls, pos: start });
    buf = '';
  }

  function isLetter(c) { return /[A-Za-z_\u00C0-\u024F]/.test(c); }
  function isDigit(c)  { return /[0-9]/.test(c); }
  function isAlnum(c)  { return /[A-Za-z0-9_\u00C0-\u024F]/.test(c); }
  function isOp(c)     { return /[+\-*/=<>!&|^%]/.test(c); }

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    switch (state) {
      case S.START:
        start = i;
        if (isLetter(c))     { buf = c; state = S.IN_WORD; }
        else if (isDigit(c)) { buf = c; state = S.IN_NUMBER; }
        else if (isOp(c))    { buf = c; state = S.IN_OP; }
        break;
      case S.IN_WORD:
        if (isAlnum(c)) buf += c;
        else { flush(); state = S.START; i--; }
        break;
      case S.IN_NUMBER:
        if (isDigit(c) || c === '.') buf += c;
        else { flush(); state = S.START; i--; }
        break;
      case S.IN_OP:
        if (isOp(c)) buf += c;
        else { flush(); state = S.START; i--; }
        break;
    }
  }
  return tokens;
}

// FIX: correct DFA state table logic — map token types to proper q-states
function buildDFATable(tokens) {
  const typeToInitState = {
    'KEYWORD':    'q0',
    'IDENTIFIER': 'q0',
    'NUMBER':     'q0',
    'OPERATOR':   'q0',
    'ERROR':      'q0',
  };
  const typeToFinalState = {
    'KEYWORD':    'q_accept',
    'IDENTIFIER': 'q1',
    'NUMBER':     'q2',
    'OPERATOR':   'q3',
    'ERROR':      'q_err',
  };
  const typeToStatus = {
    'KEYWORD':    'accept',
    'IDENTIFIER': 'intermediate',
    'NUMBER':     'intermediate',
    'OPERATOR':   'intermediate',
    'ERROR':      'reject',
  };

  return tokens.slice(0, 12).map(t => ({
    token:  t.val,
    type:   t.type,
    si:     typeToInitState[t.type] || 'q0',
    sf:     typeToFinalState[t.type] || 'q0',
    status: typeToStatus[t.type] || 'intermediate',
  }));
}

// NEW: Build DFA diagram data for visualization
function buildDFADiagramData(tokens) {
  const typeCounts = { KEYWORD: 0, IDENTIFIER: 0, NUMBER: 0, OPERATOR: 0, ERROR: 0 };
  tokens.forEach(t => { if (typeCounts[t.type] !== undefined) typeCounts[t.type]++; });
  return typeCounts;
}
