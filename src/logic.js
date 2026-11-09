// Логика «Формы» без интерфейса: форматирование, прогрессия, программы, тренд, советник,
// питание и резервная копия. Порт моделей из Forma/Models/*.swift.
import { HOME_EXERCISES } from './home.js';
import { PULLUP_EXERCISES } from './extras.js';

// ───────── Справочники ─────────

export const GROUPS = {
  chest: 'Грудь', back: 'Спина', legs: 'Ноги', glutes: 'Ягодицы', shoulders: 'Плечи',
  biceps: 'Бицепс', triceps: 'Трицепс', core: 'Пресс', cardio: 'Кардио', other: 'Другое',
};

export const METRIC_INFO = {
  weight: { title: 'Вес', short: 'Вес', unit: 'кг', better: null, noise: 0.5, digits: 1 },
  muscleMass: { title: 'Мышцы', short: 'Мышцы', unit: 'кг', better: true, noise: 0.7, digits: 1 },
  fatPercent: { title: 'Жир, %', short: 'Жир, %', unit: '%', better: false, noise: 1.0, digits: 1 },
  fatMass: { title: 'Жир, кг', short: 'Жир, кг', unit: 'кг', better: false, noise: 1.0, digits: 1 },
  water: { title: 'Вода', short: 'Вода', unit: 'л', better: null, noise: 0.7, digits: 1 },
  protein: { title: 'Белок', short: 'Белок', unit: 'кг', better: true, noise: 0.2, digits: 1 },
  bone: { title: 'Кости', short: 'Кости', unit: 'кг', better: null, noise: null, digits: 2 },
  visceralFat: { title: 'Висцеральный жир', short: 'Висц. жир', unit: '', better: false, noise: null, digits: 0 },
  bmi: { title: 'ИМТ', short: 'ИМТ', unit: '', better: null, noise: null, digits: 1 },
  fatFreeMass: { title: 'Безжировая масса', short: 'Безжир. масса', unit: 'кг', better: true, noise: 0.7, digits: 1 },
  bmr: { title: 'Обмен веществ', short: 'Обмен', unit: 'ккал', better: null, noise: null, digits: 0 },
  score: { title: 'Оценка InBody', short: 'Оценка', unit: '', better: true, noise: null, digits: 0 },
};
export const PARTIAL_METRICS = ['weight', 'muscleMass', 'fatPercent'];

export const SEGMENT_TITLES = {
  leftArm: 'Левая рука', rightArm: 'Правая рука', trunk: 'Торс', leftLeg: 'Левая нога', rightLeg: 'Правая нога',
};
export const STATUS_TITLES = { below: 'Ниже нормы', normal: 'Норма', above: 'Выше нормы' };

export const DEFAULT_EXERCISES = [
  ['Жим штанги лёжа', 'chest'], ['Жим гантелей лёжа', 'chest'], ['Жим штанги на наклонной скамье', 'chest'],
  ['Жим гантелей на наклонной скамье', 'chest'], ['Сведение рук в кроссовере', 'chest'], ['Бабочка (пек-дек)', 'chest'],
  ['Отжимания на брусьях', 'chest'], ['Подтягивания', 'back'], ['Тяга верхнего блока', 'back'],
  ['Тяга штанги в наклоне', 'back'], ['Тяга гантели в наклоне', 'back'], ['Тяга горизонтального блока', 'back'],
  ['Становая тяга', 'back'], ['Гиперэкстензия', 'back'], ['Приседания со штангой', 'legs'], ['Жим ногами', 'legs'],
  ['Выпады с гантелями', 'legs'], ['Разгибание ног в тренажёре', 'legs'], ['Сгибание ног в тренажёре', 'legs'],
  ['Румынская тяга', 'legs'], ['Подъём на носки', 'legs'], ['Ягодичный мост', 'glutes'],
  ['Отведение ноги в кроссовере', 'glutes'], ['Жим штанги стоя', 'shoulders'], ['Жим гантелей сидя', 'shoulders'],
  ['Махи гантелями в стороны', 'shoulders'], ['Обратные разведения (задняя дельта)', 'shoulders'],
  ['Подъём штанги на бицепс', 'biceps'], ['Подъём гантелей на бицепс', 'biceps'], ['Молотки', 'biceps'],
  ['Французский жим', 'triceps'], ['Разгибание рук на блоке', 'triceps'], ['Жим узким хватом', 'triceps'],
  ['Скручивания', 'core'], ['Планка', 'core'], ['Подъём ног в висе', 'core'],
  ['Беговая дорожка', 'cardio'], ['Велотренажёр', 'cardio'], ['Эллипс', 'cardio'],
  ...PULLUP_EXERCISES,
  ...HOME_EXERCISES,
];

// ───────── Форматирование ─────────

const nfCache = {};
export function num(v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  const f = (nfCache[digits] ||= new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }));
  return f.format(v);
}
export function signed(v, digits = 1) {
  const n = num(Math.abs(v), digits);
  return v > 0 ? `+${n}` : v < 0 ? `−${n}` : n;
}
export function metricValue(v, metric) {
  if (v == null) return '—';
  const info = METRIC_INFO[metric];
  const n = num(v, info.digits);
  return info.unit ? `${n} ${info.unit}` : n;
}
export function tonnage(kg) {
  return kg >= 1000 ? `${num(kg / 1000, 1)} т` : `${num(kg, 0)} кг`;
}
export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
}

// ───────── Даты (день хранится строкой YYYY-MM-DD в местном времени) ─────────

