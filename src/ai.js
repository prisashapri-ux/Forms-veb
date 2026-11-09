// ИИ-советник через DeepSeek. Ключ хранится только в этом браузере (localStorage), в резервную копию не попадает.
// Запрос уходит из браузера прямо в DeepSeek, без промежуточного сервера.
import { num, GROUPS } from './logic.js';

const KEY = 'forma.deepseek.key';
const MODEL = 'forma.deepseek.model';
/** Одна модель DeepSeek V4 Flash: видит фото, умеет думать. Режим переключается флагом thinking. */
export const API_MODEL = 'deepseek-flash';
export const MODES = [['fast', 'Быстрая'], ['think', 'Думающая']];

const ls = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* приватный режим */ } },
};
export const getKey = () => ls.get(KEY);
export const setKey = (v) => ls.set(KEY, String(v || '').trim());
// Старые значения deepseek-reasoner/deepseek-chat из прошлых версий переводятся в режимы.
export const getMode = () => { const v = ls.get(MODEL); return v === 'think' || v === 'deepseek-reasoner' ? 'think' : 'fast'; };
export const setMode = (v) => ls.set(MODEL, v === 'think' ? 'think' : 'fast');
export const isThinking = () => getMode() === 'think';

export const SYSTEM_PROMPT = `Ты тренер-советник в приложении «Форма» для силовых тренировок. Пользователь ведёт дневник тренировок (зал и дома) и делает замеры InBody.
Отвечай по-русски, коротко (до 200 слов), по делу и с конкретными цифрами из его данных: рабочие веса, повторы, подходы, тренд мышц и жира.
Всегда опирайся на его прошлые рабочие веса, а не на общие таблицы. Учитывай, что InBody ошибается на 1–2 кг между замерами.
Тренировки дома записаны с весом 0, а в повторах указаны секунды работы. У кардио (дорожка, велотренажёр, эллипс) вместо веса минуты, вместо повторов километры, плюс уровень сопротивления.
Если данных не хватает для ответа, так и скажи. Не ставь диагнозов; при боли или травме советуй обратиться к врачу.

Если пользователь прислал фото тренажёра или снаряда: назови тренажёр, какие мышцы он нагружает, как его настроить (сиденье, валики, рукояти) и 3–4 главных пункта техники. Предложи стартовый вес и подходы с учётом его рабочих весов в похожих упражнениях. Если на фото не тренажёр или его не разобрать, так и скажи и попроси снять ещё раз.
Когда советуешь конкретное упражнение для записи (по фото или по просьбе добавить), в самом конце ответа добавь служебные строки, по одной на упражнение, ровно в таком виде:
[[exercise {"name":"Жим ногами","group":"legs","sets":3,"reps":"10-12","weight":60}]]
group один из: chest, back, legs, glutes, shoulders, biceps, triceps, core, cardio, other. weight в кг, 0 если без веса. Если упражнение есть в списке приложения, бери название из списка дословно. Не больше 4 таких строк, не упоминай их в тексте.`;

