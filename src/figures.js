// Анимированные схемы упражнений: фигурка из отрезков переходит между ключевыми позами.
// Координаты в квадрате 100×100, пол на y = 92, вид сбоку (лицом вправо) или спереди (front).
// Анимация на SMIL работает в Safari и не требует библиотек.

const S = { h: [50, 13], n: [50, 23], e: [50, 37], w: [51, 51], p: [50, 51], k: [50, 71], f: [50, 91] };
const with_ = (base, o) => ({ ...base, ...o });

const BENCH = { h: [21, 59], n: [29, 62], p: [57, 62], k: [73, 66], f: [74, 90] };
const SEATED = { h: [49, 26], n: [48, 35], p: [48, 63], k: [66, 63], f: [66, 88] };
const ROW = { h: [73, 32], n: [65, 37], p: [42, 54], k: [48, 72], f: [50, 91] };
const FRONT = { front: true, h: [50, 12], n: [50, 22], p: [50, 50], k: [46, 71], f: [45, 91], k2: [54, 71], f2: [55, 91] };
const PUSH_TOP = { h: [21, 63], n: [29, 66], e: [30, 78], w: [30, 90], p: [57, 75], k: [73, 81], f: [89, 88] };
const PUSH_LOW = { h: [21, 77], n: [29, 80], e: [38, 78], w: [30, 90], p: [57, 84], k: [73, 87], f: [89, 89] };
const LYING = { h: [14, 84], n: [23, 86], e: [33, 90], w: [44, 90], p: [50, 86] };
const HANG = { w: [50, -6], e: [50, 7], n: [50, 20], h: [51, 12], p: [50, 48] };
const SQ_LOW = { h: [57, 33], n: [53, 42], p: [37, 66], k: [57, 69], f: [50, 91] };

const bench = { type: 'rect', x: 16, y: 66, w: 52, h: 5, legs: true };
const floor = { type: 'floor' };