export const DAY_MS = 86_400_000;
export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function dayDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function daysBetween(a, b) {
  return (toDate(b) - toDate(a)) / DAY_MS;
}
export function toDate(x) {
  if (x instanceof Date) return x;
  if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) return dayDate(x);
  return new Date(x);
}
const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export function fmtDay(x, withYear = true) {
  const d = toDate(x);
  const s = `${d.getDate()} ${months[d.getMonth()]}`;
  return withYear && d.getFullYear() !== new Date().getFullYear() ? `${s} ${d.getFullYear()}` : s;
}
export function weekStart(x) {
  const d = toDate(x);
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ───────── Тренировки ─────────

export const workingSets = (entry) => entry.sets.filter((s) => !s.isWarmup && (s.reps > 0 || (s.level > 0 && s.weight > 0)));
export const e1rm = (s) => (s.reps <= 0 ? 0 : s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30));
export const entryVolume = (entry) => workingSets(entry).reduce((a, s) => a + s.weight * s.reps, 0);
// У кардио в «весе» минуты, а в «повторах» километры: в тоннаж они не идут.
const CARDIO_NAMES = new Set(DEFAULT_EXERCISES.filter(([, g]) => g === 'cardio').map(([n]) => n));
export const workoutVolume = (w) => w.exercises.reduce((a, e) => a + (CARDIO_NAMES.has(e.name) ? 0 : entryVolume(e)), 0);
export const workoutSetCount = (w) => w.exercises.reduce((a, e) => a + workingSets(e).length, 0);
export const bestE1rm = (entry) => Math.max(0, ...workingSets(entry).map(e1rm));

/** Прошлое выполнение упражнения до даты `before` (исключая тренировку exceptId). */
export function previousEntry(workouts, name, before, exceptId) {
  let best = null;
  for (const w of workouts) {
    if (w.id === exceptId || (before && w.date >= before)) continue;
    const e = w.exercises.find((x) => x.name === name);
    if (!e || !workingSets(e).length) continue;
    if (!best || w.date > best.w.date) best = { w, e };
  }
  return best;
}

// ───────── Двойная прогрессия (Progression.swift) ─────────

export function stepFor(name, group) {
  const n = (name || '').toLowerCase();
  if (n.includes('жим ногами')) return 5;
  if (n.includes('гантел') || n.includes('махи') || n.includes('молотк')) return 1;
  if (group === 'biceps' || group === 'triceps') return 1.25;
  return 2.5;
}

export function repRange(top) {
  if (top <= 6) return [3, 6];
  // 12 повторов после прибавки читались бы как «верх 8–12» и давали двойную прибавку.
  if (top >= 13) return [13, 20];
  return [8, 12];
}

export function suggest(previousSets, name, group, targetRange = null) {
  if (group === 'cardio') return null;
  const warmups = previousSets.filter((s) => s.isWarmup && s.reps > 0);
  const working = previousSets.filter((s) => !s.isWarmup && s.reps > 0);
  if (!working.length) return null;
  const topWeight = Math.max(...working.map((s) => s.weight));
  const topReps = Math.max(...working.map((s) => s.reps));
  const [lo, hi] = targetRange || repRange(topReps);
  const heavy = working.filter((s) => s.weight === topWeight);
  const inc = stepFor(name, group);
  const warm = warmups.map((s) => ({ weight: s.weight, reps: s.reps, isWarmup: true }));
  let plan, reason;
  if (topWeight <= 0) {
    plan = working.map((s) => ({ weight: 0, reps: s.reps + 1, isWarmup: false }));
    reason = 'Попробуй на повтор больше в каждом подходе.';
  } else if (heavy.every((s) => s.reps >= hi)) {
    plan = working.map(() => ({ weight: topWeight + inc, reps: lo, isWarmup: false }));
    reason = `В прошлый раз все подходы по ${hi} повторов. Прибавь ${num(inc, 2)} кг и начни с ${lo} повторов.`;
  } else if (heavy[0].reps < lo) {
    plan = working.map((s) => ({ weight: s.weight, reps: s.reps, isWarmup: false }));
    reason = 'В прошлый раз было тяжело. Повтори тот же результат, прежде чем прибавлять.';
  } else {
    plan = working.map((s) => ({ weight: s.weight, reps: Math.min(s.reps + 1, hi), isWarmup: false }));
    reason = `Тот же вес, по повтору больше. Когда все подходы дойдут до ${hi}, прибавим вес.`;
  }
  const weights = [...new Set(plan.map((p) => p.weight))];
  const wt = weights.length === 1 ? num(weights[0], 2) : `${num(Math.min(...weights), 2)}–${num(Math.max(...weights), 2)}`;
  return { sets: [...warm, ...plan], reason, headline: `${wt} кг × ${plan.map((p) => p.reps).join(', ')}` };
}

// ───────── Тренд (МНК, изменение за 30 дней) ─────────

export function monthlySlope(points) {
  if (points.length < 3) return null;
  const t = points.map((p) => toDate(p.date).getTime());
  const first = Math.min(...t), last = Math.max(...t);
  if (last - first < 7 * DAY_MS) return null;
  const xs = t.map((x) => (x - first) / DAY_MS), ys = points.map((p) => p.value);
  const n = points.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let nu = 0, de = 0;
  xs.forEach((x, i) => { nu += (x - mx) * (ys[i] - my); de += (x - mx) ** 2; });
  return de > 0 ? (nu / de) * 30 : null;
}

// ───────── Программы (Programs.swift) ─────────