/** Разбирает служебные строки [[exercise {...}]] из ответа. Возвращает текст без них и список упражнений. */
export function parseExercises(text) {
  const exercises = [];
  const clean = String(text).replace(/\[\[\s*exercise\s*(\{[^\n]*?\})\s*\]\]/g, (_, json) => {
    try {
      const o = JSON.parse(json);
      const name = String(o.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!name || exercises.some((e) => e.name.toLowerCase() === name.toLowerCase()) || exercises.length >= 4) return '';
      const m = String(o.reps ?? '').match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
      const lo = m ? Math.min(100, Math.max(1, +m[1])) : 10;
      const hi = m && m[2] ? Math.min(100, Math.max(lo, +m[2])) : lo;
      exercises.push({
        name, group: Object.hasOwn(GROUPS, o.group) ? o.group : 'other',
        sets: Math.min(10, Math.max(1, Math.round(+o.sets) || 3)), reps: [lo, hi],
        weight: Math.min(1000, Math.max(0, Math.round((+o.weight || 0) * 2) / 2)),
      });
    } catch { /* битая строка: просто убираем */ }
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { text: clean, exercises };
}

const d2 = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;

/** Текстовая сводка тренировок и замеров для ИИ, без имени. Порт AIAdvisor.summary из iOS. */
export function aiSummary(sessions, body, tips, profile = {}, now = new Date()) {
  const lines = [];
  const recentS = sessions.filter((s) => now - s.date < 56 * 86400000);
  const prof = [profile.age ? `возраст ${profile.age}` : null, profile.heightCm ? `рост ${num(profile.heightCm, 0)} см` : null].filter(Boolean);
  if (prof.length) lines.push(`Профиль: ${prof.join(', ')}.`);
  lines.push(`Сегодня ${d2(now)}.`, '');
  lines.push(`Тренировки за 8 недель: ${recentS.length}. Всего в дневнике: ${sessions.length}.`);
  if (sessions.length) lines.push(`Последняя тренировка: ${d2(sessions.at(-1).date)}.`);
  const by = new Map();
  for (const s of recentS) for (const e of s.exercises) {
    if (!e.sets.length) continue;
    if (!by.has(e.name)) by.set(e.name, { group: e.group, items: [] });
    by.get(e.name).items.push([s.date, e.sets]);
  }
  if (by.size) {
    lines.push('', 'Упражнения (дата: вес×повторы рабочих подходов):');
    for (const [name, x] of by) {
      const hist = x.items.slice(-4).map(([d, sets]) => `${d2(d)}: ${sets.map((q) => (q.level ? `${num(q.weight, 2)} мин, ${q.reps} км, уровень ${num(q.level, 1)}` : `${num(q.weight, 2)}×${q.reps}`)).join(', ')}`);
      lines.push(`- ${name} [${GROUPS[x.group] || 'Другое'}], тренировок ${x.items.length}: ${hist.join('; ')}`);
    }
  }
  const pts = body.slice(-6);
  if (pts.length) {
    lines.push('', `Замеры InBody (последние ${pts.length}):`);
    for (const p of pts) {
      const parts = [];
      if (p.weight != null) parts.push(`вес ${num(p.weight)} кг`);
      if (p.muscle != null) parts.push(`мышцы ${num(p.muscle)} кг`);
      if (p.fatPercent != null) parts.push(`жир ${num(p.fatPercent)}%`);
      if (p.fatMass != null) parts.push(`жир ${num(p.fatMass)} кг`);
      if (p.standard != null) parts.push(p.standard ? 'утром натощак' : 'условия другие');
      lines.push(`- ${d2(p.date)}: ${parts.join(', ')}`);
    }
    const p = pts.at(-1);
    if (p.leftArm && p.rightArm && p.leftLeg && p.rightLeg) lines.push(`Сегменты мышц в последнем замере: руки ${num(p.leftArm)}/${num(p.rightArm)} кг, ноги ${num(p.leftLeg)}/${num(p.rightLeg)} кг (левая/правая).`);
  }
  if (tips.length) lines.push('', `Что уже заметили правила приложения: ${tips.slice(0, 5).map((t) => t.title).join('; ')}.`);
  return lines.join('\n');
}

/**
 * Сообщения для API: первый вопрос уходит вместе со сводкой. Фото (m.image или уменьшенная m.thumb)
 * прикладывается к сообщению пользователя по формату OpenAI: [{type:'text'}, {type:'image_url'}].
 */
export function buildMessages(history, summary, exerciseNames = [], machines = []) {
  const system = exerciseNames.length ? `${SYSTEM_PROMPT}\n\nУпражнения в приложении: ${exerciseNames.join(', ')}.` : SYSTEM_PROMPT;
  return [{ role: 'system', content: system }, ...history.map((m, i) => {
    const text = i === 0 && m.role === 'user' ? `Мои данные:\n${summary}\n\nВопрос: ${m.text}` : m.text;
    const img = m.role === 'user' ? m.image || m.thumb : null;
    if (!img) return { role: m.role, content: text };
    // К свежему фото прикладываются тренажёры из «Моего зала», чтобы ИИ узнал свой.
    const refs = m.image ? machineRefs(machines) : [];
    return { role: 'user', content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: img, detail: m.image ? 'high' : 'low' } }, ...refs] };
  })];
}

