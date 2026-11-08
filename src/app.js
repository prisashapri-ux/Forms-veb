// «Форма» в браузере: интерфейс. Данные живут в IndexedDB этого устройства.
import * as L from './logic.js';
import { CATALOG } from './catalog.js';
import { lineChart, barChart, dualChart, normScale } from './charts.js';
import { loadState, saveState, flush, clearState, persist } from './store.js';
import { parsePdf, InBodyError } from './parser.js';
import { demoState } from './demo.js';

const { num, signed, metricValue, tonnage, plural, fmtDay, dayKey, toDate, METRIC_INFO } = L;

// ───────── Иконки (линейные, 24×24) ─────────
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const icon = {
  body: I('<circle cx="12" cy="4.5" r="2"/><path d="M5 8.5h14M12 8.5v5.5M12 14l-3 7M12 14l3 7"/>'),
  diary: I('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  chart: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  food: I('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5H17"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  upload: I('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  x: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  chev: I('<path d="M9 5l7 7-7 7"/>', 'class="chev" width="18" height="18"'),
  more: I('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  list: I('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
  book: I('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM19 19v2H6"/>'),
  dumbbell: I('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  doc: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
};

// ───────── Состояние ─────────
let state = L.emptyState();
const ui = { bodyMetric: 'weight', segMode: 'muscle', period: 28, timer: null, pdfjs: null };

function save() { saveState(state); }
const groupOf = (name) => L.groupOfIn(state, name);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, root = document) => root.querySelector(sel);
const parseNum = (s) => { const v = Number(String(s).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(v) ? v : null; };
const workoutsSorted = () => [...state.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));
const fullMeasurements = () => state.measurements.filter((m) => !m.isPartial && !m.source);
const latestFull = () => fullMeasurements().at(-1) || null;

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// ───────── Листы (модальные окна) ─────────
let sheetClose = null;
function openSheet({ title, body, left = 'Отмена', right = null, onRight = null, onOpen = null }) {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><button class="text-btn" data-sheet="left">${esc(left)}</button><h3>${esc(title)}</h3>
    ${right ? `<button class="text-btn" data-sheet="right">${esc(right)}</button>` : '<span style="min-width:70px"></span>'}</header>
    <div class="body">${body}</div></div>`;
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-sheet="left"]')) closeSheet();
    else if (e.target.closest('[data-sheet="right"]')) onRight?.(back);
  });
  document.body.append(back);
  document.body.style.overflow = 'hidden';
  sheetClose = () => { back.remove(); document.body.style.overflow = ''; };
  onOpen?.(back);
  return back;
}
function closeSheet() { sheetClose?.(); sheetClose = null; }

function confirmSheet(title, text, action, onYes, danger = true) {
  openSheet({
    title, body: `<p style="margin:0">${esc(text)}</p><button class="btn ${danger ? 'danger' : ''} block" data-yes>${esc(action)}</button>`,
    onOpen: (el) => el.querySelector('[data-yes]').addEventListener('click', () => { closeSheet(); onYes(); }),
  });
}

// ───────── Маршрутизация ─────────
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [name, ...rest] = h.split('-');
  return { name: name || 'body', arg: rest.join('-') };
}
const go = (hash) => { location.hash = hash; };
addEventListener('hashchange', () => { closeSheet(); render(true); });

const TABS = [['body', 'Тело', icon.body], ['diary', 'Дневник', icon.diary], ['analytics', 'Аналитика', icon.chart], ['food', 'Питание', icon.food]];
const TAB_OF = { body: 'body', diary: 'diary', w: 'diary', programs: 'diary', catalog: 'diary', analytics: 'analytics', ex: 'analytics', food: 'food', settings: 'body' };

function render(scrollTop = false) {
  const r = route();
  const views = { body: viewBody, diary: viewDiary, w: viewWorkout, programs: viewPrograms, catalog: viewCatalog, analytics: viewAnalytics, ex: viewExercise, food: viewFood, settings: viewSettings };
  const v = (views[r.name] || viewBody)(r.arg);
  const y = scrollY;
  $('#app').innerHTML = `<header class="top">${v.top}</header><main class="view" id="view">${v.html}</main>`;
  $('#tabs').innerHTML = TABS.map(([id, t, ic]) => `<a href="#${id}" class="${TAB_OF[r.name] === id ? 'on' : ''}" ${TAB_OF[r.name] === id ? 'aria-current="page"' : ''}>${ic}<span>${t}</span></a>`).join('');
  document.title = v.title ? `${v.title} · Форма` : 'Форма';
  if (scrollTop) scrollTo(0, 0); else scrollTo(0, y);
  v.after?.();
}

const topTitle = (t, right = '') => `<h1>${esc(t)}</h1>${right}`;
const topBack = (href, t, right = '') => `<a class="icon-btn" href="${href}" aria-label="Назад">${icon.back}</a><h1 class="small">${esc(t)}</h1>${right || '<span style="width:40px"></span>'}`;

function demoBanner() {
  if (!state.demo) return '';
  return `<div class="example-flag"><span class="grow">Сейчас показаны <b>примерные данные</b>, не твои. Удали их, когда загрузишь свой отчёт.</span><button class="btn secondary" data-act="clear-demo">Удалить</button></div>`;
}

// ───────── Тело ─────────
function delta(metric, value, prev) {
  if (value == null || prev == null) return '';
  const d = value - prev;
  const info = METRIC_INFO[metric];
  if (info.noise != null && Math.abs(d) < info.noise) return `<span class="delta noise" title="В пределах погрешности InBody">≈ ${signed(d, info.digits)}</span>`;
  if (Math.abs(d) < 1e-9) return '<span class="delta flat">без изменений</span>';
  const cls = info.better == null ? 'flat' : (d > 0) === info.better ? 'good' : 'bad';
  return `<span class="delta ${cls}">${d > 0 ? '▲' : '▼'} ${signed(d, info.digits)}</span>`;
}

function seriesFor(metric) {
  return state.measurements.filter((m) => m.values[metric] != null).map((m) => ({ date: m.day, value: m.values[metric], partial: m.isPartial || !!m.source }));
}

function trendLine(points) {
  const recent = points.filter((p) => L.daysBetween(p.date, new Date()) <= 120);
  const slope = L.monthlySlope(recent);
  return slope == null ? null : slope;
}

function viewBody() {
  const ms = state.measurements;
  const gear = `<button class="icon-btn" data-act="go" data-to="settings" aria-label="Настройки">${icon.gear}</button>`;
  const importBtn = `<button class="icon-btn" data-act="import-pdf" aria-label="Загрузить отчёт InBody">${icon.upload}</button>`;
  if (!ms.length) {
    return {
      title: 'Тело', top: topTitle('Тело', gear),
      html: `<section class="card empty">
        <div class="art">${icon.doc}</div>
        <h2>Загрузи отчёт InBody</h2>
        <p>Скачай PDF в приложении DDX Fitness и выбери его здесь. «Форма» разберёт вес, мышцы, жир, сегменты и таблицу истории.</p>
        <button class="btn block" data-act="import-pdf">${icon.upload} Выбрать PDF</button>
        <button class="btn ghost block" data-act="load-demo">Посмотреть на примере</button>
      </section>
      <section class="card"><h2>Уже пользуешься «Формой» на iPhone?</h2>
        <p class="muted small" style="margin:0 0 10px">Сделай резервную копию в настройках приложения и загрузи файл здесь: замеры, тренировки и питание перенесутся.</p>
        <button class="btn secondary block" data-act="import-backup">Загрузить резервную копию</button></section>`,
    };
  }
  const full = latestFull();
  const latest = ms.at(-1);
  const prevOf = (metric, before) => [...ms].reverse().find((m) => m.day < before && m.values[metric] != null)?.values[metric];
  const ref = full || latest;
  const cards = ['weight', 'muscleMass', 'fatPercent', 'fatMass'].map((m) => {
    const src = [...ms].reverse().find((x) => x.values[m] != null);
    if (!src) return '';
    const v = src.values[m];
    const tr = trendLine(seriesFor(m));
    return `<button class="metric ${ui.bodyMetric === m ? 'on' : ''}" data-act="body-metric" data-m="${m}">
      <span class="label">${METRIC_INFO[m].title}</span>
      <span class="value">${num(v, METRIC_INFO[m].digits)}<small>${METRIC_INFO[m].unit === '%' ? '%' : METRIC_INFO[m].unit}</small></span>
      ${delta(m, v, prevOf(m, src.day)) || '<span class="delta flat">первый замер</span>'}
      ${tr != null ? `<span class="small muted">тренд ${signed(tr, 1)} ${METRIC_INFO[m].unit} в месяц</span>` : ''}
    </button>`;
  }).join('');

  const metric = ui.bodyMetric;
  const pts = seriesFor(metric);
  const range = [...ms].reverse().find((m) => m.ranges?.[metric])?.ranges[metric];
  let tl = null;
  const slope = L.monthlySlope(pts.filter((p) => L.daysBetween(p.date, new Date()) <= 120));
  if (slope != null && pts.length >= 3) {
    const recent = pts.filter((p) => L.daysBetween(p.date, new Date()) <= 120);
    const t = recent.map((p) => toDate(p.date).getTime()), first = Math.min(...t), last = Math.max(...t);
    const mx = t.reduce((a, b) => a + (b - first) / L.DAY_MS, 0) / t.length, my = recent.reduce((a, p) => a + p.value, 0) / recent.length;
    const perDay = slope / 30, span = (last - first) / L.DAY_MS;
    tl = [{ date: new Date(first), value: my - perDay * mx }, { date: new Date(last), value: my + perDay * (span - mx) }];
  }
  const available = Object.keys(METRIC_INFO).filter((m) => ms.some((x) => x.values[m] != null));
  const chart = `<section class="card">
    <h2>${METRIC_INFO[metric].title}<span class="aside">${pts.length} ${plural(pts.length, 'замер', 'замера', 'замеров')}</span></h2>
    <div class="chips" role="tablist">${available.map((m) => `<button class="chip ${m === metric ? 'on' : ''}" data-act="body-metric" data-m="${m}">${METRIC_INFO[m].short}</button>`).join('')}</div>
    <div style="margin-top:10px">${lineChart(pts, { band: range, trendLine: tl, label: METRIC_INFO[metric].title })}</div>
    <div class="legend">${range ? `<span style="--c:var(--band)">норма ${num(range.min)}–${num(range.max)}</span>` : ''}${pts.some((p) => p.partial) ? '<span style="--c:var(--chip)">пустые точки: из таблицы истории</span>' : ''}${tl ? '<span style="--c:var(--muted)">пунктир: тренд</span>' : ''}</div>
  </section>`;

  let norms = '';
  if (full) {
    const rows = ['weight', 'muscleMass', 'fatPercent', 'fatMass', 'water', 'protein', 'bone', 'visceralFat', 'bmi', 'fatFreeMass']
      .filter((m) => full.values[m] != null).map((m) => {
        const r = full.ranges?.[m];
        const v = full.values[m];
        const st = r ? (v < r.min ? 'below' : v > r.max ? 'above' : 'normal') : null;
        return `<div class="norm-row"><span class="name">${METRIC_INFO[m].title} ${st ? `<span class="badge ${st}">${L.STATUS_TITLES[st]}</span>` : ''}</span><span class="val">${metricValue(v, m)}</span>${r ? `<div class="bar">${normScale(v, r)}</div>` : ''}</div>`;
      }).join('');
    norms = `<section class="card"><h2>Показатели и нормы<span class="aside">${fmtDay(full.day)}</span></h2>${rows}</section>`;
  }

  let segs = '';
  const segSrc = [...fullMeasurements()].reverse().find((m) => Object.keys(m.segmentMuscle || {}).length);
  if (segSrc) {
    const data = ui.segMode === 'muscle' ? segSrc.segmentMuscle : segSrc.segmentFat;
    const cells = L.SEGMENTS_ORDER.map((s) => {
      const v = data?.[s];
      return `<div class="seg-cell ${s}"><span class="t">${L.SEGMENT_TITLES[s]}</span><span class="v">${v ? `${num(v.kg, 2)} кг` : '—'}</span>
        ${v?.percent != null ? `<span class="small muted tabular">${num(v.percent, 1)}% нормы</span>` : ''}${v?.status ? `<span><span class="badge ${v.status}">${L.STATUS_TITLES[v.status]}</span></span>` : ''}</div>`;
    }).join('');
    const sm = segSrc.segmentMuscle;
    const notes = [];
    for (const [a, b, t] of [['leftArm', 'rightArm', 'Руки'], ['leftLeg', 'rightLeg', 'Ноги']]) {
      if (sm?.[a] && sm?.[b]) {
        const diff = Math.abs(sm[a].kg - sm[b].kg) / Math.max(sm[a].kg, sm[b].kg) * 100;
        notes.push(`${t}: разница сторон ${num(diff, 0)}%${diff >= 6 ? ', стоит подтянуть слабую' : ', в пределах обычного'}`);
      }
    }
    segs = `<section class="card"><h2>Сегменты<span class="aside">${fmtDay(segSrc.day)}</span></h2>
      <div class="seg" role="tablist" style="margin-bottom:12px"><button class="${ui.segMode === 'muscle' ? 'on' : ''}" data-act="seg-mode" data-m="muscle">Мышцы</button><button class="${ui.segMode === 'fat' ? 'on' : ''}" data-act="seg-mode" data-m="fat">Жир</button></div>
      <div class="body-map">${cells}</div>${ui.segMode === 'muscle' && notes.length ? `<div class="side-note">${notes.join('. ')}.</div>` : ''}</section>`;
  }

  let goals = '';
  if (full && (full.values.bmr || full.dailyCalories || full.idealWeight)) {
    const kv = [
      ['Обмен веществ', full.values.bmr != null ? `${num(full.values.bmr, 0)} ккал` : null],
      ['Суточная норма', full.dailyCalories != null ? `${num(full.dailyCalories, 0)} ккал` : null],
      ['Идеальный вес', full.idealWeight != null ? `${num(full.idealWeight)} кг` : null],
      ['До идеала: вес', full.toIdealWeight != null ? `${signed(full.toIdealWeight)} кг` : null],
      ['До идеала: жир', full.toIdealFat != null ? `${signed(full.toIdealFat)} кг` : null],
      ['До идеала: мышцы', full.toIdealMuscle != null ? `${signed(full.toIdealMuscle)} кг` : null],
    ].filter((x) => x[1]);
    goals = `<section class="card"><h2>Обмен и цели</h2><dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`;
  }

  const list = [...ms].reverse().slice(0, 12).map((m) => `<button class="item" data-act="measurement" data-day="${m.day}">
      <div class="grow"><div class="title">${fmtDay(m.day)}</div><div class="sub">${m.isPartial ? 'из таблицы истории' : m.source ? 'вес' : (m.conditions ? conditionsText(m.conditions) : 'полный замер')}</div></div>
      <span class="tabular">${metricValue(m.values.weight, 'weight')}</span>${icon.chev}</button>`).join('');

  const backupNudge = !state.demo && (state.workouts.length + state.measurements.length) > 3 && (!state.settings.lastBackup || L.daysBetween(state.settings.lastBackup, new Date()) > 14)
    ? `<div class="example-flag"><span class="grow">Данные хранятся только в этом браузере. Сделай резервную копию, чтобы их не потерять.</span><button class="btn secondary" data-act="export">Сохранить</button></div>` : '';

  return {
    title: 'Тело', top: topTitle('Тело', `${importBtn}${gear}`),
    html: `${demoBanner()}${backupNudge}
      <section class="hero"><span class="date">Последний замер ${fmtDay(ref.day)}${ref.conditions ? `, ${conditionsText(ref.conditions)}` : ''}</span>
      ${full?.values.score != null ? `<span>Оценка InBody <b class="tabular">${num(full.values.score, 0)}</b> из 100</span>` : ''}</section>
      <div class="grid2">${cards}</div>${chart}${norms}${segs}${goals}
      <section class="card"><h2>Замеры<span class="aside">${ms.length}</span></h2><div class="list">${list}</div></section>
      <button class="btn block" data-act="import-pdf">${icon.upload} Загрузить новый отчёт</button>`,
  };
}

const TIME_TITLES = { morning: 'утро', day: 'день', evening: 'вечер' };
function conditionsText(c) {
  return [TIME_TITLES[c.timeOfDay] || '', c.fasted ? 'натощак' : 'после еды', c.afterWorkout ? 'после тренировки' : null].filter(Boolean).join(', ');
}
const isStandard = (c) => c && c.timeOfDay === 'morning' && c.fasted && !c.afterWorkout;

function measurementSheet(day) {
  const m = state.measurements.find((x) => x.day === day);
  if (!m) return;
  const rows = Object.keys(METRIC_INFO).filter((k) => m.values[k] != null).map((k) => `<dt>${METRIC_INFO[k].title}</dt><dd>${metricValue(m.values[k], k)}</dd>`).join('');
  openSheet({
    title: fmtDay(m.day), left: 'Закрыть',
    body: `<div class="card"><dl class="kv">${rows}</dl>${m.conditions ? `<p class="small muted" style="margin:10px 0 0">Условия: ${conditionsText(m.conditions)}</p>` : ''}${m.isPartial ? '<p class="small muted" style="margin:10px 0 0">Неполный замер: взят из таблицы истории в более позднем отчёте.</p>' : ''}</div>
      <button class="btn danger block" data-del>Удалить замер</button>`,
    onOpen: (el) => el.querySelector('[data-del]').addEventListener('click', () => {
      state.measurements = state.measurements.filter((x) => x.day !== day);
      save(); closeSheet(); render(); toast('Замер удалён');
    }),
  });
}

// ───────── Импорт PDF ─────────
async function loadPdfJs() {
  if (ui.pdfjs) return ui.pdfjs;
  const lib = await import('./vendor/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;
  ui.pdfjs = lib;
  return lib;
}

function pickFile(accept, cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style.display = 'none';
  input.addEventListener('change', () => { const f = input.files?.[0]; input.remove(); if (f) cb(f); });
  document.body.append(input);
  input.click();
}

async function importPdf(file) {
  toast('Читаю отчёт…');
  let report;
  try {
    const pdfjs = await loadPdfJs();
    report = await parsePdf(pdfjs, await file.arrayBuffer());
  } catch (e) {
    toast(e instanceof InBodyError ? e.message : 'Не получилось прочитать PDF. Проверь, что это отчёт InBody из DDX.');
    console.error(e);
    return;
  }
  if (report.date > dayKey(new Date())) { toast('Дата в отчёте из будущего. Проверь файл.'); return; }
  previewReport(report);
}

function previewReport(report) {
  const prevFull = [...fullMeasurements()].reverse().find((m) => m.day < report.date);
  const cond = { timeOfDay: prevFull?.conditions?.timeOfDay || 'morning', fasted: prevFull?.conditions?.fasted ?? true, afterWorkout: prevFull?.conditions?.afterWorkout ?? false };
  const exists = state.measurements.find((m) => m.day === report.date && !m.isPartial);
  const keys = ['weight', 'muscleMass', 'fatPercent', 'fatMass', 'score', 'water', 'protein', 'bone', 'visceralFat', 'bmi', 'fatFreeMass', 'bmr'];
  const rows = keys.filter((k) => report.values[k] != null).map((k) => `<dt>${METRIC_INFO[k].title}</dt><dd>${metricValue(report.values[k], k)}</dd>`).join('');
  const segN = Object.keys(report.segmentMuscle).length;
  const condHtml = () => `
    <div class="seg" role="radiogroup" aria-label="Время замера">${['morning', 'day', 'evening'].map((t) => `<button class="${cond.timeOfDay === t ? 'on' : ''}" data-cond-time="${t}">${TIME_TITLES[t][0].toUpperCase() + TIME_TITLES[t].slice(1)}</button>`).join('')}</div>
    <label class="toggle-row"><span class="grow">Натощак</span><input type="checkbox" class="switch" id="cond-fasted" ${cond.fasted ? 'checked' : ''}></label>
    <label class="toggle-row"><span class="grow">После тренировки</span><input type="checkbox" class="switch" id="cond-after" ${cond.afterWorkout ? 'checked' : ''}></label>
    <p class="warn" id="cond-warn" ${prevFull?.conditions && isStandard(prevFull.conditions) !== isStandard(cond) ? '' : 'hidden'}>Прошлый замер был в других условиях (${prevFull?.conditions ? conditionsText(prevFull.conditions) : ''}). Сравнивай такие замеры осторожно: вода и еда сдвигают вес и мышцы на 1–2 кг.</p>`;
  openSheet({
    title: 'Новый замер', right: 'Сохранить',
    body: `<div class="card"><h2>${fmtDay(report.date)}${report.age ? `<span class="aside">${report.age} лет, ${num(report.heightCm, 0)} см</span>` : ''}</h2><dl class="kv">${rows}</dl>
      <p class="small muted" style="margin:10px 0 0">${segN ? `Сегментный анализ: ${segN} из 5 частей тела. ` : ''}${report.history.length ? `Таблица истории: ${report.history.length} ${plural(report.history.length, 'замер', 'замера', 'замеров')}, прошлые добавятся как неполные.` : ''}</p>
      ${exists ? '<p class="warn" style="margin:8px 0 0">Замер за этот день уже есть, он будет заменён.</p>' : ''}</div>
      <div class="card"><h2>Условия замера</h2><div id="cond">${condHtml()}</div><p class="small muted" style="margin:8px 0 0">Честно сравнивать можно только замеры в одинаковых условиях. Лучше всего утром, натощак, до тренировки.</p></div>`,
    onOpen: (el) => {
      const box = el.querySelector('#cond');
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cond-time]');
        if (b) { cond.timeOfDay = b.dataset.condTime; box.innerHTML = condHtml(); }
      });
      box.addEventListener('change', () => {
        cond.fasted = el.querySelector('#cond-fasted').checked;
        cond.afterWorkout = el.querySelector('#cond-after').checked;
        box.innerHTML = condHtml();
      });
    },
    onRight: () => {
      if (state.demo) { state = L.emptyState(); }
      const { list, added } = L.mergeMeasurements(state.measurements, L.measurementsFromReport(report, { ...cond }));
      state.measurements = list;
      save(); closeSheet(); ui.bodyMetric = 'weight';
      go('body'); render(true);
      toast(`Замер сохранён${added > 1 ? `, из истории добавлено ${added - 1}` : ''}`);
    },
  });
}

// ───────── Дневник ─────────
function workoutStats(w) {
  const vol = L.workoutVolume(w), sets = L.workoutSetCount(w);
  return [`${w.exercises.length} ${plural(w.exercises.length, 'упражнение', 'упражнения', 'упражнений')}`, `${sets} ${plural(sets, 'подход', 'подхода', 'подходов')}`, vol ? tonnage(vol) : null, w.durationMinutes ? `${w.durationMinutes} мин` : null].filter(Boolean);
}

function viewDiary() {
  const ws = workoutsSorted();
  const program = L.programById(state.settings.activeProgram);
  const right = `<button class="icon-btn" data-act="go" data-to="catalog" aria-label="Справочник упражнений">${icon.book}</button><button class="icon-btn" data-act="go" data-to="settings" aria-label="Настройки">${icon.gear}</button>`;
  let next = '';
  if (program) {
    const d = L.nextDay(program, state.workouts);
    const day = program.days[d];
    next = `<section class="card next-up"><div class="small muted">${esc(program.title)} · день ${d + 1} из ${program.days.length}</div>
      <h2 style="margin:4px 0 6px;font-size:22px">${esc(day.title)}</h2>
      <div class="small muted" style="margin-bottom:12px">${day.items.map((i) => esc(i.exercise)).join(' · ')}</div>
      <button class="btn block" data-act="start-program" data-day="${d}">Начать тренировку</button></section>`;
  } else {
    next = `<section class="card"><h2>Программа</h2><p class="muted small" style="margin:0 0 10px">Выбери готовую программу: «Форма» будет предлагать следующий день и сама прибавлять веса.</p><button class="btn secondary block" data-act="go" data-to="programs">Выбрать программу</button></section>`;
  }
  const actions = `<div class="grid2"><button class="btn" data-act="new-workout">${icon.plus} Пустая</button>${ws[0] ? '<button class="btn secondary" data-act="repeat-last">Повторить последнюю</button>' : `<button class="btn secondary" data-act="go" data-to="programs">${icon.list} Программы</button>`}</div>`;
  let list = '';
  if (!ws.length) {
    list = `<section class="card empty"><div class="art">${icon.dumbbell}</div><h2>Тренировок пока нет</h2><p>Начни пустую тренировку или выбери программу. Подходы из прошлого раза подставятся сами.</p></section>`;
  } else {
    let month = '';
    for (const w of ws.slice(0, 60)) {
      const d = toDate(w.date);
      const m = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      if (m !== month) { list += `<div class="section-title">${m}</div>`; month = m; }
      list += `<a class="card workout-card" href="#w-${w.id}" style="color:inherit;text-decoration:none">
        <div class="row"><b class="grow">${esc(w.title)}</b><span class="small muted">${fmtDay(w.date)}</span></div>
        <div class="small muted" style="overflow-wrap:anywhere">${w.exercises.map((e) => esc(e.name)).join(' · ') || 'Без упражнений'}</div>
        <div class="stat-line">${workoutStats(w).map((s) => `<span>${s}</span>`).join('')}${!w.finishedAt ? '<span class="badge normal">идёт</span>' : ''}</div></a>`;
    }
  }
  return { title: 'Дневник', top: topTitle('Дневник', right), html: `${demoBanner()}${next}${actions}${program ? `<button class="btn ghost" data-act="go" data-to="programs">Сменить программу</button>` : ''}${list}` };
}

function newWorkout(fromProgram = null, dayIndex = 0) {
  if (state.demo) clearDemo(false);
  const w = fromProgram ? L.workoutFromProgram(fromProgram, dayIndex, state.workouts, groupOf)
    : { id: L.uid(), date: new Date().toISOString(), title: 'Тренировка', note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null, exercises: [] };
  state.workouts.push(w);
  save();
  go(`w-${w.id}`);
}

function setsFromPrevious(name, beforeIso, exceptId) {
  const prev = L.previousEntry(state.workouts, name, beforeIso, exceptId);
  if (!prev) return groupOf(name) === 'cardio' ? [{ weight: 0, reps: 0, isWarmup: false, isDone: false }] : [{ weight: 0, reps: 0, isWarmup: false, isDone: false }, { weight: 0, reps: 0, isWarmup: false, isDone: false }, { weight: 0, reps: 0, isWarmup: false, isDone: false }];
  return prev.e.sets.map((s) => ({ weight: s.weight, reps: s.reps, isWarmup: !!s.isWarmup, isDone: false }));
}

function viewWorkout(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return { title: 'Тренировка', top: topBack('#diary', 'Тренировка'), html: '<section class="card empty"><h2>Тренировка не найдена</h2><a class="btn" href="#diary">К дневнику</a></section>' };
  const blocks = w.exercises.map((e, ei) => {
    const g = groupOf(e.name);
    const prev = L.previousEntry(state.workouts, e.name, w.date, w.id);
    const range = L.programRange(w, e.name);
    const sug = prev ? L.suggest(prev.e.sets, e.name, g, range) : null;
    const prevText = prev ? `Прошлый раз ${fmtDay(prev.w.date, false)}: ${L.workingSets(prev.e).map((s) => `${num(s.weight, 2)}×${s.reps}`).join(', ')}` : 'Первый раз в дневнике';
    const isCardio = g === 'cardio';
    const note = state.exercises.find((x) => x.name === e.name)?.note;
    let n = 0;
    const rows = e.sets.map((s, si) => {
      const label = s.isWarmup ? 'Р' : String(++n);
      return `<div class="set-row ${s.isDone ? 'done' : ''}">
        <button class="set-no ${s.isWarmup ? 'warm' : ''}" data-act="toggle-warm" data-e="${ei}" data-s="${si}" aria-label="${s.isWarmup ? 'Разминочный подход, сделать рабочим' : 'Рабочий подход, сделать разминочным'}">${label}</button>
        <input inputmode="decimal" enterkeyhint="next" aria-label="${isCardio ? 'Минуты' : 'Вес, кг'}" data-in="weight" data-e="${ei}" data-s="${si}" value="${s.weight ? num(s.weight, 2).replace(/\s/g, '') : ''}" placeholder="0">
        <input inputmode="numeric" enterkeyhint="done" aria-label="${isCardio ? 'Минуты' : 'Повторы'}" data-in="reps" data-e="${ei}" data-s="${si}" value="${s.reps || ''}" placeholder="0">
        <button class="done-btn ${s.isDone ? 'on' : ''}" data-act="toggle-done" data-e="${ei}" data-s="${si}" aria-label="Подход выполнен" aria-pressed="${s.isDone}">${icon.check}</button>
        <button class="x-btn" data-act="del-set" data-e="${ei}" data-s="${si}" aria-label="Удалить подход">${icon.x}</button></div>`;
    }).join('');
    return `<section class="card">
      <div class="ex-head"><button class="name" data-act="exercise-info" data-name="${esc(e.name)}">${esc(e.name)}</button>
        <button class="icon-btn" style="width:34px;height:34px;box-shadow:none;background:var(--chip)" data-act="ex-menu" data-e="${ei}" aria-label="Действия с упражнением">${icon.more}</button></div>
      <div class="ex-meta">${L.GROUPS[g]}${range ? ` · цель ${range[0]}–${range[1]} повт.` : ''}${note ? ` · ${esc(note)}` : ''}</div>
      <div class="ex-meta">${esc(prevText)}</div>
      ${sug ? `<div class="hint"><div class="grow">Сегодня: <b>${esc(sug.headline)}</b><br><span class="muted small">${esc(sug.reason)}</span></div><button class="btn secondary" style="min-height:38px;padding:8px 12px" data-act="apply-sug" data-e="${ei}">Подставить</button></div>` : ''}
      <div class="sets"><div class="set-row head"><span>№</span><span>${isCardio ? 'мин' : 'кг'}</span><span>${isCardio ? 'км' : 'повт'}</span><span></span><span></span></div>${rows}</div>
      <button class="btn ghost block" style="margin-top:6px;min-height:40px" data-act="add-set" data-e="${ei}">${icon.plus} Подход</button>
    </section>`;
  }).join('');
  const dateVal = (() => { const d = toDate(w.date); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })();
  const vol = L.workoutVolume(w);
  return {
    title: w.title,
    top: topBack('#diary', fmtDay(w.date), w.finishedAt ? `<button class="text-btn" data-act="del-workout">Удалить</button>` : `<button class="text-btn" data-act="finish">Готово</button>`),
    html: `<section class="card stack">
        <div class="field"><label for="w-title">Название</label><input id="w-title" data-win="title" value="${esc(w.title)}"></div>
        <div class="grid2"><div class="field"><label for="w-date">Дата и время</label><input id="w-date" type="datetime-local" data-win="date" value="${dateVal}"></div>
        <div class="field"><label for="w-dur">Минут</label><input id="w-dur" inputmode="numeric" data-win="durationMinutes" value="${w.durationMinutes ?? ''}" placeholder="—"></div></div>
        <div class="stat-line" id="w-stats">${workoutStats(w).map((s) => `<span>${s}</span>`).join('')}</div>
      </section>
      ${blocks || '<section class="card empty"><p>Добавь первое упражнение. Подходы из прошлого раза подставятся сами.</p></section>'}
      <button class="btn block" data-act="add-exercise">${icon.plus} Упражнение</button>
      <section class="card"><div class="field"><label for="w-note">Заметка</label><textarea id="w-note" data-win="note" placeholder="Самочувствие, что поменять в следующий раз">${esc(w.note)}</textarea></div></section>
      ${w.finishedAt ? `<p class="small muted" style="text-align:center">Завершена ${fmtDay(w.finishedAt)}${vol ? `, тоннаж ${tonnage(vol)}` : ''}</p>` : `<button class="btn secondary block" data-act="finish">Завершить тренировку</button><button class="btn danger block" data-act="del-workout">Удалить тренировку</button>`}`,
  };
}

function currentWorkout() {
  const r = route();
  return r.name === 'w' ? state.workouts.find((x) => x.id === r.arg) : null;
}

function exercisePicker(onPick, title = 'Упражнение') {
  const recentNames = [...new Set(workoutsSorted().flatMap((w) => w.exercises.map((e) => e.name)))].slice(0, 8);
  const listHtml = (q) => {
    const ql = q.trim().toLowerCase();
    const items = state.exercises.filter((e) => !ql || e.name.toLowerCase().includes(ql));
    let html = '';
    if (!ql && recentNames.length) html += `<div class="section-title">Недавние</div><div class="card list">${recentNames.map((n) => `<button class="item" data-pick="${esc(n)}"><span class="grow title">${esc(n)}</span><span class="small muted">${L.GROUPS[groupOf(n)]}</span></button>`).join('')}</div>`;
    for (const g of Object.keys(L.GROUPS)) {
      const gi = items.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      if (!gi.length) continue;
      html += `<div class="section-title">${L.GROUPS[g]}</div><div class="card list">${gi.map((e) => `<button class="item" data-pick="${esc(e.name)}"><span class="grow title">${esc(e.name)}</span></button>`).join('')}</div>`;
    }
    if (ql && !items.some((e) => e.name.toLowerCase() === ql)) {
      html = `<div class="card stack"><b>Своё упражнение «${esc(q.trim())}»</b><div class="chips">${Object.entries(L.GROUPS).map(([g, t]) => `<button class="chip" data-new-group="${g}">${t}</button>`).join('')}</div><span class="small muted">Выбери группу мышц, чтобы добавить.</span></div>` + html;
    }
    return html;
  };
  openSheet({
    title,
    body: `<input class="search" id="pick-q" type="search" placeholder="Поиск или новое упражнение" autocomplete="off"><div id="pick-list" class="stack">${listHtml('')}</div>`,
    onOpen: (el) => {
      const q = el.querySelector('#pick-q');
      const box = el.querySelector('#pick-list');
      q.addEventListener('input', () => { box.innerHTML = listHtml(q.value); });
      box.addEventListener('click', (e) => {
        const p = e.target.closest('[data-pick]');
        const ng = e.target.closest('[data-new-group]');
        if (p) { closeSheet(); onPick(p.dataset.pick); }
        if (ng) {
          const name = q.value.trim().slice(0, 80);
          if (!state.exercises.some((x) => x.name === name)) state.exercises.push({ name, group: ng.dataset.newGroup, isCustom: true, note: '' });
          closeSheet(); onPick(name);
        }
      });
    },
  });
}

function exerciseInfo(name) {
  const ex = state.exercises.find((x) => x.name === name);
  const info = CATALOG[name];
  const hist = workoutsSorted().filter((w) => w.exercises.some((e) => e.name === name)).slice(0, 5);
  openSheet({
    title: name, left: 'Закрыть',
    body: `<div class="card stack"><div class="muted small">${L.GROUPS[groupOf(name)]}${info ? ` · ${esc(info.muscles)}` : ''}</div>
      ${info?.tips.length ? `<ul class="tips-list">${info.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<span class="muted small">Подсказок по технике для этого упражнения нет.</span>'}</div>
      <div class="card"><div class="field"><label for="ex-note">Моя заметка: где тренажёр, настройки сиденья</label><textarea id="ex-note">${esc(ex?.note || '')}</textarea></div></div>
      ${hist.length ? `<div class="card"><h2>Последние разы</h2><div class="list">${hist.map((w) => { const e = w.exercises.find((x) => x.name === name); return `<div class="item"><span class="grow"><span class="title">${fmtDay(w.date)}</span><div class="sub">${L.workingSets(e).map((s) => `${num(s.weight, 2)}×${s.reps}`).join(', ') || '—'}</div></span></div>`; }).join('')}</div></div>` : ''}
      <a class="btn secondary block" href="#ex-${encodeURIComponent(name)}">Прогресс по упражнению</a>
      ${ex?.isCustom && !state.workouts.some((w) => w.exercises.some((e) => e.name === name)) ? '<button class="btn danger block" data-del-ex>Удалить своё упражнение</button>' : ''}`,
    onOpen: (el) => {
      el.querySelector('#ex-note').addEventListener('input', (e) => { if (ex) { ex.note = e.target.value.slice(0, 500); save(); } });
      el.querySelector('[data-del-ex]')?.addEventListener('click', () => { state.exercises = state.exercises.filter((x) => x.name !== name); save(); closeSheet(); render(); });
    },
  });
}

function exerciseMenu(ei) {
  const w = currentWorkout();
  const e = w?.exercises[ei];
  if (!e) return;
  openSheet({
    title: e.name, left: 'Закрыть',
    body: `<button class="btn secondary block" data-m="replace">Заменить упражнение</button>
      ${ei > 0 ? '<button class="btn secondary block" data-m="up">Поднять выше</button>' : ''}
      ${ei < w.exercises.length - 1 ? '<button class="btn secondary block" data-m="down">Опустить ниже</button>' : ''}
      <button class="btn danger block" data-m="delete">Убрать из тренировки</button>`,
    onOpen: (el) => el.addEventListener('click', (ev) => {
      const m = ev.target.closest('[data-m]')?.dataset.m;
      if (!m) return;
      closeSheet();
      if (m === 'replace') {
        exercisePicker((name) => { e.name = name; e.sets = setsFromPrevious(name, w.date, w.id); save(); render(); }, 'Заменить на');
      } else if (m === 'up' || m === 'down') {
        const j = m === 'up' ? ei - 1 : ei + 1;
        [w.exercises[ei], w.exercises[j]] = [w.exercises[j], w.exercises[ei]];
        save(); render();
      } else if (m === 'delete') {
        w.exercises.splice(ei, 1); save(); render();
      }
    }),
  });
}

// ───────── Таймер отдыха ─────────
let timerTick = null;
let audioCtx = null;
function startTimer(seconds) {
  ui.timer = { endsAt: Date.now() + seconds * 1000, notified: false };
  try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch { /* без звука */ }
  clearInterval(timerTick);
  timerTick = setInterval(drawTimer, 250);
  drawTimer();
}
function beep() {
  try {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.35);
  } catch { /* ignore */ }
}
function drawTimer() {
  const el = $('#timer');
  if (!ui.timer) { el.hidden = true; clearInterval(timerTick); return; }
  const left = Math.round((ui.timer.endsAt - Date.now()) / 1000);
  if (left <= 0 && !ui.timer.notified) { ui.timer.notified = true; beep(); navigator.vibrate?.([200, 100, 200]); }
  if (left < -60) { ui.timer = null; el.hidden = true; clearInterval(timerTick); return; }
  const a = Math.abs(left);
  el.hidden = false;
  el.classList.toggle('over', left <= 0);
  el.innerHTML = `<div class="inner" role="timer" aria-live="off"><span class="time">${left < 0 ? '+' : ''}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}</span>
    <span class="grow">${left > 0 ? 'Отдых' : 'Пора на подход'}</span><button data-act="timer-add" data-v="-15">−15</button><button data-act="timer-add" data-v="15">+15</button><button data-act="timer-stop" aria-label="Остановить таймер">✕</button></div>`;
}