const it = (exercise, sets, lo, hi) => ({ exercise, sets, reps: [lo, hi] });
export const PROGRAMS = [
  { id: 'machines2', title: 'Старт на тренажёрах', summary: 'Всё тело на тренажёрах, чтобы спокойно освоить технику.', level: 'Новичок', perWeek: 2, days: [
    { title: 'Всё тело', items: [it('Жим ногами', 3, 10, 15), it('Тяга верхнего блока', 3, 10, 15), it('Бабочка (пек-дек)', 3, 10, 15), it('Тяга горизонтального блока', 3, 10, 15), it('Сгибание ног в тренажёре', 2, 12, 15), it('Махи гантелями в стороны', 2, 12, 15), it('Планка', 2, 30, 60)] },
  ] },
  { id: 'fullbody3', title: 'Фулбади 3 раза в неделю', summary: 'Два чередующихся дня на всё тело: А, Б, А на одной неделе, Б, А, Б на следующей.', level: 'Новичок и средний', perWeek: 3, days: [
    { title: 'Всё тело А', items: [it('Приседания со штангой', 3, 6, 10), it('Жим штанги лёжа', 3, 6, 10), it('Тяга штанги в наклоне', 3, 8, 12), it('Жим гантелей сидя', 2, 8, 12), it('Подъём штанги на бицепс', 2, 10, 15), it('Скручивания', 2, 12, 20)] },
    { title: 'Всё тело Б', items: [it('Румынская тяга', 3, 8, 12), it('Жим гантелей на наклонной скамье', 3, 8, 12), it('Тяга верхнего блока', 3, 8, 12), it('Выпады с гантелями', 2, 10, 12), it('Разгибание рук на блоке', 2, 10, 15), it('Подъём ног в висе', 2, 10, 15)] },
  ] },
  { id: 'split3', title: 'Сплит на 3 дня', summary: 'Грудь и трицепс, спина и бицепс, ноги и плечи. Каждая группа раз в неделю, но с большим объёмом.', level: 'Средний', perWeek: 3, days: [
    { title: 'Грудь и трицепс', items: [it('Жим штанги лёжа', 3, 6, 10), it('Жим гантелей на наклонной скамье', 3, 8, 12), it('Сведение рук в кроссовере', 3, 12, 15), it('Французский жим', 3, 8, 12)] },
    { title: 'Спина и бицепс', items: [it('Тяга верхнего блока', 3, 8, 12), it('Тяга штанги в наклоне', 3, 6, 10), it('Тяга горизонтального блока', 3, 10, 12), it('Подъём штанги на бицепс', 3, 8, 12)] },
    { title: 'Ноги и плечи', items: [it('Приседания со штангой', 3, 6, 10), it('Жим ногами', 3, 10, 12), it('Румынская тяга', 3, 8, 12), it('Жим гантелей сидя', 3, 8, 12), it('Махи гантелями в стороны', 3, 12, 15)] },
  ] },
  { id: 'upperlower4', title: 'Верх и низ 4 раза в неделю', summary: 'Каждая мышца дважды в неделю. Подходит, когда есть время на четыре тренировки.', level: 'Средний', perWeek: 4, days: [
    { title: 'Верх (сила)', items: [it('Жим штанги лёжа', 4, 4, 6), it('Тяга штанги в наклоне', 4, 6, 8), it('Жим штанги стоя', 3, 6, 8), it('Подтягивания', 3, 6, 10)] },
    { title: 'Низ (сила)', items: [it('Приседания со штангой', 4, 4, 6), it('Румынская тяга', 3, 6, 8), it('Подъём на носки', 3, 10, 15), it('Скручивания', 3, 12, 20)] },
    { title: 'Верх (объём)', items: [it('Жим гантелей на наклонной скамье', 3, 8, 12), it('Тяга верхнего блока', 3, 10, 12), it('Махи гантелями в стороны', 3, 12, 15), it('Подъём гантелей на бицепс', 3, 10, 12), it('Разгибание рук на блоке', 3, 10, 12)] },
    { title: 'Низ (объём)', items: [it('Жим ногами', 3, 10, 15), it('Выпады с гантелями', 3, 10, 12), it('Сгибание ног в тренажёре', 3, 10, 15), it('Ягодичный мост', 3, 10, 12)] },
  ] },
];

export const programById = (id) => PROGRAMS.find((p) => p.id === id) || null;

