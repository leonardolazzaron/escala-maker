/**
 * app.js — Escala Maker Web
 * Porta fiel da lógica Python para JavaScript puro.
 * Headers carregados de assets/ (semana-N.png, <mes>.png, escala-maker.png).
 */

'use strict';

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════
const MESES_PT = {
  janeiro: 31, fevereiro: 28, março: 31,    abril: 30,
  maio: 31,    junho: 30,     julho: 31,     agosto: 31,
  setembro: 30,outubro: 31,   novembro: 30,  dezembro: 31,
};
const MESES_DISPLAY = Object.keys(MESES_PT).map(m => m[0].toUpperCase() + m.slice(1));

const CANVAS_W = 1600, CANVAS_H = 2000;
const TABLE_L = 86,  TABLE_R = 1514;
const DIV1 = 341,    DIV2 = 1234;
const BORDER = 2,    HDR_H = 55,  ROW_H = 50;
const SZ_TABLE_HDR = 28, SZ_TABLE_BODY = 25;

const M_TABLE_L = 304, M_TABLE_R = 1295;
const M_DIV1 = 481,    M_DIV2 = 1102;
const M_HDR_H = 68,    M_ROW_H = 40.84;
const M_SZ_HDR = 24,   M_SZ_BODY = 21;

const FONT_FAMILY = "'Josefin Sans', 'DM Sans', Arial, sans-serif";
const ASSETS      = 'assets/';

// ── Header image scaling (mirrors Python) ──
const TABLE_W        = TABLE_R - TABLE_L;  // 1428
const _SRC_IMG_W     = 1807, _SRC_IMG_H = 1426;
const _SRC_ORANGE_X1 = 104,  _SRC_ORANGE_X2 = 1702;
const _SRC_ORANGE_W  = _SRC_ORANGE_X2 - _SRC_ORANGE_X1;  // 1598
const _ORANGE_TARGET = Math.floor(TABLE_W * 0.397);       // 566
const HDR_SCALE_F    = _ORANGE_TARGET / _SRC_ORANGE_W;    // ~0.3542
const HDR_IMG_W      = Math.floor(_SRC_IMG_W * HDR_SCALE_F);  // 640
const HDR_IMG_H      = Math.floor(_SRC_IMG_H * HDR_SCALE_F);  // 505
const HDR_X          = Math.floor((CANVAS_W - HDR_IMG_W) / 2);

const _SEM_OY1       = Math.floor(73  * HDR_SCALE_F);
const _SEM_OY2       = Math.floor(871 * HDR_SCALE_F);

const WEEKLY_IMG_Y       = 307;
const WEEKLY_ORANGE_BOT  = WEEKLY_IMG_Y + _SEM_OY2;
const WEEKLY_GAP_TABLE   = 201;

// ══════════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════════
const state = {
  mes: '',
  nomes: [],
  salmos: [],
  imageBlobs: [],
};

// ══════════════════════════════════════════════════════════════
// CACHE DE IMAGENS
// ══════════════════════════════════════════════════════════════
const imgCache = {};

function loadImage(src) {
  if (imgCache[src]) return Promise.resolve(imgCache[src]);
  // Encode URI to handle special characters (e.g., março.png)
  const encodedSrc = encodeURI(src);
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => { imgCache[src] = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = encodedSrc;
  });
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildMonthGrid();
  setupInputListeners();
  setupDragDrop('listNomes');
  setupDragDrop('listSalmos');
});

// Logo do header do app — usa diretamente assets/escala-maker.png via <img> no HTML
// Nenhuma lógica JS necessária; fallback tratado via onerror no <img>

// ══════════════════════════════════════════════════════════════
// GRID DE MESES
// ══════════════════════════════════════════════════════════════
function buildMonthGrid() {
  const grid = document.getElementById('monthGrid');
  MESES_DISPLAY.forEach(mes => {
    const btn = document.createElement('button');
    btn.className = 'btn-mes';
    btn.textContent = mes;
    btn.dataset.mes = mes;
    btn.addEventListener('click', () => selecionarMes(mes));
    grid.appendChild(btn);
  });
}

