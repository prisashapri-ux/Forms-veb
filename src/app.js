// «Форма» в браузере: интерфейс. Данные живут в IndexedDB этого устройства.
import * as L from './logic.js';
import { CATALOG } from './catalog.js';
import { lineChart, barChart, dualChart, normScale, sparkline, rings } from './charts.js';
import { loadState, saveState, flush, clearState, persist, saveSnapshot, loadSnapshot, dropSnapshot } from './store.js';
import { parsePdf, InBodyError } from './parser.js';
import { demoState } from './demo.js';
import { figureSVG } from './figures.js';
import { HOME, HOME_CATALOG, homeById, homeSteps, homeMinutes, homeWorkout } from './home.js';
import { PULLUP_CATALOG } from './extras.js';
import * as AI from './ai.js';

Object.assign(CATALOG, HOME_CATALOG, PULLUP_CATALOG);

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
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4" width="4.5" height="16" rx="1.4" fill="currentColor"/><rect x="14" y="4" width="4.5" height="16" rx="1.4" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5v13a1 1 0 0 0 1.5.86L15 13.7V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.3L5.5 4.64A1 1 0 0 0 4 5.5z" fill="currentColor"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5.5v13a1 1 0 0 1-1.5.86L9 13.7V18a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v4.3l9.5-5.66A1 1 0 0 1 20 5.5z" fill="currentColor"/></svg>',
  sound: I('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  mute: I('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  bell: I('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  flame: I('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 0 2 1 3 2 3 0-3-1-5.5.5-8z"/>'),
  repeat: I('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  scale: I('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/>'),
  bolt: I('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
  drop: I('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  trend: I('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
  moon: I('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  scaleBal: I('<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7zM18 7l-3 7a3 3 0 0 0 6 0l-3-7z"/>'),
  person: I('<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>'),
  key: I('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
  calendar: I('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  spark: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>'),
  compose: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  camera: I('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.5-2h6.4l1.5 2h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="12.5" r="3.5"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  up: I('<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
};

// Цвет группы мышц для картинок упражнений.
const GROUP_COLOR = { chest: 'var(--red)', back: 'var(--blue)', legs: 'var(--orange)', glutes: 'var(--pink)', shoulders: 'var(--purple)', biceps: 'var(--teal)', triceps: 'var(--indigo)', core: 'var(--green)', cardio: 'var(--pink)', other: 'var(--muted)' };
const TIP_ICON = { progress: 'trend', recovery: 'moon', balance: 'scaleBal', body: 'person', habit: 'calendar' };

// ───────── Состояние ─────────
let state = L.emptyState();
const ui = { gymQ: '', gymG: '', calMonth: null, bodyMetric: 'weight', segMode: 'muscle', period: 28, timer: null, pdfjs: null };

function save() { saveState(state); }
let snapAt = null; // когда сделана копия перед последним восстановлением из файла
addEventListener('forma-save-failed', () => toast('Не получилось сохранить: память браузера заполнена. Сохрани копию в Настройках.'));
const groupOf = (name) => L.groupOfIn(state, name);
const volumeOf = (w) => L.workoutVolume(w, groupOf);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, root = document) => root.querySelector(sel);
const parseNum = (s) => { const v = Number(String(s).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(v) ? v : null; };
// Запланированные тренировки (сохранены на день, но ещё не начаты) не идут в статистику и прогрессию.
const doneWs = () => state.workouts.filter((w) => !w.planned);
const workoutsSorted = () => [...state.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));
const fullMeasurements = () => state.measurements.filter((m) => !m.isPartial && !m.source);
const latestFull = () => fullMeasurements().at(-1) || null;

/** Квадратная картинка упражнения в цвете группы мышц. */
function thumb(name, { animate = false, size = '' } = {}) {
  const g = groupOf(name);
  // Упражнение на тренажёре из зала: вместо схемы-человечка настоящее фото тренажёра.
  const pic = machineFor(name)?.photo;
  if (pic) return `<span class="thumb photo ${size}"><img src="${pic}" alt="" loading="lazy"></span>`;
  return `<span class="thumb ${size}" style="--g:${GROUP_COLOR[g] || 'var(--accent)'}">${figureSVG(name, g, { animate, frame: animate ? null : 1 })}</span>`;
}
/** Диапазон повторов: из программы или из своей тренировки конструктора. */
function rangeFor(w, name) {
  const r = L.programRange(w, name);
  if (r || typeof w.programID !== 'string' || !w.programID.startsWith('tpl:')) return r;
  const t = (state.templates || []).find((x) => x.id === w.programID.slice(4));
  return t?.items.find((i) => i.exercise === name)?.reps || null;
}
const CUSTOM_COLORS = [['#8e8e93', '#636366'], ['#ff6482', '#ff2d55'], ['#ffb340', '#ff9500'], ['#5ac8fa', '#007aff'], ['#d17cff', '#af52de'], ['#4cd964', '#28a745']];
/** Комплекс для дома: готовый или свой. */
function planById(id) {
  const h = homeById(id);
  if (h) return h;
  const i = (state.templates || []).findIndex((t) => t.kind === 'home' && t.id === id);
  if (i < 0) return null;
  const t = state.templates[i];
  const [c1, c2] = CUSTOM_COLORS[(i % (CUSTOM_COLORS.length - 1)) + 1];
  return { ...t, custom: true, level: '', equipment: 'Своя тренировка', summary: '', c1, c2 };
}
const isHomeWorkout = (w) => typeof w.programID === 'string' && w.programID.startsWith('home:');

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

const TABS = [['body', 'Тело', icon.body, 'var(--purple)'], ['diary', 'Дневник', icon.diary, 'var(--orange)'], ['gym', 'Тренажёры', icon.dumbbell, 'var(--teal)'], ['home', 'Дома', icon.home, 'var(--pink)'], ['ai', 'ИИ', icon.spark, 'var(--indigo)'], ['analytics', 'Анализ', icon.chart, 'var(--blue)'], ['food', 'Питание', icon.food, 'var(--green)']];
const TAB_OF = { body: 'body', diary: 'diary', w: 'diary', programs: 'diary', catalog: 'diary', home: 'home', plan: 'home', build: 'diary', gym: 'gym', calendar: 'diary', advisor: 'analytics', ai: 'ai', analytics: 'analytics', ex: 'analytics', food: 'food', settings: 'body' };
const TAB_TITLE = { body: 'Тело', diary: 'Дневник', gym: 'Тренажёры', home: 'Дома', ai: 'ИИ', analytics: 'Аналитика', food: 'Питание' };

function render(scrollTop = false) {
  const r = route();
  const views = { body: viewBody, diary: viewDiary, w: viewWorkout, programs: viewPrograms, catalog: viewCatalog, home: viewHome, plan: viewPlan, build: viewBuild, gym: viewGym, calendar: viewCalendar, advisor: viewAdvisor, ai: viewAI, analytics: viewAnalytics, ex: viewExercise, food: viewFood, settings: viewSettings };
  const v = (views[r.name] || viewBody)(r.arg);
  if (r.name === 'settings' && r.arg === 'ai') setTimeout(() => { $('#ai-settings')?.scrollIntoView({ block: 'start' }); $('#ai-key')?.focus(); }, 0);
  const y = scrollY;
  const tab = TAB_OF[r.name] || 'body';
  if (r.name !== 'build') ui.draft = null;
  document.body.dataset.tab = tab;
  document.body.classList.toggle('chat-mode', r.name === 'ai');
  $('#app').innerHTML = `<header class="top ${v.top.includes('data-nav') ? 'nav' : ''}">${v.top}</header><main class="view ${v.cls || ''}" id="view">${v.html}</main>${v.foot || ''}`;
  $('#tabs').innerHTML = TABS.map(([id, t, ic, c]) => `<a href="#${id}" style="--tabc:${c}" class="${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''}>${ic}<span>${t}</span></a>`).join('');
  document.title = v.title ? `${v.title} · Форма` : 'Форма';
  if (scrollTop) scrollTo(0, 0); else scrollTo(0, y);
  v.after?.();
}

const todayEyebrow = () => new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const topTitle = (t, right = '', eyebrow = todayEyebrow()) => `<div class="tt">${eyebrow ? `<span class="date-eyebrow">${esc(eyebrow)}</span>` : ''}<h1>${esc(t)}</h1></div>${right}`;
const topBack = (href, t, right = '') => {
  const back = TAB_TITLE[href.slice(1)] || 'Назад';
  return `<a class="back-btn" href="${href}" data-nav aria-label="Назад: ${esc(back)}">${icon.back}<span>${esc(back)}</span></a><h1 class="small">${esc(t)}</h1><span class="nav-right">${right}</span>`;
};
const banner = (html, btn, ic = icon.info, color = 'var(--orange)') => `<div class="banner"><span class="ic" style="background:${color}">${ic}</span><span class="grow">${html}</span>${btn}</div>`;

function demoBanner() {
  if (!state.demo) return '';
  return banner('Сейчас показаны <b>примерные данные</b>, не твои. Удали их, когда загрузишь свой отчёт.', '<button class="btn small secondary" data-act="clear-demo">Удалить</button>');
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
  const CARD_LOOK = { weight: [icon.scale, 'var(--purple)'], muscleMass: [icon.bolt, 'var(--orange)'], fatPercent: [icon.drop, 'var(--teal)'], fatMass: [icon.drop, 'var(--indigo)'] };
  const cards = ['weight', 'muscleMass', 'fatPercent', 'fatMass'].map((m) => {
    const src = [...ms].reverse().find((x) => x.values[m] != null);
    if (!src) return '';
    const v = src.values[m];
    const tr = trendLine(seriesFor(m));
    const [ic, col] = CARD_LOOK[m];
    return `<button class="metric ${ui.bodyMetric === m ? 'on' : ''}" style="--accent:${col}" data-act="body-metric" data-m="${m}">
      <span class="label">${ic}${METRIC_INFO[m].title}</span>
      <span class="value">${num(v, METRIC_INFO[m].digits)}<small>${METRIC_INFO[m].unit === '%' ? '%' : METRIC_INFO[m].unit}</small></span>
      ${sparkline(seriesFor(m).slice(-10), col)}
      ${delta(m, v, prevOf(m, src.day)) || '<span class="delta flat">первый замер</span>'}
      ${tr != null ? `<span class="delta flat">тренд ${signed(tr, 1)} ${METRIC_INFO[m].unit}/мес</span>` : ''}
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
    <div class="legend">${range ? `<span style="--c:var(--accent-soft)">норма ${num(range.min)}–${num(range.max)}</span>` : ''}${pts.some((p) => p.partial) ? '<span style="--c:var(--fill2)">пустые точки: из таблицы истории</span>' : ''}${tl ? '<span style="--c:var(--muted)">пунктир: тренд</span>' : ''}</div>
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
      return `<div class="seg-cell ${s}">${s === 'trunk' ? `<svg class="silhouette" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="10" r="6" fill="currentColor"/><path d="M20 22h24l-3 20h-4l-2 18h-6l-2-18h-4z" fill="currentColor" opacity="0.85"/><path d="M20 22l-7 18M44 22l7 18" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.5"/></svg>` : ''}<span class="t">${L.SEGMENT_TITLES[s]}</span><span class="v">${v ? `${num(v.kg, 2)} кг` : '—'}</span>
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
      <span class="value">${metricValue(m.values.weight, 'weight')}</span>${icon.chev}</button>`).join('');

  const backupNudge = !state.demo && (state.workouts.length + state.measurements.length) > 3 && (!state.settings.lastBackup || L.daysBetween(state.settings.lastBackup, new Date()) > 14)
    ? banner('Данные хранятся только в этом браузере. Сделай резервную копию, чтобы их не потерять.', '<button class="btn small secondary" data-act="export">Сохранить</button>', icon.upload, 'var(--blue)') : '';

  // Сводка: оценка InBody кольцом и мышцы/жир относительно нормы.
  const score = full?.values.score;
  const normFrac = (k) => { const r = full?.ranges?.[k], v = full?.values[k]; return r && v != null ? Math.min(1, v / r.max) : 0; };
  const summary = `<section class="card rings-card">
      ${rings([{ frac: score != null ? score / 100 : 0, color: 'var(--purple)' }, { frac: normFrac('muscleMass'), color: 'var(--orange)' }, { frac: normFrac('fatMass'), color: 'var(--teal)' }], { label: 'Сводка последнего замера' })}
      <div class="ring-legend">
        <div><div class="l" style="color:var(--purple)">Оценка InBody</div><div class="v">${score != null ? num(score, 0) : '—'}<small> / 100</small></div></div>
        <div><div class="l" style="color:var(--orange)">Мышцы</div><div class="v">${metricValue(ref.values.muscleMass, 'muscleMass')}</div></div>
        <div><div class="l" style="color:var(--teal)">Жир</div><div class="v">${ref.values.fatPercent != null ? `${num(ref.values.fatPercent, 1)}<small> %</small>` : '—'}</div></div>
      </div></section>
      <p class="footnote">Последний замер ${fmtDay(ref.day)}${ref.conditions ? `, ${conditionsText(ref.conditions)}` : ''}. Внешнее кольцо: оценка, два других: мышцы и жир от верхней границы нормы.</p>`;

  return {
    title: 'Тело', top: topTitle('Тело', `${importBtn}${gear}`),
    html: `${demoBanner()}${backupNudge}${summary}
      <div class="section-title">Показатели</div>
      <div class="grid2">${cards}</div>${chart}${norms}${segs}${goals}
      <div class="section-title">Замеры</div>
      <section class="card list">${list}</section>
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
  const vol = volumeOf(w), sets = L.workoutSetCount(w);
  return [`${w.exercises.length} ${plural(w.exercises.length, 'упражнение', 'упражнения', 'упражнений')}`, `${sets} ${plural(sets, 'подход', 'подхода', 'подходов')}`, vol ? tonnage(vol) : null, w.durationMinutes ? `${w.durationMinutes} мин` : null].filter(Boolean);
}

function weekRings() {
  const program = L.programById(state.settings.activeProgram);
  const perWeek = program?.perWeek || 3;
  const ws0 = L.weekStart(new Date());
  const week = doneWs().filter((w) => toDate(w.date) >= ws0 && w.exercises.length);
  const count = week.length;
  const mins = week.reduce((a, w) => a + (w.durationMinutes || 0), 0);
  const sets = week.reduce((a, w) => a + L.workoutSetCount(w), 0);
  const tMin = perWeek * 45, tSets = perWeek * 18;
  return `<section class="card rings-card">
    ${rings([{ frac: count / perWeek, color: 'var(--pink)' }, { frac: mins / tMin, color: 'var(--green)' }, { frac: sets / tSets, color: 'var(--teal)' }], { label: 'Неделя' })}
    <div class="ring-legend">
      <div><div class="l" style="color:var(--pink)">Тренировки</div><div class="v">${count}<small> / ${perWeek}</small></div></div>
      <div><div class="l" style="color:var(--green)">Минуты</div><div class="v">${mins}<small> / ${tMin}</small></div></div>
      <div><div class="l" style="color:var(--teal)">Подходы</div><div class="v">${sets}<small> / ${tSets}</small></div></div>
    </div></section>`;
}

/** Примерное время: по подходам, отдыху из настроек и личному темпу из истории. */
function estItems(items) {
  return L.estimateMinutes(items.map((x) => (groupOf(x.exercise) === 'cardio' ? { cardio: true, minutes: x.minutes } : { sets: x.sets })), state.settings.restSeconds || 120, L.personalPace(doneWs()));
}
function estWorkout(w) {
  return estItems(w.exercises.map((e) => {
    const work = e.sets.filter((s) => !s.isWarmup);
    return { exercise: e.name, sets: work.length || e.sets.length, minutes: groupOf(e.name) === 'cardio' ? e.sets.reduce((a, s) => a + (s.weight || 0), 0) : 0 };
  }));
}
const estText = (m) => (m ? `≈ ${m} мин` : '');

function workoutRow(w) {
  const first = w.exercises[0]?.name;
  const home = isHomeWorkout(w);
  return `<a class="item" href="#w-${w.id}">${first ? thumb(first) : `<span class="thumb">${icon.dumbbell}</span>`}
    <span class="grow"><span class="title"><b>${esc(w.title)}</b></span>
      <div class="sub">${w.exercises.map((e) => esc(e.name)).slice(0, 3).join(', ') || 'Без упражнений'}${w.exercises.length > 3 ? ` и ещё ${w.exercises.length - 3}` : ''}</div>
      <div class="stat-line">${home ? `<span>${w.durationMinutes || 0} мин</span><span>${w.exercises.length} ${plural(w.exercises.length, 'упражнение', 'упражнения', 'упражнений')}</span>` : workoutStats(w).map((x) => `<span>${x}</span>`).join('')}${!home && !w.finishedAt && !w.durationMinutes && w.exercises.length ? `<span>${estText(estWorkout(w))}</span>` : ''}${w.planned ? '<span class="badge plan">запланирована</span>' : !w.finishedAt ? '<span class="badge normal">идёт</span>' : ''}</div></span>
    <span class="value small">${fmtDay(w.date, false)}</span>${icon.chev}</a>`;
}

function viewDiary() {
  const ws = workoutsSorted();
  const program = L.programById(state.settings.activeProgram);
  const right = `<button class="icon-btn" data-act="go" data-to="catalog" aria-label="Справочник упражнений">${icon.book}</button><button class="icon-btn" data-act="go" data-to="settings" aria-label="Настройки">${icon.gear}</button>`;
  let next = '';
  if (program) {
    const d = L.nextDay(program, state.workouts);
    const day = program.days[d];
    const first = day.items[0]?.exercise;
    next = `<section class="card next-up">
      <div><div class="small muted">${esc(program.title)} · день ${d + 1} из ${program.days.length} · ${estText(estItems(day.items))}</div>
      <h2 style="margin:4px 0 6px;font:700 24px/29px var(--font-display)">${esc(day.title)}</h2>
      <div class="small muted">${day.items.map((i) => esc(i.exercise)).join(' · ')}</div></div>
      ${first ? figureSVG(first, groupOf(first)) : ''}
      <button class="btn block" data-act="start-program" data-day="${d}">${icon.play} Начать тренировку</button></section>`;
  } else {
    next = `<section class="card next-up"><div><div class="small muted">Программа</div><h2 style="margin:4px 0 6px;font:700 24px/29px var(--font-display)">Тренируйся по плану</h2>
      <div class="small muted">«Форма» будет предлагать следующий день и сама прибавлять веса.</div></div>${figureSVG('Жим штанги лёжа', 'chest')}
      <button class="btn block" data-act="go" data-to="programs">Выбрать программу</button></section>`;
  }
  const mine = (state.templates || []).filter((t) => t.kind === 'gym');
  const mineHtml = `<div class="section-title">Мои тренировки</div><section class="card list thumbs">
    ${mine.map((t) => `<div class="item"><button class="item-main" data-act="tpl-start" data-id="${t.id}">${t.items[0] ? thumb(t.items[0].exercise) : `<span class="thumb">${icon.dumbbell}</span>`}<span class="grow"><span class="title"><b>${esc(t.title)}</b></span><div class="sub">${t.items.map((x) => esc(x.exercise)).join(', ')}</div>${t.items.length ? `<div class="stat-line"><span>${estText(estItems(t.items))}</span><span>${(() => { const n = t.items.reduce((a, x) => a + (x.sets || 0), 0); return `${n} ${plural(n, 'подход', 'подхода', 'подходов')}`; })()}</span></div>` : ''}</span></button>
      <a class="text-btn" href="#build-gym-${t.id}">Изменить</a></div>`).join('')}
    <a class="item" href="#build-gym"><span class="thumb" style="--g:var(--orange)">${icon.plus}</span><span class="grow"><span class="title">Собрать свою тренировку</span><div class="sub">Свои упражнения, подходы и повторы</div></span>${icon.chev}</a></section>`;
  const actions = `<section class="card list">
    <button class="item" data-act="new-workout"><span class="thumb" style="--g:var(--orange)">${icon.plus}</span><span class="grow title">Пустая тренировка</span>${icon.chev}</button>
    ${ws[0] ? `<button class="item" data-act="repeat-last"><span class="thumb" style="--g:var(--blue)">${icon.repeat}</span><span class="grow"><span class="title">Повторить последнюю</span><div class="sub">${esc(ws[0].title)}</div></span>${icon.chev}</button>` : ''}
    <a class="item" href="#home"><span class="thumb" style="--g:var(--pink)">${icon.home}</span><span class="grow title">Тренировка дома</span>${icon.chev}</a>
    <a class="item" href="#programs"><span class="thumb" style="--g:var(--purple)">${icon.list}</span><span class="grow"><span class="title">Программы</span>${program ? `<div class="sub">${esc(program.title)}</div>` : ''}</span>${icon.chev}</a>
  </section>`;
  let list = '';
  if (!ws.length) {
    list = `<section class="card empty"><div class="art">${icon.dumbbell}</div><h2>Тренировок пока нет</h2><p>Начни пустую тренировку, выбери программу или позанимайся дома. Подходы из прошлого раза подставятся сами.</p></section>`;
  } else {
    let month = '';
    let group = [];
    const flushGroup = () => { if (group.length) list += `<div class="section-title">${month[0].toUpperCase() + month.slice(1)}</div><section class="card list thumbs">${group.join('')}</section>`; group = []; };
    for (const w of ws.slice(0, 60)) {
      const m = toDate(w.date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', '');
      if (m !== month) { flushGroup(); month = m; }
      group.push(workoutRow(w));
    }
    flushGroup();
  }
  return { title: 'Дневник', top: topTitle('Дневник', right), html: `${demoBanner()}<div class="section-title" style="margin-top:0">Эта неделя</div>${weekRings()}${calendarCard()}${advisorCard()}${next}${actions}${mineHtml}${list}` };
}

/** day: ключ дня «ГГГГ-ММ-ДД» из календаря; время берётся текущее, дата из календаря. */
function newWorkout(fromProgram = null, dayIndex = 0, day = null) {
  if (state.demo) clearDemo(false);
  const w = fromProgram ? L.workoutFromProgram(fromProgram, dayIndex, state.workouts, groupOf)
    : { id: L.uid(), date: new Date().toISOString(), title: 'Тренировка', note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null, exercises: [] };
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day !== dayKeyOf(new Date())) {
    const [y, m, d] = day.split('-').map(Number);
    const at = new Date(); at.setFullYear(y, m - 1, d);
    w.date = at.toISOString();
  }
  state.workouts.push(w);
  save();
  go(`w-${w.id}`);
}

/** Подход строкой: у кардио минуты, километры и уровень, у остальных вес×повторы. */
function setText(s, name, w) {
  if (isHomeWorkout(w)) return `${s.reps} с`;
  if (groupOf(name) !== 'cardio') return `${num(s.weight, 2)}×${s.reps}`;
  return [s.weight ? `${num(s.weight, 2)} мин` : '', s.reps ? `${s.reps} км` : '', s.level ? `ур. ${num(s.level, 1)}` : ''].filter(Boolean).join(' · ') || '—';
}

// ───────── Календарь тренировок ─────────
const dayKeyOf = (d) => { const x = toDate(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const calBase = () => { const d = ui.calMonth ? new Date(ui.calMonth) : new Date(); d.setDate(1); d.setHours(12, 0, 0, 0); return d; };
function workoutsByDay() {
  const map = new Map();
  for (const w of state.workouts) { const k = dayKeyOf(w.date); if (!map.has(k)) map.set(k, []); map.get(k).push(w); }
  return map;
}
function monthGrid(base, byDay, small = false) {
  const y = base.getFullYear(), m = base.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = dayKeyOf(new Date());
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ws = byDay.get(k) || [];
    const home = ws.length && ws.every((w) => isHomeWorkout(w));
    const plan = ws.length && ws.every((w) => w.planned);
    cells += `<button class="cal-d ${plan ? 'plan' : ws.length ? (home ? 'has home' : 'has') : ''} ${k === today ? 'today' : ''}" data-act="cal-day" data-day="${k}" aria-label="${d}${ws.length ? `, тренировок: ${ws.length}` : ''}">${d}</button>`;
  }
  return `<div class="cal ${small ? 'small' : ''}"><div class="cal-w">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((t) => `<span>${t}</span>`).join('')}</div><div class="cal-g">${cells}</div></div>`;
}
const monthTitle = (d) => { const t = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', ''); return t[0].toUpperCase() + t.slice(1); };
function calendarCard() {
  const base = calBase();
  const byDay = workoutsByDay();
  const prefix = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
  const n = [...byDay.keys()].filter((k) => k.startsWith(prefix)).length;
  return `<div class="section-title">Календарь</div><section class="card cal-card">
    <div class="cal-head"><button class="icon-btn" data-act="cal-month" data-d="-1" aria-label="Прошлый месяц">${icon.back}</button>
    <a href="#calendar" class="grow"><b>${monthTitle(base)}</b><div class="small muted">${n ? `${n} ${plural(n, 'день', 'дня', 'дней')} с тренировкой` : 'Тренировок не было'}</div></a>
    <button class="icon-btn fwd" data-act="cal-month" data-d="1" aria-label="Следующий месяц">${icon.back}</button></div>
    ${monthGrid(base, byDay, true)}</section>`;
}
function viewCalendar() {
  const byDay = workoutsByDay();
  const base = calBase();
  const months = [];
  for (let i = 0; i < 6; i++) { const d = new Date(base); d.setMonth(d.getMonth() - i); months.push(d); }
  const total = (d) => { const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return [...byDay.entries()].filter(([k, ws]) => k.startsWith(p) && ws.some((w) => !w.planned)).length; };
  return { title: 'Календарь', top: topBack('#diary', 'Календарь'), html: months.map((d) => `<div class="section-title">${monthTitle(d)}${total(d) ? ` · ${total(d)} ${plural(total(d), 'день', 'дня', 'дней')}` : ''}</div><section class="card cal-card">${monthGrid(d, byDay)}</section>`).join('') + '<p class="small muted" style="text-align:center">Оранжевым отмечены дни в зале, розовым дома, оранжевым кольцом запланированные. Нажми на любой день, чтобы открыть тренировку или сохранить новую.</p>' };
}
function calDay(k) {
  const ws = workoutsByDay().get(k) || [];
  const date = new Date(`${k}T12:00:00`);
  const title = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const today = dayKeyOf(new Date());
  const program = L.programById(state.settings.activeProgram);
  const last = doneWs().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const opt = (kind, id, name, sub, ic, color) => `<button class="item" data-act="plan-day" data-day="${k}" data-kind="${kind}" data-id="${esc(String(id ?? ''))}"><span class="thumb" style="--g:${color}">${ic}</span><span class="grow"><span class="title">${esc(name)}</span>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span><span class="add-ic">${icon.plus}</span></button>`;
  const opts = [
    ...(state.templates || []).filter((t) => t.kind === 'gym' && t.items.length).map((t) => opt('tpl', t.id, t.title, `${estText(estItems(t.items))} · ${t.items.map((x) => x.exercise).slice(0, 3).join(', ')}`, icon.dumbbell, 'var(--orange)')),
    ...(program ? (() => { const d = L.nextDay(program, doneWs()); return [opt('program', d, program.days[d].title, `${program.title} · день ${d + 1} · ${estText(estItems(program.days[d].items))}`, icon.list, 'var(--purple)')]; })() : []),
    ...(last ? [opt('repeat', last.id, `Как «${last.title}»`, `${fmtDay(last.date, false)} · ${last.exercises.length} ${plural(last.exercises.length, 'упражнение', 'упражнения', 'упражнений')} · ${last.durationMinutes ? `${last.durationMinutes} мин` : estText(estWorkout(last))}`, icon.repeat, 'var(--blue)')] : []),
    opt('empty', '', 'Пустая тренировка', 'Упражнения добавишь потом', icon.plus, 'var(--gray, #8e8e93)'),
  ].join('');
  openSheet({
    title: title[0].toUpperCase() + title.slice(1), left: 'Закрыть',
    body: `${ws.length ? `<section class="card list thumbs">${ws.map(workoutRow).join('')}</section>` : `<p class="muted" style="margin:0">${k > today ? 'На этот день пока ничего нет.' : k === today ? 'Сегодня тренировки ещё не было.' : 'В этот день тренировки не было.'}</p>`}
      ${k === today ? `<button class="btn block" data-act="new-workout">${icon.play} Начать тренировку сейчас</button>` : ''}
      <div class="section-caption" style="margin:4px 0 -4px">Сохранить на этот день</div>
      <section class="card list">${opts}</section>
      <p class="small muted" style="margin:0">Тренировка сохранится в календаре и не начнётся. Открой её в нужный день и отмечай подходы.</p>`,
  });
}

/** Сохраняет тренировку на выбранный день, не открывая её. */
function planDay(k, kind, id) {
  let w;
  if (kind === 'tpl') {
    const t = (state.templates || []).find((x) => x.id === id);
    if (!t) return;
    w = L.workoutFromProgram({ id: `tpl:${t.id}`, title: t.title, days: [{ title: t.title, items: t.items }] }, 0, doneWs(), groupOf);
    w.programDay = null;
  } else if (kind === 'program') {
    const program = L.programById(state.settings.activeProgram);
    if (!program) return;
    w = L.workoutFromProgram(program, +id || 0, doneWs(), groupOf);
  } else {
    const src = kind === 'repeat' ? state.workouts.find((x) => x.id === id) : null;
    w = { id: L.uid(), date: '', title: src?.title || 'Тренировка', note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null,
      exercises: src ? src.exercises.map((e) => ({ name: e.name, sets: e.sets.filter((x) => !x.isWarmup).map((x) => ({ ...x, isDone: false })) })) : [] };
  }
  w.id = L.uid();
  if (state.demo) clearDemo(false);
  const [y, m, d] = k.split('-').map(Number);
  const at = new Date(); at.setFullYear(y, m - 1, d);
  if (k !== dayKeyOf(new Date())) at.setHours(18, 0, 0, 0);
  w.date = at.toISOString();
  w.finishedAt = null;
  w.planned = true;
  for (const e of w.exercises) for (const x of e.sets) x.isDone = false;
  state.workouts.push(w);
  save(); closeSheet(); render();
  toast(`Сохранено на ${at.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`);
  setTimeout(() => calDay(k), 250);
}

// ───────── Мой зал: свои тренажёры с фото и настройками ─────────
const machines = () => (state.machines ||= []);
const machineFor = (exercise) => {
  const q = String(exercise).toLowerCase();
  return machines().find((x) => x.exercise.toLowerCase() === q) || machines().find((x) => x.exercises?.some((e) => e.name.toLowerCase() === q)) || null;
};
let gymBusy = false;

/** Последняя открытая тренировка за 12 часов или новая; упражнение добавляется, если его там нет. */
function addToWorkout(name, sets) {
  let w = [...state.workouts].reverse().find((q) => !q.finishedAt && !q.planned && Date.now() - new Date(q.date) < 12 * 3600000 && Date.now() - new Date(q.date) > -3600000);
  if (!w) { w = { id: L.uid(), date: new Date().toISOString(), title: 'Тренировка', note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null, exercises: [] }; state.workouts.push(w); }
  if (!w.exercises.some((e) => e.name === name)) w.exercises.push({ name, sets });
  return w;
}

function lastResult(name) {
  const prev = L.previousEntry(doneWs(), name, new Date(Date.now() + 864e5).toISOString(), null);
  if (!prev) return '';
  const sets = L.workingSets(prev.e);
  return sets.length ? `${fmtDay(prev.w.date, false)}: ${sets.map((q) => setText(q, name, prev.w)).join(', ')}` : '';
}

let gymTried = false;
function viewGym() {
  const all = machines();
  if (!all.length && !gymSyncing && !gymTried) { gymTried = true; setTimeout(() => syncGymBase(true), 0); }
  const hasKey = !!AI.getKey();
  const q = ui.gymQ.trim().toLowerCase();
  const groups = [...new Set(all.map((m) => m.group))].filter((g) => L.GROUPS[g]).sort((a, b) => Object.keys(L.GROUPS).indexOf(a) - Object.keys(L.GROUPS).indexOf(b));
  const list = all.filter((m) => !ui.gymG || m.group === ui.gymG || m.exercises?.some((x) => x.group === ui.gymG)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const hay = (m) => [m.name, m.brand, m.exercise, ...(m.exercises || []).map((x) => `${x.name} ${x.muscle || ''}`)].join(' ').toLowerCase();
  const tools = `<div class="gym-tools">
    <button class="btn" data-act="${hasKey ? 'gym-find' : 'go'}" data-to="ai" ${gymBusy ? 'disabled' : ''}>${icon.camera} ${gymBusy ? 'Смотрю…' : 'Узнать по фото'}</button>
    <button class="btn secondary" data-act="gym-manual">${icon.plus} Добавить</button></div>`;
  const filter = all.length ? `<input class="search" id="gym-q" type="search" placeholder="Поиск: тренажёр, упражнение, мышца" value="${esc(ui.gymQ)}" autocomplete="off">
    <div class="chips" style="margin-top:10px"><button class="chip ${ui.gymG ? '' : 'on'}" data-act="gym-group" data-g="">Все · ${all.length}</button>${groups.map((g) => `<button class="chip ${ui.gymG === g ? 'on' : ''}" data-act="gym-group" data-g="${g}">${L.GROUPS[g]}</button>`).join('')}</div>` : '';
  const cards = list.length ? `<div class="gym-grid" id="gym-grid">${list.map((m) => `<button class="gym-card" data-act="gym-open" data-id="${m.id}" data-hay="${esc(hay(m))}" ${q && !hay(m).includes(q) ? 'hidden' : ''}>
      <span class="pic" style="--g:${GROUP_COLOR[m.group] || 'var(--accent)'}">${m.photo ? `<img src="${m.photo}" alt="" loading="lazy">` : thumb(m.exercise)}</span>
      <b>${esc(m.name)}</b><span class="small muted">${m.exercises?.length > 1 ? `${m.exercises.length} ${plural(m.exercises.length, 'упражнение', 'упражнения', 'упражнений')}` : esc(m.exercise !== m.name ? m.exercise : L.GROUPS[m.group])}${m.brand ? ` · ${esc(m.brand)}` : ''}</span>
      ${L.machineSettingsText(m) ? `<span class="small set">${esc(L.machineSettingsText(m))}</span>` : ''}</button>`).join('')}</div><p class="small muted" id="gym-none" ${q && !list.some((m) => hay(m).includes(q)) ? '' : 'hidden'} style="text-align:center">Ничего не нашлось</p>`
    : all.length ? '<p class="small muted" style="text-align:center">В этой группе тренажёров нет</p>'
    : `<section class="card empty"><h2>${gymSyncing ? 'Загружаю тренажёры…' : 'Тренажёры не загрузились'}</h2><p>${gymSyncing ? 'Это пара секунд.' : 'Нужен интернет. Проверь связь и попробуй ещё раз.'}</p>${gymSyncing ? '' : '<button class="btn" data-act="gym-sync">Загрузить ещё раз</button>'}</section>`;
  const files = all.length ? `<div class="section-title">Ещё</div><section class="card list">
    <button class="item" data-act="gym-export"><span class="thumb" style="--g:var(--blue)">${icon.copy}</span><span class="grow"><span class="title">Поделиться своими тренажёрами</span><div class="sub">С настройками сиденья</div></span>${icon.chev}</button>
    <button class="item" data-act="gym-import"><span class="thumb" style="--g:var(--teal)">${icon.up}</span><span class="grow"><span class="title">Загрузить из файла</span><div class="sub">Если друг поделился своими</div></span>${icon.chev}</button></section>` : '';
  return { title: 'Тренажёры', top: topTitle('Тренажёры', '', all.length ? `${all.length} ${plural(all.length, 'тренажёр', 'тренажёра', 'тренажёров')} в зале` : ''), html: `${tools}${filter}${cards}${files}` };
}

async function gymFind() {
  pickFile('image/*', async (f) => {
    gymBusy = true; if (route().name === 'gym') render();
    try {
      const { image, thumb: small } = await aiPhotoFrom(f);
      const photo = await shrinkPhoto(image, 360);
      const refs = machines().filter((x) => x.photo).slice(0, 20);
      const r = await AI.identifyMachine(image, refs, state.exercises.map((e) => e.name));
      void small;
      if (r.match != null) { machineSheet(refs[r.match], { found: true }); return; }
      const ex = state.exercises.find((e) => e.name.toLowerCase() === r.exercise.toLowerCase());
      machineSheet({ name: r.name, exercise: ex ? ex.name : r.exercise, group: ex ? ex.group : r.group, settings: '', photo }, { isNew: true, tip: r.tip });
    } catch (e) {
      toast(e.message || 'Не получилось узнать тренажёр');
    } finally {
      gymBusy = false; if (route().name === 'gym') render();
    }
  });
}

/** Уменьшает data URL до max px по длинной стороне (для хранения в «Моём зале»). */
async function shrinkPhoto(url, max) {
  const img = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = url; });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

function machineSheet(m, { isNew = false, found = false, tip = '' } = {}) {
  const last = !isNew ? lastResult(m.exercise) : '';
  const groups = Object.entries(L.GROUPS).map(([k, t]) => `<option value="${k}" ${m.group === k ? 'selected' : ''}>${t}</option>`).join('');
  openSheet({
    title: isNew ? 'Новый тренажёр' : m.name, left: 'Закрыть', right: 'Сохранить',
    body: `${found ? `<div class="gym-found">${icon.check} Это твой тренажёр</div>` : ''}
      ${MACHINE_VIDEO[m.id] ? videoTag(MACHINE_VIDEO[m.id], m.name) : m.photo ? `<img class="gym-photo" src="${m.photo}" alt="Фото тренажёра">` : ''}
      ${m.about || m.brand || m.ddx ? `<p class="small" style="margin:0">${m.brand ? `<b>${esc(m.brand)}</b>${m.ddx ? ` · №${esc(m.ddx)} в DDX` : ''}<br>` : m.ddx ? `<b>№${esc(m.ddx)} в DDX</b><br>` : ''}${esc(m.about || '')}</p>` : ''}
      <div class="m-tip">${icon.spark}<span><b>Как настроить.</b> ${esc(tip || L.setupHint(m).tip)}</span></div>
      <div class="section-caption" style="margin:4px 0 -4px">Мои уровни</div>
      <div class="m-adjust">${(() => { const f = L.setupHint(m).fields; const a = m.adjust || {}; return L.ADJUST.filter(([k]) => !f.length || f.includes(k) || a[k]).map(([k, t]) => `<label><span>${t}</span><input data-adj="${k}" inputmode="text" maxlength="12" placeholder="—" value="${esc(a[k] || '')}"></label>`).join(''); })()}</div>
      ${m.exercises?.length ? `<div class="section-caption" style="margin:4px 0 -4px">Упражнения</div><div class="card list m-exs">${m.exercises.map((x, i) => `<div class="item">${thumb(x.name)}<span class="grow"><span class="title">${esc(x.name)}</span><div class="sub">${esc(x.muscle || L.GROUPS[x.group])}${(() => { const r = lastResult(x.name); return r ? ` · ${esc(r)}` : ''; })()}</div></span><button class="icon-btn" data-m-ex="${i}" aria-label="Добавить в тренировку: ${esc(x.name)}">${icon.plus}</button></div>`).join('')}</div>` : ''}
      ${last ? `<p class="small muted" style="margin:0">Прошлый раз ${esc(last)}</p>` : ''}
      <div class="field"><label for="m-name">Название</label><input id="m-name" value="${esc(m.name)}" maxlength="60" placeholder="Например, жим ногами 45°"></div>
      <div class="field"><label for="m-ex">Упражнение</label><input id="m-ex" list="m-ex-list" value="${esc(m.exercise)}" maxlength="60"><datalist id="m-ex-list">${state.exercises.map((e) => `<option value="${esc(e.name)}">`).join('')}</datalist></div>
      <div class="field"><label for="m-group">Мышцы</label><select id="m-group">${groups}</select></div>
      <div class="field"><label for="m-set">Заметка</label><textarea id="m-set" rows="2" maxlength="300" placeholder="Например, валик на 3-й дырке, ручки узкие">${esc(m.settings || '')}</textarea></div>
      <button class="btn block" data-m-workout>${icon.plus} В тренировку</button>
      ${isNew ? '' : '<button class="btn danger block" data-m-del>Удалить тренажёр</button>'}`,
    onRight: (el) => { if (saveMachine(el, m, isNew)) { closeSheet(); render(); toast(isNew ? 'Тренажёр сохранён' : 'Сохранено'); } },
    onOpen: (el) => {
      el.querySelector('#m-ex').addEventListener('change', (e) => { const ex = state.exercises.find((x) => x.name === e.target.value); if (ex) el.querySelector('#m-group').value = ex.group; });
      el.querySelector('[data-m-workout]').addEventListener('click', () => {
        const saved = saveMachine(el, m, isNew);
        if (!saved) return;
        if (state.demo) clearDemo(false);
        const w = addToWorkout(saved.exercise, setsFromPrevious(saved.exercise, new Date().toISOString(), null));
        save(); closeSheet(); go(`w-${w.id}`);
      });
      el.querySelectorAll('[data-m-ex]').forEach((b) => b.addEventListener('click', () => {
        const x = m.exercises[+b.dataset.mEx];
        if (state.demo) clearDemo(false);
        const name = aiEnsureExercise({ name: x.name, group: x.group });
        const w = addToWorkout(name, setsFromPrevious(name, new Date().toISOString(), null));
        save(); closeSheet(); go(`w-${w.id}`);
      }));
      el.querySelector('[data-m-del]')?.addEventListener('click', () => { state.machines = machines().filter((x) => x.id !== m.id); save(); closeSheet(); render(); toast('Тренажёр удалён'); });
    },
  });
}

/** Сохраняет форму тренажёра; упражнение заводится в списке, если его не было. */
function saveMachine(el, m, isNew) {
  const name = el.querySelector('#m-name').value.trim();
  if (!name) { toast('Напиши название'); el.querySelector('#m-name').focus(); return null; }
  const exName = el.querySelector('#m-ex').value.trim() || name;
  const group = el.querySelector('#m-group').value;
  const clean = L.cleanMachine({ ...m, id: isNew ? L.uid() : m.id, name, exercise: exName, group, settings: el.querySelector('#m-set').value, adjust: { ...(m.adjust || {}), ...Object.fromEntries([...el.querySelectorAll('[data-adj]')].map((i) => [i.dataset.adj, i.value])) }, created: m.created || Date.now() });
  const finalEx = aiEnsureExercise({ name: clean.exercise, group: clean.group });
  clean.exercise = finalEx;
  if (isNew) machines().push(clean); else { const i = machines().findIndex((x) => x.id === m.id); if (i >= 0) machines()[i] = clean; else machines().push(clean); }
  Object.assign(m, clean);
  save();
  return clean;
}

let cardioBusy = null;

/** Фото табло кардиотренажёра: ИИ читает минуты, км, уровень и калории и заполняет подход. */
function cardioPhoto(w, ei) {
  const E = w.exercises[ei];
  if (!E) return;
  if (!AI.getKey()) { toast('Подключи DeepSeek во вкладке «ИИ», чтобы читать табло'); return; }
  pickFile('image/*', async (f) => {
    const busy = `${w.id}:${ei}`;
    cardioBusy = busy; render();
    try {
      const { image } = await aiPhotoFrom(f);
      const r = await AI.readCardioDisplay(image, E.name);
      // Пока ИИ читал табло, данные могли перечитаться: берём тренировку и упражнение заново по id и имени.
      const cw = state.workouts.find((x) => x.id === w.id) || w;
      const CE = cw.exercises[ei]?.name === E.name ? cw.exercises[ei] : cw.exercises.find((x) => x.name === E.name) || E;
      // Каждое фото табло = новый подход. Пустой незаполненный подход используем, заполненные не трогаем.
      let S = CE.sets.find((x) => !x.isDone && !x.weight && !x.reps);
      if (!S) { S = { weight: 0, reps: 0, isWarmup: false, isDone: false }; CE.sets.push(S); }
      if (r.minutes != null) S.weight = r.minutes;
      if (r.km != null) S.reps = Math.round(r.km);
      if (r.level != null) S.level = r.level;
      S.isDone = true;
      const line = `${E.name}: ${[r.minutes != null ? `${num(r.minutes, 1)} мин` : '', r.km != null ? `${num(r.km, 2)} км` : '', r.level != null ? `уровень ${num(r.level, 1)}` : '', r.calories != null ? `${r.calories} ккал` : ''].filter(Boolean).join(', ')}`;
      cw.note = (cw.note ? `${cw.note}\n` : '') + line;
      save(); flush();
      toast(`Подход ${CE.sets.indexOf(S) + 1} записан: ${line.slice(E.name.length + 2)}`);
    } catch (e) {
      toast(e.message || 'Не получилось прочитать табло');
    } finally {
      if (cardioBusy === busy) cardioBusy = null;
      if (route().name === 'w') render();
    }
  });
}

function setsFromPrevious(name, beforeIso, exceptId) {
  const prev = L.previousEntry(doneWs(), name, beforeIso, exceptId);
  if (!prev) return groupOf(name) === 'cardio' ? [{ weight: 0, reps: 0, isWarmup: false, isDone: false }] : [{ weight: 0, reps: 0, isWarmup: false, isDone: false }, { weight: 0, reps: 0, isWarmup: false, isDone: false }, { weight: 0, reps: 0, isWarmup: false, isDone: false }];
  return prev.e.sets.map((s) => ({ weight: s.weight, reps: s.reps, ...(s.level ? { level: s.level } : {}), isWarmup: !!s.isWarmup, isDone: false }));
}

/** Время с начала тренировки: «12:05» или «1:02:30». */
function clockText(w) {
  const sec = Math.max(0, Math.floor((Date.now() - toDate(w.startedAt)) / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
}
setInterval(() => { const el = document.getElementById('w-clock'); const w = el && currentWorkout(); if (w?.startedAt) el.textContent = clockText(w); }, 1000);

/** Файл .ics для календаря iPhone: событие на время тренировки и напоминания за час и в момент начала. */
function workoutIcs(w) {
  const t = toDate(w.date);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escI = (x) => String(x).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const list = w.exercises.map((e) => { const ws = e.sets.filter((x) => !x.isWarmup); return `${e.name}${ws.length ? `: ${ws.length}×${ws[0].reps}${ws[0].weight ? ` по ${num(ws[0].weight, 1)} кг` : ''}` : ''}`; }).join('\n');
  const url = `${location.origin}${location.pathname}#w-${w.id}`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Forma//RU', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${w.id}@forma`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(t)}`, `DTEND:${f(new Date(+t + 3600000))}`,
    `SUMMARY:${escI(`Тренировка: ${w.title}`)}`, `DESCRIPTION:${escI(`${list}\n\nОткрыть в «Форме»: ${url}`)}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escI(`Через час тренировка: ${w.title}`)}`, 'TRIGGER:-PT1H', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escI(`Пора на тренировку: ${w.title}`)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function remindWorkout(w) {
  const file = new File([workoutIcs(w)], 'trenirovka.ics', { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = 'trenirovka.ics';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  toast('Открой загруженный файл и нажми «Добавить» — календарь напомнит за час и в начале');
}

/** Завершение: неотмеченные подходы убрать или засчитать, длительность по секундомеру. */
function finishWorkout(w, how) {
  const undone = w.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.isDone && !x.isWarmup).length, 0);
  if (!w.finishedAt && undone && !how) {
    const done = w.exercises.reduce((a, e) => a + e.sets.filter((x) => x.isDone && !x.isWarmup).length, 0);
    openSheet({
      title: 'Не все подходы отмечены', left: 'Назад',
      body: `<p style="margin:0">${done ? `Отмечено ${done} ${plural(done, 'подход', 'подхода', 'подходов')}, не отмечено ${undone}.` : `Ни один из ${undone} ${plural(undone, 'подхода', 'подходов', 'подходов')} не отмечен.`} Что сделать с неотмеченными?</p>
        ${done ? `<button class="btn block" data-how="drop">Убрать неотмеченные</button>` : ''}
        <button class="btn ${done ? 'secondary' : ''} block" data-how="all">Я сделал все, засчитать</button>
        <button class="btn ghost block" data-how="back">Вернуться к тренировке</button>
        <p class="small muted" style="margin:0">В статистику и прогресс весов идут только сделанные подходы.</p>`,
      onOpen: (el) => el.addEventListener('click', (ev) => {
        const h = ev.target.closest('[data-how]')?.dataset.how;
        if (!h) return;
        closeSheet();
        if (h !== 'back') finishWorkout(w, h);
      }),
    });
    return;
  }
  delete w.planned;
  if (!w.finishedAt) {
    if (how === 'drop') for (const e of w.exercises) e.sets = e.sets.filter((x) => x.isDone || x.isWarmup);
    if (how === 'all') for (const e of w.exercises) for (const x of e.sets) x.isDone = true;
    w.exercises = w.exercises.filter((e) => e.sets.some((x) => !x.isWarmup) || e.sets.length && how !== 'drop');
    const now = new Date();
    w.finishedAt = now.toISOString();
    const mins = Math.round((now - toDate(w.startedAt || w.date)) / 60000);
    if (w.durationMinutes == null && mins > 0 && mins <= 300) w.durationMinutes = mins;
    delete w.startedAt;
  }
  ui.timer = null; drawTimer();
  save(); go('diary'); toast('Тренировка сохранена');
}

function viewWorkout(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return { title: 'Тренировка', top: topBack('#diary', 'Тренировка'), html: '<section class="card empty"><h2>Тренировка не найдена</h2><a class="btn" href="#diary">К дневнику</a></section>' };
  // Открыл свежую тренировку = начал: секундомер стартует сам. Запланированная ждёт кнопки «Начать».
  if (!w.finishedAt && !w.planned && !w.startedAt && Math.abs(Date.now() - toDate(w.date)) < 3 * 3600000) { w.startedAt = new Date().toISOString(); save(); }
  const blocks = w.exercises.map((e, ei) => {
    const g = groupOf(e.name);
    const prev = L.previousEntry(doneWs(), e.name, w.date, w.id);
    const range = rangeFor(w, e.name);
    const sug = prev ? L.suggest(prev.e.sets, e.name, g, range) : null;
    const isCardio = g === 'cardio' && !isHomeWorkout(w);
    const prevText = prev ? `Прошлый раз ${fmtDay(prev.w.date, false)}: ${L.workingSets(prev.e).map((s) => (isCardio ? `${num(s.weight, 2)} мин, ${s.reps} км${s.level ? `, уровень ${num(s.level, 1)}` : ''}` : `${num(s.weight, 2)}×${s.reps}`)).join('; ')}` : 'Первый раз в дневнике';
    const timed = isHomeWorkout(w);
    const note = state.exercises.find((x) => x.name === e.name)?.note;
    let n = 0;
    const rows = e.sets.map((s, si) => {
      const label = s.isWarmup ? 'Р' : String(++n);
      return `<div class="set-row ${s.isDone ? 'done' : ''}">
        <button class="set-no ${s.isWarmup ? 'warm' : ''}" data-act="toggle-warm" data-e="${ei}" data-s="${si}" aria-label="${s.isWarmup ? 'Разминочный подход, сделать рабочим' : 'Рабочий подход, сделать разминочным'}">${label}</button>
        <input inputmode="decimal" enterkeyhint="next" aria-label="${isCardio ? 'Минуты' : 'Вес, кг'}" data-in="weight" data-e="${ei}" data-s="${si}" value="${s.weight ? num(s.weight, 2).replace(/\s/g, '') : ''}" placeholder="0">
        <input inputmode="numeric" enterkeyhint="${isCardio ? 'next' : 'done'}" aria-label="${isCardio ? 'Километры' : timed ? 'Секунды' : 'Повторы'}" data-in="reps" data-e="${ei}" data-s="${si}" value="${s.reps || ''}" placeholder="0">
        ${isCardio ? `<input inputmode="decimal" enterkeyhint="done" aria-label="Уровень сопротивления" data-in="level" data-e="${ei}" data-s="${si}" value="${s.level ? num(s.level, 1).replace(/\s/g, '') : ''}" placeholder="0">` : ''}
        <button class="done-btn ${s.isDone ? 'on' : ''}" data-act="toggle-done" data-e="${ei}" data-s="${si}" aria-label="Подход выполнен" aria-pressed="${s.isDone}">${icon.check}</button>
        <button class="x-btn" data-act="del-set" data-e="${ei}" data-s="${si}" aria-label="Удалить подход">${icon.x}</button></div>`;
    }).join('');
    return `<section class="card ex-card">
      <div class="ex-head"><button class="thumb-btn" data-act="exercise-info" data-name="${esc(e.name)}" aria-label="Техника: ${esc(e.name)}">${thumb(e.name, { animate: true, size: 'lg' })}</button>
        <button class="name" data-act="exercise-info" data-name="${esc(e.name)}">${esc(e.name)}<small>${L.GROUPS[g]}${range ? ` · цель ${range[0]}–${range[1]} повт.` : ''}${note ? ` · ${esc(note)}` : ''}</small></button>
        <button class="icon-btn" data-act="ex-menu" data-e="${ei}" aria-label="Действия с упражнением">${icon.more}</button></div>
      <div class="ex-meta">${esc(prevText)}</div>
      ${(() => { const mm = machineFor(e.name); if (!mm) return ''; const st = L.machineSettingsText(mm); return `<button class="my-machine" data-act="gym-open" data-id="${mm.id}">${mm.photo ? `<img src="${mm.photo}" alt="">` : icon.camera}<span class="grow"><b>${esc(mm.name)}</b>${st ? `<span class="m-levels">${esc(st)}</span>` : `<span class="m-hint">${esc(L.setupHint(mm).tip)} <u>Запиши свои уровни</u></span>`}</span>${icon.chev}</button>`; })()}
      ${sug ? `<div class="hint"><div class="grow">Сегодня: <b>${esc(sug.headline)}</b><br><span class="muted small">${esc(sug.reason)}</span></div><button class="btn small secondary" data-act="apply-sug" data-e="${ei}">Подставить</button></div>` : ''}
      <div class="sets ${isCardio ? 'cardio' : ''}"><div class="set-row head"><span>№</span><span>${isCardio ? 'мин' : 'кг'}</span><span>${isCardio ? 'км' : timed ? 'сек' : 'повт'}</span>${isCardio ? '<span>уровень</span>' : ''}<span></span><span></span></div>${rows}</div>
      ${isCardio ? `<div class="cardio-btns"><button class="btn ghost" data-act="add-set" data-e="${ei}">${icon.plus} Подход</button>
        <button class="btn ghost" data-act="cardio-photo" data-e="${ei}" ${cardioBusy === `${w.id}:${ei}` ? 'disabled' : ''}>${icon.camera} ${cardioBusy === `${w.id}:${ei}` ? 'Читаю табло…' : 'Фото табло'}</button></div>`
        : `<button class="btn ghost block" style="margin-top:6px;min-height:40px" data-act="add-set" data-e="${ei}">${icon.plus} Подход</button>`}
    </section>`;
  }).join('');
  const dateVal = (() => { const d = toDate(w.date); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })();
  const vol = volumeOf(w);
  return {
    title: w.title,
    top: topBack('#diary', fmtDay(w.date), w.finishedAt ? `<button class="text-btn" data-act="del-workout">Удалить</button>` : `<button class="text-btn strong" data-act="finish">Готово</button>`),
    html: `${w.planned ? `<section class="card plan-card"><div><b>Запланирована на ${esc(fmtDay(w.date))}, ${esc(toDate(w.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))}</b>
          <div class="small muted">${w.exercises.length ? `Займёт ${estText(estWorkout(w))}. ` : ''}Время можно поменять ниже. Напоминание придёт из календаря iPhone.</div></div>
          <div class="grid2"><button class="btn" data-act="w-start">${icon.play} Начать сейчас</button><button class="btn secondary" data-act="w-remind">${icon.bell} Напомнить</button></div></section>`
        : !w.finishedAt && w.startedAt ? `<section class="card w-clock-card"><span class="w-clock-ic">${icon.clock}</span><span class="grow"><span class="small muted">Идёт тренировка${w.exercises.length ? ` · план ${estText(estWorkout(w))}` : ''}</span><b id="w-clock" class="num">${clockText(w)}</b></span><button class="btn small" data-act="finish">${icon.check} Завершить</button></section>` : ''}
      <section class="card stack">
        <div class="field"><label for="w-title">Название</label><input id="w-title" data-win="title" value="${esc(w.title)}"></div>
        <div class="grid2"><div class="field"><label for="w-date">Дата и время</label><input id="w-date" type="datetime-local" data-win="date" value="${dateVal}"></div>
        <div class="field"><label for="w-dur">Минут</label><input id="w-dur" inputmode="numeric" data-win="durationMinutes" value="${w.durationMinutes ?? ''}" placeholder="—"></div></div>
        <div class="stat-line" id="w-stats">${workoutStats(w).map((s) => `<span>${s}</span>`).join('')}</div>
      </section>
      ${blocks || '<section class="card empty"><p>Добавь первое упражнение. Подходы из прошлого раза подставятся сами.</p></section>'}
      <button class="btn secondary block" data-act="add-exercise">${icon.plus} Добавить упражнение</button>
      <section class="card"><div class="field"><label for="w-note">Заметка</label><textarea id="w-note" data-win="note" placeholder="Самочувствие, что поменять в следующий раз">${esc(w.note)}</textarea></div></section>
      ${w.finishedAt ? `<p class="small muted" style="text-align:center">Завершена ${fmtDay(w.finishedAt)}${vol ? `, тоннаж ${tonnage(vol)}` : ''}</p>` : `<button class="btn block" data-act="finish">${icon.check} Завершить тренировку</button><button class="btn danger block" data-act="del-workout">Удалить тренировку</button>`}`,
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
    if (!ql && recentNames.length) html += `<div class="section-caption">Недавние</div><div class="card list thumbs">${recentNames.map((n) => `<button class="item" data-pick="${esc(n)}">${thumb(n)}<span class="grow"><span class="title">${esc(n)}</span><div class="sub">${L.GROUPS[groupOf(n)]}</div></span></button>`).join('')}</div>`;
    for (const g of Object.keys(L.GROUPS)) {
      const gi = items.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      if (!gi.length) continue;
      html += `<div class="section-caption">${L.GROUPS[g]}</div><div class="card list thumbs">${gi.map((e) => `<button class="item" data-pick="${esc(e.name)}">${thumb(e.name)}<span class="grow title">${esc(e.name)}</span></button>`).join('')}</div>`;
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

/** 3D-анимации техники: короткие зацикленные видео, рендер своей сцены (см. project-files/forma-anim). */
const EX_VIDEO = {
  'Жим гантелей лёжа': 'anim-db-bench.mp4',
  'Жим гантелей на наклонной скамье': 'anim-db-incline.mp4',
  'Жим от груди': 'anim-chest-press.mp4',
  'Шаг и бег на дорожке': 'anim-treadmill.mp4',
};
/** Анимация конкретной модели тренажёра из базы зала: одна модель, одно видео. */
const MACHINE_VIDEO = {
  'ddx-zhim-grudi': 'anim-chest-press.mp4', 'ddx-begovaya': 'anim-treadmill.mp4',
  ...Object.fromEntries(['babochka', 'zhim-grudi-blok', 'zhim-plech', 'vertikal-rych', 'gorizont-blok', 'zhim-nogami', 'razgibanie-goleni-blok', 'sgibanie-sidya'].map((k) => [`ddx-${k}`, `anim-ddx-${k}.mp4`])),
};
const videoTag = (src, label) => `<video class="ex-video" src="${src}" autoplay loop muted playsinline preload="auto" aria-label="Анимация: ${esc(label)}"></video>`;
/** Видео упражнения: своё по названию, иначе анимация тренажёра, к которому оно привязано. */
const exVideoSrc = (name) => EX_VIDEO[name] || MACHINE_VIDEO[machineFor(name)?.id] || '';
const exVideo = (name) => (exVideoSrc(name) ? videoTag(exVideoSrc(name), name) : '');

function exerciseInfo(name) {
  const ex = state.exercises.find((x) => x.name === name);
  const info = CATALOG[name];
  const hist = workoutsSorted().filter((w) => w.exercises.some((e) => e.name === name)).slice(0, 5);
  openSheet({
    title: name, left: 'Закрыть',
    body: `${exVideo(name)}${(() => { const mm = machineFor(name); const vid = exVideoSrc(name); return mm?.photo ? `${vid ? '' : `<img class="gym-photo" src="${mm.photo}" alt="${esc(mm.name)}">`}<div class="m-tip">${icon.spark}<span><b>Как настроить.</b> ${esc(L.setupHint(mm).tip)}${L.machineSettingsText(mm) ? ` <b>Твои уровни: ${esc(L.machineSettingsText(mm))}.</b>` : ''}</span></div>` : vid ? '' : `<div class="hero-figure" style="--g:${GROUP_COLOR[groupOf(name)]}">${figureSVG(name, groupOf(name))}</div>`; })()}
      <div class="card stack"><div class="cat" style="color:${GROUP_COLOR[groupOf(name)]}">${L.GROUPS[groupOf(name)]}</div>${info ? `<div class="muted small" style="margin-top:-6px">${esc(info.muscles)}</div>` : ''}
      ${info?.tips.length ? `<ul class="tips-list">${info.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : (machineFor(name)?.about ? `<span class="small">${esc(machineFor(name).about)}</span>` : '<span class="muted small">Подсказок по технике для этого упражнения нет.</span>')}</div>
      <div class="card"><div class="field"><label for="ex-note">Моя заметка: где тренажёр, настройки сиденья</label><textarea id="ex-note">${esc(ex?.note || '')}</textarea></div></div>
      ${hist.length ? `<div class="section-caption">Последние разы</div><div class="card list">${hist.map((w) => { const e = w.exercises.find((x) => x.name === name); return `<div class="item"><span class="grow"><span class="title">${fmtDay(w.date)}</span><div class="sub tabular">${isHomeWorkout(w) ? e.sets.map((s) => `${s.reps} с`).join(', ') : L.workingSets(e).map((s) => setText(s, name, w)).join(', ') || '—'}</div></span></div>`; }).join('')}</div>` : ''}
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
    <div class="row">${thumb(p.days[0].items[0].exercise, { animate: true, size: 'lg' })}<div class="grow"><b style="font-size:19px">${esc(p.title)}</b><div class="small muted">${esc(p.level)} · ${p.perWeek} ${plural(p.perWeek, 'раз', 'раза', 'раз')} в неделю</div></div>${p.id === active ? '<span class="badge normal">активная</span>' : ''}</div>
    <p style="margin:0;font-size:15px">${esc(p.summary)}</p>
    ${p.days.map((d, i) => `<div><b class="small">${i + 1}. ${esc(d.title)}</b> <span class="small muted">${estText(estItems(d.items))}</span><div class="small muted">${d.items.map((x) => `${esc(x.exercise)} ${x.sets}×${x.reps[0]}–${x.reps[1]}`).join(' · ')}</div></div>`).join('')}
    ${p.id === active ? '<button class="btn secondary" data-act="set-program" data-id="">Отключить программу</button>' : `<button class="btn" data-act="set-program" data-id="${p.id}">Тренироваться по ней</button>`}
  </section>`).join('');
  return { title: 'Программы', top: topBack('#diary', 'Программы'), html: `<p class="footnote" style="margin-top:0">Веса растут по двойной прогрессии: сначала добираешь повторы до верха диапазона во всех подходах, потом «Форма» прибавляет вес.</p>${cards}` };
}

function viewCatalog() {
  const groups = Object.keys(L.GROUPS).map((g) => {
    const items = state.exercises.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (!items.length) return '';
    return `<div class="section-caption">${L.GROUPS[g]}</div><section class="card list thumbs">${items.map((e) => `<button class="item" data-act="exercise-info" data-name="${esc(e.name)}">${thumb(e.name)}<span class="grow"><span class="title">${esc(e.name)}</span>${e.note ? `<div class="sub">${esc(e.note)}</div>` : CATALOG[e.name] ? `<div class="sub">${esc(CATALOG[e.name].muscles)}</div>` : ''}</span>${e.isCustom ? '<span class="badge plain">своё</span>' : ''}${icon.chev}</button>`).join('')}</section>`;
  }).join('');
  return { title: 'Упражнения', top: topBack('#diary', 'Упражнения', `<button class="icon-btn" data-act="new-exercise" aria-label="Своё упражнение">${icon.plus}</button>`), html: groups };
}

// ───────── Дома ─────────
function viewHome() {
  const ws0 = L.weekStart(new Date());
  const homeWs = state.workouts.filter(isHomeWorkout);
  const thisWeek = homeWs.filter((w) => toDate(w.date) >= ws0);
  const mins = thisWeek.reduce((a, w) => a + (w.durationMinutes || 0), 0);
  const card = (h, wide = false) => `<a class="home-card ${wide ? 'wide' : ''}" href="#plan-${h.id}" style="--c1:${h.c1};--c2:${h.c2}">
      ${figureSVG(h.items[0][0], groupOf(h.items[0][0]))}
      <span class="meta">${homeMinutes(h)} мин · ${esc(h.equipment.toLowerCase())}</span><span class="ttl">${esc(h.title)}</span></a>`;
  const recent = [...homeWs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  return {
    title: 'Дома', top: topTitle('Дома'),
    html: `<section class="card rings-card">
        ${rings([{ frac: thisWeek.length / 3, color: 'var(--pink)' }, { frac: mins / 60, color: 'var(--green)' }], { label: 'Тренировки дома на этой неделе' })}
        <div class="ring-legend"><div><div class="l" style="color:var(--pink)">Тренировки дома</div><div class="v">${thisWeek.length}<small> / 3 за неделю</small></div></div>
        <div><div class="l" style="color:var(--green)">Минуты</div><div class="v">${mins}<small> / 60</small></div></div></div></section>
      <div class="section-title">Готовые тренировки</div>
      <div class="home-grid">${card(HOME[0], true)}${HOME.slice(1).map((h) => card(h)).join('')}</div>
      <div class="section-title">Мои тренировки</div>
      <div class="home-grid">${(state.templates || []).filter((t) => t.kind === 'home').map((t) => planById(t.id)).filter((h) => h.items.length).map((h) => card(h)).join('')}
        <a class="home-card add" href="#build-home"><span class="plus">${icon.plus}</span><span class="ttl">Собрать свою</span><span class="meta">упражнения, время и круги</span></a></div>
      <p class="footnote" style="margin-top:-8px">Таймер ведёт по упражнениям сам: показывает, что делать, считает время и отдых, пищит перед сменой. После тренировки она попадёт в дневник.</p>
      ${recent.length ? `<div class="section-title">Недавние</div><section class="card list thumbs">${recent.map(workoutRow).join('')}</section>` : ''}`,
  };
}

function viewPlan(id) {
  const h = planById(id);
  if (!h) return { title: 'Дома', top: topBack('#home', 'Тренировка'), html: '<section class="card empty"><h2>Тренировка не найдена</h2><a class="btn" href="#home">Ко всем</a></section>' };
  const n = h.items.length;
  const list = h.items.map(([ex, sec]) => `<button class="item" data-act="exercise-info" data-name="${esc(ex)}">${thumb(ex, { animate: true })}
    <span class="grow"><span class="title">${esc(ex)}</span><div class="sub">${esc(CATALOG[ex]?.muscles || L.GROUPS[groupOf(ex)])}</div></span><span class="value">${sec} с</span>${icon.chev}</button>`).join('');
  return {
    title: h.title, top: topBack('#home', h.title, h.custom ? `<a class="text-btn" href="#build-home-${h.id}">Изменить</a>` : ''),
    html: `<section class="plan-head" style="--c1:${h.c1};--c2:${h.c2}">
        <h2>${esc(h.title)}</h2>
        <div class="facts"><span>${icon.clock} ${homeMinutes(h)} мин</span><span>${h.rounds} ${plural(h.rounds, 'круг', 'круга', 'кругов')}</span><span>${n} ${plural(n, 'упражнение', 'упражнения', 'упражнений')}</span></div>
        <p>${esc([h.level, h.equipment].filter(Boolean).join(' · '))}</p>
        ${h.items[0] ? figureSVG(h.items[0][0], groupOf(h.items[0][0])) : ''}
      </section>
      ${h.summary ? `<p class="footnote" style="margin-top:-8px">${esc(h.summary)}</p>` : ''}
      <div class="section-caption">Один круг · отдых ${h.rest} с${h.rounds > 1 ? `, между кругами ${h.roundRest} с` : ''}</div>
      <section class="card list thumbs">${list}</section>
      ${h.items.length ? `<button class="btn block" style="background:var(--pink)" data-act="play" data-id="${h.id}">${icon.play} Начать</button>` : '<p class="footnote">Добавь упражнения, чтобы начать.</p>'}`,
  };
}

// Плеер: ведёт по шагам «приготовься → работа → отдых», картинка и обратный отсчёт.
const player = { el: null, plan: null, steps: [], i: 0, endsAt: 0, left: 0, paused: false, tick: null, sound: true, startedAt: 0, lastBeep: null, wake: null, drawnStep: -1 };

function say(text) {
  if (!player.sound) return;
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* без голоса */ }
}
function tone(freq = 880, len = 0.15) {
  if (!player.sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; g.gain.value = 0.18; o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + len);
  } catch { /* ignore */ }
}

function startPlayer(id) {
  const plan = planById(id);
  if (!plan || !plan.items.length) return;
  try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch { /* без звука */ }
  Object.assign(player, { plan, steps: homeSteps(plan), i: 0, paused: false, startedAt: Date.now(), lastBeep: null, drawnStep: -1 });
  player.el = document.createElement('div');
  player.el.className = 'player';
  player.el.setAttribute('role', 'dialog');
  player.el.setAttribute('aria-label', plan.title);
  document.body.append(player.el);
  document.body.style.overflow = 'hidden';
  player.el.addEventListener('click', onPlayerClick);
  navigator.wakeLock?.request('screen').then((l) => { player.wake = l; }).catch(() => {});
  enterStep(0);
  player.tick = setInterval(playerTick, 200);
}

function enterStep(i) {
  player.i = i;
  const st = player.steps[i];
  player.left = st.dur;
  player.endsAt = Date.now() + st.dur * 1000;
  player.lastBeep = null;
  if (st.kind === 'work') say(st.ex);
  else if (st.kind === 'rest') say(st.roundEnd ? 'Отдых. Дальше новый круг' : 'Отдых');
  else say(`Приготовься. ${st.ex}`);
  drawPlayer(true);
}

function playerTick() {
  if (!player.el || player.paused) return;
  const left = Math.max(0, Math.ceil((player.endsAt - Date.now()) / 1000));
  if (left !== player.left) {
    player.left = left;
    if (left > 0 && left <= 3 && player.lastBeep !== left) { player.lastBeep = left; tone(660, 0.12); }
  }
  if (Date.now() >= player.endsAt) {
    tone(990, 0.3);
    navigator.vibrate?.(150);
    if (player.i + 1 < player.steps.length) enterStep(player.i + 1); else finishPlayer(true);
    return;
  }
  drawPlayer(false);
}

function drawPlayer(full) {
  const st = player.steps[player.i];
  const plan = player.plan;
  const works = player.steps.filter((x) => x.kind === 'work');
  const workIdx = player.steps.slice(0, player.i + 1).filter((x) => x.kind === 'work').length - (st.kind === 'work' ? 1 : 0);
  const left = player.paused ? player.left : Math.max(0, (player.endsAt - Date.now()) / 1000);
  const frac = Math.max(0, Math.min(1, left / st.dur));
  const R = 54, C = 2 * Math.PI * R;
  const color = st.kind === 'work' ? 'var(--pink)' : st.kind === 'rest' ? 'var(--teal)' : 'var(--orange)';
  if (full || player.drawnStep !== player.i) {
    player.drawnStep = player.i;
    const nextWork = player.steps.slice(player.i + 1).find((x) => x.kind === 'work');
    const tip = CATALOG[st.ex]?.tips?.[0] || '';
    player.el.innerHTML = `<div class="bars">${works.map((_, k) => `<i class="${k < workIdx ? 'done' : k === workIdx && st.kind === 'work' ? 'now' : ''}"></i>`).join('')}</div>
      <div class="ptop"><button class="icon-btn" data-p="close" aria-label="Закончить">${icon.x}</button><span class="grow">Круг ${st.round} из ${plan.rounds}</span>
        <button class="icon-btn" data-p="sound" aria-label="${player.sound ? 'Выключить звук' : 'Включить звук'}">${player.sound ? icon.sound : icon.mute}</button></div>
      <div class="stage ${st.kind === 'work' ? '' : 'rest'}" style="--pc:${color}">
        <span class="phase">${st.kind === 'work' ? 'Работа' : st.kind === 'rest' ? (st.roundEnd ? 'Отдых между кругами' : 'Отдых') : 'Приготовься'}</span>
        ${figureSVG(st.ex, groupOf(st.ex))}
        <h2 class="ex-name">${st.kind === 'work' ? '' : '<span class="muted" style="font-weight:600;font-size:17px;display:block">Дальше</span>'}${esc(st.ex)}</h2>
        <div class="count-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="9"/>
          <circle id="p-arc" cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>
          <span class="count" id="p-count" role="timer"></span></div>
        <p class="tipline">${esc(tip)}</p>
        <p class="next">${st.kind === 'work' && nextWork ? `Потом: ${esc(nextWork.ex)}` : st.kind === 'work' ? 'Последнее упражнение' : ''}</p>
      </div>
      <div class="controls"><button data-p="prev" aria-label="Назад">${icon.prev}</button>
        <button class="main" data-p="toggle" aria-label="${player.paused ? 'Продолжить' : 'Пауза'}" style="background:${color}">${player.paused ? icon.play : icon.pause}</button>
        <button data-p="next" aria-label="Пропустить">${icon.next}</button></div>`;
  }
  const arc = player.el.querySelector('#p-arc');
  if (arc) arc.setAttribute('stroke-dashoffset', (C * (1 - frac)).toFixed(1));
  const cnt = player.el.querySelector('#p-count');
  if (cnt) { const s = Math.ceil(left); cnt.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s); }
}

function onPlayerClick(ev) {
  const b = ev.target.closest('[data-p]');
  if (!b) return;
  const a = b.dataset.p;
  if (a === 'toggle') {
    if (player.paused) { player.paused = false; player.endsAt = Date.now() + player.left * 1000; }
    else { player.left = Math.max(0, (player.endsAt - Date.now()) / 1000); player.paused = true; }
    drawPlayer(true);
  } else if (a === 'next') {
    if (player.i + 1 < player.steps.length) enterStep(player.i + 1); else finishPlayer(true);
  } else if (a === 'prev') {
    let j = player.i - 1;
    while (j > 0 && player.steps[j].kind !== 'work') j--;
    enterStep(Math.max(0, j));
  } else if (a === 'sound') {
    player.sound = !player.sound;
    if (!player.sound) try { speechSynthesis.cancel(); } catch { /* ignore */ }
    drawPlayer(true);
  } else if (a === 'close') {
    finishPlayer(false);
  } else if (a === 'done') {
    closePlayer();
  }
}

function closePlayer() {
  clearInterval(player.tick);
  player.wake?.release?.().catch(() => {});
  player.wake = null;
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  player.el?.remove();
  player.el = null;
  document.body.style.overflow = '';
  render();
}

function finishPlayer(completed) {
  clearInterval(player.tick);
  const done = player.steps.slice(0, completed ? player.steps.length : player.i).filter((x) => x.kind === 'work');
  if (!done.length) { closePlayer(); return; }
  if (state.demo) clearDemo(false);
  const w = homeWorkout(player.plan, done, player.startedAt, Date.now(), L.uid());
  state.workouts.push(w);
  save();
  if (!completed) { closePlayer(); toast('Выполненная часть записана в дневник'); return; }
  say('Готово! Отличная работа');
  player.el.innerHTML = `<div class="stage">
      <div class="done-badge">${icon.check}</div>
      <h2 class="ex-name">Готово!</h2>
      <p class="tipline">${esc(player.plan.title)}: ${w.durationMinutes} мин, ${done.length} ${plural(done.length, 'отрезок', 'отрезка', 'отрезков')} работы. Тренировка записана в дневник.</p>
    </div>
    <div class="controls" style="grid-template-columns:1fr"><button class="main" data-p="done" style="background:var(--pink)">Закрыть</button></div>`;
}

// ───────── Конструктор своих тренировок ─────────
const stepper = (val, act, extra, label) => `<span class="stepper" role="group" aria-label="${esc(label)}"><button data-act="${act}" data-d="-1" ${extra} aria-label="Меньше">−</button><b class="tabular">${val}</b><button data-act="${act}" data-d="1" ${extra} aria-label="Больше">+</button></span>`;

function viewBuild(arg) {
  const [kind = 'gym', ...rest] = (arg || 'gym').split('-');
  const id = rest.join('-');
  const back = kind === 'home' ? (id ? `#plan-${id}` : '#home') : '#diary';
  if (!ui.draft || ui.draft.key !== arg) {
    const existing = id ? (state.templates || []).find((t) => t.id === id) : null;
    ui.draft = { key: arg, isNew: !existing, t: existing ? JSON.parse(JSON.stringify(existing)) : (kind === 'home'
      ? { id: L.uid(), kind: 'home', title: '', rounds: 3, rest: 20, roundRest: 60, items: [] }
      : { id: L.uid(), kind: 'gym', title: '', items: [] }) };
  }
  const t = ui.draft.t;
  const home = t.kind === 'home';
  const rows = t.items.map((it, i) => {
    const name = home ? it[0] : it.exercise;
    const ctl = home
      ? `<div class="b-ctl"><span class="muted small">Работа</span>${stepper(`${it[1]} с`, 'b-sec', `data-i="${i}"`, 'Секунды')}</div>`
      : `<div class="b-ctl"><span class="muted small">Подходы</span>${stepper(it.sets, 'b-sets', `data-i="${i}"`, 'Подходы')}</div>
         <div class="b-ctl"><span class="muted small">Повторы</span><span class="reps-in"><input inputmode="numeric" data-b="lo" data-i="${i}" value="${it.reps[0]}" aria-label="Повторов от"><span>–</span><input inputmode="numeric" data-b="hi" data-i="${i}" value="${it.reps[1]}" aria-label="Повторов до"></span></div>`;
    return `<div class="b-item">
      <div class="row">${thumb(name)}<span class="grow"><b>${esc(name)}</b><div class="small muted">${L.GROUPS[groupOf(name)]}</div></span>
        ${i > 0 ? `<button class="x-btn" data-act="b-up" data-i="${i}" aria-label="Поднять выше">${icon.back.replace('<svg', '<svg style="transform:rotate(90deg)"')}</button>` : ''}
        <button class="x-btn" data-act="b-del" data-i="${i}" aria-label="Убрать">${icon.x}</button></div>${ctl}</div>`;
  }).join('');
  const seg = (act, cur, opts) => `<div class="seg">${opts.map((v) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${v ? `${v} с` : 'нет'}</button>`).join('')}</div>`;
  const settings = home ? `<section class="card stack">
      <div class="row"><span class="grow">Круги</span>${stepper(t.rounds, 'b-rounds', '', 'Круги')}</div>
      <div><div class="small muted" style="margin-bottom:6px">Отдых между упражнениями</div>${seg('b-rest', t.rest, [0, 10, 15, 20, 30])}</div>
      <div><div class="small muted" style="margin-bottom:6px">Отдых между кругами</div>${seg('b-rrest', t.roundRest, [0, 30, 45, 60, 90])}</div>
      ${t.items.length ? `<div class="small muted">Всего ≈ ${homeMinutes(t)} мин</div>` : ''}</section>` : '';
  return {
    title: 'Конструктор',
    top: topBack(back, ui.draft.isNew ? 'Новая тренировка' : 'Изменить', '<button class="text-btn strong" data-act="b-save">Сохранить</button>'),
    html: `<section class="card"><div class="field"><label for="b-title">Название</label><input id="b-title" data-b="title" value="${esc(t.title)}" placeholder="${home ? 'Например, Вечерняя дома' : 'Например, Спина и бицепс'}"></div></section>
      ${settings}
      <div class="section-caption">Упражнения${t.items.length ? ` · ${t.items.length}` : ''}${!home && t.items.length ? ` · ${estText(estItems(t.items))}` : ''}</div>
      <section class="card b-list">${rows || `<p class="muted small" style="margin:0">Добавь упражнения в нужном порядке. ${home ? 'Для каждого задай время работы.' : 'Для каждого задай подходы и диапазон повторов: «Форма» будет прибавлять вес, когда доберёшь верх диапазона.'}</p>`}</section>
      <button class="btn secondary block" data-act="b-add">${icon.plus} Добавить упражнение</button>
      <button class="btn block" data-act="b-save">Сохранить</button>
      ${ui.draft.isNew ? '' : '<button class="btn danger block" data-act="b-delete">Удалить тренировку</button>'}`,
  };
}

function builderAct(act, el) {
  const d = ui.draft;
  if (!d) return;
  const t = d.t, i = +el.dataset.i, dv = +el.dataset.d;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  if (act === 'b-sec') t.items[i][1] = clamp(t.items[i][1] + dv * 5, 5, 600);
  else if (act === 'b-sets') t.items[i].sets = clamp(t.items[i].sets + dv, 1, 10);
  else if (act === 'b-rounds') t.rounds = clamp(t.rounds + dv, 1, 10);
  else if (act === 'b-rest') t.rest = +el.dataset.v;
  else if (act === 'b-rrest') t.roundRest = +el.dataset.v;
  else if (act === 'b-del') t.items.splice(i, 1);
  else if (act === 'b-up') [t.items[i - 1], t.items[i]] = [t.items[i], t.items[i - 1]];
  else if (act === 'b-add') {
    exercisePicker((name) => {
      if (t.kind === 'home') t.items.push([name, 40]);
      else {
        const prog = L.PROGRAMS.flatMap((p) => p.days.flatMap((x) => x.items)).find((x) => x.exercise === name);
        t.items.push({ exercise: name, sets: prog?.sets || 3, reps: prog?.reps ? [...prog.reps] : (groupOf(name) === 'core' ? [12, 20] : [8, 12]) });
      }
      render();
    });
    return;
  } else if (act === 'b-save') {
    if (!t.title.trim()) t.title = t.kind === 'home' ? 'Моя тренировка дома' : 'Моя тренировка';
    if (!t.items.length) { toast('Добавь хотя бы одно упражнение'); return; }
    const clean = L.cleanTemplate(t);
    state.templates ||= [];
    const k = state.templates.findIndex((x) => x.id === clean.id);
    if (k >= 0) state.templates[k] = clean; else state.templates.push(clean);
    save(); ui.draft = null;
    toast('Тренировка сохранена');
    go(clean.kind === 'home' ? `plan-${clean.id}` : 'diary');
    return;
  } else if (act === 'b-delete') {
    confirmSheet('Удалить тренировку?', `«${t.title || 'Без названия'}» пропадёт из списка. Записи в дневнике останутся.`, 'Удалить', () => {
      state.templates = (state.templates || []).filter((x) => x.id !== t.id);
      save(); ui.draft = null; go(t.kind === 'home' ? 'home' : 'diary');
    });
    return;
  }
  render();
}

function startTemplate(id) {
  const t = (state.templates || []).find((x) => x.id === id);
  if (!t || !t.items.length) return;
  if (state.demo) clearDemo(false);
  const program = { id: `tpl:${t.id}`, title: t.title, days: [{ title: t.title, items: t.items }] };
  const w = L.workoutFromProgram(program, 0, state.workouts, groupOf);
  w.programDay = null;
  state.workouts.push(w);
  save();
  go(`w-${w.id}`);
}

// ───────── Советник ─────────
function currentTips() {
  const ws = doneWs().filter((w) => w.exercises.length);
  return L.advisorTips(L.sessionsFrom(ws, groupOf), L.bodyPointsFrom(state.measurements), new Date());
}
const tipHtml = (t) => `<div class="tip ${t.kind}"><span class="dot">${icon[TIP_ICON[t.kind]] || icon.info}</span><div><b>${esc(t.title)}</b><p>${esc(t.text)}</p></div></div>`;

function advisorCard() {
  const tips = currentTips();
  const top = tips[0];
  return `<a class="card advisor-card" href="#advisor">
    <div class="cat" style="color:var(--indigo)">${icon.bolt}Советник<span class="when">${tips.length ? `${tips.length} ${plural(tips.length, 'совет', 'совета', 'советов')}` : 'всё в порядке'}${icon.chev}</span></div>
    ${top ? `<b>${esc(top.title)}</b><p>${esc(top.text)}</p>` : '<p>Замечаний нет. Советник следит за прогрессом весов, перерывами, балансом мышц и замерами InBody и подскажет, когда что-то пойдёт не так.</p>'}
    <span class="ask-ai" data-act="go" data-to="ai">${icon.spark} Спросить ИИ-советника</span></a>`;
}

const ADVISOR_CHECKS = [
  ['trend', 'Застой в упражнениях', 'Три тренировки подряд без роста расчётного максимума.'],
  ['calendar', 'Перерывы', 'Неделя и больше без тренировок: подскажет, с каких весов вернуться.'],
  ['moon', 'Усталость', 'Шесть и больше недель без лёгкой недели или застой сразу в нескольких упражнениях.'],
  ['scaleBal', 'Баланс мышц', 'Забытые группы, перекос жимов и тяг, мало подходов в неделю.'],
  ['person', 'Состав тела', 'Тренд мышц и жира по InBody, разница между сторонами тела.'],
  ['clock', 'Замеры', 'Давно не было InBody или замеры сделаны в разных условиях.'],
];

function aiSummaryNow() {
  const ws = doneWs().filter((w) => w.exercises.length);
  const prof = [...state.measurements].reverse().find((m) => m.age || m.heightCm) || {};
  return AI.aiSummary(L.sessionsFrom(ws, groupOf), L.bodyPointsFrom(state.measurements), currentTips(), { age: prof.age, heightCm: prof.heightCm });
}

// ───────── ИИ-помощник: отдельный раздел с чатом ─────────
const AI_SUGGEST = [
  ['Почему не растут веса?', 'Посмотри мои упражнения: где застой и что поменять в ближайшие 2 недели?'],
  ['Разбери мой InBody', 'Разбери мои последние замеры InBody: что меняется и на что обратить внимание?'],
  ['Сколько белка и калорий?', 'Сколько мне есть белка и калорий под мою цель, судя по замерам?'],
  ['Тренировка на сегодня', 'Предложи тренировку на сегодня с учётом того, что я делал на этой неделе.'],
];
const aiState = { chats: null, id: null, busy: false, draft: '', photo: null };
const aiChats = () => (aiState.chats ||= AI.loadChats());
const aiCurrent = () => aiChats().find((c) => c.id === aiState.id) || null;

function viewAI() {
  const hasKey = !!AI.getKey();
  const chat = aiCurrent();
  const thinking = AI.isThinking();
  const inChat = !!chat?.msgs.length;
  const left = `<span data-nav class="nav-left">${inChat ? `<button class="back-btn" data-act="ai-new" aria-label="Назад к началу">${icon.back}<span>Назад</span></button>` : `<button class="icon-btn plain" data-act="ai-history" aria-label="История разговоров">${icon.list}</button>`}</span>`;
  const right = `<span class="nav-right">${inChat ? `<button class="icon-btn plain" data-act="ai-history" aria-label="История разговоров">${icon.list}</button>` : hasKey ? `<button class="icon-btn plain" data-act="ai-key" aria-label="Заменить ключ">${icon.key}</button>` : ''}<button class="icon-btn plain" data-act="ai-new" aria-label="Новый чат">${icon.compose}</button></span>`;
  let body;
  if (!hasKey) {
    body = `<div class="ai-hello"><span class="ai-logo">${icon.spark}</span><h2>ИИ-советник</h2><p>Спрашивай своими словами про тренировки, питание и замеры. Ответ учитывает твои рабочие веса, подходы и InBody.</p></div>
      <section class="card stack ai-connect"><b>Подключи DeepSeek</b>
        <p class="small muted" style="margin:0">Создай ключ на <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com</a> и пополни баланс: вопрос стоит меньше рубля. Ключ хранится только в этом браузере.</p>
        <input id="ai-key" class="search" type="password" autocomplete="off" spellcheck="false" placeholder="Вставь ключ sk-…">
        <button class="btn block" data-act="ai-save" style="background:var(--indigo)">Подключить</button></section>`;
  } else if (!chat || !chat.msgs.length) {
    body = `<div class="ai-hello"><span class="ai-logo">${icon.spark}</span><h2>Чем помочь?</h2><p>Я вижу твой дневник, рабочие веса и замеры InBody.</p></div>
      <button class="card ai-photo-cta" data-act="ai-photo"><span class="ai-logo sm">${icon.camera}</span><span class="grow"><b>Сфоткай тренажёр</b><div class="small muted">Расскажу, что он качает, как настроить и с каким весом начать, и добавлю в тренировку</div></span>${icon.chev}</button>
      <div class="ai-suggest">${AI_SUGGEST.map(([t, q], i) => `<button data-act="ai-suggest" data-i="${i}"><b>${esc(t)}</b><span>${esc(q)}</span></button>`).join('')}</div>`;
  } else {
    body = `<div class="ai-feed">${chat.msgs.map((m, i) => {
      if (m.role === 'user') {
        const pic = m.image || m.thumb ? `<img class="ai-pic" src="${esc(m.image || m.thumb)}" alt="Фото">` : m.hadPhoto ? `<div class="ai-pic none">${icon.camera} фото</div>` : '';
        return `<div class="ai-msg user">${pic}<div class="bubble">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`;
      }
      if (m.error) return `<div class="ai-msg assistant error"><span class="ai-ava">${icon.spark}</span><div class="ai-text">${esc(m.text)}<div class="ai-actions"><button class="text-btn" data-act="ai-retry">Повторить</button></div></div></div>`;
      const { text, exercises, workouts } = AI.parseExercises(m.text);
      return `<div class="ai-msg assistant"><span class="ai-ava">${icon.spark}</span><div class="ai-text">${AI.mdLite(text)}${exercises.map((x, k) => aiExCard(x, m, i, k)).join('')}${aiPlanCards(workouts, m, i)}
          <div class="ai-actions"><button class="icon-btn plain" data-act="ai-copy" data-i="${i}" aria-label="Скопировать">${icon.copy}</button>${m.model === 'think' || m.model === 'deepseek-reasoner' ? '<span class="small muted">думающая</span>' : ''}</div></div></div>`;
    }).join('')}
      ${aiState.busy ? `<div class="ai-msg assistant"><span class="ai-ava">${icon.spark}</span><div class="ai-text"><span class="typing"><i></i><i></i><i></i></span>${thinking ? '<span class="small muted"> думает, это может занять минуту</span>' : ''}</div></div>` : ''}</div>`;
  }
  const composer = hasKey ? `<div class="ai-composer"><div class="box">
      ${aiState.photo ? `<div class="ai-attach"><img src="${aiState.photo.thumb}" alt="Фото к вопросу"><button class="x" data-act="ai-photo-x" aria-label="Убрать фото">${icon.x}</button></div>` : ''}
      <textarea id="ai-input" rows="1" placeholder="${aiState.photo ? 'Что спросить про фото? Можно оставить пустым' : 'Спроси советника'}" ${aiState.busy ? 'disabled' : ''}>${esc(aiState.draft)}</textarea>
      <div class="row2"><button class="icon-btn plain cam" data-act="ai-photo" aria-label="Сфотографировать или выбрать фото" ${aiState.busy ? 'disabled' : ''}>${icon.camera}</button>
        <button class="pill ${thinking ? 'on' : ''}" data-act="ai-think" aria-pressed="${thinking}">${icon.bolt} Думающая</button>
        <details class="ai-peek"><summary>Что видит ИИ</summary><pre class="summary-pre">${esc(aiSummaryNow())}</pre></details>
        <button class="send" data-act="ai-send" aria-label="Отправить" ${aiState.busy ? 'disabled' : ''}>${icon.up}</button></div></div></div>` : '';
  return { title: 'ИИ-советник', cls: 'ai-view', top: `${left}<h1 class="small">ИИ-советник</h1>${right}`, html: body, foot: composer, after: () => { autoGrow(); fitViewport(); if (chat?.msgs.length) feedToEnd(); } };
}

/** Карточка упражнения из ответа ИИ: добавить в список и в тренировку. */
/** День для тренировки из ответа ИИ: его дата, но не в прошлом; без даты — следующие дни по порядку. */
function aiPlanDay(wk, j) {
  const today = dayKeyOf(new Date());
  if (wk.date && wk.date >= today) return wk.date;
  return wk.date ? today : dayKeyOf(new Date(Date.now() + (j + 1) * 864e5));
}
const dayLabel = (k) => { const t = new Date(`${k}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }); return t[0].toUpperCase() + t.slice(1); };

/** Карточки тренировок, которые подобрал ИИ: каждую можно сохранить в календарь как запланированную. */
function aiPlanCards(workouts, m, i) {
  if (!workouts.length) return '';
  const saved = (j) => { const id = m.planned?.[j]; return id && state.workouts.find((w) => w.id === id); };
  const cards = workouts.map((wk, j) => {
    const w = saved(j);
    const k = w ? dayKeyOf(w.date) : aiPlanDay(wk, j);
    return `<div class="ai-plan"><div class="head"><span class="ai-plan-date">${esc(dayLabel(k))}</span><b>${esc(wk.title)}</b></div>
      <ol>${wk.exercises.map((x) => `<li>${esc(x.name)} <span class="muted">${x.sets}×${x.reps[0] === x.reps[1] ? x.reps[0] : `${x.reps[0]}–${x.reps[1]}`}${x.weight ? ` · ${num(x.weight, 1)} кг` : ''}</span></li>`).join('')}</ol>
      ${w ? `<div class="btns"><a class="btn small" href="#w-${w.id}">${icon.check} В календаре · открыть</a><button class="btn small ghost" data-act="remind-id" data-id="${w.id}">${icon.bell} Напомнить</button></div>` : `<button class="btn small" data-act="ai-plan" data-i="${i}" data-j="${j}">${icon.calendar} В календарь на ${esc(dayLabel(k))}</button>`}</div>`;
  }).join('');
  const left = workouts.filter((_, j) => !saved(j)).length;
  return `${cards}${workouts.length > 1 && left > 1 ? `<button class="btn block" data-act="ai-plan-all" data-i="${i}">${icon.plus} Сохранить все ${left} в календарь</button>` : ''}`;
}

/** Сохраняет тренировку от ИИ на день k как запланированную, не начиная её. */
function savePlanned(k, title, exercises) {
  if (state.demo) clearDemo(false);
  const [y, mo, d] = k.split('-').map(Number);
  const at = new Date(); at.setFullYear(y, mo - 1, d);
  if (k !== dayKeyOf(new Date())) at.setHours(18, 0, 0, 0);
  const w = { id: L.uid(), date: at.toISOString(), title, note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null, planned: true,
    exercises: exercises.map((x) => ({ name: aiEnsureExercise(x), sets: Array.from({ length: x.sets }, () => ({ weight: x.weight, reps: x.reps[0], isWarmup: false, isDone: false })) })) };
  state.workouts.push(w);
  return w;
}

function aiExCard(x, m, i, k) {
  const known = state.exercises.some((e) => e.name.toLowerCase() === x.name.toLowerCase());
  const wid = m.added?.[x.name];
  const mine = machineFor(x.name);
  const um = aiCurrent()?.msgs[i - 1];
  const hadPhoto = !!(um && (um.image || um.thumb));
  const w = wid && state.workouts.find((q) => q.id === wid);
  const reps = x.reps[0] === x.reps[1] ? x.reps[0] : `${x.reps[0]}–${x.reps[1]}`;
  return `<div class="ai-ex" style="--g:${GROUP_COLOR[x.group] || 'var(--accent)'}"><div class="head">${thumb(x.name)}<span class="grow"><b>${esc(x.name)}</b><div class="small muted">${esc(L.GROUPS[x.group])} · ${x.sets}×${reps}${x.weight ? ` · ${num(x.weight, 1)} кг` : ''}</div></span></div>
    <div class="btns">${w ? `<a class="btn small" href="#w-${w.id}">${icon.check} Открыть тренировку</a>` : `<button class="btn small" data-act="ai-ex-workout" data-i="${i}" data-k="${k}">${icon.plus} В тренировку</button>`}
      ${known ? '' : `<button class="btn small ghost" data-act="ai-ex-add" data-i="${i}" data-k="${k}">В мои упражнения</button>`}
      ${mine ? '' : hadPhoto ? `<button class="btn small ghost" data-act="ai-ex-gym" data-i="${i}" data-k="${k}">${icon.camera} В Мой зал</button>` : ''}</div>
    ${mine ? `<button class="my-machine" data-act="gym-open" data-id="${mine.id}">${mine.photo ? `<img src="${mine.photo}" alt="">` : icon.camera}<span class="grow"><b>Твой: ${esc(mine.name)}</b>${L.machineSettingsText(mine) ? `<span class="muted"> · ${esc(L.machineSettingsText(mine))}</span>` : ''}</span>${icon.chev}</button>` : ''}</div>`;
}

function aiExFrom(el) {
  const m = aiCurrent()?.msgs[+el.dataset.i];
  const x = m && AI.parseExercises(m.text).exercises[+el.dataset.k];
  return x ? { m, x } : null;
}

/** Добавляет упражнение в общий список, если его там нет. Возвращает название, под которым оно записано. */
function aiEnsureExercise(x) {
  const have = state.exercises.find((e) => e.name.toLowerCase() === x.name.toLowerCase());
  if (have) return have.name;
  state.exercises.push({ name: x.name, group: x.group, isCustom: true, note: '' });
  return x.name;
}

/** Фото уменьшается в браузере: до 1280 px для ИИ и до 240 px миниатюра для истории. */
async function aiPhotoFrom(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = url; });
    const draw = (max, q) => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', q);
    };
    return { image: draw(1280, 0.82), thumb: draw(240, 0.6) };
  } finally { URL.revokeObjectURL(url); }
}

// Чат ИИ живёт в неподвижной рамке ровно по видимой области экрана: на iPhone
// клавиатура и прокрутка окна иначе сдвигают поле ввода и вкладки на середину.
const feedToEnd = () => { const m = $('#view'); if (m) m.scrollTop = m.scrollHeight; };
function fitViewport() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : innerHeight;
  const root = document.documentElement.style;
  root.setProperty('--vvh', `${Math.round(h)}px`);
  root.setProperty('--vvt', `${Math.round(vv ? vv.offsetTop : 0)}px`);
  document.body.classList.toggle('kb', innerHeight - h > 120);
  if (document.body.classList.contains('chat-mode') && scrollY) scrollTo(0, 0);
}
if (window.visualViewport) { visualViewport.addEventListener('resize', fitViewport); visualViewport.addEventListener('scroll', fitViewport); }
addEventListener('resize', fitViewport);
addEventListener('focusout', () => setTimeout(fitViewport, 60));
addEventListener('focusin', (e) => { if (e.target.id === 'ai-input') setTimeout(() => { fitViewport(); feedToEnd(); }, 300); });

function autoGrow() {
  const t = $('#ai-input');
  if (!t) return;
  t.style.height = 'auto';
  t.style.height = `${Math.min(160, t.scrollHeight)}px`;
}

function aiKeySheet() {
  const k = AI.getKey();
  openSheet({
    title: 'Ключ DeepSeek', left: 'Закрыть',
    body: `<p class="small muted" style="margin:0">Сейчас подключён ключ ${k ? `<b>${esc(k.slice(0, 5))}…${esc(k.slice(-4))}</b>` : 'не задан'}. Новый ключ создай на <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com → API keys</a> и вставь сюда.</p>
      <input id="ai-key" class="search" type="password" autocomplete="off" spellcheck="false" placeholder="Новый ключ sk-…">
      <button class="btn block" data-act="ai-save" style="background:var(--indigo)">Проверить и заменить</button>
      ${k ? '<button class="btn danger block" data-act="ai-forget">Удалить ключ</button>' : ''}`,
  });
}

function aiHistory() {
  const chats = [...aiChats()].sort((a, b) => b.updated - a.updated);
  openSheet({
    title: 'Разговоры', left: 'Закрыть',
    body: chats.length ? `<div class="card list">${chats.map((c) => `<div class="item"><button class="item-main" data-open="${c.id}"><span class="grow"><span class="title">${esc(c.title)}</span><div class="sub">${fmtDay(new Date(c.updated))} · ${c.msgs.filter((m) => m.role === 'user').length} ${plural(c.msgs.filter((m) => m.role === 'user').length, 'вопрос', 'вопроса', 'вопросов')}</div></span></button><button class="x-btn" data-del="${c.id}" aria-label="Удалить разговор">${icon.x}</button></div>`).join('')}</div>
      <button class="btn danger block" data-clear-all>Удалить все разговоры</button>` : '<section class="card empty"><p>Разговоров пока нет.</p></section>',
    onOpen: (el) => el.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
      if (o) { aiState.id = o.dataset.open; closeSheet(); go('ai'); render(); }
      else if (d) { aiState.chats = aiChats().filter((c) => c.id !== d.dataset.del); if (aiState.id === d.dataset.del) aiState.id = null; AI.saveChats(aiState.chats); closeSheet(); aiHistory(); render(); }
      else if (e.target.closest('[data-clear-all]')) { aiState.chats = []; aiState.id = null; AI.saveChats([]); closeSheet(); render(); }
    }),
  });
}

async function aiSend(text) {
  const photo = text == null ? aiState.photo : null;
  const q = String(text ?? $('#ai-input')?.value ?? '').trim() || (photo ? 'Что это за тренажёр, как на нём заниматься и с каким весом мне начать?' : '');
  if (!q || aiState.busy) return;
  let chat = aiCurrent();
  if (!chat) { chat = { id: L.uid(), title: AI.chatTitle(photo && !$('#ai-input')?.value.trim() ? 'Фото тренажёра' : q), created: Date.now(), updated: Date.now(), msgs: [] }; aiChats().push(chat); aiState.id = chat.id; }
  chat.msgs.push(photo ? { role: 'user', text: q.slice(0, 4000), image: photo.image, thumb: photo.thumb } : { role: 'user', text: q.slice(0, 4000) });
  aiState.photo = null;
  chat.updated = Date.now();
  aiState.draft = '';
  await aiRun(chat);
}

async function aiRun(chat) {
  aiState.busy = true;
  AI.saveChats(aiChats());
  if (route().name === 'ai') render();
  const model = AI.getMode();
  try {
    const names = state.exercises.map((e) => e.name);
    const answer = await AI.ask(chat.msgs.filter((m) => !m.error).map(({ role, text, image, thumb }) => ({ role, text, image, thumb })), aiSummaryNow(), fetch, names, machines());
    chat.msgs.push({ role: 'assistant', text: answer, model });
  } catch (e) {
    chat.msgs.push({ role: 'assistant', text: e.message, error: true });
  }
  chat.updated = Date.now();
  aiState.busy = false;
  AI.saveChats(aiChats());
  if (route().name === 'ai') render();
}

function aiAct(act, el) {
  if (act === 'ai-send') aiSend();
  else if (act === 'ai-suggest') aiSend(AI_SUGGEST[+el.dataset.i][1]);
  else if (act === 'ai-new') { aiState.id = null; aiState.draft = ''; render(); }
  else if (act === 'ai-history') aiHistory();
  else if (act === 'ai-think') { AI.setMode(AI.isThinking() ? 'fast' : 'think'); aiState.draft = $('#ai-input')?.value || ''; render(); }
  else if (act === 'ai-photo') {
    aiState.draft = $('#ai-input')?.value || aiState.draft;
    pickFile('image/*', async (f) => {
      try { aiState.photo = await aiPhotoFrom(f); } catch { toast('Не получилось открыть фото'); return; }
      if (route().name !== 'ai') go('ai');
      render(); setTimeout(() => $('#ai-input')?.focus(), 0);
    });
  }
  else if (act === 'ai-photo-x') { aiState.photo = null; aiState.draft = $('#ai-input')?.value || ''; render(); }
  else if (act === 'ai-ex-add') {
    const r = aiExFrom(el);
    if (r) { aiEnsureExercise(r.x); save(); render(); toast('Добавлено в упражнения'); }
  }
  else if (act === 'ai-ex-workout') {
    const r = aiExFrom(el);
    if (!r) return;
    const wasDemo = state.demo;
    if (wasDemo) clearDemo(false);
    const name = aiEnsureExercise(r.x);
    const w = addToWorkout(name, Array.from({ length: r.x.sets }, () => ({ weight: r.x.weight, reps: r.x.reps[0], isWarmup: false, isDone: false })));
    r.m.added = { ...r.m.added, [r.x.name]: w.id };
    save(); AI.saveChats(aiChats()); render();
    if (!wasDemo) toast('Добавлено в тренировку');
  }
  else if (act === 'ai-plan' || act === 'ai-plan-all') {
    const m = aiCurrent()?.msgs[+el.dataset.i];
    if (!m) return;
    const { workouts } = AI.parseExercises(m.text);
    const js = act === 'ai-plan' ? [+el.dataset.j] : workouts.map((_, j) => j);
    const days = [];
    for (const j of js) {
      const wk = workouts[j];
      if (!wk || (m.planned?.[j] && state.workouts.some((w) => w.id === m.planned[j]))) continue;
      const k = aiPlanDay(wk, j);
      const w = savePlanned(k, wk.title, wk.exercises);
      m.planned = { ...m.planned, [j]: w.id };
      days.push(dayLabel(k));
    }
    save(); AI.saveChats(aiChats()); render();
    if (days.length) toast(days.length === 1 ? `Сохранено в календарь: ${days[0]}` : `Сохранено в календарь: ${days.length} тренировки`);
  }
  else if (act === 'ai-ex-gym') {
    const r = aiExFrom(el);
    const prevMsg = aiCurrent()?.msgs[+el.dataset.i - 1];
    if (!r) return;
    const name = aiEnsureExercise(r.x);
    machineSheet({ name: r.x.name, exercise: name, group: r.x.group, settings: '', photo: prevMsg?.thumb || null }, { isNew: true });
  }
  else if (act === 'ai-copy') { const m = aiCurrent()?.msgs[+el.dataset.i]; if (m) navigator.clipboard?.writeText(AI.parseExercises(m.text).text).then(() => toast('Скопировано'), () => toast('Не получилось скопировать')); }
  else if (act === 'ai-retry') { const c = aiCurrent(); if (c && c.msgs.at(-1)?.error) { c.msgs.pop(); aiRun(c); } }
}

function viewAdvisor() {
  const tips = currentTips();
  return {
    title: 'Советник', top: topBack('#analytics', 'Советник'),
    html: `<section class="advisor-head"><span class="ic">${icon.bolt}</span><div><h2>Советник</h2><p>${tips.length ? `Есть ${tips.length} ${plural(tips.length, 'совет', 'совета', 'советов')} по твоим тренировкам и замерам.` : 'Сейчас замечаний нет. Продолжай в том же духе.'}</p></div></section>
      <a class="card ask-card" href="#ai"><span class="ai-logo sm">${icon.spark}</span><span class="grow"><b>Спросить ИИ-советника</b><div class="small muted">Вопросы своими словами, ответ с учётом твоих данных</div></span>${icon.chev}</a>
      ${tips.length ? `<div class="section-caption">Советы по правилам</div><section class="card">${tips.map(tipHtml).join('')}</section>` : ''}
      <div class="section-caption">Что проверяет</div>
      <section class="card list">${ADVISOR_CHECKS.map(([ic, t, d]) => `<div class="item"><span class="thumb" style="--g:var(--indigo)">${icon[ic]}</span><span class="grow"><span class="title">${t}</span><div class="sub">${d}</div></span></div>`).join('')}</section>
      <p class="footnote" style="margin-top:-8px">Советы по правилам считаются прямо в браузере и никуда не отправляются.</p>`,
  };
}

// ───────── Аналитика ─────────
function viewAnalytics() {
  const ws = doneWs().filter((w) => w.exercises.length);
  const now = new Date();
  const P = ui.period;
  const inRange = (w, a, b) => { const d = L.daysBetween(w.date, now); return d >= a && d < b; };
  const cur = ws.filter((w) => inRange(w, 0, P)), prev = ws.filter((w) => inRange(w, P, 2 * P));
  const sum = (arr, f) => arr.reduce((a, w) => a + f(w), 0);
  const kpi = (label, v, pv, fmt) => {
    const d = pv ? ((v - pv) / pv) * 100 : null;
    return `<div class="kpi"><div class="v">${fmt(v)}</div><div class="l">${label}</div>${d != null ? `<div class="d ${d >= 0 ? 'delta good' : 'delta bad'}">${d >= 0 ? '+' : '−'}${num(Math.abs(d), 0)}%</div>` : '<div class="d muted">—</div>'}</div>`;
  };
  const tipsHtml = advisorCard();
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
    weeks.push({ label: `${s.getDate()}.${String(s.getMonth() + 1).padStart(2, '0')}`, value: sum(items, volumeOf), count: items.length, highlight: i === 0 });
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
    return `<a class="item" href="#ex-${encodeURIComponent(x.name)}">${thumb(x.name)}<span class="grow"><span class="title">${esc(x.name)}</span><div class="sub">${x.count} ${plural(x.count, 'тренировка', 'тренировки', 'тренировок')} · 1ПМ ≈ ${num(x.last, 0)} кг</div></span>${x.count > 1 ? `<span class="delta ${d >= 0 ? 'good' : 'bad'}">${signed(d, 1)} кг</span>` : ''}${icon.chev}</a>`;
  }).join('');
  // Тело и тренировки.
  let bodyVs = '';
  const bodyPts = state.measurements.filter((m) => !m.source).sort((a, b) => a.day.localeCompare(b.day));
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
      <section class="card"><div class="kpis">${kpi('тренировок', cur.length, prev.length, (v) => num(v, 0))}${kpi('тоннаж', sum(cur, volumeOf), sum(prev, volumeOf), tonnage)}${kpi('подходов', sum(cur, L.workoutSetCount), sum(prev, L.workoutSetCount), (v) => num(v, 0))}</div>
      <p class="small muted" style="margin:10px 0 0">Сравнение с предыдущим таким же периодом.</p></section>
      <section class="card"><h2>Тоннаж по неделям</h2>${barChart(weeks, { format: (v) => (v >= 1000 ? `${num(v / 1000, 1)}т` : num(v, 0)), label: 'Тоннаж по неделям' })}</section>
      <section class="card"><h2>Подходы по группам<span class="aside">≈ ${num(Object.entries(sets).filter(([g]) => g !== 'cardio').reduce((a, [, n]) => a + n, 0) / weeksN, 0)} в неделю</span></h2>${groupsHtml || '<p class="muted small">Нет рабочих подходов за период.</p>'}<p class="small muted" style="margin:8px 0 0">Для роста обычно нужно 10–20 рабочих подходов в неделю на группу.</p></section>
      <section class="card"><h2>Календарь<span class="aside">${streak} ${plural(streak, 'неделя', 'недели', 'недель')} подряд</span></h2><div class="heat" aria-label="Тренировки за 16 недель">${heat}</div></section>
      <div class="section-title">Упражнения</div><section class="card list thumbs">${exList || '<p class="muted small">Нет силовых упражнений.</p>'}</section>
      ${bodyVs}`,
  };
}

function weeksAll(ws) {
  const map = new Map();
  for (const w of ws) {
    const s = L.weekStart(w.date);
    const k = s.getTime();
    map.set(k, (map.get(k) || 0) + volumeOf(w));
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ date: new Date(k + 3 * L.DAY_MS), value: v }));
}

function viewExercise(nameEnc) {
  const name = nameEnc;
  const rows = doneWs().sort((a, b) => (a.date < b.date ? -1 : 1)).map((w) => ({ w, e: w.exercises.find((x) => x.name === name) })).filter((x) => x.e && L.workingSets(x.e).length);
  if (!rows.length) return { title: name, top: topBack('#analytics', name), html: '<section class="card empty"><p>По этому упражнению пока нет подходов.</p></section>' };
  const pts = rows.map(({ w, e }) => ({ date: w.date, value: L.bestE1rm(e) }));
  const maxW = Math.max(...rows.flatMap(({ e }) => L.workingSets(e).map((s) => s.weight)));
  const maxV = Math.max(...rows.map(({ e }) => L.entryVolume(e)));
  const best = Math.max(...pts.map((p) => p.value));
  const maxReps = Math.max(...rows.flatMap(({ e }) => L.workingSets(e).map((s) => s.reps)));
  const hist = [...rows].reverse().slice(0, 20).map(({ w, e }) => `<div class="item"><span class="grow"><span class="title">${fmtDay(w.date)}</span><div class="sub tabular">${L.workingSets(e).map((s) => setText(s, name, w)).join(', ')}</div></span><span class="small muted tabular">1ПМ ${num(L.bestE1rm(e), 0)}</span></div>`).join('');
  return {
    title: name, top: topBack('#analytics', name),
    html: `<div class="hero-figure" style="--g:${GROUP_COLOR[groupOf(name)]}">${figureSVG(name, groupOf(name))}</div>
      <section class="card"><h2>Расчётный максимум<span class="aside">формула Эпли</span></h2>${lineChart(pts, { label: 'Расчётный максимум' })}</section>
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
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="${value > target * 1.1 ? 'var(--above)' : 'var(--accent)'}" stroke-opacity="0.2" stroke-width="14"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="${value > target * 1.1 ? 'var(--above)' : 'var(--accent)'}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)"/>
    <text x="70" y="68" text-anchor="middle" style="font:700 26px var(--font-rounded);fill:var(--fg)">${num(value, 0)}</text>
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
const APP_VERSION = (new URL(import.meta.url).searchParams.get('v') || 'dev').replace('forma-', '');

/** Ручное обновление: сохраняем данные, сбрасываем кэш сайта и перезапускаемся с новой версией из сети. */
async function appUpdate() {
  if (!navigator.onLine) { toast('Нет интернета, обновить не получится'); return; }
  toast('Обновляю…');
  await flush();
  try { await (await navigator.serviceWorker?.getRegistration())?.update(); } catch { /* без сервис-воркера */ }
  try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* кэша нет */ }
  setTimeout(() => location.reload(), 400);
}

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
        <button class="btn secondary" data-act="import-backup">Восстановить из копии</button>
        ${snapAt ? `<button class="btn ghost" data-act="undo-restore">Вернуть данные, какими они были до восстановления ${fmtDay(snapAt, false)}</button>` : ''}</section>
      <section class="card stack" id="ai-settings"><h2>ИИ-советник (DeepSeek)</h2>
        <p class="small muted" style="margin:0">Чтобы задавать вопросы советнику, нужен свой ключ API DeepSeek. Создай его на <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com</a> и пополни баланс: один вопрос стоит меньше рубля. Ключ хранится только в этом браузере и не попадает в резервную копию.</p>
        <div class="field"><label for="ai-key">Ключ API</label><input id="ai-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…" value="${esc(AI.getKey())}"></div>
        <div class="seg">${AI.MODES.map(([m, t]) => `<button class="${AI.getMode() === m ? 'on' : ''}" data-act="ai-model" data-m="${m}">${t}</button>`).join('')}</div>
        <p class="small muted" style="margin:0">«Быстрая» отвечает за секунды. «Думающая» рассуждает дольше и стоит дороже, зато точнее в сложных вопросах. Серверы DeepSeek находятся в Китае.</p>
        <div class="grid2"><button class="btn" data-act="ai-save">Сохранить ключ</button>${AI.getKey() ? '<button class="btn danger" data-act="ai-forget">Удалить ключ</button>' : '<span></span>'}</div></section>
      <section class="card stack"><h2>Таймер отдыха</h2><div class="seg">${[60, 90, 120, 180].map((s) => `<button class="${state.settings.restSeconds === s ? 'on' : ''}" data-act="rest" data-s="${s}">${s < 120 ? `${s} с` : `${s / 60} мин`}</button>`).join('')}</div>
        <p class="small muted" style="margin:0">Запускается, когда отмечаешь подход выполненным.</p></section>
      <section class="card stack"><h2>Данные</h2>${state.demo ? '<button class="btn secondary" data-act="clear-demo">Удалить примерные данные</button>' : '<button class="btn ghost" data-act="load-demo">Показать примерные данные</button>'}
        <button class="btn danger" data-act="erase">Стереть всё</button></section>
      <section class="card stack"><h2>Обновление</h2>
        <p class="small muted" style="margin:0">Новая версия подтягивается сама при каждом запуске, если есть интернет. Ярлык переустанавливать не нужно: при удалении ярлыка iPhone стирает и данные приложения.</p>
        <button class="btn secondary" data-act="app-update">Обновить сейчас</button></section>
      <p class="small muted" style="text-align:center">Форма для браузера · версия ${esc(APP_VERSION)} · данные не покидают устройство</p>`,
  };
}

async function shareFile(json, name, title) {
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Файл сохранён в «Загрузки»');
}

function applyMachines(json) {
  const r = L.mergeMachines(machines(), json);
  state.machines = r.machines;
  for (const m of r.machines) { aiEnsureExercise({ name: m.exercise, group: m.group }); for (const x of m.exercises || []) aiEnsureExercise(x); }
  return r;
}

function importMachines(file) {
  file.text().then((text) => {
    let r;
    try { r = applyMachines(text); } catch (e) { toast(e.message); return; }
    save(); render();
    toast(`Добавлено ${r.added}, обновлено ${r.updated}`);
  });
}

// База тренажёров зала лежит рядом с сайтом и подтягивается сама при первом запуске и при её обновлении.
let gymSyncing = false;
async function syncGymBase(force = false) {
  if (gymSyncing) return;
  gymSyncing = true;
  if (force && route().name === 'gym') render();
  try {
    const res = await fetch('./gym-base.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const json = await res.json();
    const v = String(json.version || '');
    if (!v || (state.settings.gymBase === v && machines().length && !force)) return;
    const r = applyMachines(json);
    state.settings.gymBase = v;
    save(); render();
    if (r.added || r.removed) toast([r.added ? `Тренажёры: +${r.added}` : '', r.removed ? `убрано дублей: ${r.removed}` : ''].filter(Boolean).join(', '));
  } catch { if (force) toast('Не получилось загрузить, проверь интернет'); /* иначе попробуем в следующий раз */ } finally {
    gymSyncing = false;
    if (route().name === 'gym') render();
  }
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
      saveSnapshot(state).then((ok) => {
        if (ok) snapAt = new Date().toISOString();
        state = next; save(); go('body'); render(true);
        toast(ok ? 'Данные восстановлены. Вернуть как было можно в Настройках' : 'Данные восстановлены');
      });
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
    case 'go': ev.preventDefault(); go(el.dataset.to); break;
    case 'import-pdf': pickFile('application/pdf,.pdf', importPdf); break;
    case 'import-backup': pickFile('application/json,.json', importBackup); break;
    case 'export': exportBackup(); break;
    case 'app-update': appUpdate(); break;
    case 'undo-restore':
      confirmSheet('Вернуть прежние данные?', 'Данные станут такими, какими были до восстановления из файла. То, что ты записал после восстановления, пропадёт.', 'Вернуть', () => {
        loadSnapshot().then((snap) => {
          if (!snap?.state) { toast('Прежних данных не нашлось'); snapAt = null; render(); return; }
          state = snap.state; snapAt = null; save(); dropSnapshot(); render(true); toast('Вернул прежние данные');
        });
      });
      break;
    case 'load-demo':
      if (state.measurements.length || state.workouts.length) { toast('Примерные данные показываются только в пустом приложении'); break; }
      state = demoState(); save(); render(true); break;
    case 'clear-demo': clearDemo(); toast('Примерные данные удалены'); break;
    case 'erase': confirmSheet('Стереть все данные?', 'Замеры, тренировки и питание удалятся из этого браузера. Отменить нельзя, поэтому сначала сохрани копию.', 'Стереть всё', async () => { await clearState(); state = L.emptyState(); save(); go('body'); render(true); }); break;
    case 'body-metric': ui.bodyMetric = el.dataset.m; render(); break;
    case 'seg-mode': ui.segMode = el.dataset.m; render(); break;
    case 'measurement': measurementSheet(el.dataset.day); break;
    case 'new-workout': closeSheet(); newWorkout(null, 0, el.dataset.day || null); break;
    case 'plan-day': planDay(el.dataset.day, el.dataset.kind, el.dataset.id); break;
    case 'gym-find': gymFind(); break;
    case 'gym-sync': syncGymBase(true); break;
    case 'gym-group': ui.gymG = el.dataset.g; render(); break;
    case 'cal-month': { const d = calBase(); d.setMonth(d.getMonth() + +el.dataset.d); ui.calMonth = d; render(); break; }
    case 'cal-day': calDay(el.dataset.day); break;
    case 'gym-import': pickFile('application/json,.json', importMachines); break;
    case 'gym-export': shareFile(JSON.stringify(L.machinesFile(machines())), `moy-zal-${dayKey(new Date())}.json`, 'Мой зал'); break;
    case 'gym-manual': machineSheet({ name: '', exercise: '', group: 'other', settings: '', photo: null }, { isNew: true }); break;
    case 'gym-open': { ev.preventDefault(); const m = machines().find((x) => x.id === el.dataset.id); if (m) machineSheet(m); break; }
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
      const prev = L.previousEntry(doneWs(), E.name, w.date, w.id);
      const sug = prev && L.suggest(prev.e.sets, E.name, groupOf(E.name), rangeFor(w, E.name));
      if (sug) { E.sets = sug.sets.map((s) => ({ ...s, isDone: false })); save(); render(); }
      break;
    }
    case 'toggle-warm': S.isWarmup = !S.isWarmup; save(); render(); break;
    case 'toggle-done':
      S.isDone = !S.isDone;
      if (S.isDone && w.planned) { delete w.planned; if (dayKeyOf(w.date) === dayKeyOf(new Date())) { w.date = new Date().toISOString(); w.startedAt = w.date; } }
      save(); render();
      if (S.isDone) startTimer(state.settings.restSeconds || 120);
      break;
    case 'cardio-photo': cardioPhoto(w, +el.dataset.e); break;
    case 'del-set': E.sets.splice(+el.dataset.s, 1); save(); render(); break;
    case 'add-set': { const last = E.sets.at(-1); E.sets.push(last ? { ...last, isWarmup: false, isDone: false } : { weight: 0, reps: 0, isWarmup: false, isDone: false }); save(); render(); break; }
    case 'finish': finishWorkout(w); break;
    case 'w-start': delete w.planned; w.date = new Date().toISOString(); w.startedAt = w.date; save(); render(); toast('Тренировка началась'); break;
    case 'w-remind': remindWorkout(w); break;
    case 'remind-id': { const rw = state.workouts.find((x) => x.id === el.dataset.id); if (rw) remindWorkout(rw); break; }
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
    case 'play': startPlayer(el.dataset.id); break;
    case 'tpl-start': startTemplate(el.dataset.id); break;
    case 'ai-send': case 'ai-suggest': case 'ai-new': case 'ai-history': case 'ai-think': case 'ai-copy': case 'ai-retry':
    case 'ai-photo': case 'ai-photo-x': case 'ai-ex-add': case 'ai-ex-workout': case 'ai-ex-gym': case 'ai-plan': case 'ai-plan-all':
      ev.preventDefault(); aiAct(act, el); break;
    case 'ai-model': AI.setMode(el.dataset.m); render(); break;
    case 'ai-key': aiKeySheet(); break;
    case 'ai-save': {
      const v = AI.cleanKey($('#ai-key').value);
      if (!v) { if (route().name === 'ai') toast('Вставь ключ'); else { AI.setKey(''); render(); toast('Ключ удалён'); } break; }
      if (!v.startsWith('sk-')) { toast('Это не ключ DeepSeek: он начинается с sk-. Его создают на platform.deepseek.com → API keys'); break; }
      const label = el.textContent; el.disabled = true; el.textContent = 'Проверяю ключ…';
      AI.checkKey(v).then((r) => {
        if (r.state === 'bad') { el.disabled = false; el.textContent = label; toast('DeepSeek не принял ключ. Он показывается только один раз при создании: создай новый ключ и скопируй его целиком'); return; }
        AI.setKey(v); closeSheet(); render();
        toast(r.state === 'ok' ? `Ключ работает${r.balance ? `, на счёте ${r.balance}` : ''}`
          : r.state === 'money' ? 'Ключ верный, но на счёте DeepSeek нет денег. Пополни баланс на platform.deepseek.com'
          : r.state === 'net' ? 'Ключ сохранён, но DeepSeek сейчас не отвечает. Проверь интернет или VPN'
          : `Ключ сохранён, но DeepSeek ответил ошибкой ${r.status}`);
      });
      break;
    }
    case 'ai-forget': AI.setKey(''); closeSheet(); render(); toast('Ключ удалён'); break;
    case 'b-sec': case 'b-sets': case 'b-rounds': case 'b-rest': case 'b-rrest': case 'b-del': case 'b-up': case 'b-add': case 'b-save': case 'b-delete':
      builderAct(act, el); break;
    default: break;
  }
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.id === 'ai-input') { aiState.draft = el.value; autoGrow(); return; }
  if (el.id === 'gym-q') {
    ui.gymQ = el.value;
    const q = el.value.trim().toLowerCase();
    let n = 0;
    for (const c of document.querySelectorAll('#gym-grid .gym-card')) { const ok = !q || c.dataset.hay.includes(q); c.hidden = !ok; if (ok) n++; }
    const none = $('#gym-none'); if (none) none.hidden = n > 0;
    return;
  }
  if (el.dataset.b && ui.draft) {
    const t = ui.draft.t;
    if (el.dataset.b === 'title') t.title = el.value.slice(0, 60);
    else {
      const v = parseNum(el.value);
      const it = t.items[+el.dataset.i];
      if (it && v != null && v >= 1 && v <= 100) it.reps[el.dataset.b === 'lo' ? 0 : 1] = Math.round(v);
    }
    return;
  }
  const w = currentWorkout();
  if (!w) return;
  if (el.dataset.in) {
    const S = w.exercises[+el.dataset.e]?.sets[+el.dataset.s];
    if (!S) return;
    const v = parseNum(el.value);
    if (el.dataset.in === 'weight') S.weight = v != null && v >= 0 && v <= 1000 ? v : 0;
    else if (el.dataset.in === 'level') { if (v != null && v > 0 && v <= 100) S.level = Math.round(v * 10) / 10; else delete S.level; }
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
  if (ev.target.id === 'ai-input' && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && matchMedia('(hover: hover)').matches) { ev.preventDefault(); aiSend(); return; }
  if (ev.key !== 'Enter' || !ev.target.dataset?.in) return;
  ev.preventDefault();
  const inputs = [...document.querySelectorAll('[data-in]')];
  const i = inputs.indexOf(ev.target);
  const nextIn = inputs[i + 1];
  if (nextIn && (ev.target.dataset.in === 'weight' || (ev.target.dataset.in === 'reps' && nextIn.dataset.in === 'level'))) nextIn.focus(); else ev.target.blur();
});

// ───────── Запуск ─────────
async function start() {
  let saved = null;
  try { saved = await loadState(); } catch { /* без сохранённых данных */ }
  if (saved && Array.isArray(saved.workouts)) {
    state = { ...L.emptyState(), ...saved, settings: { ...L.emptyState().settings, ...(saved.settings || {}) } };
  }
  // Новые упражнения из обновлений (например, для дома) добавляются в старый список.
  for (const [name, group] of L.DEFAULT_EXERCISES) if (!state.exercises.some((e) => e.name === name)) state.exercises.push({ name, group, isCustom: false, note: '' });
  render(true);
  window.__formaBooted = true;
  loadSnapshot().then((snap) => { if (snap?.at && Date.now() - new Date(snap.at) < 30 * 864e5) snapAt = snap.at; });
  persist();
  syncGymBase();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // Новая версия сайта ставится в фоне; как только она взяла управление, перезагружаемся один раз.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    // Не перезагружаемся посреди дела: ИИ читает табло, открыт таймер, чат или окно, идёт тренировка.
    // Тогда обновление ждёт, пока приложение свернут или откроют другой экран.
    const busyNow = () => !!(player.el || aiState.busy || cardioBusy || gymBusy || sheetClose || route().name === 'w');
    const tryReload = () => { if (pendingReload && !reloaded && !busyNow()) { reloaded = true; flush(); location.reload(); } };
    let pendingReload = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || pendingReload) return;
      pendingReload = true;
      flush();
      tryReload();
    });
    addEventListener('hashchange', () => setTimeout(tryReload, 300));
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
}
start().catch((e) => window.__formaFail?.(e?.message || String(e)));
export { state, flush };
