'use strict';
/* Everything around the mini-games: hub, run map, prep, scenes. Names, texts and art here are placeholders. */

/* ---------- Data ---------- */
const ICONS = {
  map: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-4 2.500-6 6-6s6 2 6 6M16 5a3.500 3.500 0 0 1 0 6.500M17.500 14.500c2 .8 3.500 2.500 3.500 5.500"/>',
  bag: '<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
  tasks: '<path d="M4 6l2 2 3-3M4 13l2 2 3-3M4 20l2 0M13 7h7M13 14h7M13 20h7"/>',
  door: '<path d="M14 4H6v16h8M11 12h9M17 9l3 3-3 3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  lecture: '<path d="M12 6c-2-1.500-5-2-8-2v14c3 0 6 .5 8 2 2-1.500 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14"/>',
  lab: '<path d="M9 3h6M10 3v6l-5 10a1.500 1.500 0 0 0 1.500 2h11a1.500 1.500 0 0 0 1.500-2L14 9V3M7.500 15h9"/>',
  cafe: '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.500a2.500 2.500 0 0 1 0 5H17M9 3v3M13 3v3"/>',
  event: '<path d="M8.500 8.500a3.500 3.500 0 1 1 5 3.200c-1 .6-1.500 1.300-1.500 2.800M12 19v.1"/>',
  boss: '<path d="M2 9l10-5 10 5-10 5zM6 11.500V17c3 2.500 9 2.500 12 0v-5.500M22 9v6"/>',
};
const icon = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const heartSvg = (on, small) => `<svg class="heart${on ? '' : ' off'}${small ? ' small' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C6 16 2 12.500 2 8.500A5 5 0 0 1 12 6a5 5 0 0 1 10 2.500C22 12.500 18 16 12 21z"/></svg>`;

const LOCATIONS = {
  university: { name: 'Университет', x: 50, y: 18, main: true, text: 'Отсюда начинается зачётная неделя: кабинеты, активности и экзамен в конце.' },
  central:    { name: 'Централка',   x: 50, y: 48, text: 'Главная площадь. Здесь всегда кто-то ждёт встречи.' },
  park:       { name: 'Парк',        x: 19, y: 66, text: 'Тихие скамейки для разговоров по душам.' },
  dorm:       { name: 'Общага',      x: 81, y: 66, text: 'Комната игрока и соседи по этажу.' },
  campus:     { name: 'Студгородок', x: 50, y: 85, text: 'Кафе, спортплощадка и клубы по интересам.' },
};
const CHARS = [
  { id: 'artem', name: 'Артём', role: 'Отличник',    loc: 'university', line: 'Опять в библиотеке до закрытия. Составишь компанию?' },
  { id: 'liza',  name: 'Лиза',  role: 'Староста',    loc: 'university', line: 'Ты вообще читаешь общий чат? Там важное.' },
  { id: 'dan',   name: 'Даня',  role: 'Музыкант',    loc: 'central',    line: 'Написал новую песню. Хочешь послушать первой?' },
  { id: 'nika',  name: 'Ника',  role: 'Художница',   loc: 'park',       line: 'Сиди так, не двигайся. Я тебя рисую.' },
  { id: 'mark',  name: 'Марк',  role: 'Спортсмен',   loc: 'campus',     line: 'Пробежка завтра в семь. Отговорки не принимаются.' },
  { id: 'kira',  name: 'Кира',  role: 'Соседка',     loc: 'dorm',       line: 'Кто доел мой йогурт? Признавайся.' },
];
const BOOSTS = [
  { id: 'coffee', name: 'Кофе',      text: '+3 хода',                    price: 60 },
  { id: 'crib',   name: 'Шпаргалка', text: 'Цели меньше на четверть',    price: 100 },
  { id: 'notes',  name: 'Конспект',  text: 'На поле сразу есть крест',   price: 80 },
  { id: 'energy', name: 'Энергетик', text: 'На поле сразу есть взрыв',   price: 120 },
];
const ROOMS = {
  lecture: { name: 'Лекция',      icon: 'lecture', text: 'Обычное занятие.' },
  lab:     { name: 'Лаборатория', icon: 'lab',     text: 'Целей больше, ходов меньше, награда выше.' },
  cafe:    { name: 'Столовая',    icon: 'cafe' },
  event:   { name: 'Событие',     icon: 'event' },
  boss:    { name: 'Экзамен',     icon: 'boss',    text: 'Финал недели. При провале можно пересдать, пока есть силы.' },
};
const EVENTS = [
  { title: 'Забытый конспект', text: 'На парте лежит чужая тетрадь. На обложке записка: «Вернуть за вознаграждение».',
    choices: [{ label: 'Вернуть владельцу (+40 монет)', coins: 40 }, { label: 'Оставить на месте' }] },
  { title: 'Просьба старосты', text: 'Лиза просит помочь расставить стулья перед лекцией.',
    choices: [{ label: 'Помочь (+1 к отношениям с Лизой)', rel: 'liza' }, { label: 'Убежать (+20 монет за найденную мелочь)', coins: 20 }] },
  { title: 'Автомат с кофе', text: 'Автомат выдал два стакана вместо одного и сдачу сверху.',
    choices: [{ label: 'Забрать сдачу (+60 монет)', coins: 60 }, { label: 'Выпить оба стакана (+1 сила)', heal: 1 }] },
];
const MAX_HEARTS = 3, MAX_BOOSTS = 2, MAX_REL = 5, LAYERS = 7, LAYER_H = 104;

