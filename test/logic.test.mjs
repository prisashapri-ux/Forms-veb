import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/logic.js';

const now = new Date(1_790_000_000 * 1000);
const daysAgo = (n) => new Date(+now - n * 86_400_000);
const session = (ago, items) => ({ date: daysAgo(ago), exercises: items.map(([name, group, weight, reps]) => ({ name, group, sets: Array(3).fill({ weight, reps }) })) });
const balanced = (ago, bench = 80) => session(ago, [
  ['Жим штанги лёжа', 'chest', bench, 10], ['Тяга штанги в наклоне', 'back', 60, 10], ['Тяга верхнего блока', 'back', 50, 10],
  ['Приседания со штангой', 'legs', 90, 8], ['Жим ногами', 'legs', 150, 10], ['Жим гантелей сидя', 'shoulders', 20, 10],
  ['Махи гантелями в стороны', 'shoulders', 8, 15], ['Отжимания на брусьях', 'chest', 0, 12],
]);
const ids = (t) => t.map((x) => x.id);

test('перерыв', () => {
  const t = L.advisorTips([balanced(10)], [], now);
  assert.equal(t[0].id, 'break');
  assert.equal(t[0].title, 'Перерыв 10 дней');
  assert.ok(!ids(L.advisorTips([balanced(2)], [], now)).includes('break'));
});

test('застой', () => {
  const s = [balanced(30, 80), balanced(26, 82.5), balanced(19, 80), balanced(12, 82.5), balanced(5, 80)];
  assert.ok(ids(L.plateauTips(s, now)).includes('plateau-Жим штанги лёжа'));
  const g = [balanced(30, 75), balanced(26, 77.5), balanced(19, 80), balanced(12, 82.5), balanced(5, 85)];
  assert.ok(!ids(L.plateauTips(g, now)).includes('plateau-Жим штанги лёжа'));
});

test('забытая спина и перекос жимов', () => {
  const push = [['Жим штанги лёжа', 'chest', 80, 10], ['Жим гантелей сидя', 'shoulders', 20, 10], ['Приседания со штангой', 'legs', 90, 8], ['Французский жим', 'triceps', 30, 12]];
  const s = [session(40, [['Тяга штанги в наклоне', 'back', 60, 10]]), ...[24, 18, 11, 4].map((a) => session(a, push))];
  const t = L.advisorTips(s, [], now);
  assert.ok(t.some((x) => x.id === 'neglected-back' && x.priority === 60));
  assert.ok(ids(t).includes('balance-push'));
});

test('разгрузка после шести тяжёлых недель', () => {
  const ws = L.weekStart(now);
  const s = [];
  for (let w = 1; w <= 8; w++) for (const d of [1.5, 3.5]) { const x = balanced(0, 70 + w); x.date = new Date(+ws + (-w * 7 + d) * 86_400_000); s.push(x); }
  assert.ok(ids(L.advisorTips(s, [], now)).includes('deload'));
});

test('состав тела', () => {
  const fat = [0, 1, 2, 3].map((i) => ({ date: daysAgo(90 - i * 28), weight: 75 + i, muscle: 33, fatMass: 14 + i }));
  assert.ok(ids(L.advisorTips([], fat, now)).includes('body-fat-up'));
  const cut = [0, 1, 2, 3].map((i) => ({ date: daysAgo(90 - i * 28), weight: 80 - i, muscle: 35 - i * 0.6, fatMass: 16 - i }));
  assert.match(L.advisorTips([], cut, now).find((x) => x.id === 'body-cut-muscle').text, /г в день/);
  const one = [{ date: daysAgo(50), weight: 75, muscle: 33, fatPercent: 15, fatMass: 11, leftArm: 3.0, rightArm: 3.4 }];
  const i = ids(L.advisorTips([], one, now));
  assert.ok(i.includes('body-measure') && i.includes('imbalance-arms'));
});

const sets = (items, warm) => [...(warm ? [{ weight: warm[0], reps: warm[1], isWarmup: true }] : []), ...items.map(([weight, reps]) => ({ weight, reps, isWarmup: false }))];
const working = (s) => s.sets.filter((x) => !x.isWarmup);

