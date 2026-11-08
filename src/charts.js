// Небольшие SVG-графики без библиотек. Цвета берутся из CSS-переменных темы.
import { num, fmtDay, toDate } from './logic.js';

const W = 340;

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 1e6; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks, step };
}

const digitsFor = (step) => (step >= 1 ? 0 : step >= 0.1 ? 1 : 2);

/**
 * Линейный график по датам.
 * @param {{date:any, value:number, partial?:boolean}[]} points
 * @param {{band?:{min:number,max:number}, height?:number, unit?:string, trend?:boolean, color?:string, area?:boolean}} o
 */
export function lineChart(points, o = {}) {
  const H = o.height || 170;
  const pad = { l: 36, r: 12, t: 12, b: 24 };
  if (!points.length) return '';
  const xs = points.map((p) => toDate(p.date).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 3 * 86_400_000; x1 += 3 * 86_400_000; }
  const vals = points.map((p) => p.value);
  let ymin = Math.min(...vals), ymax = Math.max(...vals);
  if (o.band) { ymin = Math.min(ymin, o.band.min); ymax = Math.max(ymax, o.band.max); }
  const spread = Math.max(ymax - ymin, Math.abs(ymax) * 0.02, 0.5);
  const { lo, hi, ticks, step } = niceTicks(ymin - spread * 0.08, ymax + spread * 0.08);
  const X = (t) => pad.l + ((t - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const color = o.color || 'var(--accent)';
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label || 'График'}">`;
  if (o.band) {
    const y1 = Y(Math.min(o.band.max, hi)), y2 = Y(Math.max(o.band.min, lo));
    s += `<rect x="${pad.l}" y="${y1}" width="${W - pad.l - pad.r}" height="${Math.max(0, y2 - y1)}" fill="var(--band)"/>`;
  }
  for (const t of ticks) {
    s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)" stroke-width="1"/>`;
    s += `<text x="${pad.l - 6}" y="${Y(t) + 3.5}" text-anchor="end" class="tick">${num(t, digitsFor(step))}</text>`;
  }
  // Подписи дат: первая и последняя, плюс середина при достаточном размахе.
  const labelDates = [x0, x1];
  if (points.length > 2) labelDates.splice(1, 0, (x0 + x1) / 2);
  labelDates.forEach((t, i) => {
    const anchor = i === 0 ? 'start' : i === labelDates.length - 1 ? 'end' : 'middle';
    s += `<text x="${X(t)}" y="${H - 6}" text-anchor="${anchor}" class="tick">${fmtDay(new Date(t), false)}</text>`;
  });
  const sorted = points.map((p, i) => ({ ...p, t: xs[i] })).sort((a, b) => a.t - b.t);
  const path = sorted.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.value).toFixed(1)}`).join('');
  if (o.area !== false && sorted.length > 1) {
    s += `<path d="${path}L${X(sorted.at(-1).t).toFixed(1)},${Y(lo)}L${X(sorted[0].t).toFixed(1)},${Y(lo)}Z" fill="${color}" opacity="0.12"/>`;
  }
  if (sorted.length > 1) s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (o.trendLine) {
    const [a, b] = o.trendLine;
    s += `<line x1="${X(toDate(a.date).getTime())}" y1="${Y(a.value)}" x2="${X(toDate(b.date).getTime())}" y2="${Y(b.value)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  }
  sorted.forEach((p, i) => {
    const last = i === sorted.length - 1;
    const r = last ? 4.5 : 3;
    s += p.partial
      ? `<circle cx="${X(p.t)}" cy="${Y(p.value)}" r="${r}" fill="var(--card)" stroke="${color}" stroke-width="1.6"/>`
      : `<circle cx="${X(p.t)}" cy="${Y(p.value)}" r="${r}" fill="${color}"/>`;
  });
  return s + '</svg>';
}