export function nextDay(program, workouts) {
  const last = workouts.filter((w) => w.programID === program.id && w.programDay != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return last ? (last.programDay + 1) % program.days.length : 0;
}

/** Диапазон повторов из программы, по которой создана тренировка. */
export function programRange(workout, name) {
  const p = programById(workout.programID);
  const day = p && workout.programDay != null ? p.days[workout.programDay] : null;
  return day?.items.find((i) => i.exercise === name)?.reps || null;
}

/** Новая тренировка по дню программы: веса из прошлого раза с прибавкой. */
export function workoutFromProgram(program, dayIndex, workouts, groupOf, now = new Date()) {
  const day = program.days[dayIndex];
  const date = now.toISOString();
  const exercises = day.items.map((item) => {
    const prev = previousEntry(workouts, item.exercise, date);
    let plan = prev ? suggest(prev.e.sets, item.exercise, groupOf(item.exercise), item.reps)?.sets || [] : [];
    const working = plan.filter((p) => !p.isWarmup);
    if (!working.length) {
      plan = Array.from({ length: item.sets }, () => ({ weight: 0, reps: item.reps[0], isWarmup: false }));
    } else if (working.length !== item.sets) {
      const last = working[working.length - 1];
      plan = [...plan.filter((p) => p.isWarmup), ...working.slice(0, item.sets),
        ...Array.from({ length: Math.max(0, item.sets - working.length) }, () => ({ ...last }))];
    }
    return { name: item.exercise, sets: plan.map((p) => ({ ...p, isDone: false })) };
  });
  return { id: uid(), date, title: day.title, note: '', durationMinutes: null, programID: program.id, programDay: dayIndex, finishedAt: null, exercises };
}

// ───────── Питание (Nutrition.swift) ─────────

export const GOALS = {
  cut: { title: 'Сбросить жир', kcal: 0.85, protein: 2.0 },
  keep: { title: 'Держать форму', kcal: 1, protein: 1.6 },
  gain: { title: 'Набрать мышцы', kcal: 1.1, protein: 1.8 },
};
export const FOOD_PRESETS = [
  { title: 'Протеин, 1 скуп', protein: 24, kcal: 120 }, { title: 'Курица 150 г', protein: 35, kcal: 165 },
  { title: 'Творог 5% 200 г', protein: 34, kcal: 240 }, { title: 'Яйца, 3 шт', protein: 19, kcal: 230 },
  { title: 'Греческий йогурт 150 г', protein: 15, kcal: 110 }, { title: 'Рыба 150 г', protein: 26, kcal: 120 },
  { title: 'Говядина 150 г', protein: 30, kcal: 280 },
];
export function defaultGoal(latest) {
  return latest?.toIdealFat != null && latest.toIdealFat <= -2 ? 'cut' : 'keep';
}
export function nutritionTargets(latest, weight, goalId) {
  const g = GOALS[goalId] || GOALS.keep;
  const w = weight ?? latest?.values?.weight ?? 70;
  const protein = Math.round((w * g.protein) / 5) * 5;
  if (latest?.dailyCalories) return { protein, kcal: Math.round((latest.dailyCalories * g.kcal) / 50) * 50, basis: `норма InBody ${num(latest.dailyCalories, 0)} ккал` };
  if (latest?.values?.bmr) return { protein, kcal: Math.round((latest.values.bmr * 1.55 * g.kcal) / 50) * 50, basis: 'обмен веществ × 1,55' };
  return { protein, kcal: 2200 * g.kcal, basis: 'средняя норма' };
}

// ───────── Советник (Advisor.swift, офлайн-правила) ─────────

const MAJOR = ['chest', 'back', 'legs', 'shoulders'];

export function sessionsFrom(workouts, groupOf) {
  return workouts.map((w) => ({
    date: toDate(w.date),
    exercises: w.exercises.map((e) => ({ name: e.name, group: groupOf(e.name), sets: workingSets(e).map((s) => (s.level ? { weight: s.weight, reps: s.reps, level: s.level } : { weight: s.weight, reps: s.reps })) })),
  })).sort((a, b) => a.date - b.date);
}

export function bodyPointsFrom(measurements) {
  return measurements.filter((m) => !m.source).map((m) => ({
    date: toDate(m.day), weight: m.values.weight, muscle: m.values.muscleMass, fatPercent: m.values.fatPercent, fatMass: m.values.fatMass,
    standard: m.conditions ? (m.conditions.timeOfDay === 'morning' && m.conditions.fasted && !m.conditions.afterWorkout) : null,
    leftArm: m.segmentMuscle?.leftArm?.kg, rightArm: m.segmentMuscle?.rightArm?.kg,
    leftLeg: m.segmentMuscle?.leftLeg?.kg, rightLeg: m.segmentMuscle?.rightLeg?.kg,
  })).sort((a, b) => a.date - b.date);
}

const sVolume = (s) => s.exercises.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.weight * x.reps, 0), 0);
const days = (a, b) => (b - a) / DAY_MS;
const recent = (sessions, n, now) => sessions.filter((s) => days(s.date, now) < n);
const groupTitle = (g) => GROUPS[g].toLowerCase();

/** Застой: три последние тренировки упражнения не превзошли лучший результат до них. */
export function plateauTips(sessions, now) {
  const hist = {};
  for (const s of recent(sessions, 84, now)) for (const e of s.exercises) {
    if (e.group === 'cardio') continue;
    const best = Math.max(0, ...e.sets.filter((x) => x.reps > 0).map(e1rm));
    if (best > 0) (hist[e.name] ||= []).push({ date: s.date, best });
  }
  const plateaus = [];
  for (const [name, pts] of Object.entries(hist)) {
    if (pts.length < 5) continue;
    const rec = pts.slice(-3), earlier = pts.slice(0, -3);
    const rb = Math.max(...rec.map((p) => p.best)), eb = Math.max(...earlier.map((p) => p.best));
    if (days(rec[0].date, rec[2].date) >= 10 && days(rec[2].date, now) < 21 && rb <= eb * 1.005) {
      plateaus.push({ best: eb, tip: { id: `plateau-${name}`, kind: 'progress', priority: 80, title: `Застой: ${name}`, text: `Три последние тренировки без роста: оценка максимума держится около ${num(eb, 0)} кг. Смени диапазон повторов (например, 5–6 вместо 8–12), возьми похожую вариацию упражнения или сделай лёгкую неделю.` } });
    }
  }
  plateaus.sort((a, b) => b.best - a.best);
  return plateaus.map((p) => p.tip);
}

