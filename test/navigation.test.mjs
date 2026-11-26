import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, TAB_OF } from '../src/navigation.js';
import { emptyState, makeBackup, readBackup } from '../src/logic.js';
import { TOUR_STEPS } from '../src/tour.js';

test('пустой адрес открывает «Сегодня», а знакомые ссылки сохраняют экран и аргумент', () => {
  for (const hash of ['', '#', '#invalid', '#constructor', '#%']) {
    assert.deepEqual(parseRoute(hash), { name: 'today', arg: '' });
  }
  for (const [name, tab] of Object.entries({
    body: 'body', diary: 'diary', w: 'diary', programs: 'diary', catalog: 'diary',
    home: 'diary', plan: 'diary', build: 'diary', gym: 'diary', calendar: 'today',
    advisor: 'body', analytics: 'body', ex: 'body', ai: 'ai', food: 'profile', settings: 'profile',
  })) {
    assert.equal(TAB_OF[parseRoute('#' + name).name], tab);
  }
  assert.deepEqual(parseRoute('#w-id-with-dashes'), { name: 'w', arg: 'id-with-dashes' });
  assert.deepEqual(parseRoute('#ex-' + encodeURIComponent('Жим - лёжа')), { name: 'ex', arg: 'Жим - лёжа' });
  assert.deepEqual(parseRoute('#settings-ai'), { name: 'settings', arg: 'ai' });
  assert.deepEqual(TOUR_STEPS.map(([name]) => name), ['today', 'diary', 'body', 'ai', 'profile']);
});

test('темы переносятся в резервной копии, старая копия сохраняет текущую тему', () => {
  for (const theme of ['system', 'light', 'dark']) {
    const s = emptyState();
    s.settings.theme = theme;
    assert.equal(readBackup(JSON.stringify(makeBackup(s))).settings.theme, theme);
  }
  const legacy = makeBackup(emptyState());
  assert.equal(legacy.settings.theme, undefined);
  assert.equal(readBackup(legacy, { theme: 'dark' }).settings.theme, 'dark');
  assert.equal(readBackup({ ...legacy, settings: { theme: 'invalid' } }, { theme: 'light' }).settings.theme, 'light');
});