/* ---------- Saved progress ---------- */
const META_DEFAULT = { coins: 300, week: 1, wins: 0, stars: 0, talks: 0, rel: {}, talked: [] };
function loadMeta() {
  try { return { ...META_DEFAULT, ...JSON.parse(localStorage.getItem('ogranka.meta') || '{}') }; }
  catch (e) { return { ...META_DEFAULT }; }
}
const meta = loadMeta();
function saveMeta() { try { localStorage.setItem('ogranka.meta', JSON.stringify(meta)); } catch (e) {} }
const relOf = id => meta.rel[id] === undefined ? 1 : meta.rel[id];
function changeRel(id, d) { meta.rel[id] = Math.max(0, Math.min(MAX_REL, relOf(id) + d)); saveMeta(); }

/* ---------- Screens and overlays ---------- */
const SCREENS = ['hub', 'runMap', 'prep', 'scene', 'runEnd', 'app'];
function show(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
  $(id).classList.remove('enter');
  void $(id).offsetWidth;
  $(id).classList.add('enter');
}
let toastTimer = 0;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2200);
}
function openSheet(html) { $('sheet').innerHTML = html; $('sheetWrap').hidden = false; }
function closeSheet() { $('sheetWrap').hidden = true; }
function confirmSheet(title, text, yes, onYes) {
  pendingConfirm = onYes;
  openSheet(`<h2 class="title2">${title}</h2><p class="note">${text}</p>
    <button class="cta" data-act="confirmYes">${yes}</button>
    <button class="cta ghost" data-act="closeSheet">Отмена</button>`);
}
let pendingConfirm = null;
function wipe(title, sub, mid) {
  $('wipeTitle').textContent = title;
  $('wipeSub').textContent = sub;
  const el = $('wipe');
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  setTimeout(mid, 300);
  setTimeout(() => { el.hidden = true; }, 900);
}
const coinsHtml = n => `<span class="coins"><i class="coin"></i>${n}</span>`;
const heartsHtml = (n, max, small) => `<span class="hearts" role="img" aria-label="${n} из ${max}">${Array.from({ length: max }, (_, i) => heartSvg(i < n, small)).join('')}</span>`;

/* ---------- Hub ---------- */
const TABS = [['campus', 'Кампус', 'map'], ['people', 'Контакты', 'people'], ['bag', 'Рюкзак', 'bag'], ['tasks', 'Задания', 'tasks']];
let tab = 'campus';