export function advisorTips(sessionsIn, bodyIn, now = new Date()) {
  const sessions = [...sessionsIn].sort((a, b) => a.date - b.date).filter((s) => s.date <= now);
  const body = [...bodyIn].sort((a, b) => a.date - b.date);
  const tips = [];
  // Перерыв.
  const last = sessions[sessions.length - 1];
  if (last) {
    const gap = Math.floor(days(last.date, now));
    if (gap >= 7) tips.push({ id: 'break', kind: 'habit', priority: 90, title: `Перерыв ${gap} ${plural(gap, 'день', 'дня', 'дней')}`, text: 'Начни с весов на 10–15% ниже прошлых и вернись к ним за одну-две тренировки. Так меньше риск травмы и сильной крепатуры.' });
  }
  // Застой.
  const plateaus = plateauTips(sessions, now);
  tips.push(...plateaus.slice(0, 2));
  // Разгрузка.
  const thisWeek = weekStart(now);
  const weeks = [];
  for (let i = 1; i <= 10; i++) {
    const start = new Date(thisWeek); start.setDate(start.getDate() - 7 * i);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const items = sessions.filter((s) => s.date >= start && s.date < end);
    weeks.push({ count: items.length, volume: items.reduce((a, s) => a + sVolume(s), 0) });
  }
  const active = weeks.filter((w) => w.count > 0);
  if (active.length) {
    const avg = active.reduce((a, w) => a + w.volume, 0) / active.length;
    let streak = 0;
    for (const w of weeks) { if (w.count >= 2 && w.volume >= avg * 0.6) streak++; else break; }
    if (streak >= 6) tips.push({ id: 'deload', kind: 'recovery', priority: plateaus.length >= 2 ? 85 : 70, title: 'Пора на разгрузку', text: `Уже ${streak} ${plural(streak, 'неделя', 'недели', 'недель')} подряд без лёгкой недели. Сделай одну неделю с теми же упражнениями, но вдвое меньше подходов и на 10–20% легче. После неё силовые обычно снова растут.` });
    else if (plateaus.length >= 3) tips.push({ id: 'deload', kind: 'recovery', priority: 75, title: 'Застой сразу в нескольких упражнениях', text: `Когда стоят ${plateaus.length} упражнения одновременно, дело чаще в усталости, сне или питании, а не в программе. Попробуй лёгкую неделю и проверь, хватает ли сна и белка.` });
  }
  // Забытые группы и баланс.
  const month = recent(sessions, 28, now);
  if (month.length >= 4) {
    const lastDate = {};
    for (const s of recent(sessions, 90, now)) for (const e of s.exercises) {
      if (!e.sets.length) continue;
      const g = e.group === 'glutes' ? 'legs' : e.group;
      if (!lastDate[g] || s.date > lastDate[g]) lastDate[g] = s.date;
    }
    for (const g of MAJOR) {
      if (lastDate[g]) {
        const gap = Math.floor(days(lastDate[g], now));
        if (gap >= 14) tips.push({ id: `neglected-${g}`, kind: 'balance', priority: 60, title: `Давно не было: ${groupTitle(g)}`, text: `Последний раз ${gap} ${plural(gap, 'день', 'дня', 'дней')} назад, а тренировок за месяц ${month.length}. Добавь хотя бы одно упражнение на эту группу в ближайшую тренировку.` });
      } else {
        tips.push({ id: `neglected-${g}`, kind: 'balance', priority: 40, title: `Нет упражнений: ${groupTitle(g)}`, text: 'За три месяца в дневнике нет ни одного подхода на эту группу. Если это не намеренно, добавь одно-два упражнения в неделю.' });
      }
    }
    const sets = {};
    for (const s of month) for (const e of s.exercises) {
      const g = e.group === 'glutes' ? 'legs' : e.group;
      sets[g] = (sets[g] || 0) + e.sets.length;
    }
    const push = (sets.chest || 0) + (sets.shoulders || 0) + (sets.triceps || 0);
    const pull = (sets.back || 0) + (sets.biceps || 0);
    if (push >= 12 && push > pull * 1.5) tips.push({ id: 'balance-push', kind: 'balance', priority: 50, title: 'Жимов больше, чем тяг', text: `За 4 недели ${push} подходов на грудь, плечи и трицепс против ${pull} на спину и бицепс. Для здоровых плеч и осанки держи примерно поровну: добавь тягу в наклоне или тягу блока.` });
    else if (pull >= 12 && pull > push * 2) tips.push({ id: 'balance-pull', kind: 'balance', priority: 30, title: 'Тяг заметно больше, чем жимов', text: `За 4 недели ${pull} подходов на спину и бицепс против ${push} на грудь, плечи и трицепс. Добавь жим, чтобы верх тела рос равномерно.` });
    const weekly = MAJOR.filter((g) => sets[g] > 0).map((g) => [g, sets[g] / 4]).sort((a, b) => a[1] - b[1]);
    if (weekly[0] && weekly[0][1] < 6) tips.push({ id: `volume-${weekly[0][0]}`, kind: 'balance', priority: 35, title: `Мало подходов: ${groupTitle(weekly[0][0])}`, text: `Около ${num(weekly[0][1])} рабочих подходов в неделю. Для роста мышц обычно нужно 10–20 в неделю на группу, добавляй по 2–3 подхода.` });
  }
  tips.push(...bodyTips(body, sessions, now));
  return tips.sort((a, b) => (a.priority !== b.priority ? b.priority - a.priority : a.id < b.id ? -1 : 1));
}

function slope(points, key) {
  const v = points.filter((p) => p[key] != null).map((p) => ({ date: p.date, value: p[key] }));
  if (v.length < 3 || days(v[0].date, v[v.length - 1].date) < 21) return null;
  return monthlySlope(v);
}