// ───────── Программы и справочник ─────────
function viewPrograms() {
  const active = state.settings.activeProgram;
  const cards = L.PROGRAMS.map((p) => `<section class="card stack">
    <div class="row"><b class="grow" style="font-size:18px">${esc(p.title)}</b>${p.id === active ? '<span class="badge normal">активная</span>' : ''}</div>
    <div class="small muted">${esc(p.level)} · ${p.perWeek} ${plural(p.perWeek, 'раз', 'раза', 'раз')} в неделю</div>
    <p style="margin:0">${esc(p.summary)}</p>
    ${p.days.map((d, i) => `<div><b class="small">${i + 1}. ${esc(d.title)}</b><div class="small muted">${d.items.map((x) => `${esc(x.exercise)} ${x.sets}×${x.reps[0]}–${x.reps[1]}`).join(' · ')}</div></div>`).join('')}
    ${p.id === active ? '<button class="btn secondary" data-act="set-program" data-id="">Отключить программу</button>' : `<button class="btn" data-act="set-program" data-id="${p.id}">Тренироваться по ней</button>`}
  </section>`).join('');
  return { title: 'Программы', top: topBack('#diary', 'Программы'), html: `<p class="muted small" style="margin:0 4px">Веса растут по двойной прогрессии: сначала добираешь повторы до верха диапазона во всех подходах, потом «Форма» прибавляет вес.</p>${cards}` };
}