/** Столбики: [{label, value, highlight?}] */
export function barChart(items, o = {}) {
  const H = o.height || 150;
  const pad = { l: 36, r: 8, t: 10, b: 22 };
  if (!items.length) return '';
  const max = Math.max(...items.map((i) => i.value), 1);
  const { hi, ticks, step } = niceTicks(0, max, 3);
  const bw = (W - pad.l - pad.r) / items.length;
  const Y = (v) => pad.t + (1 - v / hi) * (H - pad.t - pad.b);
  const fmt = o.format || ((v) => num(v, digitsFor(step)));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label || 'График'}">`;
  for (const t of ticks) {
    s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)"/>`;
    s += `<text x="${pad.l - 6}" y="${Y(t) + 3.5}" text-anchor="end" class="tick">${fmt(t)}</text>`;
  }
  const every = Math.ceil(items.length / 6);
  items.forEach((it, i) => {
    const x = pad.l + i * bw + bw * 0.18;
    const h = Y(0) - Y(it.value);
    s += `<rect x="${x.toFixed(1)}" y="${Y(it.value).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" fill="${it.highlight ? 'var(--accent)' : 'var(--accent-soft)'}"/>`;
    if ((items.length - 1 - i) % every === 0) s += `<text x="${(x + bw * 0.32).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="tick">${it.label}</text>`;
  });
  return s + '</svg>';
}

/** Два ряда изменений от первого значения: состав тела и тоннаж (нормированы на свои оси). */
export function dualChart(a, b, o = {}) {
  const H = o.height || 170;
  const pad = { l: 36, r: 40, t: 12, b: 24 };
  const all = [...a.points, ...b.points, ...a.series.flatMap((x) => x.points)];
  if (!all.length) return '';
  const xs = all.map((p) => toDate(p.date).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 86_400_000; x1 += 86_400_000; }
  const X = (t) => pad.l + ((t - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const axis = (pts) => {
    const v = pts.map((p) => p.value);
    return niceTicks(Math.min(0, ...v), Math.max(0.5, ...v), 4);
  };
  const A = axis(a.points), B = axis(b.points);
  const Ya = (v) => pad.t + (1 - (v - A.lo) / (A.hi - A.lo)) * (H - pad.t - pad.b);
  const Yb = (v) => pad.t + (1 - (v - B.lo) / (B.hi - B.lo)) * (H - pad.t - pad.b);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label || 'График'}">`;
  for (const t of A.ticks) {
    s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Ya(t)}" y2="${Ya(t)}" stroke="var(--grid)"/>`;
    s += `<text x="${pad.l - 6}" y="${Ya(t) + 3.5}" text-anchor="end" class="tick">${t > 0 ? '+' : ''}${num(t, digitsFor(A.step))}</text>`;
  }
  for (const t of B.ticks) s += `<text x="${W - pad.r + 6}" y="${Yb(t) + 3.5}" class="tick">${b.format ? b.format(t) : num(t, 0)}</text>`;
  const bw = Math.max(4, (W - pad.l - pad.r) / Math.max(12, b.points.length * 1.6));
  for (const p of b.points) {
    const x = X(toDate(p.date).getTime());
    s += `<rect x="${(x - bw / 2).toFixed(1)}" y="${Yb(p.value).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, Yb(B.lo) - Yb(p.value)).toFixed(1)}" rx="2" fill="var(--accent-soft)"/>`;
  }
  for (const series of a.series) {
    const pts = series.points.map((p) => ({ x: X(toDate(p.date).getTime()), y: Ya(p.value) })).sort((p, q) => p.x - q.x);
    if (pts.length > 1) s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')}" fill="none" stroke="${series.color}" stroke-width="2.2"/>`;
    for (const p of pts) s += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${series.color}"/>`;
  }
  s += `<text x="${pad.l}" y="${H - 6}" class="tick">${fmtDay(new Date(x0), false)}</text><text x="${W - pad.r}" y="${H - 6}" text-anchor="end" class="tick">${fmtDay(new Date(x1), false)}</text>`;
  return s + '</svg>';
}

/** Полоска «ниже нормы / норма / выше нормы» с отметкой значения, как в отчёте InBody. */
export function normScale(value, range) {
  if (value == null || !range) return '';
  const span = range.max - range.min || 1;
  const lo = range.min - span, hi = range.max + span;
  const pos = Math.min(98, Math.max(2, ((value - lo) / (hi - lo)) * 100));
  const status = value < range.min ? 'below' : value > range.max ? 'above' : 'normal';
  return `<div class="scale" aria-hidden="true"><span class="z below"></span><span class="z normal"></span><span class="z above"></span><i class="mark ${status}" style="left:${pos.toFixed(1)}%"></i></div>
  <div class="scale-labels"><span>${num(range.min)}</span><span>${num(range.max)}</span></div>`;
}