function bodyTips(points, sessions, now) {
  const latest = points[points.length - 1];
  if (!latest) return [];
  const tips = [];
  const window = points.filter((p) => days(p.date, now) <= 120);
  const ms = slope(window, 'muscle');
  const fs = slope(window, 'fatMass') ?? slope(window, 'fatPercent');
  if (ms != null && fs != null) {
    const mUp = ms >= 0.3, mDown = ms <= -0.3, fUp = fs >= 0.4, fDown = fs <= -0.4;
    const mt = `${signed(ms)} кг мышц в месяц`;
    if (mUp && !fUp) tips.push({ id: 'body-muscle-up', kind: 'body', priority: 45, title: 'Мышцы растут', text: `По тренду ${mt}${fDown ? ', а жир уходит' : ', жир не растёт'}. Текущий подход работает, ничего не меняй.` });
    else if (fUp && !mUp) tips.push({ id: 'body-fat-up', kind: 'body', priority: 65, title: 'Жир растёт быстрее мышц', text: `По тренду ${mt} и жир растёт. Скорее всего, профицит калорий великоват: убери 200–300 ккал в день и следи, чтобы рабочие веса продолжали расти.` });
    else if (mDown && fDown) {
      const pr = latest.weight ? ` Это примерно ${num(latest.weight * 1.6, 0)}–${num(latest.weight * 2.2, 0)} г в день.` : '';
      tips.push({ id: 'body-cut-muscle', kind: 'body', priority: 65, title: 'Сушка задевает мышцы', text: `Жир уходит, но и мышцы тоже (${mt}). Держи белок 1,6–2,2 г на кг веса, не урезай тяжёлые базовые упражнения и не снижай калории слишком резко.${pr}` });
    } else if (!mUp && recent(sessions, 28, now).length >= 8) {
      tips.push({ id: 'body-muscle-flat', kind: 'body', priority: 40, title: 'Мышцы стоят при регулярных тренировках', text: 'Тренировок за месяц много, а мышечная масса по InBody почти не меняется. Проверь, растут ли рабочие веса, хватает ли белка и сна. Изменения меньше 0,7 кг InBody может не увидеть.' });
    }
  }
  const age = Math.floor(days(latest.date, now));
  if (age >= 35) tips.push({ id: 'body-measure', kind: 'habit', priority: 25, title: 'Пора на InBody', text: `Последний замер был ${age} ${plural(age, 'день', 'дня', 'дней')} назад. Встань на весы в тех же условиях, что и раньше: утром, натощак, до тренировки.` });
  if (points.length >= 2) {
    const a = points[points.length - 2].standard, b = latest.standard;
    if (a != null && b != null && a !== b) tips.push({ id: 'body-conditions', kind: 'habit', priority: 20, title: 'Последние замеры в разных условиях', text: 'Один замер утром натощак, другой нет. Вода и еда сдвигают вес и мышцы на 1–2 кг, поэтому сравнивай замеры только в одинаковых условиях.' });
  }
  for (const [id, title, l, r] of [['arms', 'Руки', latest.leftArm, latest.rightArm], ['legs', 'Ноги', latest.leftLeg, latest.rightLeg]]) {
    if (l == null || r == null || Math.max(l, r) <= 0) continue;
    const diff = Math.abs(l - r) / Math.max(l, r);
    if (diff < 0.06) continue;
    tips.push({ id: `imbalance-${id}`, kind: 'balance', priority: 30, title: `${title}: разница между сторонами ${num(diff * 100, 0)}%`, text: `Левая ${num(l)} кг, правая ${num(r)} кг мышц. Добавь упражнения на одну сторону с гантелями и начинай подход с ${l < r ? 'левую' : 'правую'}, делая столько же повторов другой стороной.` });
  }
  return tips;
}

// ───────── Состояние и резервная копия (совместима с Backup.swift, version 2) ─────────

export function emptyState() {
  return {
    measurements: [],
    exercises: DEFAULT_EXERCISES.map(([name, group]) => ({ name, group, isCustom: false, note: '' })),
    workouts: [],
    food: [],
    templates: [],
    machines: [],
    settings: { activeProgram: null, nutritionGoal: null, restSeconds: 120 },
  };
}

// Swift .iso8601 не понимает доли секунды.
const iso = (d) => toDate(d).toISOString().replace(/\.\d{3}Z$/, 'Z');

export function makeBackup(state) {
  return {
    version: 2,
    createdAt: iso(new Date()),
    measurements: [...state.measurements].sort((a, b) => a.day.localeCompare(b.day)).map((m) => {
      const ranges = {}, segmentMuscle = {}, segmentFat = {};
      for (const [k, r] of Object.entries(m.ranges || {})) ranges[k] = { min: r.min, max: r.max };
      for (const [k, s] of Object.entries(m.segmentMuscle || {})) segmentMuscle[k] = clean(s);
      for (const [k, s] of Object.entries(m.segmentFat || {})) segmentFat[k] = clean(s);
      return clean({
        day: iso(dayDate(m.day)), isPartial: !!m.isPartial, values: { ...m.values },
        dailyCalories: m.dailyCalories, idealWeight: m.idealWeight, toIdealWeight: m.toIdealWeight, toIdealFat: m.toIdealFat,
        toIdealMuscle: m.toIdealMuscle, age: m.age, heightCm: m.heightCm,
        extras: { ranges, segmentMuscle, segmentFat }, conditions: m.conditions || undefined, source: m.source || undefined,
      });
    }),
    exercises: [...state.exercises].sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((e) => clean({ name: e.name, group: e.group, isCustom: !!e.isCustom, note: e.note || undefined })),
    workouts: [...state.workouts].sort((a, b) => (a.date < b.date ? -1 : 1)).map((w) => clean({
      date: iso(w.date), title: w.title, note: w.note || '', durationMinutes: w.durationMinutes ?? undefined,
      programID: w.programID ?? undefined, programDay: w.programDay ?? undefined, finishedAt: w.finishedAt ? iso(w.finishedAt) : undefined,
      exercises: w.exercises.map((e, i) => ({ order: i, exerciseName: e.name, group: groupOfIn(state, e.name),
        sets: e.sets.map((s, j) => clean({ order: j, weight: s.weight, reps: s.reps, level: s.level || undefined, isWarmup: !!s.isWarmup, isDone: !!s.isDone })) })),
    })),
    food: [...state.food].sort((a, b) => (a.date < b.date ? -1 : 1)).map((f) => ({ date: iso(f.date), title: f.title, protein: f.protein, kcal: f.kcal })),
    // Свои тренировки из конструктора. iOS-приложение незнакомые поля пропускает.
    ...(state.templates?.length ? { templates: state.templates.map(cleanTemplate).filter(Boolean) } : {}),
    ...(state.machines?.length ? { machines: state.machines.map(cleanMachine).filter(Boolean) } : {}),
  };
}