/** Шаблоны движений: frames — ключевые позы, props — неподвижный инвентарь. */
const T = {
  squat: { frames: [with_(S, { e: [41, 30], w: [46, 22] }), with_(SQ_LOW, { e: [44, 48], w: [49, 40] })] },
  airsquat: { frames: [with_(S, { e: [60, 30], w: [73, 28] }), with_(SQ_LOW, { e: [63, 46], w: [76, 46] })] },
  goblet: { frames: [with_(S, { e: [56, 34], w: [57, 26] }), with_(SQ_LOW, { e: [60, 52], w: [61, 44] })] },
  hinge: { frames: [with_(S, { w: [52, 51] }), { h: [74, 31], n: [66, 36], e: [66, 50], w: [66, 63], p: [42, 52], k: [47, 72], f: [50, 91] }] },
  deadlift: { frames: [{ h: [72, 40], n: [64, 44], e: [62, 58], w: [61, 72], p: [40, 60], k: [56, 70], f: [50, 91] }, with_(S, { w: [52, 51] })] },
  bench: { props: [bench], frames: [with_(BENCH, { e: [30, 49], w: [31, 36] }), with_(BENCH, { e: [20, 58], w: [31, 50] })] },
  incline: {
    props: [{ type: 'line', a: [30, 36], b: [56, 68], width: 5 }, { type: 'line', a: [56, 68], b: [56, 91], width: 3 }],
    frames: [{ h: [31, 33], n: [37, 41], p: [56, 63], k: [72, 62], f: [74, 90], e: [38, 28], w: [39, 15] }, { h: [31, 33], n: [37, 41], p: [56, 63], k: [72, 62], f: [74, 90], e: [28, 44], w: [36, 34] }],
  },
  ohp: { frames: [with_(S, { e: [42, 31], w: [47, 22] }), with_(S, { e: [50, 9], w: [51, -4] })] },
  seatpress: { props: [{ type: 'rect', x: 38, y: 65, w: 24, h: 4, legs: true }, { type: 'line', a: [42, 64], b: [40, 30], width: 4 }], frames: [with_(SEATED, { e: [40, 42], w: [45, 33] }), with_(SEATED, { e: [48, 21], w: [49, 8] })] },
  pulldown: {
    props: [{ type: 'rect', x: 40, y: 66, w: 22, h: 4, legs: true }, { type: 'pulley', at: [52, -12] }],
    cable: [52, -12],
    frames: [{ h: [46, 27], n: [47, 36], p: [50, 64], k: [68, 64], f: [68, 88], e: [50, 22], w: [52, 9] }, { h: [46, 27], n: [47, 36], p: [50, 64], k: [68, 64], f: [68, 88], e: [38, 46], w: [46, 36] }],
  },
  pullup: {
    props: [{ type: 'line', a: [28, -6], b: [72, -6], width: 3 }],
    frames: [with_(HANG, { k: [53, 67], f: [47, 84] }), { w: [50, -6], e: [40, 6], n: [50, 5], h: [55, -4], p: [50, 33], k: [53, 52], f: [47, 69] }],
  },
  pullwide: {
    props: [{ type: 'line', a: [16, -6], b: [84, -6], width: 3 }],
    frames: [
      { front: true, h: [50, 9], n: [50, 20], p: [50, 49], k: [46, 69], f: [45, 88], k2: [54, 69], f2: [55, 88], e: [30, 7], w: [24, -6], e2: [70, 7], w2: [76, -6] },
      { front: true, h: [50, -8], n: [50, 3], p: [50, 32], k: [46, 52], f: [45, 71], k2: [54, 52], f2: [55, 71], e: [30, 13], w: [24, -6], e2: [70, 13], w2: [76, -6] },
    ],
  },
  invrow: {
    props: [{ type: 'line', a: [16, 48], b: [42, 48], width: 3 }, { type: 'line', a: [18, 48], b: [18, 92], width: 3 }],
    frames: [
      { h: [24, 69], n: [32, 72], p: [60, 80], k: [75, 85], f: [90, 89], e: [30, 60], w: [30, 49] },
      { h: [22, 51], n: [30, 56], p: [59, 71], k: [75, 81], f: [90, 89], e: [42, 61], w: [31, 49] },
    ],
  },
  row: { frames: [with_(ROW, { e: [65, 51], w: [64, 65] }), with_(ROW, { e: [54, 36], w: [58, 49] })] },
  cablerow: {
    props: [floor, { type: 'pulley', at: [92, 66] }],
    cable: [92, 66],
    frames: [{ h: [37, 42], n: [38, 51], p: [36, 79], k: [52, 72], f: [67, 78], e: [52, 55], w: [65, 58] }, { h: [35, 42], n: [37, 51], p: [36, 79], k: [52, 72], f: [67, 78], e: [25, 56], w: [39, 62] }],
  },
  curl: { frames: [with_(S, { e: [50, 37], w: [53, 51] }), with_(S, { e: [51, 37], w: [61, 27] })] },
  pushdown: { props: [{ type: 'pulley', at: [64, -12] }], cable: [64, -12], frames: [with_(S, { h: [53, 13], n: [52, 23], e: [51, 37], w: [59, 27] }), with_(S, { h: [53, 13], n: [52, 23], e: [51, 37], w: [54, 51] })] },
  french: { props: [bench], frames: [with_(BENCH, { e: [27, 49], w: [17, 52] }), with_(BENCH, { e: [27, 49], w: [29, 36] })] },
  lateral: { frames: [with_(FRONT, { e: [42, 37], w: [41, 50], e2: [58, 37], w2: [59, 50] }), with_(FRONT, { e: [32, 27], w: [19, 27], e2: [68, 27], w2: [81, 27] })] },
  rearfly: { frames: [with_(ROW, { e: [65, 51], w: [64, 64] }), with_(ROW, { e: [62, 30], w: [58, 21] })] },
  fly: { frames: [with_(FRONT, { e: [33, 28], w: [21, 33], e2: [67, 28], w2: [79, 33] }), with_(FRONT, { e: [40, 33], w: [48, 37], e2: [60, 33], w2: [52, 37] })] },
  jacks: {
    frames: [with_(FRONT, { e: [42, 37], w: [41, 50], e2: [58, 37], w2: [59, 50], k: [47, 71], f: [46, 91], k2: [53, 71], f2: [54, 91] }),
      with_(FRONT, { e: [34, 14], w: [30, 1], e2: [66, 14], w2: [70, 1], k: [40, 70], f: [34, 90], k2: [60, 70], f2: [66, 90] })],
  },
  lunge: { frames: [with_(S, { e: [50, 37], w: [50, 51] }), { h: [49, 33], n: [48, 42], e: [48, 55], w: [49, 68], p: [47, 68], k: [63, 72], f: [64, 91], k2: [40, 86], f2: [24, 90], t2: [20, 92] }] },
  legpress: {
    props: [{ type: 'line', a: [16, 38], b: [46, 74], width: 5 }, { type: 'line', a: [46, 74], b: [60, 74], width: 5 }],
    plate: true,
    frames: [{ h: [22, 40], n: [28, 48], p: [48, 70], e: [38, 64], w: [46, 74], k: [52, 50], f: [68, 60] }, { h: [22, 40], n: [28, 48], p: [48, 70], e: [38, 64], w: [46, 74], k: [64, 56], f: [82, 48] }],
  },
  legext: { props: [{ type: 'rect', x: 34, y: 65, w: 28, h: 4, legs: true }, { type: 'line', a: [37, 64], b: [35, 30], width: 4 }], pad: true, frames: [{ h: [41, 25], n: [41, 34], p: [42, 62], k: [60, 62], f: [60, 82], e: [42, 48], w: [46, 60] }, { h: [41, 25], n: [41, 34], p: [42, 62], k: [60, 62], f: [78, 55], e: [42, 48], w: [46, 60] }] },
  legcurl: { props: [{ type: 'rect', x: 12, y: 62, w: 66, h: 5, legs: true }], pad: true, frames: [{ h: [18, 54], n: [26, 58], p: [54, 58], k: [72, 59], f: [91, 61], e: [20, 64], w: [14, 60] }, { h: [18, 54], n: [26, 58], p: [54, 58], k: [72, 59], f: [80, 41], e: [20, 64], w: [14, 60] }] },
  calf: { props: [{ type: 'rect', x: 44, y: 92, w: 18, h: 3 }], frames: [with_(S, { t: [57, 92] }), { h: [50, 8], n: [50, 18], e: [50, 32], w: [51, 46], p: [50, 46], k: [50, 66], f: [50, 86], t: [57, 92] }] },
  bridge: { props: [floor], frames: [with_(LYING, { k: [64, 70], f: [70, 90] }), with_(LYING, { n: [24, 85], p: [48, 70], k: [66, 66], f: [70, 90] })] },
  plank: { props: [floor], frames: [{ h: [19, 70], n: [27, 73], e: [28, 88], w: [40, 89], p: [55, 78], k: [71, 82], f: [88, 88] }, { h: [19, 70], n: [27, 73], e: [28, 88], w: [40, 89], p: [55, 75], k: [71, 81], f: [88, 88] }] },
  pushup: { props: [floor], frames: [PUSH_TOP, PUSH_LOW] },
  dips: { props: [{ type: 'line', a: [42, 51], b: [60, 51], width: 3 }, { type: 'line', a: [57, 51], b: [57, 91], width: 3 }], frames: [{ h: [52, 15], n: [50, 24], e: [50, 37], w: [50, 50], p: [49, 52], k: [45, 70], f: [36, 78] }, { h: [53, 29], n: [51, 38], e: [39, 42], w: [50, 50], p: [49, 65], k: [45, 82], f: [36, 88] }] },
  benchdip: { props: [{ type: 'rect', x: 24, y: 60, w: 16, h: 4, legs: true }], frames: [{ h: [44, 26], n: [42, 35], e: [37, 47], w: [34, 60], p: [44, 62], k: [62, 70], f: [76, 90] }, { h: [44, 37], n: [42, 46], e: [30, 52], w: [34, 60], p: [44, 73], k: [62, 76], f: [76, 90] }] },
  crunch: { props: [floor], frames: [{ h: [14, 82], n: [23, 85], e: [22, 75], w: [15, 80], p: [50, 87], k: [62, 70], f: [72, 89] }, { h: [24, 68], n: [30, 76], e: [30, 66], w: [23, 67], p: [50, 87], k: [62, 70], f: [72, 89] }] },
  hangraise: { props: [{ type: 'line', a: [28, -6], b: [72, -6], width: 3 }], frames: [with_(HANG, { k: [50, 68], f: [50, 88] }), with_(HANG, { k: [69, 46], f: [88, 44] })] },
  lyingraise: { props: [floor], frames: [with_(LYING, { k: [70, 86], f: [90, 86] }), with_(LYING, { k: [60, 69], f: [70, 52] })] },
  hyper: {
    props: [{ type: 'circle', at: [52, 60], r: 4 }, { type: 'line', a: [52, 64], b: [80, 92], width: 3 }, { type: 'circle', at: [82, 86], r: 3 }],
    frames: [{ f: [80, 84], k: [66, 70], p: [52, 57], n: [38, 79], h: [33, 87], e: [44, 74], w: [40, 70] }, { f: [80, 84], k: [66, 70], p: [52, 57], n: [30, 38], h: [24, 31], e: [38, 44], w: [34, 40] }],
  },
  superman: { props: [floor], frames: [{ h: [18, 82], n: [26, 85], p: [54, 87], k: [72, 88], f: [90, 88], e: [16, 86], w: [6, 86] }, { h: [17, 76], n: [26, 80], p: [54, 86], k: [72, 84], f: [89, 79], e: [16, 77], w: [6, 74] }] },
  kickback: { props: [{ type: 'pulley', at: [10, 88] }], cable: [10, 88], cableFrom: 'f2', frames: [with_(S, { e: [56, 36], w: [64, 40] }), with_(S, { e: [56, 36], w: [64, 40], k2: [40, 70], f2: [30, 86], t2: [26, 82] })] },
  run: {
    props: [{ type: 'line', a: [16, 93], b: [86, 93], width: 4 }],
    speed: 0.9,
    frames: [
      { h: [53, 13], n: [52, 23], p: [50, 51], e: [44, 35], w: [50, 44], e2: [58, 34], w2: [64, 26], k: [60, 66], f: [56, 84], k2: [44, 70], f2: [34, 80] },
      { h: [53, 13], n: [52, 23], p: [50, 51], e: [58, 34], w: [64, 26], e2: [44, 35], w2: [50, 44], k: [44, 70], f: [34, 80], k2: [60, 66], f2: [56, 84] },
    ],
  },
  bike: {
    props: [{ type: 'line', a: [38, 52], b: [50, 74], width: 3 }, { type: 'line', a: [50, 74], b: [68, 42], width: 3 }, { type: 'line', a: [50, 74], b: [50, 91], width: 3 }, { type: 'line', a: [32, 52], b: [44, 52], width: 4 }, { type: 'line', a: [64, 42], b: [72, 42], width: 4 }, { type: 'ring', at: [50, 74], r: 9 }],
    speed: 0.8,
    frames: [
      { h: [60, 20], n: [54, 27], p: [38, 50], e: [60, 38], w: [68, 42], k: [56, 56], f: [58, 74], k2: [48, 64], f2: [42, 74] },
      { h: [60, 20], n: [54, 27], p: [38, 50], e: [60, 38], w: [68, 42], k: [48, 64], f: [42, 74], k2: [56, 56], f2: [58, 74] },
    ],
  },
  burpee: {
    props: [floor],
    frames: [
      with_(S, { e: [50, 9], w: [51, -4] }),
      { h: [62, 50], n: [56, 56], e: [60, 70], w: [62, 86], p: [40, 72], k: [56, 72], f: [50, 91] },
      PUSH_TOP,
      { h: [62, 50], n: [56, 56], e: [60, 70], w: [62, 86], p: [40, 72], k: [56, 72], f: [50, 91] },
    ],
  },
  climber: {
    props: [floor],
    speed: 0.7,
    frames: [with_(PUSH_TOP, { k: [48, 74], f: [58, 86], k2: [73, 81], f2: [89, 88] }), with_(PUSH_TOP, { k: [73, 81], f: [89, 88], k2: [48, 74], f2: [58, 86] })],
  },
};