function viewCatalog() {
  const groups = Object.keys(L.GROUPS).map((g) => {
    const items = state.exercises.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (!items.length) return '';
    return `<div class="section-title">${L.GROUPS[g]}</div><section class="card list">${items.map((e) => `<button class="item" data-act="exercise-info" data-name="${esc(e.name)}"><span class="grow"><span class="title">${esc(e.name)}</span>${e.note ? `<div class="sub">${esc(e.note)}</div>` : CATALOG[e.name] ? `<div class="sub">${esc(CATALOG[e.name].muscles)}</div>` : ''}</span>${e.isCustom ? '<span class="badge plain">своё</span>' : ''}${icon.chev}</button>`).join('')}</section>`;
  }).join('');
  return { title: 'Упражнения', top: topBack('#diary', 'Упражнения', `<button class="icon-btn" data-act="new-exercise" aria-label="Своё упражнение">${icon.plus}</button>`), html: groups };
}

// ───────── Аналитика ─────────
function viewAnalytics() {
  const ws = state.workouts.filter((w) => w.exercises.length);
  const now = new Date();
  const P = ui.period;
  const inRange = (w, a, b) => { const d = L.daysBetween(w.date, now); return d >= a && d < b; };
  const cur = ws.filter((w) => inRange(w, 0, P)), prev = ws.filter((w) => inRange(w, P, 2 * P));
  const sum = (arr, f) => arr.reduce((a, w) => a + f(w), 0);
  const kpi = (label, v, pv, fmt) => {
    const d = pv ? ((v - pv) / pv) * 100 : null;
    return `<div class="kpi"><div class="v">${fmt(v)}</div><div class="l">${label}</div>${d != null ? `<div class="d ${d >= 0 ? 'delta good' : 'delta bad'}">${d >= 0 ? '+' : '−'}${num(Math.abs(d), 0)}%</div>` : '<div class="d muted">—</div>'}</div>`;
  };
  const tips = L.advisorTips(L.sessionsFrom(ws, groupOf), L.bodyPointsFrom(state.measurements), now);
  const tipsHtml = `<section class="card"><h2>Советы<span class="aside">по твоим данным</span></h2>
    ${tips.length ? tips.slice(0, 5).map((t) => `<div class="tip ${t.kind}"><span class="dot"></span><div><b>${esc(t.title)}</b><p>${esc(t.text)}</p></div></div>`).join('') : '<p class="muted small" style="margin:0">Пока замечаний нет. Советы появятся, когда в дневнике будет хотя бы несколько недель тренировок и пара замеров InBody.</p>'}
    <p class="small muted" style="margin:10px 0 0">Советы считаются прямо на телефоне по правилам, данные никуда не отправляются.</p></section>`;
  if (!ws.length) {
    return { title: 'Аналитика', top: topTitle('Аналитика'), html: `${demoBanner()}${tipsHtml}<section class="card empty"><div class="art">${icon.chart}</div><h2>Нечего считать</h2><p>Запиши пару тренировок в дневник, и здесь появятся тоннаж, нагрузка по группам мышц и прогресс по упражнениям.</p><a class="btn" href="#diary">В дневник</a></section>` };
  }
  // Недели.
  const ws0 = L.weekStart(now);
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const s = new Date(ws0); s.setDate(s.getDate() - 7 * i);
    const e = new Date(s); e.setDate(e.getDate() + 7);
    const items = ws.filter((w) => { const d = toDate(w.date); return d >= s && d < e; });
    weeks.push({ label: `${s.getDate()}.${String(s.getMonth() + 1).padStart(2, '0')}`, value: sum(items, L.workoutVolume), count: items.length, highlight: i === 0 });
  }
  // Группы мышц.
  const sets = {};
  for (const w of cur) for (const e of w.exercises) { const g = groupOf(e.name); sets[g] = (sets[g] || 0) + L.workingSets(e).length; }
  const maxSets = Math.max(1, ...Object.values(sets));
  const weeksN = P / 7;
  const groupsHtml = Object.entries(sets).filter(([g]) => g !== 'cardio').sort((a, b) => b[1] - a[1]).map(([g, n]) => `<div class="hbar"><span>${L.GROUPS[g]}</span><span class="track"><span class="fill" style="width:${(n / maxSets) * 100}%"></span></span><span class="n">${n}</span></div>`).join('');
  // Тепловая карта 16 недель.
  const days = new Set(ws.map((w) => dayKey(toDate(w.date))));
  const start = new Date(ws0); start.setDate(start.getDate() - 7 * 15);
  let heat = '';
  for (let i = 0; i < 16 * 7; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    if (d > now) { heat += '<i style="visibility:hidden"></i>'; continue; }
    const k = dayKey(d);
    const cnt = ws.filter((w) => dayKey(toDate(w.date)) === k).reduce((a, w) => a + L.workoutSetCount(w), 0);
    const lvl = !days.has(k) ? '' : cnt >= 20 ? 'l3' : cnt >= 10 ? 'l2' : 'l1';
    heat += `<i class="${lvl} ${k === dayKey(now) ? 'today' : ''}" title="${fmtDay(d)}"></i>`;
  }
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const s = new Date(ws0); s.setDate(s.getDate() - 7 * i);
    const e = new Date(s); e.setDate(e.getDate() + 7);
    if (ws.some((w) => { const d = toDate(w.date); return d >= s && d < e; })) streak++; else if (i > 0) break;
  }
  // Упражнения.
  const exMap = new Map();
  for (const w of [...ws].sort((a, b) => (a.date < b.date ? -1 : 1))) for (const e of w.exercises) {
    if (groupOf(e.name) === 'cardio' || !L.workingSets(e).length || L.bestE1rm(e) <= 0) continue;
    const x = exMap.get(e.name) || { name: e.name, count: 0, best: 0, first: null, last: null, lastDate: w.date };
    const b = L.bestE1rm(e);
    x.count++; x.best = Math.max(x.best, b); x.first ??= b; x.last = b; x.lastDate = w.date;
    exMap.set(e.name, x);
  }
  const exList = [...exMap.values()].sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1)).slice(0, 15).map((x) => {
    const d = x.first ? x.last - x.first : 0;
    return `<a class="item" href="#ex-${encodeURIComponent(x.name)}" style="color:inherit;text-decoration:none"><span class="grow"><span class="title">${esc(x.name)}</span><div class="sub">${x.count} ${plural(x.count, 'тренировка', 'тренировки', 'тренировок')} · 1ПМ ≈ ${num(x.last, 0)} кг</div></span>${x.count > 1 ? `<span class="delta ${d >= 0 ? 'good' : 'bad'}">${signed(d, 1)} кг</span>` : ''}${icon.chev}</a>`;
  }).join('');
  // Тело и тренировки.
  let bodyVs = '';
  const bodyPts = state.measurements.filter((m) => !m.source);
  if (bodyPts.length >= 2) {
    const first = bodyPts[0];
    const mk = (k) => bodyPts.filter((m) => m.values[k] != null && first.values[k] != null).map((m) => ({ date: m.day, value: m.values[k] - first.values[k] }));
    bodyVs = `<section class="card"><h2>Тело и тренировки<span class="aside">с ${fmtDay(first.day)}</span></h2>
      ${dualChart({ series: [{ points: mk('muscleMass'), color: 'var(--accent)' }, { points: mk('fatMass').length > 1 ? mk('fatMass') : mk('fatPercent'), color: 'var(--above)' }], points: [] },
        { points: weeksAll(ws).filter((x) => toDate(x.date) >= toDate(first.day)), format: (v) => (v >= 1000 ? `${num(v / 1000, 0)}т` : num(v, 0)) }, { label: 'Изменение мышц и жира рядом с недельным тоннажем' })}
      <div class="legend"><span style="--c:var(--accent)">мышцы, кг от первого замера</span><span style="--c:var(--above)">жир</span><span style="--c:var(--accent-soft)">тоннаж за неделю</span></div></section>`;
  }
  return {
    title: 'Аналитика', top: topTitle('Аналитика'),
    html: `${demoBanner()}${tipsHtml}
      <div class="seg" role="tablist">${[[28, '4 недели'], [84, '3 месяца'], [364, 'Год']].map(([p, t]) => `<button class="${P === p ? 'on' : ''}" data-act="period" data-p="${p}">${t}</button>`).join('')}</div>
      <section class="card"><div class="kpis">${kpi('тренировок', cur.length, prev.length, (v) => num(v, 0))}${kpi('тоннаж', sum(cur, L.workoutVolume), sum(prev, L.workoutVolume), tonnage)}${kpi('подходов', sum(cur, L.workoutSetCount), sum(prev, L.workoutSetCount), (v) => num(v, 0))}</div>
      <p class="small muted" style="margin:10px 0 0">Сравнение с предыдущим таким же периодом.</p></section>
      <section class="card"><h2>Тоннаж по неделям</h2>${barChart(weeks, { format: (v) => (v >= 1000 ? `${num(v / 1000, 1)}т` : num(v, 0)), label: 'Тоннаж по неделям' })}</section>
      <section class="card"><h2>Подходы по группам<span class="aside">≈ ${num(Object.entries(sets).filter(([g]) => g !== 'cardio').reduce((a, [, n]) => a + n, 0) / weeksN, 0)} в неделю</span></h2>${groupsHtml || '<p class="muted small">Нет рабочих подходов за период.</p>'}<p class="small muted" style="margin:8px 0 0">Для роста обычно нужно 10–20 рабочих подходов в неделю на группу.</p></section>
      <section class="card"><h2>Календарь<span class="aside">${streak} ${plural(streak, 'неделя', 'недели', 'недель')} подряд</span></h2><div class="heat" aria-label="Тренировки за 16 недель">${heat}</div></section>
      <section class="card"><h2>Упражнения</h2><div class="list">${exList || '<p class="muted small">Нет силовых упражнений.</p>'}</div></section>
      ${bodyVs}`,
  };
}

