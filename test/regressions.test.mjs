import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/logic.js';

test('невыполненные подходы не попадают в статистику и сводку ИИ', () => {
  const e = { name: 'Жим', sets: [{ weight: 50, reps: 10, isDone: true }, { weight: 80, reps: 10, isDone: false }] };
  const w = { date: '2026-11-01T12:00:00Z', exercises: [e] };
  assert.equal(L.workoutVolume(w), 500);
  assert.equal(L.workoutSetCount(w), 1);
  assert.equal(L.sessionsFrom([w], () => 'chest')[0].exercises[0].sets.length, 1);
  assert.equal(L.sessionsFrom([{ ...w, planned: true }], () => 'chest').length, 0);
  assert.equal(L.sessionsFrom([{ ...w, exercises: [{ ...e, sets: [e.sets[1]] }] }], () => 'chest').length, 0);
});

test('прогрессия не повышает все веса по одному подходу', () => {
  const sets = [{ weight: 50, reps: 12 }, { weight: 40, reps: 8 }, { weight: 80, reps: 12, isDone: false }];
  const p = L.suggest(sets, 'Жим', 'chest', [8, 12]);
  assert.deepEqual(p.sets.map(s => s.weight), [50, 40]);
  assert.deepEqual(p.sets.map(s => s.reps), [12, 9]);
});

test('план не двигает программу вперёд', () => {
  const p = { id: 'p', days: [{}, {}] };
  assert.equal(L.nextDay(p, [{ programID: 'p', programDay: 0, date: '2026-11-20', planned: true }]), 0);
});

test('копия сохраняет пользовательские настройки и календарный день независимо от часового пояса', () => {
  const oldTZ = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Moscow';
    const s = L.emptyState();
    s.settings = { ...s.settings, restSeconds: 90, nutritionGoal: 'gain', activeProgram: 'split3' };
    s.measurements = [{ day: '2026-11-19', values: { weight: 70 } }];
    const b = L.makeBackup(s);
    process.env.TZ = 'America/New_York';
    const back = L.readBackup(b);
    assert.equal(back.measurements[0].day, '2026-11-19');
    assert.equal(back.settings.restSeconds, 90);
    assert.equal(back.settings.nutritionGoal, 'gain');
    assert.equal(back.settings.activeProgram, 'split3');
    assert.equal(L.readBackup({ version: 2, measurements: [], workouts: [] }, s.settings).settings.restSeconds, 90);
  } finally { if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ; }
});