function renderHub() {
  $('hubBar').innerHTML = `<div class="stub avatar" aria-hidden="true">Я</div>
    <div class="grow"><h1>Кампус</h1><div class="sub">Неделя ${meta.week}</div></div>${coinsHtml(meta.coins)}`;
  $('tabs').innerHTML = TABS.map(([id, label, ic]) =>
    `<button class="tab" data-act="tab" data-id="${id}"${id === tab ? ' aria-current="page"' : ''}>${icon(ic)}${label}</button>`).join('');
  const view = $('hubView');
  view.classList.toggle('padded', tab !== 'campus');
  view.innerHTML = { campus: campusView, people: peopleView, bag: bagView, tasks: tasksView }[tab]();
}
function campusView() {
  const c = LOCATIONS.central;
  const lines = ['university', 'park', 'dorm', 'campus'].map(k => `<line x1="${c.x}" y1="${c.y}" x2="${LOCATIONS[k].x}" y2="${LOCATIONS[k].y}" vector-effect="non-scaling-stroke"/>`).join('');
  const pins = Object.entries(LOCATIONS).map(([id, l]) => {
    const here = CHARS.filter(ch => ch.loc === id);
    const dots = here.map(ch => `<span class="dot">${ch.name[0]}</span>`).join('');
    return `<button class="loc${l.main ? ' main' : ''}" style="left:${l.x}%;top:${l.y}%" data-act="loc" data-id="${id}">
      <span class="stub">Арт локации</span><span class="people">${dots}</span><span class="name">${l.name}</span></button>`;
  }).join('');
  return `<div class="campus"><svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="#fff" stroke-width="14">${lines}</svg>${pins}</div>
    <div class="ctaWrap"><button class="cta" data-act="startRun">На зачётную неделю</button></div>`;
}
function peopleView() {
  return `<p class="note">Имена и образы временные. После каждого забега с каждым можно поговорить один раз.</p>` + CHARS.map(ch => {
    const used = meta.talked.includes(ch.id);
    return `<button class="row" data-act="talk" data-id="${ch.id}"><span class="stub avatar">${ch.name[0]}</span>
      <span class="grow"><b>${ch.name}</b><small>${ch.role} · ${LOCATIONS[ch.loc].name}</small>${heartsHtml(relOf(ch.id), MAX_REL, true)}</span>
      <small>${used ? 'После забега' : 'Поговорить'}</small></button>`;
  }).join('');
}
function bagView() {
  return `<p class="note">Бонусы покупаются перед входом в кабинет. Предметы и подарки появятся здесь позже.</p>` + BOOSTS.map(b =>
    `<div class="row"><span class="stub avatar">?</span><span class="grow"><b>${b.name}</b><small>${b.text}</small></span>${coinsHtml(b.price)}</div>`).join('');
}
function tasksView() {
  const tasks = [['Сдать зачётную неделю', meta.wins, 1], ['Собрать 10 звёзд в кабинетах', meta.stars, 10], ['Поговорить с однокурсниками 3 раза', meta.talks, 3]];
  return `<p class="note">Награды за задания пока не выдаются.</p>` + tasks.map(([name, cur, max]) =>
    `<div class="row"><span class="grow"><b>${name}</b><small>${Math.min(cur, max)} из ${max}</small></span>${cur >= max ? icon('check') : ''}</div>`).join('');
}
function openLocation(id) {
  const l = LOCATIONS[id];
  const here = CHARS.filter(ch => ch.loc === id).map(ch =>
    `<button class="row" data-act="talk" data-id="${ch.id}"><span class="stub avatar">${ch.name[0]}</span><span class="grow"><b>${ch.name}</b><small>${ch.role}</small></span></button>`).join('');
  openSheet(`<div class="stub portrait">Арт локации: ${l.name}</div><h2 class="title2">${l.name}</h2><p class="note">${l.text}</p>${here}
    ${id === 'university' ? '<button class="cta" data-act="startRun">Начать зачётную неделю</button>' : ''}
    <button class="cta ghost" data-act="closeSheet">Закрыть</button>`);
}
function openTalk(id) {
  const ch = CHARS.find(c => c.id === id);
  const used = meta.talked.includes(id);
  openSheet(`<div class="stub portrait">Портрет: ${ch.name}</div>
    <p class="line"><span class="speaker">${ch.name}</span>${used ? 'Давай потом, мне пора. Увидимся после зачётной недели!' : ch.line}</p>
    ${used ? '' : `<button class="cta" data-act="reply" data-id="${id}" data-d="1">Поддержать (+1 к отношениям)</button>
    <button class="cta ghost" data-act="reply" data-id="${id}" data-d="-1">Подколоть (−1 к отношениям)</button>`}
    <button class="cta ghost" data-act="closeSheet">${used ? 'Закрыть' : 'Уйти молча'}</button>`);
}

