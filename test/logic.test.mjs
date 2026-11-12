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

test('свои тренировки переживают резервную копию и чистятся', async () => {
  const L = await import('../src/logic.js');
  const st = L.emptyState();
  st.templates = [
    { id: 'a1', kind: 'gym', title: 'Спина', items: [{ exercise: 'Подтягивания широким хватом', sets: 4, reps: [12, 6] }] },
    { id: 'b2', kind: 'home', title: 'Дом', rounds: 99, rest: 15, roundRest: 45, items: [['Отжимания', 3], ['Планка', 45]] },
  ];
  const back = L.readBackup(JSON.stringify(L.makeBackup(st)));
  assert.equal(back.templates.length, 2);
  assert.deepEqual(back.templates[0].items[0].reps, [6, 12]);
  assert.equal(back.templates[1].rounds, 3);
  assert.deepEqual(back.templates[1].items[0], ['Отжимания', 40]);
  assert.ok(st.exercises.some((e) => e.name === 'Австралийские подтягивания'));
});

test('сводка для ИИ и запрос к DeepSeek', async () => {
  const L = await import('../src/logic.js');
  const A = await import('../src/ai.js');
  const now = new Date('2026-11-08T12:00:00Z');
  const sessions = [{ date: new Date('2026-11-01T10:00:00Z'), exercises: [{ name: 'Подтягивания', group: 'back', sets: [{ weight: 0, reps: 8 }, { weight: 0, reps: 7 }] }] }];
  const body = [{ date: new Date('2026-11-02T08:00:00Z'), weight: 80.5, muscle: 36.1, fatPercent: 18, standard: true }];
  const s = A.aiSummary(sessions, body, [{ title: 'Застой' }], { age: 30, heightCm: 180 }, now);
  assert.match(s, /Подтягивания \[Спина\], тренировок 1: 01\.11\.26: 0×8, 0×7/);
  assert.match(s, /вес 80,5 кг/);
  assert.match(s, /возраст 30/);
  const msgs = A.buildMessages([{ role: 'user', text: 'Что делать?' }, { role: 'assistant', text: 'Ок' }, { role: 'user', text: 'А ещё?' }], 'СВОДКА');
  assert.equal(msgs[0].role, 'system');
  assert.match(msgs[1].content, /^Мои данные:\nСВОДКА\n\nВопрос: Что делать\?$/);
  assert.equal(msgs[3].content, 'А ещё?');
  globalThis.localStorage = { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; }, removeItem(k) { delete this.m[k]; } };
  await assert.rejects(A.ask([{ role: 'user', text: 'x' }], ''), /ключ/);
  A.setKey(' sk-test ');
  let sent;
  const ok = await A.ask([{ role: 'user', text: 'x' }], 'S', async (url, o) => { sent = { url, o }; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: ' Ответ ' } }] }) }; });
  assert.equal(ok, 'Ответ');
  assert.equal(sent.o.headers.Authorization, 'Bearer sk-test');
  assert.equal(JSON.parse(sent.o.body).model, 'deepseek-flash');
  assert.deepEqual(JSON.parse(sent.o.body).thinking, { type: 'disabled' });
  localStorage.setItem('forma.deepseek.model', 'deepseek-reasoner');
  assert.equal(A.getMode(), 'think');
  await A.ask([{ role: 'user', text: 'x' }], 'S', async (url, o) => { sent = { url, o }; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Да' } }] }) }; });
  assert.deepEqual(JSON.parse(sent.o.body).thinking, { type: 'enabled' });
  A.setMode('fast');
  // Если deepseek-flash недоступна, один повтор на deepseek-chat без фото.
  const bodies = [];
  const fb = await A.ask([{ role: 'user', text: 'Что это?', image: 'data:image/jpeg;base64,AAA' }], 'S', async (url, o) => {
    bodies.push(JSON.parse(o.body));
    return bodies.length === 1 ? { ok: false, status: 400, json: async () => ({ error: { message: 'Model Not Exist' } }) } : { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Ответ' } }] }) };
  });
  assert.equal(bodies[1].model, 'deepseek-chat');
  assert.equal(typeof bodies[1].messages[1].content, 'string');
  assert.match(fb, /без учёта снимка/);
  await assert.rejects(A.ask([{ role: 'user', text: 'x' }], 'S', async () => ({ ok: false, status: 402, json: async () => ({}) })), /закончились деньги/);
  void L;
});

test('фото уходит в DeepSeek, в историю пишется только миниатюра', async () => {
  const A = await import('../src/ai.js');
  const msgs = A.buildMessages([{ role: 'user', text: 'Что это?', image: 'data:image/jpeg;base64,BIG', thumb: 'data:image/jpeg;base64,T' }, { role: 'assistant', text: 'Жим' }, { role: 'user', text: 'Ещё', thumb: 'data:image/jpeg;base64,T' }], 'S', ['Жим лёжа']);
  assert.match(msgs[0].content, /Упражнения в приложении: Жим лёжа\./);
  assert.equal(msgs[1].content[0].type, 'text');
  assert.match(msgs[1].content[0].text, /Вопрос: Что это\?/);
  assert.deepEqual(msgs[1].content[1], { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,BIG', detail: 'high' } });
  assert.equal(msgs[2].content, 'Жим');
  assert.equal(msgs[3].content[1].image_url.detail, 'low');
  globalThis.localStorage = { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; }, removeItem(k) { delete this.m[k]; } };
  A.saveChats([{ id: 'a', updated: 1, msgs: [{ role: 'user', text: 'x', image: 'BIG', thumb: 'T' }] }]);
  assert.deepEqual(A.loadChats()[0].msgs[0], { role: 'user', text: 'x', thumb: 'T' });
});

test('упражнения из ответа ИИ разбираются и не ломают текст', async () => {
  const A = await import('../src/ai.js');
  const r = A.parseExercises('Это **жим ногами**.\n\n[[exercise {"name":"Жим ногами","group":"legs","sets":3,"reps":"10-12","weight":62.3}]]\n[[exercise {"name":"Жим ногами","group":"legs"}]]\n[[exercise {"name":"Икры","group":"zzz","sets":99,"reps":"15"}]]\n[[exercise {битый}]]');
  assert.equal(r.text, 'Это **жим ногами**.');
  assert.deepEqual(r.exercises, [
    { name: 'Жим ногами', group: 'legs', sets: 3, reps: [10, 12], weight: 62.5 },
    { name: 'Икры', group: 'other', sets: 10, reps: [15, 15], weight: 0 },
  ]);
  assert.deepEqual(A.parseExercises('Просто текст').exercises, []);
});

test('разметка ответов ИИ безопасна', async () => {
  const A = await import('../src/ai.js');
  const h = A.mdLite('### План\n**Жим** 5×5\n- раз <script>\n- два\n\n1. три');
  assert.equal(h, '<h4>План</h4><p><b>Жим</b> 5×5</p><ul><li>раз &lt;script&gt;</li><li>два</li></ul><ol><li>три</li></ol>');
});

test('уровень сопротивления кардио сохраняется в резервной копии', () => {
  const s = L.emptyState();
  s.workouts.push({ id: 'w1', date: '2026-11-09T08:00:00.000Z', title: 'Кардио', note: '', durationMinutes: 30, programID: null, programDay: null, finishedAt: '2026-11-09T08:40:00.000Z',
    exercises: [{ name: 'Эллипс', sets: [{ weight: 30, reps: 5, level: 8, isWarmup: false, isDone: true }, { weight: 10, reps: 0, isWarmup: false, isDone: true }] }] });
  const back = L.readBackup(JSON.parse(JSON.stringify(L.makeBackup(s))));
  const sets = back.workouts[0].exercises[0].sets;
  assert.equal(sets[0].level, 8);
  assert.equal('level' in sets[1], false);
  assert.equal(L.workingSets({ sets }).length, 1);
});

test('табло кардио по фото: разбор и запрос', async () => {
  const A = await import('../src/ai.js');
  assert.deepEqual(A.parseDisplay('{"ok":true,"minutes":"32,5","km":5.27,"level":8,"calories":312.4}'), { minutes: 32.5, km: 5.27, level: 8, calories: 312 });
  assert.deepEqual(A.parseDisplay('```json\n{"ok":true,"minutes":30,"km":null,"level":999}\n```'), { minutes: 30, km: null, level: null, calories: null });
  assert.throws(() => A.parseDisplay('{"ok":false,"note":"это кот"}'), /это кот/);
  assert.throws(() => A.parseDisplay('{"ok":true}'), /не видно цифр/);
  assert.throws(() => A.parseDisplay('не json'), /непонятно/);
  globalThis.localStorage = { m: { 'forma.deepseek.key': 'sk-test' }, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; }, removeItem(k) { delete this.m[k]; } };
  let body;
  const r = await A.readCardioDisplay('data:image/jpeg;base64,X', 'Эллипс', async (u, o) => { body = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"ok":true,"minutes":20,"km":3,"level":6}' } }] }) }; });
  assert.equal(r.level, 6);
  assert.equal(body.model, 'deepseek-flash');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.messages[1].content[1].image_url.url, 'data:image/jpeg;base64,X');
});

test('Мой зал: тренажёры в копии, узнавание по фото', async () => {
  const A = await import('../src/ai.js');
  const s = L.emptyState();
  s.machines = [{ id: 'm1', name: 'Жим ногами 45°', exercise: 'Жим ногами', group: 'legs', settings: 'Сиденье 4', photo: 'data:image/jpeg;base64,AAAA', created: 1 }, { name: '' }];
  const back = L.readBackup(JSON.parse(JSON.stringify(L.makeBackup(s))));
  assert.deepEqual(back.machines, [{ id: 'm1', name: 'Жим ногами 45°', exercise: 'Жим ногами', group: 'legs', settings: 'Сиденье 4', photo: 'data:image/jpeg;base64,AAAA', created: 1 }]);
  assert.equal(L.cleanMachine({ name: 'X', photo: 'javascript:alert(1)' }).photo, null);
  assert.deepEqual(A.parseMachine('{"ok":true,"match":2,"name":"Тяга","exercise":"Тяга верхнего блока","group":"back","tip":"Валик на бёдра"}', 2), { match: 1, name: 'Тяга', exercise: 'Тяга верхнего блока', group: 'back', tip: 'Валик на бёдра' });
  assert.equal(A.parseMachine('{"ok":true,"match":5,"name":"Тяга"}', 2).match, null);
  assert.throws(() => A.parseMachine('{"ok":false,"note":"это стул"}', 0), /это стул/);
  const refs = A.machineRefs(back.machines);
  assert.equal(refs.length, 3);
  assert.match(refs[1].text, /Сиденье 4/);
  const msgs = A.buildMessages([{ role: 'user', text: 'Что это?', image: 'data:image/jpeg;base64,B' }], 'S', [], back.machines);
  assert.equal(msgs[1].content.length, 5);
  const old = A.buildMessages([{ role: 'user', text: 'Что это?', thumb: 'data:image/jpeg;base64,B' }], 'S', [], back.machines);
  assert.equal(old[1].content.length, 2);
});

test('база тренажёров сливается по названию и не трогает свои настройки', () => {
  const cur = [{ id: 'a', name: 'Жим ногами', exercise: 'Жим ногами', group: 'legs', settings: 'Сиденье 4', photo: null, created: 1 }];
  const file = L.machinesFile([{ id: 'a', name: 'жим ногами', exercise: 'Жим ногами', group: 'legs', settings: 'Сиденье 2', photo: 'data:image/jpeg;base64,AA', created: 2 }, { id: 'b', name: 'Баттерфляй', exercise: 'Сведение рук в тренажёре', group: 'chest', created: 3 }]);
  const r = L.mergeMachines(cur, JSON.stringify(file));
  assert.equal(r.added, 1); assert.equal(r.updated, 1);
  assert.equal(r.machines[0].settings, 'Сиденье 4');
  assert.equal(r.machines[0].photo, 'data:image/jpeg;base64,AA');
  assert.equal(r.machines[1].name, 'Баттерфляй');
  assert.throws(() => L.mergeMachines([], '{}'), /нет тренажёров/);
});

test('тоннаж не считает кардио из своих упражнений', () => {
  const w = { exercises: [{ name: 'Гребля в тренажёре', sets: [{ weight: 20, reps: 4, level: 5 }] }, { name: 'Жим лёжа', sets: [{ weight: 50, reps: 10 }] }] };
  assert.equal(L.workoutVolume(w), 580);
  assert.equal(L.workoutVolume(w, (n) => (n === 'Гребля в тренажёре' ? 'cardio' : 'chest')), 500);
});

test('ключ DeepSeek чистится и проверяется', async () => {
  const AI = await import('../src/ai.js');
  assert.equal(AI.cleanKey(' "sk-ab​c12 3"\n'), 'sk-abc123');
  const mk = (status, body) => async () => ({ status, ok: status < 300, json: async () => body });
  assert.equal((await AI.checkKey('sk-x', mk(401, {}))).state, 'bad');
  assert.equal((await AI.checkKey('sk-x', mk(200, { is_available: false, balance_infos: [] }))).state, 'money');
  const ok = await AI.checkKey('sk-x', mk(200, { is_available: true, balance_infos: [{ total_balance: '5.00', currency: 'USD' }] }));
  assert.equal(ok.state, 'ok'); assert.equal(ok.balance, '5.00 USD');
  assert.equal((await AI.checkKey('sk-x', async () => { throw new TypeError('x'); })).state, 'net');
});

test('настройки тренажёра: уровни, подсказка и слияние базы', () => {
  const m = L.cleanMachine({ name: 'Разгибание голени рычажное', adjust: { seat: ' 4 ', roller: '3', junk: 'x', back: '' } });
  assert.deepEqual(m.adjust, { seat: '4', roller: '3' });
  assert.equal(L.machineSettingsText({ ...m, settings: 'ручки узкие' }), 'Сиденье 4 · Валик 3 · ручки узкие');
  assert.match(L.setupHint(m).tip, /колено/);
  assert.match(L.setupHint({ name: 'Кроссовер', exercises: [{ name: 'Отведение плеча в кроссовере' }] }).tip, /блок/i);
  const merged = L.mergeMachines([{ ...m, id: 'a' }], { machines: [{ name: 'Разгибание голени рычажное', about: 'новое' }] }).machines;
  assert.deepEqual(merged[0].adjust, { seat: '4', roller: '3' });
  assert.equal(merged[0].about, 'новое');
});

test('график «Тело и тренировки» держит линии внутри рамки', async () => {
  const { dualChart } = await import('../src/charts.js');
  const svg = dualChart({ points: [], series: [{ color: 'red', points: [{ date: '2026-07-01', value: 0 }, { date: '2026-09-01', value: 1.6 }, { date: '2026-11-01', value: -2.4 }] }] }, { points: [] });
  const ys = [...svg.matchAll(/<circle cx="[\d.]+" cy="([-\d.]+)"/g)].map((x) => +x[1]);
  assert.equal(ys.length, 3);
  for (const y of ys) assert.ok(y >= 0 && y <= 170, `y=${y}`);
});

test('ИИ: план тренировок из служебных строк', async () => {
  const AI = await import('../src/ai.js');
  const r = AI.parseExercises('План на неделю.\n[[workout {"date":"2026-11-15","title":"Ноги","exercises":[{"name":"Жим ногами","group":"legs","sets":4,"reps":"10-12","weight":100},{"name":"Выпады","group":"legs","sets":3,"reps":12}]}]]\n[[workout {"title":"Спина","exercises":[{"name":"Тяга верхнего блока","group":"back","sets":3,"reps":"8-10","weight":55}]}]]\n[[workout {битое}]]');
  assert.equal(r.text, 'План на неделю.');
  assert.equal(r.workouts.length, 2);
  assert.equal(r.workouts[0].date, '2026-11-15');
  assert.deepEqual(r.workouts[0].exercises[0].reps, [10, 12]);
  assert.equal(r.workouts[1].date, null);
  assert.match(AI.todayLine(new Date(2026, 10, 12)), /^Сегодня 2026-11-12, четверг/);
});

test('ИИ: видит план из календаря и может его менять', async () => {
  const AI = await import('../src/ai.js');
  const r = AI.parseExercises('Меняю.\n[[workout {"replace":"mhz1abc","date":"2026-11-16","exercises":[{"name":"Жим ногами","group":"legs","sets":4,"reps":10,"weight":90}]}]]\n[[workout {"replace":"mhz2def","remove":true}]]\n[[workout {"replace":"bad id!","remove":true}]]');
  assert.equal(r.workouts.length, 2);
  assert.equal(r.workouts[0].replace, 'mhz1abc');
  assert.equal(r.workouts[0].title, '');
  assert.equal(r.workouts[1].remove, true);
  assert.deepEqual(r.workouts[1].exercises, []);
  const now = new Date(2026, 10, 12, 10);
  const t = AI.plannedText([
    { id: 'p1', date: new Date(2026, 10, 14, 18).toISOString(), title: 'Ноги', exercises: [{ name: 'Жим ногами', sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }] }] },
    { id: 'old', date: new Date(2026, 10, 1, 18).toISOString(), title: 'Старое', exercises: [] },
  ], now);
  assert.match(t, /id=p1, .*14\.11\.26.*«Ноги»: Жим ногами 2×10 · 60 кг/);
  assert.doesNotMatch(t, /Старое/);
  assert.match(AI.plannedText([], now), /нет/);
  const msgs = AI.buildMessages([{ role: 'user', text: 'Привет' }], 'S', [], [], t);
  assert.match(msgs[0].content, /id=p1/);
});