// Упражнение → шаблон и инвентарь.
const MAP = {
  'Жим штанги лёжа': ['bench', 'barbell'], 'Жим гантелей лёжа': ['bench', 'dumbbell'],
  'Жим штанги на наклонной скамье': ['incline', 'barbell'], 'Жим гантелей на наклонной скамье': ['incline', 'dumbbell'],
  'Сведение рук в кроссовере': ['fly', 'cable2'], 'Бабочка (пек-дек)': ['fly', 'none'], 'Отжимания на брусьях': ['dips'],
  'Подтягивания': ['pullup'], 'Подтягивания широким хватом': ['pullwide'], 'Подтягивания обратным хватом': ['pullup'],
  'Подтягивания узким хватом': ['pullup'], 'Подтягивания нейтральным хватом': ['pullup'], 'Подтягивания в гравитроне': ['pullup'],
  'Подтягивания с резинкой': ['pullup'], 'Негативные подтягивания': ['pullup'], 'Подтягивания с весом': ['pullup', 'dumbbell'],
  'Австралийские подтягивания': ['invrow'], 'Вис на перекладине': ['pullup'], 'Тяга верхнего блока': ['pulldown', 'handle'], 'Тяга штанги в наклоне': ['row', 'barbell'],
  'Тяга гантели в наклоне': ['row', 'dumbbell'], 'Тяга горизонтального блока': ['cablerow', 'handle'], 'Становая тяга': ['deadlift', 'barbell'],
  'Гиперэкстензия': ['hyper'], 'Приседания со штангой': ['squat', 'barbell'], 'Жим ногами': ['legpress'],
  'Выпады с гантелями': ['lunge', 'dumbbell'], 'Разгибание ног в тренажёре': ['legext'], 'Сгибание ног в тренажёре': ['legcurl'],
  'Румынская тяга': ['hinge', 'barbell'], 'Подъём на носки': ['calf'], 'Ягодичный мост': ['bridge'],
  'Отведение ноги в кроссовере': ['kickback'], 'Жим штанги стоя': ['ohp', 'barbell'], 'Жим гантелей сидя': ['seatpress', 'dumbbell'],
  'Махи гантелями в стороны': ['lateral', 'dumbbell'], 'Обратные разведения (задняя дельта)': ['rearfly', 'dumbbell'],
  'Подъём штанги на бицепс': ['curl', 'barbell'], 'Подъём гантелей на бицепс': ['curl', 'dumbbell'], 'Молотки': ['curl', 'dumbbell'],
  'Французский жим': ['french', 'barbell'], 'Разгибание рук на блоке': ['pushdown', 'handle'], 'Жим узким хватом': ['bench', 'barbell'],
  'Скручивания': ['crunch'], 'Планка': ['plank'], 'Подъём ног в висе': ['hangraise'],
  'Беговая дорожка': ['run'], 'Велотренажёр': ['bike'], 'Эллипс': ['run'],
  // Дома
  'Отжимания': ['pushup'], 'Приседания без веса': ['airsquat'], 'Выпады назад': ['lunge'], 'Обратные отжимания от стула': ['benchdip'],
  'Супермен': ['superman'], 'Подъём ног лёжа': ['lyingraise'], 'Берпи': ['burpee'], 'Альпинист': ['climber'],
  'Прыжки «звёздочка»': ['jacks'], 'Приседания с гантелью': ['goblet', 'dumbbell'], 'Боковая планка': ['plank'],
  'Румынская тяга с гантелями': ['hinge', 'dumbbell'], 'Жим гантелей лёжа на полу': ['bench', 'dumbbell'],
  'Птица-собака': ['climber'], 'Y-T-W лёжа': ['superman'], 'Ангел у стены': ['ohp'],
  'Тяга резинки к поясу': ['cablerow'], 'Разведение резинки перед грудью': ['fly'], 'Приседания с резинкой': ['airsquat'],
  'Жим резинки над головой': ['ohp'], 'Сгибание рук с резинкой': ['curl'], 'Разгибание рук с резинкой': ['pushdown'],
  'Шаги в сторону с мини-лентой': ['airsquat'], 'Ягодичный мост с мини-лентой': ['bridge'], 'Отжимания с резинкой': ['pushup'],
  'Кошка-корова': ['climber'], 'Поза ребёнка': ['crunch'], 'Растяжка груди у стены': ['fly'], 'Растяжка задней поверхности бедра': ['hinge'],
  'Растяжка квадрицепса стоя': ['lunge'], 'Растяжка сгибателей бедра в выпаде': ['lunge'], 'Растяжка ягодиц лёжа': ['bridge'],
  'Растяжка широчайших у опоры': ['hinge'], 'Растяжка плеч и трицепса': ['ohp'],
};