/* ---------- Run: map generation ---------- */
let run = null;
function pickType(depth) {
  if (depth === 0) return 'lecture';
  const roll = Math.random();
  if (depth === LAYERS - 2) return roll < .5 ? 'cafe' : 'lecture';
  return roll < .5 ? 'lecture' : roll < .72 ? 'lab' : roll < .92 ? 'event' : 'cafe';
}
function roomConfig(type, depth) {
  const base = Match3.levelConfig(type === 'boss' ? 8 : type === 'lab' ? depth + 3 : depth + 1);
  const moves = type === 'boss' ? base.moves + 2 : type === 'lab' ? base.moves - 1 : base.moves;
  return { ...base, moves };
}
function generateMap() {
  const layers = [];
  for (let d = 0; d < LAYERS; d++) {
    const count = d === LAYERS - 1 ? 1 : 2 + Math.floor(Math.random() * 2);
    const xs = count === 1 ? [50] : count === 2 ? [30, 70] : [17, 50, 83];
    layers.push(xs.map((x, i) => {
      const type = d === LAYERS - 1 ? 'boss' : pickType(d);
      const node = { id: `${d}-${i}`, depth: d, x, type, next: [], done: false };
      if (type === 'lecture' || type === 'lab' || type === 'boss') node.cfg = roomConfig(type, d);
      return node;
    }));
  }
  for (let d = 0; d < LAYERS - 1; d++) {
    const nearest = (n, list) => list.reduce((m, o) => Math.abs(o.x - n.x) < Math.abs(m.x - n.x) ? o : m);
    for (const a of layers[d]) {
      for (const b of layers[d + 1]) if (Math.abs(a.x - b.x) <= 34) a.next.push(b);
      if (!a.next.length) a.next.push(nearest(a, layers[d + 1]));
    }
    for (const b of layers[d + 1]) {
      if (!layers[d].some(a => a.next.includes(b))) nearest(b, layers[d]).next.push(b);
    }
  }
  return layers;
}
const openNodes = () => run.at ? run.at.next : run.layers[0];

function startRun() {
  closeSheet();
  run = { layers: generateMap(), at: null, hearts: MAX_HEARTS, earned: 0, stars: 0, rooms: 0 };
  wipe('Зачётная неделя', `Неделя ${meta.week}. Доберитесь до экзамена`, () => { renderMap(); show('runMap'); scrollMap(); });
}

