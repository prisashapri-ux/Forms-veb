// ИИ-советник через DeepSeek. Ключ хранится только в этом браузере (localStorage), в резервную копию не попадает.
// Запрос уходит из браузера прямо в DeepSeek, без промежуточного сервера.
import { num, GROUPS } from './logic.js';

const KEY = 'forma.deepseek.key';
const MODEL = 'forma.deepseek.model';
export const MODELS = [['deepseek-chat', 'Быстрая (deepseek-chat)'], ['deepseek-reasoner', 'Думающая (deepseek-reasoner)']];

const ls = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* приватный режим */ } },
};
export const getKey = () => ls.get(KEY);
export const setKey = (v) => ls.set(KEY, String(v || '').trim());
export const getModel = () => (MODELS.some(([m]) => m === ls.get(MODEL)) ? ls.get(MODEL) : MODELS[0][0]);
export const setModel = (v) => ls.set(MODEL, v);

export const SYSTEM_PROMPT = `Ты тренер-советник в приложении «Форма» для силовых тренировок. Пользователь ведёт дневник тренировок (зал и дома) и делает замеры InBody.
Отвечай по-русски, коротко (до 200 слов), по делу и с конкретными цифрами из его данных: рабочие веса, повторы, подходы, тренд мышц и жира.
Всегда опирайся на его прошлые рабочие веса, а не на общие таблицы. Учитывай, что InBody ошибается на 1–2 кг между замерами.
Тренировки дома записаны с весом 0, а в повторах указаны секунды работы.
Если данных не хватает для ответа, так и скажи. Не ставь диагнозов; при боли или травме советуй обратиться к врачу.`;

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
      const hist = x.items.slice(-4).map(([d, sets]) => `${d2(d)}: ${sets.map((q) => `${num(q.weight, 2)}×${q.reps}`).join(', ')}`);
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

/** Сообщения для API: первый вопрос уходит вместе со сводкой. */
export function buildMessages(history, summary) {
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...history.map((m, i) => ({
    role: m.role, content: i === 0 && m.role === 'user' ? `Мои данные:\n${summary}\n\nВопрос: ${m.text}` : m.text,
  }))];
}

const ERR = {
  401: 'Ключ не подошёл. Проверь его в настройках.', 402: 'На счёте DeepSeek закончились деньги. Пополни баланс на platform.deepseek.com.',
  429: 'Слишком много запросов. Подожди минуту и спроси снова.', 500: 'У DeepSeek сбой. Попробуй позже.', 503: 'DeepSeek перегружен. Попробуй позже.',
};

export async function ask(history, summary, fetchFn = fetch) {
  const key = getKey();
  if (!key) throw new Error('Добавь ключ DeepSeek в настройках.');
  let res;
  try {
    res = await fetchFn('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: getModel(), max_tokens: 2000, messages: buildMessages(history, summary) }),
    });
  } catch {
    throw new Error('Не получилось связаться с DeepSeek. Проверь интернет. Если интернет есть, браузер мог заблокировать запрос.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* пустое тело */ }
  if (!res.ok) throw new Error(`${ERR[res.status] || `Ошибка ${res.status}.`}${json?.error?.message ? ` (${String(json.error.message).slice(0, 160)})` : ''}`);
  const text = String(json?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('Пустой ответ. Попробуй ещё раз.');
  return text;
}
