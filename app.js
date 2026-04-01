/**
 * app.js — Escala Maker Web
 * Porta fiel da lógica Python para JavaScript puro.
 * Geração de imagens via Canvas API, download via Blob.
 */

'use strict';

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES (espelha o script original)
// ══════════════════════════════════════════════════════════════
const MESES_PT = {
  janeiro: 31, fevereiro: 28, março: 31,    abril: 30,
  maio: 31,    junho: 30,     julho: 31,     agosto: 31,
  setembro: 30,outubro: 31,   novembro: 30,  dezembro: 31,
};
const MESES_DISPLAY = Object.keys(MESES_PT).map(m => m[0].toUpperCase() + m.slice(1));

const CANVAS_W = 1600, CANVAS_H = 2000;
const TABLE_L = 86, TABLE_R = 1514, TABLE_W = TABLE_R - TABLE_L;
const DIV1 = 341, DIV2 = 1234;
const BORDER = 2, HDR_H = 55, ROW_H = 50;
const SZ_TABLE_HDR = 28, SZ_TABLE_BODY = 25;

// Tabela mensal
const M_TABLE_L = 304, M_TABLE_R = 1295;
const M_DIV1 = 481, M_DIV2 = 1102;
const M_HDR_H = 68, M_ROW_H = 40.84;
const M_SZ_HDR = 24, M_SZ_BODY = 21;

// ══════════════════════════════════════════════════════════════
// ESTADO DA APLICAÇÃO
// ══════════════════════════════════════════════════════════════
const state = {
  mes: '',
  nomes: [],
  salmos: [],
  imageBlobs: [],   // { name, blob, url }
};

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildMonthGrid();
  setupInputListeners();
  setupDragDrop('listNomes');
  setupDragDrop('listSalmos');
});

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
  document.querySelectorAll('.btn-mes').forEach(b => {
    b.classList.toggle('selected', b.dataset.mes === mes);
  });
  const dias = MESES_PT[mes.toLowerCase()];
  const info = document.getElementById('monthInfo');
  info.textContent = `${mes} · ${dias} dias`;
}

// ══════════════════════════════════════════════════════════════
// INPUT LISTENERS (Enter para adicionar)
// ══════════════════════════════════════════════════════════════
function setupInputListeners() {
  document.getElementById('inputNome').addEventListener('keydown', e => {
    if (e.key === 'Enter') adicionarNome();
  });
  document.getElementById('inputSalmo').addEventListener('keydown', e => {
    if (e.key === 'Enter') adicionarSalmo();
  });
}

// ══════════════════════════════════════════════════════════════
// MEMBROS
// ══════════════════════════════════════════════════════════════
function adicionarNome() {
  const input = document.getElementById('inputNome');
  const txt = input.value.trim();
  if (!txt) return;
  state.nomes.push(txt);
  renderListItem('listNomes', txt, state.nomes.length - 1, 'nomes');
  input.value = '';
  input.focus();
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
  renderListItem('listSalmos', `Salmo ${txt}`, state.salmos.length - 1, 'salmos');
  input.value = '';
  input.focus();
}

function showErroSalmo(msg) {
  const el = document.getElementById('salmoErro');
  el.textContent = msg;
  if (msg) setTimeout(() => { el.textContent = ''; }, 3000);
}

// ══════════════════════════════════════════════════════════════
// RENDERIZAÇÃO DE LISTA
// ══════════════════════════════════════════════════════════════
function renderListItem(listId, label, index, dataKey) {
  const list = document.getElementById(listId);
  const li = document.createElement('li');
  li.className = 'list-item';
  li.draggable = true;
  li.dataset.index = index;

  const span = document.createElement('span');
  span.className = 'list-item-text';
  span.textContent = label;

  const btn = document.createElement('button');
  btn.className = 'list-item-remove';
  btn.innerHTML = '×';
  btn.title = 'Remover';
  btn.addEventListener('click', () => removerItem(listId, li, dataKey));

  li.appendChild(span);
  li.appendChild(btn);
  list.appendChild(li);
}

function removerItem(listId, li, dataKey) {
  const list = document.getElementById(listId);
  const items = Array.from(list.children);
  const idx = items.indexOf(li);
  if (idx !== -1) state[dataKey].splice(idx, 1);
  li.remove();
}

function limparLista(dataKey) {
  state[dataKey] = [];
  const listId = dataKey === 'nomes' ? 'listNomes' : 'listSalmos';
  document.getElementById(listId).innerHTML = '';
}

