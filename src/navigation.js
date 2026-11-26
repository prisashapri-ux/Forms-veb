export const TAB_OF = Object.freeze({
  today: 'today', calendar: 'today',
  diary: 'diary', w: 'diary', programs: 'diary', catalog: 'diary',
  home: 'diary', plan: 'diary', build: 'diary', gym: 'diary',
  body: 'body', analytics: 'body', advisor: 'body', ex: 'body',
  ai: 'ai',
  profile: 'profile', settings: 'profile', food: 'profile',
});

export function parseRoute(hash) {
  let decoded;
  try { decoded = decodeURIComponent(hash.slice(1)); } catch { return { name: 'today', arg: '' }; }
  const [name, ...rest] = decoded.split('-');
  return Object.hasOwn(TAB_OF, name) ? { name, arg: rest.join('-') } : { name: 'today', arg: '' };
}