/** Проверяет и нормализует свою тренировку из конструктора. */
export function cleanTemplate(t) {
  if (!t || typeof t !== 'object' || !Array.isArray(t.items)) return null;
  const int = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
  const title = String(t.title || '').trim().slice(0, 60) || 'Моя тренировка';
  const id = typeof t.id === 'string' && /^[\w-]{1,40}$/.test(t.id) ? t.id : uid();
  if (t.kind === 'home') {
    const items = t.items.filter((x) => Array.isArray(x) && typeof x[0] === 'string' && x[0]).slice(0, 30).map(([ex, sec]) => [ex.slice(0, 80), int(sec, 5, 600, 40)]);
    return { id, kind: 'home', title, rounds: int(t.rounds, 1, 10, 3), rest: int(t.rest, 0, 300, 20), roundRest: int(t.roundRest, 0, 600, 60), items };
  }
  const items = t.items.filter((x) => x && typeof x.exercise === 'string' && x.exercise).slice(0, 30).map((x) => {
    const lo = int(x.reps?.[0], 1, 100, 8), hi = int(x.reps?.[1], 1, 100, 12);
    return { exercise: x.exercise.slice(0, 80), sets: int(x.sets, 1, 10, 3), reps: [Math.min(lo, hi), Math.max(lo, hi)] };
  });
  return { id, kind: 'gym', title, items };
}

/** Тренажёр из «Моего зала»: фото-миниатюра, упражнение и свои настройки (сиденье, валик). */
export function cleanMachine(m) {
  if (!m || typeof m !== 'object') return null;
  const name = String(m.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!name) return null;
  const photo = typeof m.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,[\w+/=]+$/.test(m.photo) && m.photo.length < 300000 ? m.photo : null;
  return {
    id: typeof m.id === 'string' && /^[\w-]{1,40}$/.test(m.id) ? m.id : uid(), name,
    exercise: String(m.exercise || name).replace(/\s+/g, ' ').trim().slice(0, 60) || name,
    group: GROUPS[m.group] ? m.group : 'other', settings: String(m.settings || '').trim().slice(0, 300),
    photo, created: Number.isFinite(m.created) ? m.created : Date.now(),
    ...(m.about ? { about: String(m.about).trim().slice(0, 400) } : {}),
    ...(m.brand ? { brand: String(m.brand).trim().slice(0, 40) } : {}),
    ...(m.ddx ? { ddx: String(m.ddx).replace(/\D/g, '').slice(0, 6) } : {}),
    ...(Array.isArray(m.exercises) && m.exercises.length ? { exercises: m.exercises.filter((x) => x && typeof x.name === 'string' && x.name.trim()).slice(0, 30).map((x) => ({
      name: x.name.replace(/\s+/g, ' ').trim().slice(0, 80), muscle: String(x.muscle || '').trim().slice(0, 60), group: GROUPS[x.group] ? x.group : 'other',
    })) } : {}),
  };
}

/** Файл базы тренажёров: только «Мой зал», без тренировок и замеров. */
export const machinesFile = (machines) => ({ format: 'forma-machines', version: 1, machines: machines.map(cleanMachine).filter(Boolean) });

/**
 * Слияние базы с текущим залом по названию: новые добавляются, у совпавших обновляются фото и упражнение,
 * а свои непустые настройки сохраняются. Возвращает { machines, added, updated }.
 */
export function mergeMachines(current, json) {
  let f;
  try { f = typeof json === 'string' ? JSON.parse(json) : json; } catch { throw new Error('Файл не читается: это не JSON.'); }
  const list = Array.isArray(f?.machines) ? f.machines.map(cleanMachine).filter(Boolean).slice(0, 200) : null;
  if (!list) throw new Error('В файле нет тренажёров.');
  const out = current.map((m) => ({ ...m }));
  let added = 0, updated = 0;
  for (const m of list) {
    const i = out.findIndex((x) => x.name.toLowerCase() === m.name.toLowerCase());
    if (i < 0) { out.push({ ...m, id: out.some((x) => x.id === m.id) ? uid() : m.id }); added++; continue; }
    out[i] = { ...out[i], ...m, id: out[i].id, photo: m.photo || out[i].photo, settings: out[i].settings || m.settings, created: out[i].created };
    updated++;
  }
  return { machines: out, added, updated };
}

function clean(o) {
  const r = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) r[k] = v;
  return r;
}

export function groupOfIn(state, name) {
  return state.exercises.find((e) => e.name === name)?.group || 'other';
}