function weeksAll(ws) {
  const map = new Map();
  for (const w of ws) {
    const s = L.weekStart(w.date);
    const k = s.getTime();
    map.set(k, (map.get(k) || 0) + L.workoutVolume(w));
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ date: new Date(k + 3 * L.DAY_MS), value: v }));
}

function viewExercise(nameEnc) {
  const name = nameEnc;
  const rows = [...state.workouts].sort((a, b) => (a.date < b.date ? -1 : 1)).map((w) => ({ w, e: w.exercises.find((x) => x.name === name) })).filter((x) => x.e && L.workingSets(x.e).length);
  if (!rows.length) return { title: name, top: topBack('#analytics', name), html: '<section class="card empty"><p>По этому упражнению пока нет подходов.</p></section>' };
  const pts = rows.map(({ w, e }) => ({ date: w.date, value: L.bestE1rm(e) }));
  const maxW = Math.max(...rows.flatMap(({ e }) => L.workingSets(e).map((s) => s.weight)));
  const maxV = Math.max(...rows.map(({ e }) => L.entryVolume(e)));
  const best = Math.max(...pts.map((p) => p.value));
  const maxReps = Math.max(...rows.flatMap(({ e }) => L.workingSets(e).map((s) => s.reps)));
  const hist = [...rows].reverse().slice(0, 20).map(({ w, e }) => `<div class="item"><span class="grow"><span class="title">${fmtDay(w.date)}</span><div class="sub tabular">${L.workingSets(e).map((s) => `${num(s.weight, 2)}×${s.reps}`).join(', ')}</div></span><span class="small muted tabular">1ПМ ${num(L.bestE1rm(e), 0)}</span></div>`).join('');
  return {
    title: name, top: topBack('#analytics', name),
    html: `<section class="card"><h2>Расчётный максимум<span class="aside">формула Эпли</span></h2>${lineChart(pts, { label: 'Расчётный максимум' })}</section>
      <section class="card"><div class="kpis"><div class="kpi"><div class="v">${num(best, 0)}</div><div class="l">лучший 1ПМ, кг</div></div><div class="kpi"><div class="v">${num(maxW, 1)}</div><div class="l">макс. вес, кг</div></div><div class="kpi"><div class="v">${tonnage(maxV)}</div><div class="l">рекорд тоннажа</div></div></div>
      <p class="small muted" style="margin:10px 0 0">Больше всего повторов в подходе: ${maxReps}.</p></section>
      <section class="card"><h2>История</h2><div class="list">${hist}</div></section>
      <button class="btn secondary block" data-act="exercise-info" data-name="${esc(name)}">Техника и заметка</button>`,
  };
}

