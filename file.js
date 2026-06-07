let currentFile = null;

function setupDropZone() {
  const dz = document.getElementById('dropZone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragging'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragging'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('dragging');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  });
}

function triggerFilePick() {
  document.getElementById('fileInput').click();
}
function handleFile(e) {
  const files = e.target.files;
  if (!files || files.length === 0) {
    console.error('Tidak ada file yang terdeteksi.');
    return;
  }
  processFile(files[0]);
}

function getFileKind(file) {
  if (!file || !file.name) return null;
  const name = file.name.trim().toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (name.endsWith('.txt') || type.includes('text/plain'))             return 'txt';
  if (name.endsWith('.pdf') || type.includes('pdf'))                    return 'pdf';
  if (name.endsWith('.docx') || name.endsWith('.doc') || name.endsWith('.rtf') ||
      type.includes('word') || type.includes('officedocument'))         return 'docx';
  if (/\.(png|jpe?g|webp|bmp|tiff?)$/.test(name) || type.startsWith('image/')) return 'image';
  return null;
}

function setUploadProgress(pct, msg) {
  document.getElementById('uploadProgress').style.display = 'block';
  document.getElementById('uploadFill').style.width = pct + '%';
  document.getElementById('uploadMsg').textContent = msg;
}

function hideUploadProgress() {
  setTimeout(() => {
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadFill').style.width = '0%';
  }, 600);
}

function showExtractedText(text, file, extra) {
  document.getElementById('proposalText').value = text;
  currentFile = { name: file.name, size: file.size };

  document.getElementById('dzDefault').style.display = 'none';
  document.getElementById('dzActive').style.display = 'flex';
  document.getElementById('dzFilename').textContent =
    `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  const prev = document.getElementById('previewBox');
  prev.style.display = 'block';
  document.getElementById('previewText').textContent =
    text.slice(0, 500) + (text.length > 500 ? '...' : '');
  document.getElementById('previewMeta').textContent =
    `${text.length.toLocaleString('id-ID')} karakter  •  ${file.name}` + (extra ? `  •  ${extra}` : '');
  document.getElementById('previewImg').style.display = 'none';
}

async function processFile(file) {
  if (!(file instanceof File)) {
    console.error('processFile: expected a File object, got', typeof file);
    return;
  }

  const kind = getFileKind(file);

  if (!kind) {
    alert(
      `Format file tidak didukung.\n\nNama: "${file.name}"\nTipe: "${file.type || 'tidak diketahui'}"\n\n` +
      `Format yang didukung: .txt, .pdf, .docx, .doc, .png, .jpg, .jpeg`
    );
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    alert('Ukuran file maksimal 20 MB.'); return;
  }

  setUploadProgress(10, 'Membaca file...');

  try {
    if (kind === 'txt') {
      setUploadProgress(40, 'Memproses teks...');
      const text = await file.text();
      setUploadProgress(100, 'Selesai');
      hideUploadProgress();
      showExtractedText(text, file, 'Teks biasa');

    } else if (kind === 'pdf') {
      setUploadProgress(20, 'Memuat PDF...');
      const arrayBuf = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) throw new Error('PDF.js belum termuat. Coba refresh halaman.');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      setUploadProgress(40, `Mengekstrak ${pdf.numPages} halaman...`);

      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page    = await pdf.getPage(p);
        const content = await page.getTextContent();
        fullText += content.items.map(i => i.str).join(' ') + '\n';
        setUploadProgress(40 + Math.round((p / pdf.numPages) * 50), `Halaman ${p}/${pdf.numPages}...`);
      }
      setUploadProgress(100, 'Selesai');
      hideUploadProgress();

      if (!fullText.trim()) {
        // Scanned PDF — fallback to OCR on page 1
        setUploadProgress(10, 'PDF scan terdeteksi, menjalankan OCR...');
        const page     = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        await runOCR(file, canvas.toDataURL('image/png'), 'PDF (OCR)');
      } else {
        showExtractedText(fullText.trim(), file, `PDF • ${pdf.numPages} halaman`);
      }

    } else if (kind === 'docx') {
      setUploadProgress(20, 'Membaca DOCX...');
      const arrayBuf = await file.arrayBuffer();
      setUploadProgress(50, 'Mengekstrak teks...');
      if (!window.mammoth) throw new Error('Mammoth.js belum termuat. Coba refresh halaman.');
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuf });
      setUploadProgress(100, 'Selesai');
      hideUploadProgress();
      showExtractedText(result.value.trim(), file, 'Word DOCX');

    } else if (kind === 'image') {
      setUploadProgress(10, 'Memuat gambar...');
      const objectUrl = URL.createObjectURL(file);
      const imgEl = document.getElementById('previewImg');
      imgEl.src = objectUrl;
      imgEl.style.display = 'block';
      document.getElementById('previewBox').style.display = 'block';
      await runOCR(file, objectUrl, 'Gambar (OCR)');
    }
  } catch (err) {
    hideUploadProgress();
    alert('Gagal memproses file: ' + (err.message || err));
    console.error(err);
  }
}

async function runOCR(file, imgSrc, label) {
  setUploadProgress(15, 'Menginisialisasi Tesseract OCR...');
  try {
    if (!window.Tesseract) throw new Error('Tesseract.js belum termuat.');
    const worker = await Tesseract.createWorker('ind+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          setUploadProgress(
            20 + Math.round(m.progress * 75),
            `OCR: ${Math.round(m.progress * 100)}%...`
          );
        }
      },
    });
    const { data: { text } } = await worker.recognize(imgSrc);
    await worker.terminate();
    setUploadProgress(100, 'OCR selesai');
    hideUploadProgress();
    showExtractedText(text.trim(), file, label);
    document.getElementById('previewText').textContent =
      text.slice(0, 500) + (text.length > 500 ? '...' : '');
  } catch (err) {
    hideUploadProgress();
    alert('OCR gagal: ' + (err.message || err) + '\nCoba unggah file teks biasa (.txt).');
  }
}

function clearFile() {
  currentFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('dzDefault').style.display  = 'block';
  document.getElementById('dzActive').style.display   = 'none';
  document.getElementById('previewBox').style.display = 'none';
  document.getElementById('previewImg').style.display = 'none';
}

let currentFileA = null;
let currentFileB = null;

function setupCmpDropZones() {
  ['A', 'B'].forEach(label => {
    const dz = document.getElementById('cmpDropZone' + label);
    if (!dz) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragging'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragging'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragging');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processCmpFile(e.dataTransfer.files[0], label);
      }
    });
  });
}

function triggerCmpFilePick(label) {
  document.getElementById('cmpFileInput' + label).click();
}

function handleCmpFile(e, label) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  processCmpFile(files[0], label);
}

function setCmpUploadProgress(label, pct, msg) {
  document.getElementById('cmpUploadProgress' + label).style.display = 'block';
  document.getElementById('cmpUploadFill' + label).style.width = pct + '%';
  document.getElementById('cmpUploadMsg' + label).textContent = msg;
}

function hideCmpUploadProgress(label) {
  setTimeout(() => {
    document.getElementById('cmpUploadProgress' + label).style.display = 'none';
    document.getElementById('cmpUploadFill' + label).style.width = '0%';
  }, 600);
}

function showCmpExtractedText(text, file, label) {
  document.getElementById('compareText' + label).value = text;
  if (label === 'A') currentFileA = { name: file.name, size: file.size };
  else currentFileB = { name: file.name, size: file.size };

  document.getElementById('cmpDzDefault' + label).style.display = 'none';
  document.getElementById('cmpDzActive' + label).style.display = 'flex';
  document.getElementById('cmpDzFilename' + label).textContent =
    file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
}

async function processCmpFile(file, label) {
  if (!(file instanceof File)) return;

  const kind = getFileKind(file);

  if (!kind) {
    alert('Format file tidak didukung.\n\nNama: "' + file.name + '"\nFormat yang didukung: .txt, .pdf, .docx, .doc, .png, .jpg, .jpeg');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    alert('Ukuran file maksimal 20 MB.');
    return;
  }

  setCmpUploadProgress(label, 10, 'Membaca file...');

  try {
    if (kind === 'txt') {
      setCmpUploadProgress(label, 40, 'Memproses teks...');
      const text = await file.text();
      setCmpUploadProgress(label, 100, 'Selesai');
      hideCmpUploadProgress(label);
      showCmpExtractedText(text, file, label);

    } else if (kind === 'pdf') {
      setCmpUploadProgress(label, 20, 'Memuat PDF...');
      const arrayBuf = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) throw new Error('PDF.js belum termuat. Coba refresh halaman.');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      setCmpUploadProgress(label, 40, 'Mengekstrak ' + pdf.numPages + ' halaman...');

      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        fullText += content.items.map(i => i.str).join(' ') + '\n';
        setCmpUploadProgress(label, 40 + Math.round((p / pdf.numPages) * 50), 'Halaman ' + p + '/' + pdf.numPages + '...');
      }
      setCmpUploadProgress(label, 100, 'Selesai');
      hideCmpUploadProgress(label);

      if (!fullText.trim()) {
        setCmpUploadProgress(label, 10, 'PDF scan terdeteksi, menjalankan OCR...');
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        await runCmpOCR(file, canvas.toDataURL('image/png'), label);
      } else {
        showCmpExtractedText(fullText.trim(), file, label);
      }

    } else if (kind === 'docx') {
      setCmpUploadProgress(label, 20, 'Membaca DOCX...');
      const arrayBuf = await file.arrayBuffer();
      setCmpUploadProgress(label, 50, 'Mengekstrak teks...');
      if (!window.mammoth) throw new Error('Mammoth.js belum termuat. Coba refresh halaman.');
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuf });
      setCmpUploadProgress(label, 100, 'Selesai');
      hideCmpUploadProgress(label);
      showCmpExtractedText(result.value.trim(), file, label);

    } else if (kind === 'image') {
      setCmpUploadProgress(label, 10, 'Memuat gambar...');
      const objectUrl = URL.createObjectURL(file);
      await runCmpOCR(file, objectUrl, label);
    }
  } catch (err) {
    hideCmpUploadProgress(label);
    alert('Gagal memproses file: ' + (err.message || err));
    console.error(err);
  }
}

async function runCmpOCR(file, imgSrc, label) {
  setCmpUploadProgress(label, 15, 'Menginisialisasi Tesseract OCR...');
  try {
    if (!window.Tesseract) throw new Error('Tesseract.js belum termuat.');
    const worker = await Tesseract.createWorker('ind+eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          setCmpUploadProgress(label, 20 + Math.round(m.progress * 75), 'OCR: ' + Math.round(m.progress * 100) + '%...');
        }
      },
    });
    const { data: { text } } = await worker.recognize(imgSrc);
    await worker.terminate();
    setCmpUploadProgress(label, 100, 'OCR selesai');
    hideCmpUploadProgress(label);
    showCmpExtractedText(text.trim(), file, label);
  } catch (err) {
    hideCmpUploadProgress(label);
    alert('OCR gagal: ' + (err.message || err) + '\nCoba unggah file teks biasa (.txt).');
  }
}

function clearCmpFile(label) {
  if (label === 'A') currentFileA = null;
  else currentFileB = null;
  document.getElementById('cmpFileInput' + label).value = '';
  document.getElementById('compareText' + label).value = '';
  document.getElementById('cmpDzDefault' + label).style.display = 'block';
  document.getElementById('cmpDzActive' + label).style.display = 'none';
}