function selecionarMes(mes) {
  state.mes = mes;
  document.querySelectorAll('.btn-mes').forEach(b =>
    b.classList.toggle('selected', b.dataset.mes === mes)
  );
  const dias = MESES_PT[mes.toLowerCase()];
  document.getElementById('monthInfo').textContent = `${mes} · ${dias} dias`;
}

// ══════════════════════════════════════════════════════════════
// INPUTS
// ══════════════════════════════════════════════════════════════
function setupInputListeners() {
  document.getElementById('inputNome').addEventListener('keydown',  e => { if (e.key === 'Enter') adicionarNome(); });
  document.getElementById('inputSalmo').addEventListener('keydown', e => { if (e.key === 'Enter') adicionarSalmo(); });
}

// ══════════════════════════════════════════════════════════════
// MEMBROS
// ══════════════════════════════════════════════════════════════
function adicionarNome() {
  const input = document.getElementById('inputNome');
  const txt = input.value.trim();
  if (!txt) return;
  state.nomes.push(txt);
  renderListItem('listNomes', txt, 'nomes');
  input.value = ''; input.focus();
}

// ══════════════════════════════════════════════════════════════
// SALMOS
// ══════════════════════════════════════════════════════════════
function adicionarSalmo() {
  const input = document.getElementById('inputSalmo');
  const txt = input.value.trim();
  if (!txt) return;
  if (!/^\d+(\:\d+(-\d+)?)?$/.test(txt)) {
    showErroSalmo('⚠ Formato inválido. Use "57" ou "57:1-5".');
    return;
  }
  showErroSalmo('');
  state.salmos.push(txt);
  renderListItem('listSalmos', `Salmo ${txt}`, 'salmos');
  input.value = ''; input.focus();
}

function showErroSalmo(msg) {
  const el = document.getElementById('salmoErro');
  el.textContent = msg;
  if (msg) setTimeout(() => { el.textContent = ''; }, 3000);
}

// ══════════════════════════════════════════════════════════════
// LISTAS
// ══════════════════════════════════════════════════════════════
function renderListItem(listId, label, dataKey) {
  const list = document.getElementById(listId);
  const li   = document.createElement('li');
  li.className = 'list-item';
  li.draggable = true;

  const span = document.createElement('span');
  span.className = 'list-item-text';
  span.textContent = label;

  const btn = document.createElement('button');
  btn.className = 'list-item-remove';
  btn.innerHTML = '×';
  btn.addEventListener('click', () => removerItem(listId, li, dataKey));

  li.appendChild(span);
  li.appendChild(btn);
  list.appendChild(li);
}

function removerItem(listId, li, dataKey) {
  const idx = Array.from(document.getElementById(listId).children).indexOf(li);
  if (idx !== -1) state[dataKey].splice(idx, 1);
  li.remove();
}

function limparLista(dataKey) {
  state[dataKey] = [];
  document.getElementById(dataKey === 'nomes' ? 'listNomes' : 'listSalmos').innerHTML = '';
}

