// Обучение для новых пользователей: экран приветствия, короткий тур по вкладкам с подсветкой
// и экран «С чего начать». Показывается при первом запуске, повторяется из Настроек.
// Кнопки с data-act на последнем экране обрабатывает общий обработчик кликов в app.js.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Шаги тура по вкладкам: id вкладки, заголовок, текст, подсказки.
export const TOUR_STEPS = [
  ['body', 'Тело', 'Здесь твой состав тела по отчётам InBody: вес, мышцы, жир, вода и сегменты рук, ног и торса.',
    ['Скачай PDF отчёта в приложении DDX Fitness и загрузи кнопкой со стрелкой вверху.', 'Каждый новый отчёт добавляется в историю, графики строятся сами.', 'Шестерёнка открывает настройки и резервную копию.']],
  ['diary', 'Дневник', 'Тренировки в зале: начни пустую, повтори прошлую или возьми готовую программу.',
    ['Отмечай подход галочкой, и запустится таймер отдыха.', '«Форма» подскажет, когда добавить вес или повторы.', 'В календаре видны прошедшие и запланированные тренировки.']],
  ['gym', 'Тренажёры', 'Тренажёры с анимацией движения и подсказками по технике.',
    ['Найди тренажёр поиском или по группе мышц.', 'Сфотографируй тренажёр в зале, и «Форма» подскажет, что это за упражнение.', 'Сохраняй свои настройки сиденья и упоров.']],
  ['home', 'Дома', 'Тренировки без зала: комплексы на таймере с голосовыми подсказками.',
    ['Есть разделы для перекладины, резинок, растяжки и осанки.', 'Нагрузка растёт сама: каждые 3 тренировки уровень повышается.', 'После отрезка можно записать, сколько повторов получилось.']],
  ['ai', 'ИИ', 'Чат с ИИ-советником: спроси про программу, технику или питание, пришли фото тренажёра.',
    ['Нужен свой ключ DeepSeek, его вставляют в Настройках.', 'Советник видит твои замеры и тренировки, поэтому отвечает по делу.']],
  ['analytics', 'Анализ', 'Прогресс в цифрах: объём по группам мышц, рекорды и динамика каждого упражнения.',
    ['Советник без интернета подскажет, где ты отстаёшь и когда отдохнуть.', 'Нажми на упражнение, чтобы увидеть его историю.']],
  ['food', 'Питание', 'Белок и калории за день. Норма считается по твоему отчёту InBody и цели.',
    ['Выбери цель: похудеть, держать вес или набрать мышцы.', 'Добавляй еду из готовых вариантов или вписывай свою.']],
];

const FEATURES = [
  ['body', 'var(--purple)', 'Состав тела', 'Загружай отчёты InBody из DDX и следи за мышцами и жиром.'],
  ['diary', 'var(--orange)', 'Тренировки', 'Записывай подходы в зале и занимайся дома по таймеру.'],
  ['spark', 'var(--indigo)', 'Подсказки', 'Советник подскажет, когда прибавить вес и где ты отстаёшь.'],
  ['lock', 'var(--green)', 'Данные только у тебя', 'Всё хранится в этом браузере и никуда не отправляется.'],
];

let el = null;
let ctx = null;
let page = 0; // 0 приветствие, 1..N вкладки, N+1 «С чего начать»
let returnHash = '';
const LAST = TOUR_STEPS.length + 1;

export const tourOpen = () => !!el;

/**
 * Открывает обучение.
 * opts: icon (набор иконок), go(hash), color(tab) цвет вкладки, empty (нет данных), standalone (открыто с экрана «Домой»),
 * onClose(finished) вызывается при закрытии.
 */
export function openTour(opts, startPage = 0) {
  closeTour(false, true);
  ctx = opts;
  page = startPage;
  returnHash = location.hash;
  el = document.createElement('div');
  el.className = 'tour';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.addEventListener('click', onClick);
  document.body.append(el);
  document.body.classList.add('touring');
  addEventListener('keydown', onKey);
  addEventListener('resize', place);
  draw();
}

export function closeTour(finished = false, silent = false) {
  if (!el) return;
  el.remove();
  el = null;
  document.body.classList.remove('touring');
  removeEventListener('keydown', onKey);
  removeEventListener('resize', place);
  if (!silent) ctx?.onClose?.(finished);
}

function onKey(e) {
  if (e.key === 'Escape') { closeTour(page === LAST); if (page > 0 && page < LAST) restore(); }
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
}