// ───────── Питание ─────────
function ring(value, target, label, unit) {
  const r = 52, c = 2 * Math.PI * r;
  const frac = target ? Math.min(1, value / target) : 0;
  return `<div class="ring"><svg viewBox="0 0 140 140" role="img" aria-label="${label}: ${num(value, 0)} из ${num(target, 0)} ${unit}">
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--chip)" stroke-width="12"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="${value > target * 1.1 ? 'var(--above)' : 'var(--accent)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)"/>
    <text x="70" y="68" text-anchor="middle" style="font:700 24px var(--font-display);fill:var(--fg)">${num(value, 0)}</text>
    <text x="70" y="88" text-anchor="middle" style="font-size:12px;fill:var(--muted)">из ${num(target, 0)} ${unit}</text></svg><span class="lbl">${label}</span></div>`;
}

function viewFood() {
  const latest = latestFull();
  const goal = state.settings.nutritionGoal || L.defaultGoal(latest);
  const lastWeight = [...state.measurements].reverse().find((m) => m.values.weight != null)?.values.weight;
  const t = L.nutritionTargets(latest, lastWeight, goal);
  const today = dayKey(new Date());
  const items = state.food.filter((f) => dayKey(toDate(f.date)) === today).sort((a, b) => (a.date < b.date ? 1 : -1));
  const p = items.reduce((a, f) => a + f.protein, 0), k = items.reduce((a, f) => a + f.kcal, 0);
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = dayKey(d);
    week.push({ label: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()], value: state.food.filter((f) => dayKey(toDate(f.date)) === key).reduce((a, f) => a + f.protein, 0), highlight: i === 0 });
  }
  return {
    title: 'Питание', top: topTitle('Питание'),
    html: `${demoBanner()}<div class="seg" role="tablist">${Object.entries(L.GOALS).map(([id, g]) => `<button class="${goal === id ? 'on' : ''}" data-act="goal" data-g="${id}">${g.title}</button>`).join('')}</div>
      <section class="card"><h2>Сегодня</h2><div class="ring-wrap">${ring(p, t.protein, 'Белок', 'г')}${ring(k, t.kcal, 'Калории', 'ккал')}</div>
      <p class="small muted" style="margin:10px 0 0">Белок ${num(L.GOALS[goal].protein, 1)} г на кг веса. Калории: ${esc(t.basis)}${L.GOALS[goal].kcal !== 1 ? `, ${L.GOALS[goal].kcal > 1 ? '+' : '−'}${num(Math.abs(L.GOALS[goal].kcal - 1) * 100, 0)}% под цель` : ''}.</p></section>
      <section class="card"><h2>Быстро добавить</h2><div class="presets">${L.FOOD_PRESETS.map((f, i) => `<button class="preset" data-act="preset" data-i="${i}"><b>${esc(f.title)}</b><span>${f.protein} г белка · ${f.kcal} ккал</span></button>`).join('')}</div></section>
      <section class="card stack"><h2>Своё</h2>
        <div class="field"><label for="f-title">Что съел</label><input id="f-title" placeholder="Например, гречка с курицей"></div>
        <div class="grid2"><div class="field"><label for="f-p">Белок, г</label><input id="f-p" inputmode="decimal" placeholder="0"></div><div class="field"><label for="f-k">Калории</label><input id="f-k" inputmode="numeric" placeholder="0"></div></div>
        <button class="btn" data-act="add-food">Добавить</button></section>
      ${items.length ? `<section class="card"><h2>Записи за сегодня</h2><div class="list">${items.map((f) => `<div class="item"><span class="grow"><span class="title">${esc(f.title)}</span><div class="sub tabular">${num(f.protein)} г белка · ${num(f.kcal, 0)} ккал</div></span><button class="x-btn" data-act="del-food" data-id="${f.id}" aria-label="Удалить">${icon.x}</button></div>`).join('')}</div></section>` : ''}
      <section class="card"><h2>Белок за неделю<span class="aside">цель ${num(t.protein, 0)} г</span></h2>${barChart(week, { label: 'Белок по дням', format: (v) => num(v, 0) })}</section>`,
  };
}