test('резервная копия сохраняет пометку «запланирована»', () => {
  const s = L.emptyState();
  s.workouts.push({ id: 'a', date: '2026-11-20T15:00:00.000Z', title: 'План', note: '', durationMinutes: null, programID: null, programDay: null, finishedAt: null, planned: true, exercises: [{ name: 'Жим штанги лёжа', sets: [{ weight: 60, reps: 8, isWarmup: false, isDone: false }] }] });
  s.workouts.push({ id: 'b', date: '2026-11-10T15:00:00.000Z', title: 'Было', note: '', durationMinutes: 50, programID: null, programDay: null, finishedAt: 'мусор', exercises: [] });
  const back = L.readBackup(JSON.stringify(L.makeBackup(s)));
  const plan = back.workouts.find((w) => w.title === 'План');
  assert.equal(plan.planned, true);
  assert.equal(back.workouts.find((w) => w.title === 'Было').finishedAt, null);
});

test('estimateMinutes: по подходам и отдыху, личный темп', () => {
  // 4 упражнения по 3 подхода, отдых 120 с: 5 + 12×2,75 + 4×1,5 = 44 → 45
  assert.equal(L.estimateMinutes([{ sets: 3 }, { sets: 3 }, { sets: 3 }, { sets: 3 }], 120), 45);
  assert.equal(L.estimateMinutes([], 120), 0);
  assert.equal(L.estimateMinutes([{ cardio: true, minutes: 20 }], 90), 25);
  const w = (mins, n) => ({ finishedAt: 'x', durationMinutes: mins, exercises: [{ name: 'a', sets: Array.from({ length: n }, () => ({ reps: 10, isDone: true })) }] });
  assert.equal(L.personalPace([w(60, 20), w(50, 20)]), null);
  assert.equal(L.personalPace([w(60, 20), w(50, 20), w(40, 20)]), 2.5);
  assert.equal(L.estimateMinutes([{ sets: 4 }, { sets: 4 }], 120, 2.5), 20);
});