const finite = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Читает резервную копию iOS- или веб-версии. Бросает Error с понятным текстом. */
export function readBackup(json) {
  let f;
  try { f = typeof json === 'string' ? JSON.parse(json) : json; } catch { throw new Error('Файл не читается: это не JSON.'); }
  if (!f || typeof f !== 'object' || !Array.isArray(f.measurements) || !Array.isArray(f.workouts)) throw new Error('Это не резервная копия «Формы».');
  if (typeof f.version === 'number' && f.version > 2) throw new Error('Копия сделана более новой версией «Формы». Обнови приложение.');
  const state = emptyState();
  for (const m of f.measurements) {
    const d = new Date(m.day);
    if (Number.isNaN(+d)) continue;
    const values = {};
    for (const [k, v] of Object.entries(m.values || {})) if (METRIC_INFO[k] && finite(v, 0, 10000)) values[k] = v;
    state.measurements.push({
      day: dayKey(d), isPartial: !!m.isPartial, values,
      dailyCalories: m.dailyCalories ?? null, idealWeight: m.idealWeight ?? null, toIdealWeight: m.toIdealWeight ?? null,
      toIdealFat: m.toIdealFat ?? null, toIdealMuscle: m.toIdealMuscle ?? null, age: m.age ?? null, heightCm: m.heightCm ?? null,
      ranges: m.extras?.ranges || {}, segmentMuscle: m.extras?.segmentMuscle || {}, segmentFat: m.extras?.segmentFat || {},
      conditions: m.conditions || null, source: m.source || null, importedAt: new Date().toISOString(),
    });
  }
  const byName = new Map(state.exercises.map((e) => [e.name, e]));
  for (const e of f.exercises || []) {
    if (!e?.name) continue;
    const ex = byName.get(e.name) || { name: e.name, group: GROUPS[e.group] ? e.group : 'other', isCustom: !!e.isCustom, note: '' };
    ex.note = e.note || ex.note || '';
    if (!byName.has(e.name)) { byName.set(e.name, ex); state.exercises.push(ex); }
  }
  for (const w of f.workouts) {
    const d = new Date(w.date);
    if (Number.isNaN(+d)) continue;
    const exercises = [...(w.exercises || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).filter((e) => e.exerciseName).map((e) => {
      if (!byName.has(e.exerciseName)) {
        const ex = { name: e.exerciseName, group: GROUPS[e.group] ? e.group : 'other', isCustom: true, note: '' };
        byName.set(ex.name, ex); state.exercises.push(ex);
      }
      return { name: e.exerciseName, sets: [...(e.sets || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s) => ({
        weight: finite(s.weight, 0, 1000) ? s.weight : 0, reps: Number.isInteger(s.reps) && s.reps >= 0 && s.reps <= 1000 ? s.reps : 0,
        ...(finite(s.level, 1, 100) ? { level: Math.round(s.level * 10) / 10 } : {}), isWarmup: !!s.isWarmup, isDone: !!s.isDone })) };
    });
    state.workouts.push({ id: uid(), date: d.toISOString(), title: String(w.title || 'Тренировка'), note: String(w.note || ''),
      durationMinutes: finite(w.durationMinutes, 0, 1440) ? w.durationMinutes : null, programID: w.programID ?? null,
      programDay: Number.isInteger(w.programDay) ? w.programDay : null, finishedAt: w.finishedAt || null, exercises });
  }
  for (const x of f.food || []) {
    const d = new Date(x.date);
    if (Number.isNaN(+d) || !finite(x.protein, 0, 1000) || !finite(x.kcal, 0, 20000)) continue;
    state.food.push({ id: uid(), date: d.toISOString(), title: String(x.title || 'Еда'), protein: x.protein, kcal: x.kcal });
  }
  state.templates = Array.isArray(f.templates) ? f.templates.map(cleanTemplate).filter(Boolean) : [];
  state.machines = Array.isArray(f.machines) ? f.machines.map(cleanMachine).filter(Boolean).slice(0, 200) : [];
  return state;
}

/** Замер из разобранного PDF плюс неполные замеры из таблицы истории. */
export function measurementsFromReport(report, conditions) {
  const full = {
    day: report.date, isPartial: false, values: { ...report.values }, ranges: report.ranges,
    segmentMuscle: report.segmentMuscle, segmentFat: report.segmentFat,
    dailyCalories: report.dailyCalories, idealWeight: report.idealWeight, toIdealWeight: report.toIdealWeight,
    toIdealFat: report.toIdealFat, toIdealMuscle: report.toIdealMuscle, age: report.age, heightCm: report.heightCm,
    conditions: conditions || null, source: null, importedAt: new Date().toISOString(),
  };
  const partial = report.history.filter((h) => h.date !== report.date).map((h) => {
    const values = {};
    for (const k of PARTIAL_METRICS) if (h[k] != null) values[k] = h[k];
    return { day: h.date, isPartial: true, values, ranges: {}, segmentMuscle: {}, segmentFat: {}, conditions: null, source: null, importedAt: new Date().toISOString() };
  });
  return [full, ...partial];
}

/** Добавляет замеры: полный заменяет любой, неполный не трогает существующий. */
export function mergeMeasurements(existing, incoming) {
  const map = new Map(existing.map((m) => [m.day, m]));
  let added = 0;
  for (const m of incoming) {
    const old = map.get(m.day);
    if (!old || (!m.isPartial && (old.isPartial || old.source)) || (!m.isPartial && !old.isPartial)) {
      if (!old) added++;
      map.set(m.day, m);
    }
  }
  return { list: [...map.values()].sort((a, b) => a.day.localeCompare(b.day)), added };
}

export const SEGMENTS_ORDER = ['leftArm', 'trunk', 'rightArm', 'leftLeg', 'rightLeg'];