// ══════════════════════════════════════════════════════════════
// DRAG & DROP nas listas
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
    const target = e.target.closest('.list-item');
    if (target && target !== dragSrc) {
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      target.classList.add('drag-over');
    }
  });
  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.list-item');
    if (target && dragSrc && target !== dragSrc) {
      const items = Array.from(list.children);
      const fromIdx = items.indexOf(dragSrc);
      const toIdx   = items.indexOf(target);
      if (fromIdx !== -1 && toIdx !== -1) {
        // Reordena no DOM
        if (fromIdx < toIdx) list.insertBefore(dragSrc, target.nextSibling);
        else list.insertBefore(dragSrc, target);
      }
    }
    list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
}

// Sincroniza arrays com a ordem visual da lista
function syncLists() {
  const nomesEls  = document.getElementById('listNomes').querySelectorAll('.list-item-text');
  const salmosEls = document.getElementById('listSalmos').querySelectorAll('.list-item-text');
  state.nomes  = Array.from(nomesEls).map(el => el.textContent.trim());
  state.salmos = Array.from(salmosEls).map(el => el.textContent.replace('Salmo ', '').trim());
}

// ══════════════════════════════════════════════════════════════
// LÓGICA DE ESCALA (porta fiel do Python)
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
        const candidatos = [];
        for (let j = i + 1; j < fila.length; j++) candidatos.push(j);
        shuffle(candidatos);
        let swapped = false;
        for (const j of candidatos) {
          if (fila[j] !== fila[i - 1]) {
            [fila[i], fila[j]] = [fila[j], fila[i]];
            swapped = true;
            break;
          }
        }
        if (!swapped) { shuffle(fila); break; }
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
  const escala = [];
  let si = 0;
  if (!nomes.length) {
    for (let dia = 1; dia <= totalDias; dia++) {
      const s = si < salmos.length ? salmos[si++] : '-';
      escala.push([dia, '-', s]);
    }
    return escala;
  }
  const fila = embaralharSemConsecutivos([...nomes, ...nomes]);
  const intercalar = (nomes.length * 2) < totalDias;
  const seq = [];
  if (intercalar) {
    let ni = 0;
    for (let i = 0; i < totalDias; i++) {
      if (i % 2 === 0 && ni < fila.length) seq.push(fila[ni++]);
      else seq.push('-');
    }
  } else {
    let ni = 0;
    for (let i = 0; i < totalDias; i++) {
      seq.push(ni < fila.length ? fila[ni++] : '-');
    }
  }
  seq.forEach((membro, idx) => {
    const s = si < salmos.length ? salmos[si++] : '-';
    escala.push([idx + 1, membro, s]);
  });
  return escala;
}