function restore() { if (returnHash !== undefined) ctx.go(returnHash.replace(/^#/, '') || 'body'); }

function step(d) {
  const next = Math.max(0, Math.min(LAST, page + d));
  if (next === page) return;
  page = next;
  draw();
}

function onClick(e) {
  const b = e.target.closest('[data-tour], [data-act]');
  if (!b) return;
  if (b.dataset.act) { closeTour(true); ctx.go('body'); return; } // дальше кнопку обработает app.js
  const t = b.dataset.tour;
  if (t === 'next') step(1);
  else if (t === 'back') step(-1);
  else if (t === 'start') step(1);
  else if (t === 'skip') { closeTour(false); restore(); }
  else if (t === 'done') { closeTour(true); ctx.go('body'); }
}

const dots = () => `<div class="tour-dots" aria-hidden="true">${TOUR_STEPS.map((_, i) => `<i class="${i + 1 === page ? 'on' : ''}"></i>`).join('')}</div>`;

function draw() {
  const ic = ctx.icon;
  el.classList.toggle('full', page === 0 || page === LAST);
  if (page === 0) {
    el.setAttribute('aria-label', 'Добро пожаловать');
    el.innerHTML = `<div class="tour-page">
      <div class="tour-scroll">
        <h1>Добро пожаловать<br>в «Форму»</h1>
        <ul class="tour-feats">${FEATURES.map(([i, c, t, d]) => `<li><span class="ic" style="color:${c}">${ic[i]}</span><span><b>${esc(t)}</b><span>${esc(d)}</span></span></li>`).join('')}</ul>
      </div>
      <div class="tour-actions">
        <p class="small muted">Покажу за минуту, что где находится.</p>
        <button class="btn block" data-tour="start">Показать</button>
        <button class="btn ghost block" data-tour="skip">Пропустить</button>
      </div></div>`;
    return;
  }
  if (page === LAST) {
    el.setAttribute('aria-label', 'С чего начать');
    const standalone = ctx.standalone;
    el.innerHTML = `<div class="tour-page">
      <div class="tour-scroll">
        <span class="tour-badge" style="background:var(--green)">${ic.check}</span>
        <h1>С чего начать</h1>
        <ol class="tour-start">
          <li><b>Загрузи отчёт InBody.</b> PDF из приложения DDX Fitness заполнит раздел «Тело».</li>
          <li><b>Проведи первую тренировку.</b> В «Дневнике» для зала или в «Дома» по таймеру.</li>
          ${standalone ? '' : '<li><b>Поставь «Форму» на экран «Домой».</b> В Safari нажми «Поделиться», затем «На экран „Домой“». Так iPhone не сотрёт её данные.</li>'}
          <li><b>Раз в неделю сохраняй копию</b> в Настройках: данные живут только в этом браузере.</li>
        </ol>
      </div>
      <div class="tour-actions">
        ${ctx.empty ? `<button class="btn block" data-act="import-pdf">${ic.upload} Загрузить отчёт InBody</button>
        <button class="btn secondary block" data-act="load-demo">Посмотреть на примерных данных</button>` : ''}
        <button class="btn ${ctx.empty ? 'ghost' : ''} block" data-tour="done">${ctx.empty ? 'Начать с нуля' : 'Готово'}</button>
      </div></div>`;
    return;
  }
  const [tab, title, text, tips] = TOUR_STEPS[page - 1];
  ctx.go(tab);
  el.setAttribute('aria-label', `${title}, шаг ${page} из ${TOUR_STEPS.length}`);
  el.innerHTML = `<div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-card" style="--tabc:${ctx.color?.(tab) || 'var(--accent)'}">
      <header><span class="n">${page} из ${TOUR_STEPS.length}</span><button class="tour-x" data-tour="skip" aria-label="Закрыть обучение">${ctx.icon.x}</button></header>
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      <ul>${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <footer>${dots()}<span class="grow"></span>
        <button class="btn small gray" data-tour="back">Назад</button>
        <button class="btn small" data-tour="next">${page === TOUR_STEPS.length ? 'Дальше' : 'Далее'}</button></footer>
    </div>`;
  // Новый экран рисуется по событию hashchange, поэтому место подсветки считаем на следующем кадре.
  requestAnimationFrame(place);
}

// Ставит подсветку на кнопку вкладки внизу и карточку над панелью вкладок.
function place() {
  if (!el || page === 0 || page === LAST) return;
  const tab = TOUR_STEPS[page - 1][0];
  const a = document.querySelector(`#tabs a[href="#${tab}"]`);
  const hole = el.querySelector('.tour-hole');
  const card = el.querySelector('.tour-card');
  const bar = document.querySelector('.tabbar');
  if (!a || !hole || !card) return;
  const r = a.getBoundingClientRect();
  const pad = 4;
  Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  const barTop = bar ? bar.getBoundingClientRect().top : innerHeight;
  card.style.bottom = `${Math.max(12, innerHeight - barTop + 14)}px`;
  // Хвостик карточки указывает на вкладку.
  const cr = card.getBoundingClientRect();
  card.style.setProperty('--tail', `${Math.min(cr.width - 22, Math.max(22, r.left + r.width / 2 - cr.left))}px`);
}