/** Сохранённые тренажёры для сравнения: подпись и маленькое фото каждого, не больше 20. */
export function machineRefs(machines) {
  const list = machines.filter((x) => x.photo).slice(0, 20);
  if (!list.length) return [];
  const out = [{ type: 'text', text: `Мои сохранённые тренажёры («Мой зал»). Если на фото выше один из них, так и скажи («это твой …»), используй его упражнение и мои настройки:` }];
  list.forEach((x, i) => {
    out.push({ type: 'text', text: `Тренажёр ${i + 1}: ${x.name}, упражнение «${x.exercise}»${x.settings ? `, мои настройки: ${x.settings}` : ''}` });
    out.push({ type: 'image_url', image_url: { url: x.photo, detail: 'low' } });
  });
  return out;
}

const ERR = {
  401: 'Ключ не подошёл. Проверь его в настройках.', 402: 'На счёте DeepSeek закончились деньги. Пополни баланс на platform.deepseek.com.',
  429: 'Слишком много запросов. Подожди минуту и спроси снова.', 500: 'У DeepSeek сбой. Попробуй позже.', 503: 'DeepSeek перегружен. Попробуй позже.',
};

const LEGACY_MODEL = 'deepseek-chat';

async function post(fetchFn, key, body) {
  let res;
  try {
    res = await fetchFn('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Не получилось связаться с DeepSeek. Проверь интернет. Если интернет есть, браузер мог заблокировать запрос.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* пустое тело */ }
  return { res, json };
}

/**
 * Вопрос к DeepSeek. Если аккаунту недоступна deepseek-flash, один раз повторяет на старой
 * deepseek-chat: она без фото, поэтому снимки заменяются пометкой.
 */
export async function ask(history, summary, fetchFn = fetch, exerciseNames = [], machines = []) {
  const key = getKey();
  if (!key) throw new Error('Добавь ключ DeepSeek в настройках.');
  const think = isThinking();
  let { res, json } = await post(fetchFn, key, {
    model: API_MODEL, thinking: { type: think ? 'enabled' : 'disabled' },
    max_tokens: think ? 8000 : 2000, messages: buildMessages(history, summary, exerciseNames, machines),
  });
  const modelErr = !res.ok && [400, 404, 422].includes(res.status) && /model/i.test(String(json?.error?.message || ''));
  if (modelErr) {
    const hadPhoto = history.some((m) => m.image || m.thumb);
    const plain = history.map(({ image, thumb, ...m }) => (image || thumb ? { ...m, text: `${m.text}\n(К сообщению приложено фото, но эта модель его не видит.)` } : m));
    ({ res, json } = await post(fetchFn, key, { model: LEGACY_MODEL, max_tokens: 2000, messages: buildMessages(plain, summary, exerciseNames) }));
    if (res.ok && hadPhoto) json = { ...json, legacyNoPhoto: true };
  }
  if (!res.ok) throw new Error(`${ERR[res.status] || `Ошибка ${res.status}.`}${json?.error?.message ? ` (${String(json.error.message).slice(0, 160)})` : ''}`);
  const text = String(json?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('Пустой ответ. Попробуй ещё раз.');
  return json.legacyNoPhoto ? `${text}\n\n*DeepSeek не дал этому ключу модель с распознаванием фото, поэтому ответ без учёта снимка.*` : text;
}

// ───────── История разговоров (только в этом браузере) ─────────
const CHATS = 'forma.ai.chats';
export function loadChats() {
  try {
    const v = JSON.parse(ls.get(CHATS) || '[]');
    return Array.isArray(v) ? v.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.msgs)) : [];
  } catch { return []; }
}
/** Полноразмерные фото в историю не пишутся, только миниатюры: localStorage маленький. */
export function saveChats(chats) {
  const trimmed = [...chats].sort((a, b) => b.updated - a.updated).slice(0, 40)
    .map((c) => ({ ...c, msgs: c.msgs.slice(-80).map(({ image, ...m }) => m) }));
  try { localStorage.setItem(CHATS, JSON.stringify(trimmed)); return; } catch { /* места мало: ниже без старых миниатюр */ }
  // Не влезло: миниатюры остаются только в самом свежем разговоре.
  ls.set(CHATS, JSON.stringify(trimmed.map((c, i) => (i ? { ...c, msgs: c.msgs.map(({ thumb, ...m }) => (thumb ? { ...m, hadPhoto: true } : m)) } : c))));
}
export const chatTitle = (text) => { const t = String(text).replace(/\s+/g, ' ').trim(); return t.length > 48 ? `${t.slice(0, 46)}…` : t || 'Новый чат'; };

/** Простая разметка ответа: абзацы, списки, **жирный**, `код`, заголовки. Вход экранируется. */
export function mdLite(src) {
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>');
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of String(src).replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-*•]\s+(.*)$/), ol = line.match(/^\s*\d+[.)]\s+(.*)$/), h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (h) { flushPara(); flushList(); out.push(`<h4>${inline(h[1])}</h4>`); continue; }
    if (ul || ol) {
      flushPara();
      const tag = ul ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list ||= { tag, items: [] };
      list.items.push((ul || ol)[1]);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flushPara(); flushList(); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('');
}

