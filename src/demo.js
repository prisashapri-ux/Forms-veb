// Примерные данные для знакомства с приложением. Числа выдуманные и помечены в интерфейсе.
import { emptyState, programById, workoutFromProgram, groupOfIn, uid, dayKey } from './logic.js';

export function demoState(now = new Date()) {
  const s = emptyState();
  s.demo = true;
  const day = (ago) => { const d = new Date(now); d.setDate(d.getDate() - ago); return d; };
  const ranges = {
    weight: { min: 58, max: 78 }, muscleMass: { min: 29, max: 35 }, fatPercent: { min: 10, max: 20 }, fatMass: { min: 7.5, max: 15 },
    water: { min: 37, max: 45 }, protein: { min: 10, max: 12.2 }, bone: { min: 3.4, max: 4.2 }, visceralFat: { min: 1, max: 9 },
    bmi: { min: 18.5, max: 25 }, fatFreeMass: { min: 50, max: 61 },
  };
  const points = [
    [118, 74.6, 32.1, 19.9], [90, 74.1, 32.4, 19.1], [62, 73.8, 32.8, 18.4], [34, 73.2, 33.1, 17.6], [6, 72.9, 33.5, 16.9],
  ];
  points.forEach(([ago, w, m, f], i) => {
    const fatMass = +(w * f / 100).toFixed(1);
    const last = i === points.length - 1;
    s.measurements.push({
      day: dayKey(day(ago)), isPartial: false,
      values: { weight: w, muscleMass: m, fatPercent: f, fatMass, water: +(w * 0.55).toFixed(1), protein: +(m * 0.36).toFixed(1), bone: 3.7,
        visceralFat: last ? 6 : 7, bmi: +(w / 1.76 / 1.76).toFixed(1), fatFreeMass: +(w - fatMass).toFixed(1), bmr: Math.round(370 + 21.6 * (w - fatMass)), score: 72 + i * 2 },
      ranges, dailyCalories: last ? 2750 : 2700, idealWeight: 70.5, toIdealWeight: -2.4, toIdealFat: -3.1, toIdealMuscle: 0.7, age: 28, heightCm: 176,
      segmentMuscle: { leftArm: { kg: 3.6, percent: 104, status: 'normal' }, rightArm: { kg: 3.75, percent: 108, status: 'normal' }, trunk: { kg: 27.4, percent: 103, status: 'normal' }, leftLeg: { kg: 9.1, percent: 97, status: 'normal' }, rightLeg: { kg: 9.2, percent: 98, status: 'normal' } },
      segmentFat: { leftArm: { kg: 0.7, percent: 118, status: 'normal' }, rightArm: { kg: 0.7, percent: 117, status: 'normal' }, trunk: { kg: 6.6, percent: 155, status: 'above' }, leftLeg: { kg: 1.9, percent: 108, status: 'normal' }, rightLeg: { kg: 1.9, percent: 108, status: 'normal' } },
      conditions: { timeOfDay: 'morning', fasted: true, afterWorkout: false }, source: null, importedAt: new Date().toISOString(),
    });
  });
  // Восемь недель по программе «Фулбади 3 раза в неделю» с прогрессией.
  const program = programById('fullbody3');
  const start = { 'Приседания со штангой': 60, 'Жим штанги лёжа': 55, 'Тяга штанги в наклоне': 45, 'Жим гантелей сидя': 14, 'Подъём штанги на бицепс': 25, 'Скручивания': 0,
    'Румынская тяга': 60, 'Жим гантелей на наклонной скамье': 18, 'Тяга верхнего блока': 45, 'Выпады с гантелями': 12, 'Разгибание рук на блоке': 20, 'Подъём ног в висе': 0 };
  let dayIndex = 0;
  for (let ago = 56; ago >= 1; ago--) {
    const d = day(ago);
    if (![1, 3, 5].includes(d.getDay())) continue;
    d.setHours(19, 0, 0, 0);
    const w = workoutFromProgram(program, dayIndex, s.workouts, (n) => groupOfIn(s, n), d);
    for (const e of w.exercises) {
      for (const set of e.sets) {
        if (set.weight === 0 && start[e.name]) set.weight = start[e.name];
        set.isDone = true;
      }
    }
    w.finishedAt = new Date(d.getTime() + 65 * 60000).toISOString();
    w.durationMinutes = 65;
    w.id = uid();
    s.workouts.push(w);
    dayIndex = (dayIndex + 1) % program.days.length;
  }
  s.settings.activeProgram = 'fullbody3';
  const t = new Date(now); t.setHours(9, 0, 0, 0);
  s.food.push({ id: uid(), date: t.toISOString(), title: 'Творог 5% 200 г', protein: 34, kcal: 240 });
  t.setHours(13);
  s.food.push({ id: uid(), date: t.toISOString(), title: 'Курица 150 г', protein: 35, kcal: 165 });
  return s;
}