/* ---------- Run: map screen ---------- */
function renderMap() {
  const open = openNodes();
  $('runBar').innerHTML = `<button class="icon" data-act="leaveRun" aria-label="Покинуть зачётную неделю">${icon('door')}</button>
    <div class="grow"><h1>Зачётная неделя</h1>${heartsHtml(run.hearts, MAX_HEARTS)}</div>${coinsHtml(meta.coins)}`;
  const height = LAYERS * LAYER_H + 30;
  const yOf = n => (LAYERS - 1 - n.depth) * LAYER_H + 62;
  const lines = run.layers.flat().flatMap(a => a.next.map(b => {
    const walked = a.done && (b.done || open.includes(b));
    return `<line x1="${a.x}" y1="${yOf(a)}" x2="${b.x}" y2="${yOf(b)}" stroke="${walked ? '#1c0a10' : '#8fa0af'}" stroke-width="${walked ? 4 : 3}" stroke-dasharray="${walked ? 'none' : '2 9'}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  })).join('');
  const nodes = run.layers.flat().map(n => {
    const isOpen = open.includes(n), r = ROOMS[n.type];
    const cls = `node${n.done ? ' done' : isOpen ? ' open' : ' locked'}${n.type === 'boss' ? ' boss' : ''}`;
    return `<button class="${cls}" style="left:${n.x}%;top:${yOf(n)}px" ${isOpen ? `data-act="node" data-id="${n.id}"` : 'disabled'}>
      <span class="disc">${icon(n.done ? 'check' : r.icon)}</span><span class="cap">${r.name}</span></button>`;
  }).join('');
  $('track').innerHTML = `<div id="trackIn" style="height:${height}px"><svg viewBox="0 0 100 ${height}" preserveAspectRatio="none" fill="none" aria-hidden="true">${lines}</svg>${nodes}</div>`;
}
function scrollMap() {
  const target = openNodes()[0];
  if (target) $('track').scrollTop = (LAYERS - 1 - target.depth) * LAYER_H + 62 - $('track').clientHeight * .6;
}
function backToMap() { renderMap(); show('runMap'); scrollMap(); }
const findNode = id => run.layers.flat().find(n => n.id === id);

/* ---------- Run: prep before a room ---------- */
let prepNode = null, picked = [];
function openPrep(node) { prepNode = node; picked = []; renderPrep(); show('prep'); }
function pickedCost() { return picked.reduce((s, id) => s + BOOSTS.find(b => b.id === id).price, 0); }
function renderPrep() {
  const n = prepNode, r = ROOMS[n.type], left = meta.coins - pickedCost();
  const goals = applyBoosts(n.cfg, picked);
  const prep = $('prep');
  prep.classList.add('padded');
  prep.innerHTML = `<div class="stub roomArt">Арт кабинета: ${r.name}</div>
    <h2 class="title2">${r.name}</h2><p class="note">${r.text} Мини-игра: три в ряд.</p>
    <div class="row"><span class="grow"><small>Цель</small><span class="goalsRow">${Object.keys(goals.goals).map(c =>
      `<span class="goal">${spriteHtml(c, 34)}<b>${goals.goals[c]}</b></span>`).join('')}</span></span>
      <span class="grow" style="flex:none;align-items:center"><small>Ходы</small><b>${goals.moves}</b></span></div>
    <div class="row" style="border:0;background:none;padding:0"><b class="grow">Подготовка (до ${MAX_BOOSTS})</b>${coinsHtml(left)}</div>
    <div class="boosts">${BOOSTS.map(b => {
      const on = picked.includes(b.id);
      const off = !on && (picked.length >= MAX_BOOSTS || b.price > left);
      return `<button class="boost" data-act="boost" data-id="${b.id}" aria-pressed="${on}"${off ? ' disabled' : ''}><b>${b.name}</b>${b.text}<span class="price"><i class="coin"></i>${b.price}</span></button>`;
    }).join('')}</div>
    <div class="foot"><button class="cta" data-act="enterRoom">Войти в кабинет</button>
    <button class="cta ghost" data-act="backToMap">К карте</button></div>`;
}
function applyBoosts(cfg, ids) {
  const out = { ...cfg, goals: { ...cfg.goals }, special: [] };
  if (ids.includes('coffee')) out.moves += 3;
  if (ids.includes('crib')) for (const c in out.goals) out.goals[c] = Math.ceil(out.goals[c] * .75);
  if (ids.includes('notes')) out.special.push('line');
  if (ids.includes('energy')) out.special.push('bomb');
  return out;
}
function enterRoom() {
  const node = prepNode, r = ROOMS[node.type];
  meta.coins -= pickedCost();
  saveMeta();
  const rewardFor = stars => (node.type === 'boss' ? 150 : node.type === 'lab' ? 70 : 40) + stars * 20;
  const room = {
    ...applyBoosts(node.cfg, picked),
    title: r.name,
    winTitle: node.type === 'boss' ? 'Экзамен сдан!' : 'Кабинет пройден',
    failTitle: node.type === 'boss' ? 'Экзамен не сдан' : 'Кабинет не пройден',
    failText: 'Осталось собрать этих зверей. Минус одна сила.',
    rewardFor,
    onExit() { confirmSheet('Сдаться?', 'Кабинет будет считаться непройденным, вы потеряете одну силу.', 'Сдаться', () => Match3.leave()); },
    onDone(res) { finishRoom(node, res, rewardFor); },
  };
  show('app');
  Match3.start(room);
}
function finishRoom(node, res, rewardFor) {
  run.rooms++;
  if (res.won) {
    const coins = rewardFor(res.stars);
    meta.coins += coins; meta.stars += res.stars;
    run.earned += coins; run.stars += res.stars;
    saveMeta();
    completeNode(node);
    if (node.type === 'boss') return endRun(true);
  } else {
    run.hearts--;
    if (run.hearts <= 0) return endRun(false);
    if (node.type !== 'boss') completeNode(node); // the exam can be retaken, other rooms stay behind
  }
  backToMap();
}
function completeNode(node) { node.done = true; run.at = node; }

/* ---------- Run: non-game rooms ---------- */
let sceneChoices = [], sceneNode = null;
function renderScene(node, title, text, choices, artLabel) {
  sceneNode = node; sceneChoices = choices;
  const el = $('scene');
  el.classList.add('padded');
  el.innerHTML = `<div class="stub sceneArt">${artLabel}</div><h2 class="title2">${title}</h2><p class="line">${text}</p>
    <div class="foot">${choices.map((c, i) => `<button class="cta${i ? ' ghost' : ''}" data-act="sceneChoice" data-i="${i}">${c.label}</button>`).join('')}</div>`;
  show('scene');
}
function openScene(node) {
  if (node.type === 'cafe') {
    const full = run.hearts >= MAX_HEARTS;
    return renderScene(node, 'Столовая', full ? 'Сил и так хватает. Можно просто сэкономить на обеде.' : 'Горячий обед восстанавливает силы.',
      [full ? { label: 'Сэкономить (+40 монет)', coins: 40 } : { label: 'Пообедать (+1 сила)', heal: 1 }], 'Арт: столовая');
  }
  const e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  renderScene(node, e.title, e.text, e.choices, 'Арт события');
}
function applyChoice(c) {
  if (c.coins) { meta.coins += c.coins; run.earned += c.coins; toast(`Монеты: +${c.coins}`); }
  if (c.heal) {
    const healed = run.hearts < MAX_HEARTS;
    run.hearts = Math.min(MAX_HEARTS, run.hearts + c.heal);
    toast(healed ? 'Сила восстановлена' : 'Сил уже максимум');
  }
  if (c.rel) { changeRel(c.rel, 1); toast('Отношения улучшились'); }
  saveMeta();
  completeNode(sceneNode);
  backToMap();
}

/* ---------- Run: the end ---------- */
function endRun(won, left) {
  if (won) { meta.coins += 200; run.earned += 200; meta.wins++; meta.week++; }
  meta.talked = [];
  saveMeta();
  const el = $('runEnd');
  el.classList.add('padded');
  const title = won ? 'Неделя сдана!' : left ? 'Вы ушли с недели' : 'Силы закончились';
  const text = won ? 'Экзамен позади, а однокурсники уже зовут встретиться.' : 'Заработанные монеты остаются. На кампусе можно отдохнуть, поговорить с друзьями и попробовать снова.';
  el.innerHTML = `<div class="stub sceneArt">${won ? 'Арт: победа' : 'Арт: утешающая сцена'}</div><h2 class="title2">${title}</h2><p class="note">${text}</p>
    <div class="row"><span class="grow"><small>Пройдено кабинетов</small><b>${run.rooms}</b></span><span class="grow"><small>Звёзды</small><b>${run.stars}</b></span><span class="grow"><small>Монеты</small><b>+${run.earned}</b></span></div>
    <div class="foot"><button class="cta" data-act="goHub">Вернуться на кампус</button></div>`;
  show('runEnd');
}
function goHub() {
  run = null;
  wipe('Кампус', 'С кем встретимся сегодня?', () => { tab = 'campus'; renderHub(); show('hub'); });
}

/* ---------- Actions ---------- */
const ACTIONS = {
  tab(d) { tab = d.id; renderHub(); },
  loc(d) { openLocation(d.id); },
  talk(d) { openTalk(d.id); },
  reply(d) {
    const delta = Number(d.d);
    changeRel(d.id, delta);
    meta.talked.push(d.id); meta.talks++;
    saveMeta();
    closeSheet(); renderHub();
    toast(delta > 0 ? 'Отношения улучшились' : 'Отношения ухудшились');
  },
  closeSheet,
  confirmYes() { closeSheet(); const f = pendingConfirm; pendingConfirm = null; if (f) f(); },
  startRun,
  leaveRun() { confirmSheet('Покинуть неделю?', 'Прогресс на карте пропадёт, заработанные монеты останутся.', 'Покинуть', () => endRun(false, true)); },
  node(d) {
    const n = findNode(d.id);
    if (n.cfg) openPrep(n); else openScene(n);
  },
  boost(d) {
    picked = picked.includes(d.id) ? picked.filter(x => x !== d.id) : [...picked, d.id];
    renderPrep();
  },
  enterRoom,
  backToMap,
  sceneChoice(d) { applyChoice(sceneChoices[Number(d.i)]); },
  goHub,
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled) { sound.unlock(); sound.tick(); ACTIONS[el.dataset.act](el.dataset); return; }
  if (e.target === $('sheetWrap')) closeSheet();
});

renderHub();
window.__meta = { meta, get run() { return run; }, findNode, ACTIONS };