test('двойная прогрессия', () => {
  let s = L.suggest(sets([[80, 9], [80, 9], [80, 8]]), 'X', 'chest');
  assert.deepEqual(working(s).map((x) => x.reps), [10, 10, 9]);
  s = L.suggest(sets([[80, 12], [80, 12], [80, 12]], [40, 12]), 'X', 'chest');
  assert.deepEqual(working(s).map((x) => x.weight), [82.5, 82.5, 82.5]);
  assert.deepEqual(working(s).map((x) => x.reps), [8, 8, 8]);
  assert.deepEqual(s.sets[0], { weight: 40, reps: 12, isWarmup: true });
  s = L.suggest(sets([[24, 12], [24, 12]]), 'Жим гантелей лёжа', 'chest');
  assert.deepEqual(working(s).map((x) => x.weight), [25, 25]);
  s = L.suggest(sets([[100, 6], [100, 6], [100, 6]]), 'X', 'legs');
  assert.deepEqual(working(s).map((x) => x.reps), [3, 3, 3]);
  assert.equal(L.suggest(sets([[0, 20]]), 'Беговая дорожка', 'cardio'), null);
});

test('тренд', () => {
  const pts = [0, 1, 2, 3, 4].map((i) => ({ date: new Date(i * 7 * 86_400_000), value: 70 - i * 0.35 }));
  assert.ok(Math.abs(L.monthlySlope(pts) + 1.5) < 0.001);
  assert.equal(L.monthlySlope(pts.slice(0, 2)), null);
});

test('склонения', () => {
  assert.equal(L.plural(1, 'день', 'дня', 'дней'), 'день');
  assert.equal(L.plural(3, 'день', 'дня', 'дней'), 'дня');
  assert.equal(L.plural(11, 'день', 'дня', 'дней'), 'дней');
  assert.equal(L.plural(22, 'день', 'дня', 'дней'), 'дня');
});

test('резервная копия туда и обратно', () => {
  const st = L.emptyState();
  st.measurements.push({ day: '2026-10-03', isPartial: false, values: { weight: 69, muscleMass: 31.3 }, ranges: { weight: { min: 53.4, max: 72.2 } },
    segmentMuscle: { leftArm: { kg: 3.29, percent: 107.3, status: 'normal' } }, segmentFat: {}, dailyCalories: 2655, conditions: { timeOfDay: 'morning', fasted: true, afterWorkout: false } });
  st.exercises.find((e) => e.name === 'Жим штанги лёжа').note = 'Скамья у зеркала';
  st.workouts.push({ id: 'a', date: '2026-10-04T15:30:00.000Z', title: 'Грудь', note: '', exercises: [{ name: 'Жим штанги лёжа', sets: [{ weight: 80, reps: 8, isWarmup: false, isDone: true }] }] });
  st.food.push({ id: 'f', date: '2026-10-04T10:00:00.000Z', title: 'Творог', protein: 34, kcal: 240 });
  const json = JSON.stringify(L.makeBackup(st));
  assert.ok(!/\.\d{3}Z/.test(json), 'даты без миллисекунд для Swift');
  const back = L.readBackup(json);
  assert.equal(back.measurements[0].day, '2026-10-03');
  assert.equal(back.measurements[0].values.weight, 69);
  assert.equal(back.measurements[0].segmentMuscle.leftArm.kg, 3.29);
  assert.equal(back.exercises.find((e) => e.name === 'Жим штанги лёжа').note, 'Скамья у зеркала');
  assert.equal(back.workouts[0].exercises[0].sets[0].weight, 80);
  assert.equal(back.food[0].protein, 34);
  assert.throws(() => L.readBackup('{"x":1}'), /не резервная копия/);
});

test('программа подставляет веса с прибавкой', () => {
  const p = L.programById('split3');
  const prev = { id: 'p', date: '2026-10-01T10:00:00.000Z', title: '', exercises: [{ name: 'Жим штанги лёжа', sets: [{ weight: 80, reps: 10, isWarmup: false }, { weight: 80, reps: 10, isWarmup: false }, { weight: 80, reps: 10, isWarmup: false }] }] };
  const w = L.workoutFromProgram(p, 0, [prev], () => 'chest', new Date('2026-10-05T10:00:00Z'));
  assert.deepEqual(w.exercises[0].sets.map((s) => s.weight), [82.5, 82.5, 82.5]);
  assert.deepEqual(w.exercises[0].sets.map((s) => s.reps), [6, 6, 6]);
  assert.deepEqual(w.exercises[1].sets.map((s) => s.reps), [8, 8, 8]);
  assert.equal(L.nextDay(p, [w]), 1);
});