// ───────── Табло кардиотренажёра по фото ─────────
const DISPLAY_PROMPT = `Ты считываешь итог с табло кардиотренажёра (эллипс, велотренажёр, беговая дорожка) по фото.
Ответь только JSON без пояснений: {"ok":true,"minutes":число или null,"km":число или null,"level":число или null,"calories":число или null,"note":"коротко, что не удалось прочитать"}.
minutes: время тренировки в минутах, «32:30» это 32.5. km: дистанция в километрах, мили переведи в км. level: уровень сопротивления или нагрузки (Level, Resistance, Res), для дорожки наклон не путай с уровнем: если уровня нет, null.
calories: ккал. Не выдумывай: если значения на табло не видно, ставь null. Если на фото не табло тренажёра, верни {"ok":false,"note":"почему"}.`;

const clampNum = (v, max, digits = 1) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > max) return null;
  const k = 10 ** digits;
  return Math.round(n * k) / k;
};

/** Разбирает ответ модели про табло: проверяет диапазоны, лишнее отбрасывает. */
export function parseDisplay(text) {
  let o;
  try { o = JSON.parse(String(text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new Error('ИИ ответил непонятно. Попробуй сфотографировать ещё раз.'); }
  if (!o || o.ok === false) throw new Error(`Не получилось прочитать табло${o?.note ? `: ${String(o.note).slice(0, 140)}` : '.'}`);
  const r = { minutes: clampNum(o.minutes, 600), km: clampNum(o.km, 200, 2), level: clampNum(o.level, 100), calories: clampNum(o.calories, 5000, 0) };
  if (r.minutes == null && r.km == null && r.level == null && r.calories == null) throw new Error('На фото не видно цифр табло. Сними ближе и без бликов.');
  return r;
}

export async function readCardioDisplay(image, exercise, fetchFn = fetch) {
  const key = getKey();
  if (!key) throw new Error('Чтобы читать табло по фото, подключи DeepSeek во вкладке «ИИ».');
  const { res, json } = await post(fetchFn, key, {
    model: API_MODEL, thinking: { type: 'disabled' }, max_tokens: 300, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: DISPLAY_PROMPT }, { role: 'user', content: [
      { type: 'text', text: `Тренажёр: ${exercise}. Считай итог тренировки с табло, ответ в JSON.` },
      { type: 'image_url', image_url: { url: image, detail: 'high' } },
    ] }],
  });
  if (!res.ok) {
    if ([400, 404, 422].includes(res.status) && /model/i.test(String(json?.error?.message || ''))) throw new Error('DeepSeek не дал этому ключу модель, которая видит фото.');
    throw new Error(`${ERR[res.status] || `Ошибка ${res.status}.`}${json?.error?.message ? ` (${String(json.error.message).slice(0, 160)})` : ''}`);
  }
  return parseDisplay(json?.choices?.[0]?.message?.content || '');
}