const BY_GROUP = { chest: ['pushup'], back: ['row', 'dumbbell'], legs: ['airsquat'], glutes: ['bridge'], shoulders: ['ohp', 'dumbbell'], biceps: ['curl', 'dumbbell'], triceps: ['pushdown', 'handle'], core: ['crunch'], cardio: ['run'], other: ['airsquat'] };

export function figureFor(name, group) {
  return MAP[name] || BY_GROUP[group] || BY_GROUP.other;
}

const fmt = (v) => Math.round(v * 10) / 10;

/** Возвращает SVG. opts: { animate, color, equipColor } */
export function figureSVG(name, group, opts = {}) {
  const [tplName, eq = 'none'] = figureFor(name, group);
  const tpl = T[tplName] || T.airsquat;
  const color = opts.color || 'currentColor';
  const eqColor = opts.equipColor || color;
  const animate = opts.animate !== false;
  const rawFrames = opts.frame != null ? [tpl.frames[opts.frame % tpl.frames.length]] : tpl.frames;
  const frames = rawFrames.map((fr) => {
    const f = { ...fr };
    f.e2 ||= f.e; f.w2 ||= f.w; f.k2 ||= f.k; f.f2 ||= f.f;
    f.t ||= [f.f[0] + 6, f.f[1] + 1];
    f.t2 ||= [f.f2[0] + 6, f.f2[1] + 1];
    return f;
  });
  const dur = ((tpl.speed || 1) * (frames.length > 2 ? 3.2 : 2.4)).toFixed(1);
  const loop = (vals) => (frames.length > 2 ? [...vals, vals[0]] : [vals[0], vals[1], vals[0]]);
  const anim = (attr, vals) => {
    const l = loop(vals);
    if (!animate || l.every((v) => v === l[0])) return '';
    const n = l.length - 1;
    const keyTimes = l.map((_, i) => fmt(i / n)).join(';');
    const splines = Array(n).fill('0.45 0 0.55 1').join(';');
    return `<animate attributeName="${attr}" values="${l.join(';')}" keyTimes="${keyTimes}" dur="${dur}s" calcMode="spline" keySplines="${splines}" repeatCount="indefinite"/>`;
  };
  const pt = (key, dx = 0, dy = 0) => frames.map((f) => {
    const base = f[key];
    let x = base[0], y = base[1];
    if (f.front && (key === 'n2' || key === 'n1')) { x = f.n[0] + (key === 'n1' ? -6 : 6); y = f.n[1] + 2; }
    if (f.front && (key === 'p1' || key === 'p2')) { x = f.p[0] + (key === 'p1' ? -4 : 4); y = f.p[1]; }
    return [fmt(x + dx), fmt(y + dy)];
  });
  const resolve = (key) => {
    if (['n1', 'n2', 'p1', 'p2'].includes(key)) {
      return frames.map((f) => {
        if (!f.front) return key[0] === 'n' ? f.n : f.p;
        if (key[0] === 'n') return [f.n[0] + (key === 'n1' ? -6 : 6), f.n[1] + 2];
        return [f.p[0] + (key === 'p1' ? -4 : 4), f.p[1]];
      });
    }
    return pt(key);
  };
  const seg = (a, b, width, op = 1, col = color) => {
    const A = resolve(a), B = resolve(b);
    const v = (arr, i) => arr.map((p) => p[i]);
    return `<line x1="${A[0][0]}" y1="${A[0][1]}" x2="${B[0][0]}" y2="${B[0][1]}" stroke="${col}" stroke-width="${width}" stroke-linecap="round" opacity="${op}">${anim('x1', v(A, 0))}${anim('y1', v(A, 1))}${anim('x2', v(B, 0))}${anim('y2', v(B, 1))}</line>`;
  };
  const dot = (key, r, fill, extra = '') => {
    const P = resolve(key);
    return `<circle cx="${P[0][0]}" cy="${P[0][1]}" r="${r}" fill="${fill}" ${extra}>${anim('cx', P.map((p) => p[0]))}${anim('cy', P.map((p) => p[1]))}</circle>`;
  };

  let props = '';
  for (const pr of tpl.props || []) {
    if (pr.type === 'rect') props += `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="2" fill="${eqColor}" opacity="0.35"/>${pr.legs ? `<line x1="${pr.x + 4}" y1="${pr.y + pr.h}" x2="${pr.x + 4}" y2="92" stroke="${eqColor}" stroke-width="2.5" opacity="0.35"/><line x1="${pr.x + pr.w - 4}" y1="${pr.y + pr.h}" x2="${pr.x + pr.w - 4}" y2="92" stroke="${eqColor}" stroke-width="2.5" opacity="0.35"/>` : ''}`;
    else if (pr.type === 'line') props += `<line x1="${pr.a[0]}" y1="${pr.a[1]}" x2="${pr.b[0]}" y2="${pr.b[1]}" stroke="${eqColor}" stroke-width="${pr.width || 3}" stroke-linecap="round" opacity="0.35"/>`;
    else if (pr.type === 'floor') props += `<line x1="4" y1="93" x2="96" y2="93" stroke="${eqColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.25"/>`;
    else if (pr.type === 'pulley') props += `<circle cx="${pr.at[0]}" cy="${pr.at[1]}" r="3" fill="none" stroke="${eqColor}" stroke-width="2" opacity="0.5"/>`;
    else if (pr.type === 'circle') props += `<circle cx="${pr.at[0]}" cy="${pr.at[1]}" r="${pr.r}" fill="${eqColor}" opacity="0.35"/>`;
    else if (pr.type === 'ring') props += `<circle cx="${pr.at[0]}" cy="${pr.at[1]}" r="${pr.r}" fill="none" stroke="${eqColor}" stroke-width="2.5" opacity="0.35"/>`;
  }
  if (!tpl.props?.some((p) => p.type === 'floor' || p.type === 'line') && !['pullup', 'pullwide', 'hangraise', 'incline', 'legpress', 'hyper', 'invrow'].includes(tplName)) {
    props += `<line x1="18" y1="93" x2="82" y2="93" stroke="${eqColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.25"/>`;
  }

  // Тросы блока тянутся к кисти (или к стопе для отведения ноги).
  let cables = '';
  const cableTo = (anchor, key) => {
    const P = resolve(key);
    return `<line x1="${anchor[0]}" y1="${anchor[1]}" x2="${P[0][0]}" y2="${P[0][1]}" stroke="${eqColor}" stroke-width="1.2" opacity="0.6">${anim('x2', P.map((p) => p[0]))}${anim('y2', P.map((p) => p[1]))}</line>`;
  };
  if (tpl.cable) cables += cableTo(tpl.cable, tpl.cableFrom || 'w');
  if (eq === 'cable2') {
    cables += `<circle cx="6" cy="-8" r="3" fill="none" stroke="${eqColor}" stroke-width="2" opacity="0.5"/><circle cx="94" cy="-8" r="3" fill="none" stroke="${eqColor}" stroke-width="2" opacity="0.5"/>`;
    cables += cableTo([6, -8], 'w') + cableTo([94, -8], 'w2');
  }

  const far = 0.42;
  let body = '';
  // Дальние конечности бледнее, чтобы читалась глубина.
  body += seg(frames[0].front ? 'n2' : 'n', 'e2', 4.5, far) + seg('e2', 'w2', 4.5, far);
  body += seg(frames[0].front ? 'p2' : 'p', 'k2', 5.5, far) + seg('k2', 'f2', 5, far) + seg('f2', 't2', 4, far);
  body += seg('n', 'p', 7.5, 1);
  if (frames[0].front) body += seg('n1', 'n2', 5, 1) + seg('p1', 'p2', 5, 1);
  body += seg(frames[0].front ? 'p1' : 'p', 'k', 5.5, 1) + seg('k', 'f', 5, 1) + seg('f', 't', 4, 1);
  body += seg(frames[0].front ? 'n1' : 'n', 'e', 4.5, 1) + seg('e', 'w', 4.5, 1);
  body += dot('h', 5.6, color);

  let equip = '';
  if (tpl.plate) {
    const P = resolve('f');
    const a = P.map((q) => [fmt(q[0] - 5), fmt(q[1] - 9)]), b = P.map((q) => [fmt(q[0] + 5), fmt(q[1] + 9)]);
    equip += `<line x1="${a[0][0]}" y1="${a[0][1]}" x2="${b[0][0]}" y2="${b[0][1]}" stroke="${eqColor}" stroke-width="4" stroke-linecap="round" opacity="0.6">${anim('x1', a.map((q) => q[0]))}${anim('y1', a.map((q) => q[1]))}${anim('x2', b.map((q) => q[0]))}${anim('y2', b.map((q) => q[1]))}</line>`;
  }
  if (tpl.pad) equip += dot('f', 3.5, eqColor, 'opacity="0.6"');
  const hands = frames[0].front || eq === 'cable2' ? ['w', 'w2'] : ['w'];
  for (const hand of hands) {
    if (eq === 'barbell') equip += dot(hand, 7, 'none', `stroke="${eqColor}" stroke-width="3" opacity="0.85"`) + dot(hand, 2, eqColor);
    else if (eq === 'dumbbell') equip += dot(hand, 3.6, eqColor, 'opacity="0.85"');
    else if (eq === 'handle') equip += dot(hand, 2.4, eqColor, 'opacity="0.85"');
  }
  return `<svg class="figure" viewBox="0 -14 100 110" aria-hidden="true">${props}${cables}${body}${equip}</svg>`;
}

export const TEMPLATE_NAMES = Object.keys(T);