function dividirSemanas(escala) {
  const semanas = [];
  for (let i = 0; i < escala.length; i += 7) semanas.push(escala.slice(i, i + 7));
  return semanas;
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO DE IMAGENS VIA CANVAS
// ══════════════════════════════════════════════════════════════
const FONT_FAMILY = "'Josefin Sans', sans-serif";

function getCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function desenharTabela(ctx, linhas, yIni, cw) {
  const k  = cw / CANVAS_W;
  const L  = Math.round(TABLE_L * k), R  = Math.round(TABLE_R * k);
  const d1 = Math.round(DIV1 * k),    d2 = Math.round(DIV2 * k);
  const fh = Math.round(SZ_TABLE_HDR * k);
  const fb = Math.round(SZ_TABLE_BODY * k);
  const bw = Math.max(1, Math.round(BORDER * k));
  const hh = Math.round(HDR_H * k);
  const rh = Math.round(ROW_H * k);

  ctx.fillStyle = '#000';
  ctx.lineWidth = bw;
  ctx.strokeStyle = '#000';

  // Header box
  const y0 = yIni, y1 = yIni + hh;
  strokeRect(ctx, L, y0, R, y1, d1, d2);
  ctx.font = `600 ${fh}px ${FONT_FAMILY}`;
  textCenter(ctx, 'Dia',    L,  d1, y0, hh, fh);
  textCenter(ctx, 'Membro', d1, d2, y0, hh, fh);
  textCenter(ctx, 'Salmos', d2, R,  y0, hh, fh);

  // Rows
  ctx.font = `${fb}px ${FONT_FAMILY}`;
  linhas.forEach(([dia, membro, salmo], idx) => {
    const yi = y1 + idx * rh, yf = yi + rh;
    strokeRect(ctx, L, yi, R, yf, d1, d2);
    textCenter(ctx, String(dia),    L,  d1, yi, rh, fb);
    textCenter(ctx, String(membro), d1, d2, yi, rh, fb);
    textCenter(ctx, String(salmo),  d2, R,  yi, rh, fb);
  });

  return y1 + linhas.length * rh;
}

function strokeRect(ctx, x0, y0, x1, y1, d1, d2) {
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
  ctx.moveTo(x0, y1); ctx.lineTo(x1, y1);
  ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
  ctx.moveTo(x1, y0); ctx.lineTo(x1, y1);
  ctx.moveTo(d1, y0); ctx.lineTo(d1, y1);
  ctx.moveTo(d2, y0); ctx.lineTo(d2, y1);
  ctx.stroke();
}

function textCenter(ctx, text, xa, xb, yt, rowH, fontSize) {
  const tw = ctx.measureText(text).width;
  const x  = xa + (xb - xa - tw) / 2;
  const y  = yt + (rowH + fontSize * 0.75) / 2 - fontSize * 0.15;
  ctx.fillText(text, x, y);
}

function canvas45(alturaConteudo) {
  const hStd = Math.round(CANVAS_W * 5 / 4);
  if (alturaConteudo <= hStd) return [CANVAS_W, hStd];
  const hNew = Math.ceil(alturaConteudo / 4) * 4;
  const wNew = Math.round(hNew * 4 / 5);
  return [wNew, hNew];
}

// ── Gerar imagem SEMANAL ──────────────────────────────────────
function gerarSemanal(linhas, num, mes) {
  const tabTop = 1050;   // posição vertical simplificada (sem imagem de fundo)
  const tabBot = tabTop + HDR_H + linhas.length * ROW_H;
  const neededH = tabBot + 60;
  const [cw, ch] = canvas45(neededH);

  const canvas = getCanvas(cw, ch);
  const ctx = canvas.getContext('2d');

  // Fundo branco
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);

  // Título da semana
  const k = cw / CANVAS_W;
  ctx.fillStyle = '#000';
  ctx.font = `300 ${Math.round(36 * k)}px ${FONT_FAMILY}`;
  ctx.letterSpacing = '3px';

  const titleTxt = `${mes.toUpperCase()} · SEMANA ${num}`;
  const tw = ctx.measureText(titleTxt).width;
  ctx.fillText(titleTxt, (cw - tw) / 2, Math.round(900 * k));

  // Linha decorativa
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(1, Math.round(2 * k));
  const lineY = Math.round(960 * k);
  ctx.beginPath();
  ctx.moveTo(Math.round(TABLE_L * k), lineY);
  ctx.lineTo(Math.round(TABLE_R * k), lineY);
  ctx.stroke();

  // Tabela
  ctx.fillStyle = '#000';
  desenharTabela(ctx, linhas, Math.round(tabTop * k), cw);

  return canvas;
}

// ── Gerar imagem MENSAL ───────────────────────────────────────
function gerarMensal(escala, mes) {
  const cw = CANVAS_W, ch = CANVAS_H;
  const nRows = escala.length;
  const GAP_MES_TABLE = 80;
  const tituloH = 120;
  let rowH = Math.round(M_ROW_H);
  const conteudo = tituloH + GAP_MES_TABLE + M_HDR_H + nRows * rowH;
  let margin = Math.round((ch - conteudo) / 2);
  if (margin < 40) {
    margin = 40;
    const availRows = ch - 2 * margin - tituloH - GAP_MES_TABLE - M_HDR_H;
    rowH = Math.max(22, Math.round(availRows / nRows));
  }
  const tableY = margin + tituloH + GAP_MES_TABLE;
  const scaleFont = rowH / M_ROW_H;
  const szHdr  = Math.max(14, Math.round(M_SZ_HDR  * scaleFont));
  const szBody = Math.max(12, Math.round(M_SZ_BODY * scaleFont));

  const canvas = getCanvas(cw, ch);
  const ctx = canvas.getContext('2d');

  // Fundo branco
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);

  // Título do mês
  ctx.fillStyle = '#000';
  ctx.font = `400 80px ${FONT_FAMILY}`;
  ctx.letterSpacing = '8px';
  const mesTitle = mes.toUpperCase();
  const titleW = ctx.measureText(mesTitle).width;
  ctx.fillText(mesTitle, (cw - titleW) / 2, margin + 90);

  // Linha decorativa
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  const lineY = margin + tituloH + 20;
  ctx.beginPath();
  ctx.moveTo(M_TABLE_L, lineY); ctx.lineTo(M_TABLE_R, lineY);
  ctx.stroke();

  // Tabela mensal
  desenharTabelaMensal(ctx, escala, tableY, rowH, M_HDR_H, szHdr, szBody);

  return canvas;
}

