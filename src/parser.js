// Разбор PDF-отчёта InBody из DDX Fitness. Порт Forma/Import/InBodyParser.swift.
// Порядок текста в отчёте перемешан, поэтому слова собираются во «фразы» с координатами,
// а значения ищутся рядом с подписями: в той же строке и в той же колонке.

export const METRICS = [
  'weight', 'muscleMass', 'fatPercent', 'fatMass', 'water', 'protein',
  'bone', 'visceralFat', 'bmi', 'fatFreeMass', 'bmr', 'score',
];

export const SEGMENTS = ['leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg'];

export class InBodyError extends Error {}

const NUM = String.raw`[-−+]?\d+(?:[.,]\d+)?`;

export function toNumber(s) {
  const v = Number(String(s).replace(',', '.').replace('−', '-').replace('+', '').trim());
  return Number.isFinite(v) ? v : null;
}

function leadingNumber(s) {
  const m = String(s).match(new RegExp('^' + NUM));
  return m ? toNumber(m[0]) : null;
}

function allNumbers(s) {
  return [...String(s).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => toNumber(m[0])).filter((v) => v != null);
}

/** «03.10.26» или «03.10.2026» → «2026-10-03». */
export function parseDay(s) {
  const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const month = Number(m[2]), day = Number(m[1]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Слова из pdf.js (`page.getTextContent().items`) → фразы с координатами, отсчёт сверху страницы.
 * @param {{str:string, transform:number[], width:number, height:number}[]} items
 */
export function extractPhrases(items, pageHeight) {
  const words = [];
  for (const it of items) {
    const text = (it.str || '').trim();
    if (!text) continue;
    const h = it.height || Math.abs(it.transform[3]) || 0;
    if (!(it.width > 0) || !(h > 0)) continue;
    const x = it.transform[4];
    const baseline = pageHeight - it.transform[5];
    words.push({ text, minX: x, maxX: x + it.width, midY: baseline - h * 0.35, height: h });
  }
  return groupIntoPhrases(words);
}

function groupIntoPhrases(words) {
  const lines = [];
  for (const g of [...words].sort((a, b) => a.midY - b.midY)) {
    const line = lines.find((l) => {
      const ref = l[0];
      return Math.abs(ref.midY - g.midY) < Math.max(1.5, Math.min(ref.height, g.height) * 0.2)
        && Math.abs(ref.height - g.height) < Math.max(ref.height, g.height) * 0.15;
    });
    if (line) line.push(g); else lines.push([g]);
  }
  const phrases = [];
  for (const line of lines) {
    let cur = null;
    for (const g of line.sort((a, b) => a.minX - b.minX)) {
      if (cur) {
        const gap = g.minX - cur.maxX;
        if (gap < g.height * 0.6) {
          if (gap > g.height * 0.12) cur.text += ' ';
          cur.text += g.text;
          cur.maxX = Math.max(cur.maxX, g.maxX);
          continue;
        }
        phrases.push(cur);
      }
      cur = { ...g };
    }
    if (cur) phrases.push(cur);
  }
  for (const p of phrases) p.midX = (p.minX + p.maxX) / 2;
  return phrases;
}

function firstMatch(re, texts) {
  for (const t of texts) {
    const m = t.match(re);
    if (m && m[1] != null) return m[1];
  }
  return null;
}

/** Разбирает фразы страницы. Возвращает отчёт или бросает InBodyError. */
export function parsePhrases(phrases, pageWidth) {
  const texts = phrases.map((p) => p.text);
  const column = (p) => (p.midX < pageWidth / 2 ? 0 : 1);
  const sameRow = (a, b) => Math.abs(a.midY - b.midY) < Math.max(3, Math.min(a.height, b.height) * 0.35);

  const dateText = firstMatch(/Дата\s*(\d{2}\.\d{2}\.\d{2,4})/, texts);
  const date = dateText && parseDay(dateText);
  if (!date) throw new InBodyError('Похоже, это не отчёт InBody: не нашлись дата и основные показатели.');

  const report = {
    date, age: null, heightCm: null, values: {}, ranges: {},
    dailyCalories: null, idealWeight: null, toIdealWeight: null, toIdealFat: null, toIdealMuscle: null,
    segmentMuscle: {}, segmentFat: {}, history: [],
  };
  const age = firstMatch(/Возраст\s*(\d+)/, texts);
  if (age) report.age = Number(age);
  const height = firstMatch(/Рост\s*(\d+(?:[.,]\d+)?)/, texts);
  if (height) report.heightCm = toNumber(height);

  // Оценка InBody: «78» и «/100» обычно разные фразы, но бывают и слитно.
  const joined = firstMatch(/^(\d{1,3})\s*\/\s*100$/, texts);
  if (joined) report.values.score = toNumber(joined);
  else {
    const slash = phrases.find((p) => p.text === '/100');
    if (slash) {
      const cands = phrases.filter((p) => /^\d{1,3}$/.test(p.text) && p.maxX <= slash.minX + 3 && Math.abs(p.midY - slash.midY) < 25);
      cands.sort((a, b) => (slash.minX - a.maxX) - (slash.minX - b.maxX));
      if (cands[0]) report.values.score = toNumber(cands[0].text);
    }
  }

  const numStart = new RegExp('^' + NUM);
  const rangeRe = new RegExp('^' + NUM + String.raw`\s*[–—-]\s*` + NUM + '$');

  function indicator(label, prefix = false) {
    for (const p of phrases) {
      const ok = prefix ? p.text.toLowerCase().startsWith(label.toLowerCase()) : p.text === label;
      if (!ok) continue;
      const values = phrases.filter((q) => sameRow(q, p) && column(q) === column(p) && q.minX > p.maxX && numStart.test(q.text));
      if (!values.length) continue;
      const vp = values.reduce((a, b) => (b.minX > a.minX ? b : a));
      const value = leadingNumber(vp.text);
      if (value == null) continue;
      const rp = phrases
        .filter((q) => column(q) === column(p) && q.midY > p.midY && q.midY - p.midY < 40 && rangeRe.test(q.text))
        .sort((a, b) => a.midY - b.midY)[0];
      let range = null;
      if (rp) {
        const nums = allNumbers(rp.text.replace(/[–—]/g, ' '));
        if (nums.length === 2) range = { min: Math.abs(nums[0]), max: Math.abs(nums[1]) };
      }
      return { value, range };
    }
    return null;
  }

  const withRanges = [
    ['Вес', false, 'weight'], ['Мышцы', false, 'muscleMass'], ['Жир', false, 'fatPercent'],
    ['Вода', false, 'water'], ['Белок', false, 'protein'], ['Кости', false, 'bone'],
    ['Висцеральный жир', true, 'visceralFat'], ['Индекс массы тела', false, 'bmi'],
    ['Безжировая масса', false, 'fatFreeMass'], ['Обмен веществ', false, 'bmr'], ['Содержание жира', true, 'fatMass'],
  ];
  for (const [label, prefix, metric] of withRanges) {
    const r = indicator(label, prefix);
    if (r) {
      report.values[metric] = r.value;
      if (r.range) report.ranges[metric] = r.range;
    }
  }
  report.dailyCalories = indicator('Суточная норма калорий')?.value ?? null;
  report.idealWeight = indicator('Идеальный вес')?.value ?? null;

  const toIdeal = (word) => {
    const v = firstMatch(new RegExp('^' + word + String.raw`\s*(` + NUM + String.raw`)\s*кг$`), texts);
    return v == null ? null : toNumber(v);
  };
  report.toIdealWeight = toIdeal('Вес');
  report.toIdealFat = toIdeal('Жир');
  report.toIdealMuscle = toIdeal('Мышцы');

  // История: строка дат и строки «Вес, кг», «Мышцы, кг», «Жир, %».
  const dates = phrases.filter((p) => /^\d{2}\.\d{2}\.\d{2,4}$/.test(p.text));
  const history = {};
  const cellRe = new RegExp('^' + NUM + '$');
  for (const [label, key] of [['Вес, кг', 'weight'], ['Мышцы, кг', 'muscleMass'], ['Жир, %', 'fatPercent']]) {
    const row = phrases.find((p) => p.text === label);
    if (!row) continue;
    for (const cell of phrases.filter((q) => sameRow(q, row) && q.minX > row.maxX && cellRe.test(q.text))) {
      const dp = dates.reduce((best, d) => (!best || Math.abs(d.midX - cell.midX) < Math.abs(best.midX - cell.midX) ? d : best), null);
      if (!dp || Math.abs(dp.midX - cell.midX) >= 25) continue;
      const d = parseDay(dp.text);
      const v = toNumber(cell.text);
      if (!d || v == null) continue;
      (history[d] ||= { date: d, weight: null, muscleMass: null, fatPercent: null })[key] = v;
    }
  }
  report.history = Object.values(history).sort((a, b) => a.date.localeCompare(b.date));

  report.segmentMuscle = segments(phrases, 'Содержание мышц', column);
  report.segmentFat = segments(phrases, 'Содержание жира', column);

  if (report.values.weight == null) throw new InBodyError('Похоже, это не отчёт InBody: не нашлись дата и основные показатели.');
  return sanitize(report);
}

// Подписи «Левая рука» и т.п. в отчёте нарисованы картинкой,
// поэтому сегмент определяется по положению крупных значений «N кг» в панели.
function segments(phrases, header, column) {
  const head = phrases.find((p) => p.text.toLowerCase().startsWith(header.toLowerCase()));
  if (!head) return {};
  const side = column(head);
  const area = phrases.filter((p) => column(p) === side && p.midY > head.midY + 5);
  const kg = area.filter((p) => new RegExp('^' + NUM + String.raw`\s*кг$`).test(p.text));
  if (kg.length !== 5) return {};
  const percents = area.filter((p) => new RegExp('^' + NUM + String.raw`\s*%$`).test(p.text));
  const statuses = area.filter((p) => /^(Торс\s*)?(Норма|Выше нормы|Ниже нормы)$/.test(p.text));

  const byY = [...kg].sort((a, b) => a.midY - b.midY);
  const trunk = byY[2];
  const rest = byY.filter((_, i) => i !== 2);
  const top = rest.slice(0, 2).sort((a, b) => a.midX - b.midX);
  const bottom = rest.slice(2).sort((a, b) => a.midX - b.midX);
  const mapping = [['leftArm', top[0]], ['rightArm', top[1]], ['trunk', trunk], ['leftLeg', bottom[0]], ['rightLeg', bottom[1]]];

  const dist = (a, b) => (a.midX - b.midX) ** 2 + (a.midY - b.midY) ** 2;
  const owner = (p) => kg.reduce((best, k) => (!best || dist(k, p) < dist(best, p) ? k : best), null);
  const nearest = (list, phrase) => list.filter((p) => owner(p) === phrase).sort((a, b) => dist(a, phrase) - dist(b, phrase))[0];

  const result = {};
  for (const [segment, phrase] of mapping) {
    const value = leadingNumber(phrase.text);
    if (value == null) continue;
    const entry = { kg: value, percent: null, status: null };
    const pc = nearest(percents, phrase);
    if (pc) entry.percent = leadingNumber(pc.text);
    const st = nearest(statuses, phrase);
    if (st) entry.status = normStatus(st.text);
    result[segment] = entry;
  }
  return result;
}

export function normStatus(text) {
  const t = text.toLowerCase();
  if (t.includes('ниже')) return 'below';
  if (t.includes('выше')) return 'above';
  if (t.includes('норма')) return 'normal';
  return null;
}

// Границы правдоподобия: отбрасываем явный мусор разбора (как InBodyParser.plausible в iOS-версии).
const PLAUSIBLE = {
  weight: [20, 300], muscleMass: [5, 120], fatPercent: [1, 75], fatMass: [0.5, 200], water: [5, 120],
  protein: [1, 40], bone: [0.5, 10], visceralFat: [1, 30], bmi: [8, 80], fatFreeMass: [10, 200],
  bmr: [500, 5000], score: [1, 120],
};

export function plausible(metric, v) {
  const r = PLAUSIBLE[metric];
  return v != null && Number.isFinite(v) && (!r || (v >= r[0] && v <= r[1]));
}

function sanitize(report) {
  for (const m of Object.keys(report.values)) if (!plausible(m, report.values[m])) delete report.values[m];
  for (const h of report.history) {
    for (const k of ['weight', 'muscleMass', 'fatPercent']) if (!plausible(k, h[k])) h[k] = null;
  }
  report.history = report.history.filter((h) => h.weight != null || h.muscleMass != null || h.fatPercent != null);
  return report;
}

/** Полный разбор: pdfjs — модуль pdf.js, data — ArrayBuffer файла. */
export async function parsePdf(pdfjs, data) {
  if (data.byteLength > 20 * 1024 * 1024) throw new InBodyError('Файл больше 20 МБ, это не похоже на отчёт InBody.');
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
  } catch {
    throw new InBodyError('Не получилось открыть PDF.');
  }
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const phrases = extractPhrases(content.items.slice(0, 5000), vp.height);
  return parsePhrases(phrases, vp.width);
}