// ───────── Настройки ─────────
function viewSettings() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const counts = `${state.measurements.length} ${plural(state.measurements.length, 'замер', 'замера', 'замеров')}, ${state.workouts.length} ${plural(state.workouts.length, 'тренировка', 'тренировки', 'тренировок')}, ${state.food.length} ${plural(state.food.length, 'запись', 'записи', 'записей')} еды`;
  return {
    title: 'Настройки', top: topBack('#body', 'Настройки'),
    html: `${standalone ? '' : `<section class="card"><h2>Поставить на экран «Домой»</h2><ol class="steps"><li>Открой эту страницу в Safari.</li><li>Нажми «Поделиться» внизу экрана.</li><li>Выбери «На экран „Домой“» и нажми «Добавить».</li></ol><p class="small muted" style="margin:10px 0 0">Так «Форма» открывается как приложение, работает без интернета, и Safari не стирает её данные.</p></section>`}
      <section class="card stack"><h2>Резервная копия</h2>
        <p class="small muted" style="margin:0">Все данные хранятся только в этом браузере: ${counts}. Копия в файле переносится между телефонами и в iOS-приложение «Форма», и обратно.</p>
        ${state.settings.lastBackup ? `<p class="small muted" style="margin:0">Последняя копия: ${fmtDay(state.settings.lastBackup)}.</p>` : ''}
        <button class="btn" data-act="export">Сохранить копию</button>
        <button class="btn secondary" data-act="import-backup">Восстановить из копии</button></section>
      <section class="card stack"><h2>Таймер отдыха</h2><div class="seg">${[60, 90, 120, 180].map((s) => `<button class="${state.settings.restSeconds === s ? 'on' : ''}" data-act="rest" data-s="${s}">${s < 120 ? `${s} с` : `${s / 60} мин`}</button>`).join('')}</div>
        <p class="small muted" style="margin:0">Запускается, когда отмечаешь подход выполненным.</p></section>
      <section class="card stack"><h2>Данные</h2>${state.demo ? '<button class="btn secondary" data-act="clear-demo">Удалить примерные данные</button>' : '<button class="btn ghost" data-act="load-demo">Показать примерные данные</button>'}
        <button class="btn danger" data-act="erase">Стереть всё</button></section>
      <p class="small muted" style="text-align:center">Форма для браузера · данные не покидают устройство</p>`,
  };
}