function desenharTabelaMensal(ctx, linhas, yIni, rowH, hdrH, szHdr, szBody) {
  const L = M_TABLE_L, R = M_TABLE_R, d1 = M_DIV1, d2 = M_DIV2;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = BORDER;

  // Header
  const y0 = yIni, y1 = yIni + hdrH;
  strokeRectM(ctx, L, y0, R, y1, d1, d2);
  ctx.fillStyle = '#000';
  ctx.font = `600 ${szHdr}px ${FONT_FAMILY}`;
  textCenter(ctx, 'Dia',    L,  d1, y0, hdrH, szHdr);
  textCenter(ctx, 'Membro', d1, d2, y0, hdrH, szHdr);
  textCenter(ctx, 'Salmos', d2, R,  y0, hdrH, szHdr);

  ctx.font = `${szBody}px ${FONT_FAMILY}`;
  linhas.forEach(([dia, membro, salmo], idx) => {
    const yi = y1 + idx * rowH, yf = yi + rowH;
    strokeRectM(ctx, L, yi, R, yf, d1, d2);
    textCenter(ctx, String(dia),    L,  d1, yi, rowH, szBody);
    textCenter(ctx, String(membro), d1, d2, yi, rowH, szBody);
    textCenter(ctx, String(salmo),  d2, R,  yi, rowH, szBody);
  });
}

function strokeRectM(ctx, x0, y0, x1, y1, d1, d2) {
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
  ctx.moveTo(x0, y1); ctx.lineTo(x1, y1);
  ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
  ctx.moveTo(x1, y0); ctx.lineTo(x1, y1);
  ctx.moveTo(d1, y0); ctx.lineTo(d1, y1);
  ctx.moveTo(d2, y0); ctx.lineTo(d2, y1);
  ctx.stroke();
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function gerarEscala() {
  syncLists();

  // Validações
  if (!state.mes) {
    showStatus('Selecione um mês antes de gerar.', 'err'); return;
  }
  if (!state.nomes.length) {
    showStatus('Adicione ao menos um membro.', 'err'); return;
  }
  if (!state.salmos.length) {
    showStatus('Adicione ao menos um Salmo.', 'err'); return;
  }

  // UI → loading
  const btn = document.getElementById('btnGerar');
  btn.disabled = true;
  btn.textContent = 'Gerando…';
  showProgress(true);
  showStatus('Iniciando geração…', 'info');

  // Limpa resultados anteriores
  state.imageBlobs.forEach(b => URL.revokeObjectURL(b.url));
  state.imageBlobs = [];
  document.getElementById('resultGrid').innerHTML = '';
  document.getElementById('resultPanel').style.display = 'none';

  // Aguarda um frame para UI atualizar
  await nextFrame();

  try {
    const totalDias = MESES_PT[state.mes.toLowerCase()];
    const escala    = distribuirEscala(totalDias, state.nomes, state.salmos);
    const semanas   = dividirSemanas(escala);

    for (let i = 0; i < semanas.length; i++) {
      showStatus(`Gerando Semana ${i + 1} de ${semanas.length}…`, 'info');
      await nextFrame();
      const canvas = gerarSemanal(semanas[i], i + 1, state.mes);
      const nome   = `Everyday Devocional - Escala ${state.mes}-Semana ${i + 1}.png`;
      await addResult(canvas, nome, `Semana ${i + 1}`);
    }

    showStatus('Gerando imagem mensal…', 'info');
    await nextFrame();
    const canvasMensal = gerarMensal(escala, state.mes);
    const nomeMensal   = `Everyday Devocional - Escala ${state.mes} completo.png`;
    await addResult(canvasMensal, nomeMensal, `${state.mes} completo`);

    document.getElementById('resultPanel').style.display = 'block';
    document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });

    const n = semanas.length + 1;
    showStatus(`✓ ${n} imagem(ns) gerada(s) com sucesso! Clique nas imagens para baixar.`, 'ok');
  } catch (err) {
    showStatus(`Erro: ${err.message}`, 'err');
    console.error(err);
  }

  btn.disabled = false;
  btn.textContent = 'Gerar Escala';
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
      img.src = url;
      img.alt = label;

      const lbl = document.createElement('div');
      lbl.className = 'result-card-label';
      lbl.innerHTML = `<span>${label}</span><span class="result-card-dl">⬇</span>`;

      card.appendChild(img);
      card.appendChild(lbl);
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
    await new Promise(r => setTimeout(r, 300)); // pequeno delay entre downloads
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