test('mergeMachines: убирает дубли из removed, но не трогает тренажёр со своими уровнями', () => {
  const cur = [{ id: 'a', name: 'A', exercise: 'x', group: 'chest' }, { id: 'b', name: 'B', exercise: 'x', group: 'chest' }, { id: 'c', name: 'C', exercise: 'x', group: 'chest', adjust: { seat: '4' } }];
  const r = L.mergeMachines(cur, { machines: [{ id: 'a', name: 'A', exercise: 'x', group: 'chest' }], removed: ['b', 'c'] });
  assert.deepEqual(r.machines.map((m) => m.id), ['a', 'c']);
  assert.equal(r.removed, 1);
});

test('Дома: нагрузка растёт по уровням, повторы пишутся в отрезок', async () => {
  const H = await import('../src/home.js');
  const p = H.homeById('pull1');
  assert.equal(H.homeScaled(p, 0).stage, 1);
  assert.deepEqual(H.homeScaled(p, 0).items, p.items);
  const s3 = H.homeScaled(p, 6);
  assert.equal(s3.stage, 3);
  assert.equal(s3.items[0][1], p.items[0][1] + 10);
  assert.ok(s3.rest < p.rest && s3.rest >= 10);
  assert.equal(H.homeScaled(p, 100).stage, 4);
  const care = H.homeScaled(H.homeById('cooldown'), 50);
  assert.equal(care.stage, 0);
  assert.deepEqual(care.items, H.homeById('cooldown').items);
  assert.ok(H.countable('Подтягивания широким хватом'));
  assert.ok(!H.countable('Вис на перекладине') && !H.countable('Поза ребёнка'));
  const w = H.homeWorkout(p, [{ kind: 'work', ex: 'Подтягивания', dur: 30, count: 7 }, { kind: 'work', ex: 'Подтягивания', dur: 30 }], 0, 60000, 'x');
  assert.equal(w.exercises[0].sets[0].count, 7);
  assert.ok(!('count' in w.exercises[0].sets[1]));
  const { CATALOG } = await import('../src/catalog.js'); const { PULLUP_CATALOG } = await import('../src/extras.js');
  const names = new Set(L.DEFAULT_EXERCISES.map(([n]) => n)); const tips = { ...CATALOG, ...H.HOME_CATALOG, ...PULLUP_CATALOG };
  for (const h of H.HOME) for (const [ex] of h.items) { assert.ok(names.has(ex), `нет в списке: ${ex}`); assert.ok(tips[ex], `нет подсказок: ${ex}`); }
});