async function exportBackup() {
  const json = JSON.stringify(L.makeBackup(state), null, 2);
  const name = `forma-${dayKey(new Date())}.json`;
  const file = new File([json], name, { type: 'application/json' });
  state.settings.lastBackup = new Date().toISOString();
  save();
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Резервная копия «Формы»' }); render(); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Копия сохранена в «Загрузки»');
  render();
}

function importBackup(file) {
  file.text().then((text) => {
    let next;
    try { next = L.readBackup(text); } catch (e) { toast(e.message); return; }
    next.settings = { ...state.settings, ...next.settings, activeProgram: state.settings.activeProgram };
    confirmSheet('Восстановить копию?', `В копии ${next.measurements.length} замеров, ${next.workouts.length} тренировок и ${next.food.length} записей еды. Текущие данные в браузере заменятся.`, 'Заменить данные', () => {
      state = next; save(); go('body'); render(true); toast('Данные восстановлены');
    });
  });
}

function clearDemo(rerender = true) {
  const keep = { restSeconds: state.settings.restSeconds, activeProgram: rerender ? null : state.settings.activeProgram };
  state = L.emptyState();
  state.settings = { ...state.settings, ...keep };
  save();
  if (rerender) render(); else toast('Примерные данные удалены, дальше всё твоё');
}

