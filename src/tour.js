// Обучение для новых пользователей: экран приветствия, короткий тур по вкладкам с подсветкой
// и экран «С чего начать». Открывается из профиля или настроек.
// Кнопки с data-act на последнем экране обрабатывает общий обработчик кликов в app.js.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Шаги тура по вкладкам: id вкладки, заголовок, текст, подсказки.
export const TOUR_STEPS = [
  ['today', 'Сегодня', 'Отсюда можно сразу начать или продолжить тренировку.',
    ['Здесь же видны цель, питание, активность за неделю и календарь.']],
  ['diary', 'Тренировки', 'Выбери программу, начни пустую тренировку или запусти комплекс дома.',
    ['После отметки подхода запускается таймер отдыха.', 'Тренажёры и прошлые тренировки доступны в этом разделе.']],
  ['body', 'Прогресс', 'Следи за составом тела, динамикой и рекордами.',
    ['PDF InBody можно импортировать в любой момент. Замеры сохраняются в истории.']],
  ['ai', 'ИИ-тренер', 'Спроси о программе, технике или питании. Можно приложить фото тренажёра.',
    ['Для запросов нужен ключ DeepSeek. Сообщения, фото и сводка дневника передаются в этот сервис.']],
  ['profile', 'Профиль', 'Выбери цель, тему оформления и сделай резервную копию.',
    ['Питание также доступно с экрана «Сегодня».']],
];

const FEATURES = [
  ['diary', 'var(--blue)', 'Тренировки', 'Записывай подходы в зале и занимайся дома по таймеру.'],
  ['chart', 'var(--purple)', 'Прогресс', 'Следи за замерами, нагрузкой и рекордами.'],
  ['food', 'var(--green)', 'Питание', 'Записывай калории и белок с учётом своей цели.'],
];

let el = null;
let ctx = null;
let page = 0; // 0 приветствие, 1..N вкладки, N+1 «С чего начать»
let returnHash = '';
let opener;
const background = () => document.querySelectorAll('#app, .tabbar, #timer');
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
  opener = document.activeElement;
  el = document.createElement('div');
  el.className = 'tour';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.tabIndex = -1;
  el.addEventListener('click', onClick);
  document.body.append(el);
  background().forEach((node) => { node.inert = true; });
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
  background().forEach((node) => { node.inert = false; });
  const focus = opener?.isConnected ? opener : document.querySelector('#view');
  focus?.focus({ preventScroll: true });
  removeEventListener('keydown', onKey);
  removeEventListener('resize', place);
  if (!silent) ctx?.onClose?.(finished);
}

function onKey(e) {
  if (e.key === 'Escape') { closeTour(page === LAST); if (page > 0 && page < LAST) restore(); }
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
}

function restore() { if (returnHash !== undefined) ctx.go(returnHash.replace(/^#/, '') || 'today'); }

function step(d) {
  const next = Math.max(0, Math.min(LAST, page + d));
  if (next === page) return;
  page = next;
  draw();
}

function onClick(e) {
  const b = e.target.closest('[data-tour], [data-act]');
  if (!b) return;
  if (b.dataset.act) { closeTour(true); ctx.go('today'); return; } // дальше кнопку обработает app.js
  const t = b.dataset.tour;
  if (t === 'next') step(1);
  else if (t === 'back') step(-1);
  else if (t === 'start') step(1);
  else if (t === 'skip') { closeTour(false); restore(); }
  else if (t === 'done') { closeTour(true); ctx.go('today'); }
}

const dots = () => `<div class="tour-dots" aria-hidden="true">${TOUR_STEPS.map((_, i) => `<i class="${i + 1 === page ? 'on' : ''}"></i>`).join('')}</div>`;

function draw() {
  el.focus({ preventScroll: true });
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
          <li><b>Проведи первую тренировку.</b> Начни на экране «Сегодня» или выбери домашний комплекс в «Тренировках».</li>
          ${standalone ? '' : '<li><b>Поставь «Форму» на экран «Домой».</b> В Safari нажми «Поделиться», затем «На экран „Домой“».</li>'}
          <li><b>Раз в неделю сохраняй копию</b> в Настройках: файл поможет перенести дневник на другое устройство.</li>
        </ol>
      </div>
      <div class="tour-actions">
        ${ctx.empty ? `<button class="btn secondary block" data-act="import-pdf">${ic.upload} Загрузить отчёт InBody</button>
        <button class="btn secondary block" data-act="load-demo">Посмотреть на примерных данных</button>` : ''}
        <button class="btn block" data-tour="done">${ctx.empty ? 'К первой тренировке' : 'Готово'}</button>
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