// ══════════════════════════════════════════════════════════════
// DRAG & DROP
// ══════════════════════════════════════════════════════════════
function setupDragDrop(listId) {
  const list = document.getElementById(listId);
  let dragSrc = null;

  list.addEventListener('dragstart', e => {
    dragSrc = e.target.closest('.list-item');
    if (dragSrc) dragSrc.classList.add('dragging');
  });
  list.addEventListener('dragend', () => {
    if (dragSrc) dragSrc.classList.remove('dragging');
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
  list.addEventListener('dragover', e => {
    e.preventDefault();
    const t = e.target.closest('.list-item');
    if (t && t !== dragSrc) {
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      t.classList.add('drag-over');
    }
  });
  list.addEventListener('drop', e => {
    e.preventDefault();
    const t = e.target.closest('.list-item');
    if (t && dragSrc && t !== dragSrc) {
      const items = Array.from(list.children);
      const fi = items.indexOf(dragSrc), ti = items.indexOf(t);
      if (fi !== -1 && ti !== -1)
        list.insertBefore(dragSrc, fi < ti ? t.nextSibling : t);
    }
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
}

function syncLists() {
  state.nomes  = Array.from(document.getElementById('listNomes').querySelectorAll('.list-item-text')).map(el => el.textContent.trim());
  state.salmos = Array.from(document.getElementById('listSalmos').querySelectorAll('.list-item-text')).map(el => el.textContent.replace('Salmo ', '').trim());
}

// ══════════════════════════════════════════════════════════════
// LÓGICA DE ESCALA
// ══════════════════════════════════════════════════════════════
function embaralharSemConsecutivos(fila) {
  if (!fila.length) return fila;
  fila = [...fila];
  shuffle(fila);
  for (let t = 0; t < 500; t++) {
    let ok = true;
    for (let i = 1; i < fila.length; i++) {
      if (fila[i] === fila[i - 1]) {
        ok = false;
        const cands = Array.from({length: fila.length - i - 1}, (_, j) => i + 1 + j);
        shuffle(cands);
        let sw = false;
        for (const j of cands) {
          if (fila[j] !== fila[i - 1]) { [fila[i], fila[j]] = [fila[j], fila[i]]; sw = true; break; }
        }
        if (!sw) { shuffle(fila); break; }
      }
    }
    if (ok) break;
  }
  return fila;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function distribuirEscala(totalDias, nomes, salmos) {
  const escala = []; let si = 0;
  if (!nomes.length) {
    for (let d = 1; d <= totalDias; d++) escala.push([d, '-', si < salmos.length ? salmos[si++] : '-']);
    return escala;
  }
  const fila = embaralharSemConsecutivos([...nomes, ...nomes]);
  const intercalar = (nomes.length * 2) < totalDias;
  const seq = []; let ni = 0;
  for (let i = 0; i < totalDias; i++) {
    if (intercalar) seq.push(i % 2 === 0 && ni < fila.length ? fila[ni++] : '-');
    else seq.push(ni < fila.length ? fila[ni++] : '-');
  }
  seq.forEach((m, idx) => escala.push([idx + 1, m, si < salmos.length ? salmos[si++] : '-']));
  return escala;
}

function dividirSemanas(escala) {
  const s = [];
  for (let i = 0; i < escala.length; i += 7) s.push(escala.slice(i, i + 7));
  return s;
}

// ══════════════════════════════════════════════════════════════
// CANVAS HELPERS
// ══════════════════════════════════════════════════════════════
function getCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function canvas45(h) {
  const hStd = Math.round(CANVAS_W * 5 / 4);
  if (h <= hStd) return [CANVAS_W, hStd];
  const hN = Math.ceil(h / 4) * 4;
  return [Math.round(hN * 4 / 5), hN];
}

function strokeCells(ctx, x0, y0, x1, y1, d1, d2) {
  ctx.beginPath();
  [[x0,y0,x1,y0],[x0,y1,x1,y1],[x0,y0,x0,y1],[x1,y0,x1,y1],[d1,y0,d1,y1],[d2,y0,d2,y1]]
    .forEach(([ax,ay,bx,by]) => { ctx.moveTo(ax,ay); ctx.lineTo(bx,by); });
  ctx.stroke();
}

function textCenter(ctx, text, xa, xb, yt, rh, fs) {
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, xa + (xb - xa - tw) / 2, yt + (rh + fs * 0.75) / 2 - fs * 0.15);
}

function desenharTabela(ctx, linhas, yIni, cw) {
  const k = cw / CANVAS_W;
  const L = Math.round(TABLE_L*k), R = Math.round(TABLE_R*k);
  const d1 = Math.round(DIV1*k),   d2 = Math.round(DIV2*k);
  const fh = Math.round(SZ_TABLE_HDR*k),  fb = Math.round(SZ_TABLE_BODY*k);
  const bw = Math.max(1, Math.round(BORDER*k));
  const hh = Math.round(HDR_H*k),  rh = Math.round(ROW_H*k);

  ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = bw;

  const y0 = yIni, y1 = yIni + hh;
  strokeCells(ctx, L, y0, R, y1, d1, d2);
  ctx.font = `600 ${fh}px ${FONT_FAMILY}`;
  textCenter(ctx, 'Dia', L, d1, y0, hh, fh);
  textCenter(ctx, 'Membro', d1, d2, y0, hh, fh);
  textCenter(ctx, 'Salmos', d2, R, y0, hh, fh);

  ctx.font = `${fb}px ${FONT_FAMILY}`;
  linhas.forEach(([dia, membro, salmo], idx) => {
    const yi = y1 + idx*rh, yf = yi + rh;
    strokeCells(ctx, L, yi, R, yf, d1, d2);
    textCenter(ctx, String(dia), L, d1, yi, rh, fb);
    textCenter(ctx, String(membro), d1, d2, yi, rh, fb);
    textCenter(ctx, String(salmo), d2, R, yi, rh, fb);
  });
}

function desenharTabelaMensal(ctx, linhas, yIni, rowH, hdrH, szHdr, szBody) {
  const L = M_TABLE_L, R = M_TABLE_R, d1 = M_DIV1, d2 = M_DIV2;
  ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineWidth = BORDER;

  const y0 = yIni, y1 = yIni + hdrH;
  strokeCells(ctx, L, y0, R, y1, d1, d2);
  ctx.font = `600 ${szHdr}px ${FONT_FAMILY}`;
  textCenter(ctx, 'Dia', L, d1, y0, hdrH, szHdr);
  textCenter(ctx, 'Membro', d1, d2, y0, hdrH, szHdr);
  textCenter(ctx, 'Salmos', d2, R, y0, hdrH, szHdr);

  ctx.font = `${szBody}px ${FONT_FAMILY}`;
  linhas.forEach(([dia, membro, salmo], idx) => {
    const yi = y1 + idx*rowH, yf = yi + rowH;
    strokeCells(ctx, L, yi, R, yf, d1, d2);
    textCenter(ctx, String(dia), L, d1, yi, rowH, szBody);
    textCenter(ctx, String(membro), d1, d2, yi, rowH, szBody);
    textCenter(ctx, String(salmo), d2, R, yi, rowH, szBody);
  });
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO DAS IMAGENS
// ══════════════════════════════════════════════════════════════

// SEMANAL — usa assets/semana-N.png como header
// Matches Python: header resized to HDR_IMG_W x HDR_IMG_H, placed at (HDR_X, WEEKLY_IMG_Y)
// Table starts at WEEKLY_ORANGE_BOT + WEEKLY_GAP_TABLE
async function gerarSemanal(linhas, num) {
  const hdrImg       = await loadImage(`${ASSETS}semana-${num}.png`);
  const TAB_TOP_BASE = WEEKLY_ORANGE_BOT + WEEKLY_GAP_TABLE;  // 816
  const tabBot       = TAB_TOP_BASE + HDR_H + linhas.length * ROW_H;
  const neededH      = tabBot + 60;
  const [cw, ch]     = canvas45(neededH);
  const k            = cw / CANVAS_W;

  const canvas = getCanvas(cw, ch);
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);

  if (hdrImg) {
    // Resize header to HDR_IMG_W x HDR_IMG_H (scaled by k if canvas differs)
    const imgW = Math.round(HDR_IMG_W * k);
    const imgH = Math.round(HDR_IMG_H * k);
    const hx   = Math.round((cw - imgW) / 2);
    const hy   = Math.round(WEEKLY_IMG_Y * k);
    const pasteY = Math.max(0, hy);
    const cropY  = Math.max(0, -hy);
    // Draw with possible crop from top
    if (cropY > 0) {
      const srcCropY = Math.round(cropY * (hdrImg.height / imgH));
      const srcH     = hdrImg.height - srcCropY;
      ctx.drawImage(hdrImg, 0, srcCropY, hdrImg.width, srcH, hx, pasteY, imgW, imgH - cropY);
    } else {
      ctx.drawImage(hdrImg, hx, pasteY, imgW, imgH);
    }
  }

  desenharTabela(ctx, linhas, Math.round(TAB_TOP_BASE * k), cw);
  return canvas;
}

// MENSAL — usa assets/<mes>.png como header
// Python: loads mes.png, resizes to HDR_IMG_W width keeping aspect ratio,
// vertically centers [titulo_img + GAP_MES_TABLE + table] in 1600x2000 canvas
async function gerarMensal(escala, mes) {
  // Try multiple image paths (mirrors Python's _carregar_titulo_mes which tries lowercase and Capitalized)
  const mesLower = mes.toLowerCase();
  const mesCap   = mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase();
  let hdrImg = await loadImage(`${ASSETS}${mesLower}.png`);
  if (!hdrImg) hdrImg = await loadImage(`${ASSETS}${mesCap}.png`);

  const cw = CANVAS_W, ch = CANVAS_H;
  const nRows     = escala.length;
  const GAP_TABLE = 60;

  // Calculate titulo_img height (resized to HDR_IMG_W width)
  let tituloH = 0;
  if (hdrImg) {
    const ratio = HDR_IMG_W / hdrImg.width;
    tituloH = Math.round(hdrImg.height * ratio);
  } else {
    // Fallback: measure text height to compute proper layout spacing
    // Use an offscreen canvas to measure the 72px text accurately
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = 100; tmpCanvas.height = 100;
    const tmpCtx = tmpCanvas.getContext('2d');
    const fontSize = 72;
    tmpCtx.font = `${fontSize}px ${FONT_FAMILY}`;
    const metrics = tmpCtx.measureText(mes.toUpperCase());
    // Use actualBoundingBoxAscent + Descent for accurate height, fallback to fontSize
    tituloH = Math.round(
      (metrics.actualBoundingBoxAscent || fontSize * 0.75) +
      (metrics.actualBoundingBoxDescent || fontSize * 0.25)
    );
  }

  let rowH = Math.floor(M_ROW_H);
  let conteudo = tituloH + GAP_TABLE + M_HDR_H + nRows * rowH;
  let margin   = Math.floor((ch - conteudo) / 2);
  if (margin < 40) {
    margin = 40;
    const availRows = ch - 2 * margin - tituloH - GAP_TABLE - M_HDR_H;
    rowH = Math.max(22, Math.floor(availRows / nRows));
    conteudo = tituloH + GAP_TABLE + M_HDR_H + nRows * rowH;
    margin   = Math.floor((ch - conteudo) / 2);
  }

  const tableY    = margin + tituloH + GAP_TABLE;
  const scaleFont = rowH / M_ROW_H;
  const szHdr     = Math.max(14, Math.round(M_SZ_HDR  * scaleFont));
  const szBody    = Math.max(12, Math.round(M_SZ_BODY * scaleFont));

  const canvas = getCanvas(cw, ch);
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);

  if (hdrImg) {
    // Draw mes image resized to HDR_IMG_W, centered horizontally, at y=margin
    const tx = Math.round((cw - HDR_IMG_W) / 2);
    ctx.drawImage(hdrImg, tx, margin, HDR_IMG_W, tituloH);
  } else {
    // Fallback: draw month name as text (matches Pillow's draw.text where y = top of text)
    const fontSize = 72;
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';
    const tw = ctx.measureText(mes.toUpperCase()).width;
    ctx.fillText(mes.toUpperCase(), (cw - tw) / 2, margin);
    ctx.textBaseline = 'alphabetic'; // restore default
  }

  desenharTabelaMensal(ctx, escala, tableY, rowH, M_HDR_H, szHdr, szBody);
  return canvas;
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function gerarEscala() {
  syncLists();

  if (!state.mes)           { showStatus('Selecione um mês antes de gerar.', 'err');  return; }
  if (!state.nomes.length)  { showStatus('Adicione ao menos um membro.', 'err');      return; }
  if (!state.salmos.length) { showStatus('Adicione ao menos um Salmo.', 'err');       return; }

  const btn = document.getElementById('btnGerar');
  btn.disabled = true; btn.textContent = 'Gerando…';
  showProgress(true);
  showStatus('Iniciando geração…', 'info');

  state.imageBlobs.forEach(b => URL.revokeObjectURL(b.url));
  state.imageBlobs = [];
  document.getElementById('resultGrid').innerHTML = '';
  document.getElementById('resultPanel').style.display = 'none';
  await nextFrame();

  try {
    // Ensure Josefin Sans is loaded before drawing on canvas
    await document.fonts.load("400 72px 'Josefin Sans'");
    await document.fonts.load("600 28px 'Josefin Sans'");

    const totalDias = MESES_PT[state.mes.toLowerCase()];
    const escala    = distribuirEscala(totalDias, state.nomes, state.salmos);
    const semanas   = dividirSemanas(escala);

    for (let i = 0; i < semanas.length; i++) {
      showStatus(`Gerando Semana ${i+1} de ${semanas.length}…`, 'info');
      await nextFrame();
      const c = await gerarSemanal(semanas[i], i + 1);
      await addResult(c, `Everyday Devocional - Escala ${state.mes}-Semana ${i+1}.png`, `Semana ${i+1}`);
    }

    showStatus('Gerando imagem mensal…', 'info');
    await nextFrame();
    const cm = await gerarMensal(escala, state.mes);
    await addResult(cm, `Everyday Devocional - Escala ${state.mes} completo.png`, `${state.mes} completo`);

    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showStatus(`✓ ${semanas.length + 1} imagem(ns) gerada(s)! Clique para baixar.`, 'ok');

  } catch (err) {
    showStatus(`Erro: ${err.message}`, 'err');
    console.error(err);
  }

  btn.disabled = false; btn.textContent = 'Gerar Escala';
  showProgress(false);
}

async function addResult(canvas, nome, label) {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      state.imageBlobs.push({ name: nome, blob, url });

      const card = document.createElement('div');
      card.className = 'result-card';
      card.title = `Clique para baixar: ${nome}`;
      card.addEventListener('click', () => downloadBlob(blob, nome));

      const img = document.createElement('img');
      img.src = url; img.alt = label;

      const lbl = document.createElement('div');
      lbl.className = 'result-card-label';
      lbl.innerHTML = `<span>${label}</span><span class="result-card-dl">⬇</span>`;

      card.appendChild(img); card.appendChild(lbl);
      document.getElementById('resultGrid').appendChild(card);
      resolve();
    }, 'image/png');
  });
}

// ══════════════════════════════════════════════════════════════
// DOWNLOAD
// ══════════════════════════════════════════════════════════════
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function baixarTudo() {
  for (const item of state.imageBlobs) {
    downloadBlob(item.blob, item.name);
    await new Promise(r => setTimeout(r, 300));
  }
}

// ══════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════
function showStatus(msg, kind = 'info') {
  const el = document.getElementById('statusMsg');
  el.className = `status-msg status-${kind}`;
  el.textContent = msg;
  el.style.display = 'block';
}

function showProgress(show) {
  document.getElementById('progressWrap').style.display = show ? 'block' : 'none';
}

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