// ───────── События ─────────
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const w = currentWorkout();
  const E = w && el.dataset.e != null ? w.exercises[+el.dataset.e] : null;
  const S = E && el.dataset.s != null ? E.sets[+el.dataset.s] : null;
  switch (act) {
    case 'go': go(el.dataset.to); break;
    case 'import-pdf': pickFile('application/pdf,.pdf', importPdf); break;
    case 'import-backup': pickFile('application/json,.json', importBackup); break;
    case 'export': exportBackup(); break;
    case 'load-demo':
      if (state.measurements.length || state.workouts.length) { toast('Примерные данные показываются только в пустом приложении'); break; }
      state = demoState(); save(); render(true); break;
    case 'clear-demo': clearDemo(); toast('Примерные данные удалены'); break;
    case 'erase': confirmSheet('Стереть все данные?', 'Замеры, тренировки и питание удалятся из этого браузера. Отменить нельзя, поэтому сначала сохрани копию.', 'Стереть всё', async () => { await clearState(); state = L.emptyState(); save(); go('body'); render(true); }); break;
    case 'body-metric': ui.bodyMetric = el.dataset.m; render(); break;
    case 'seg-mode': ui.segMode = el.dataset.m; render(); break;
    case 'measurement': measurementSheet(el.dataset.day); break;
    case 'new-workout': newWorkout(); break;
    case 'repeat-last': {
      const last = workoutsSorted()[0];
      if (state.demo) clearDemo(false);
      const nw = { id: L.uid(), date: new Date().toISOString(), title: last.title, note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null, exercises: last.exercises.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ ...s, isDone: false })) })) };
      state.workouts.push(nw); save(); go(`w-${nw.id}`); break;
    }
    case 'start-program': newWorkout(L.programById(state.settings.activeProgram), +el.dataset.day); break;
    case 'set-program': state.settings.activeProgram = el.dataset.id || null; save(); go('diary'); break;
    case 'add-exercise':
      exercisePicker((name) => { w.exercises.push({ name, sets: setsFromPrevious(name, w.date, w.id) }); save(); render(); setTimeout(() => scrollTo(0, document.body.scrollHeight), 0); });
      break;
    case 'ex-menu': exerciseMenu(+el.dataset.e); break;
    case 'exercise-info': exerciseInfo(el.dataset.name); break;
    case 'new-exercise': exercisePicker((name) => exerciseInfo(name), 'Своё упражнение'); break;
    case 'apply-sug': {
      const prev = L.previousEntry(state.workouts, E.name, w.date, w.id);
      const sug = prev && L.suggest(prev.e.sets, E.name, groupOf(E.name), L.programRange(w, E.name));
      if (sug) { E.sets = sug.sets.map((s) => ({ ...s, isDone: false })); save(); render(); }
      break;
    }
    case 'toggle-warm': S.isWarmup = !S.isWarmup; save(); render(); break;
    case 'toggle-done':
      S.isDone = !S.isDone; save(); render();
      if (S.isDone) startTimer(state.settings.restSeconds || 120);
      break;
    case 'del-set': E.sets.splice(+el.dataset.s, 1); save(); render(); break;
    case 'add-set': { const last = E.sets.at(-1); E.sets.push(last ? { ...last, isWarmup: false, isDone: false } : { weight: 0, reps: 0, isWarmup: false, isDone: false }); save(); render(); break; }
    case 'finish':
      if (!w.finishedAt) {
        w.finishedAt = new Date().toISOString();
        const mins = Math.round(L.daysBetween(w.date, new Date()) * 1440);
        if (w.durationMinutes == null && mins > 0 && mins <= 300) w.durationMinutes = mins;
        w.exercises = w.exercises.filter((e) => e.sets.length);
      }
      ui.timer = null; drawTimer();
      save(); go('diary'); toast('Тренировка сохранена'); break;
    case 'del-workout':
      confirmSheet('Удалить тренировку?', `«${w.title}» от ${fmtDay(w.date)} удалится вместе со всеми подходами.`, 'Удалить', () => { state.workouts = state.workouts.filter((x) => x.id !== w.id); save(); go('diary'); });
      break;
    case 'timer-add': if (ui.timer) { ui.timer.endsAt += +el.dataset.v * 1000; ui.timer.notified = false; drawTimer(); } break;
    case 'timer-stop': ui.timer = null; drawTimer(); break;
    case 'period': ui.period = +el.dataset.p; render(); break;
    case 'goal': state.settings.nutritionGoal = el.dataset.g; save(); render(); break;
    case 'preset': { const f = L.FOOD_PRESETS[+el.dataset.i]; if (state.demo) clearDemo(false); state.food.push({ id: L.uid(), date: new Date().toISOString(), ...f }); save(); render(); toast(`Добавлено: ${f.title}`); break; }
    case 'add-food': {
      const title = $('#f-title').value.trim() || 'Еда';
      const p = parseNum($('#f-p').value) ?? 0, k = parseNum($('#f-k').value) ?? 0;
      if (p <= 0 && k <= 0) { toast('Укажи белок или калории'); break; }
      if (p > 500 || k > 10000) { toast('Слишком большое число'); break; }
      if (state.demo) clearDemo(false);
      state.food.push({ id: L.uid(), date: new Date().toISOString(), title: title.slice(0, 80), protein: p, kcal: k }); save(); render(); break;
    }
    case 'del-food': state.food = state.food.filter((f) => f.id !== el.dataset.id); save(); render(); break;
    case 'rest': state.settings.restSeconds = +el.dataset.s; save(); render(); break;
    default: break;
  }
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  const w = currentWorkout();
  if (!w) return;
  if (el.dataset.in) {
    const S = w.exercises[+el.dataset.e]?.sets[+el.dataset.s];
    if (!S) return;
    const v = parseNum(el.value);
    if (el.dataset.in === 'weight') S.weight = v != null && v >= 0 && v <= 1000 ? v : 0;
    else S.reps = v != null && v >= 0 && v <= 1000 ? Math.round(v) : 0;
    save();
    const stats = $('#w-stats');
    if (stats) stats.innerHTML = workoutStats(w).map((s) => `<span>${s}</span>`).join('');
  } else if (el.dataset.win) {
    const k = el.dataset.win;
    if (k === 'title') w.title = el.value.slice(0, 80) || 'Тренировка';
    else if (k === 'note') w.note = el.value.slice(0, 2000);
    else if (k === 'date') { const d = new Date(el.value); if (!Number.isNaN(+d)) w.date = d.toISOString(); }
    else if (k === 'durationMinutes') { const v = parseNum(el.value); w.durationMinutes = v != null && v > 0 && v <= 1440 ? Math.round(v) : null; }
    save();
  }
});

// Enter в поле веса переводит на повторы, в повторах закрывает клавиатуру.
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || !ev.target.dataset?.in) return;
  ev.preventDefault();
  const inputs = [...document.querySelectorAll('[data-in]')];
  const i = inputs.indexOf(ev.target);
  if (ev.target.dataset.in === 'weight' && inputs[i + 1]) inputs[i + 1].focus(); else ev.target.blur();
});

// ───────── Запуск ─────────
async function start() {
  const saved = await loadState();
  if (saved && Array.isArray(saved.workouts)) {
    state = { ...L.emptyState(), ...saved, settings: { ...L.emptyState().settings, ...(saved.settings || {}) } };
  }
  render(true);
  persist();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
}
start();
export { state, flush };