// ───────── «Мой зал»: узнать тренажёр по фото ─────────
const MACHINE_PROMPT = `Ты узнаёшь тренажёры в спортзале по фото. Тебе дают новое фото и, возможно, список уже сохранённых тренажёров пользователя с их фото.
Ответь только JSON: {"ok":true,"match":номер сохранённого тренажёра или null,"name":"короткое название тренажёра по-русски","exercise":"основное упражнение на нём","group":"chest|back|legs|glutes|shoulders|biceps|triceps|core|cardio|other","tip":"одна фраза: как настроить под себя"}.
match ставь, только если это явно тот же тренажёр (та же модель и вид), а не просто похожий тип. Если упражнение есть в списке приложения, бери название оттуда дословно.
Если на фото не тренажёр и не снаряд, верни {"ok":false,"note":"почему"}.`;

/** Разбирает ответ про тренажёр. match приводится к индексу массива сохранённых (с нуля) или null. */
export function parseMachine(text, count) {
  let o;
  try { o = JSON.parse(String(text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new Error('ИИ ответил непонятно. Попробуй сфотографировать ещё раз.'); }
  if (!o || o.ok === false) throw new Error(`Не получилось узнать тренажёр${o?.note ? `: ${String(o.note).slice(0, 140)}` : '.'}`);
  const n = Number(o.match);
  const name = String(o.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return {
    match: Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : null,
    name: name || 'Тренажёр', exercise: String(o.exercise || name || '').replace(/\s+/g, ' ').trim().slice(0, 60) || name || 'Тренажёр',
    group: Object.hasOwn(GROUPS, o.group) ? o.group : 'other', tip: String(o.tip || '').trim().slice(0, 200),
  };
}

export async function identifyMachine(image, machines = [], exerciseNames = [], fetchFn = fetch) {
  const key = getKey();
  if (!key) throw new Error('Чтобы узнавать тренажёры по фото, подключи DeepSeek во вкладке «ИИ».');
  const refs = machineRefs(machines);
  const { res, json } = await post(fetchFn, key, {
    model: API_MODEL, thinking: { type: 'disabled' }, max_tokens: 400, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: exerciseNames.length ? `${MACHINE_PROMPT}\nУпражнения в приложении: ${exerciseNames.join(', ')}.` : MACHINE_PROMPT },
      { role: 'user', content: [{ type: 'text', text: 'Новое фото. Что это за тренажёр? Ответ в JSON.' }, { type: 'image_url', image_url: { url: image, detail: 'high' } }, ...refs] },
    ],
  });
  if (!res.ok) {
    if ([400, 404, 422].includes(res.status) && /model/i.test(String(json?.error?.message || ''))) throw new Error('DeepSeek не дал этому ключу модель, которая видит фото.');
    throw new Error(`${ERR[res.status] || `Ошибка ${res.status}.`}${json?.error?.message ? ` (${String(json.error.message).slice(0, 160)})` : ''}`);
  }
  return parseMachine(json?.choices?.[0]?.message?.content || '', machines.filter((x) => x.photo).slice(0, 20).length);
}
