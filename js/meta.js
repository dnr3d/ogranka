'use strict';
/* Everything around the mini-games: hub, calendar, day runs, exam. Names, texts and art here are placeholders. */

/* ---------- Data ---------- */
const ICONS = {
  map: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-4 2.500-6 6-6s6 2 6 6M16 5a3.500 3.500 0 0 1 0 6.500M17.500 14.500c2 .8 3.500 2.500 3.500 5.500"/>',
  bag: '<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/>',
  tasks: '<path d="M4 6l2 2 3-3M4 13l2 2 3-3M4 20l2 0M13 7h7M13 14h7M13 20h7"/>',
  door: '<path d="M14 4H6v16h8M11 12h9M17 9l3 3-3 3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  fact: '<path d="M12 6c-2-1.500-5-2-8-2v14c3 0 6 .5 8 2 2-1.500 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14"/>',
  cafe: '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.500a2.500 2.500 0 0 1 0 5H17M9 3v3M13 3v3"/>',
  boss: '<path d="M2 9l10-5 10 5-10 5zM6 11.500V17c3 2.500 9 2.500 12 0v-5.500M22 9v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M18.400 5.600l-2.100 2.100M7.700 16.300l-2.100 2.100"/>',
};
const icon = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const heartSvg = (on, small) => `<svg class="heart${on ? '' : ' off'}${small ? ' small' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C6 16 2 12.500 2 8.500A5 5 0 0 1 12 6a5 5 0 0 1 10 2.500C22 12.500 18 16 12 21z"/></svg>`;

const GAMES = {
  match3: { name: 'Три в ряд', mod: Match3 },
  blocks: { name: 'Блок-пазл', mod: Blocks },
  stack:  { name: 'Падающие блоки', mod: Stack },
};
const LOCATIONS = {
  university: { name: 'Университет', x: 50, y: 18, main: true, text: 'Здесь проходят уроки и зачётная неделя.' },
  central:    { name: 'Централка',   x: 50, y: 48, text: 'Главная площадь. Здесь всегда кто-то ждёт встречи.' },
  park:       { name: 'Парк',        x: 19, y: 66, text: 'Тихие скамейки для разговоров по душам.' },
  dorm:       { name: 'Общага',      x: 81, y: 66, text: 'Комната игрока и соседи по этажу.' },
  campus:     { name: 'Студгородок', x: 50, y: 85, text: 'Кафе, спортплощадка и клубы по интересам.' },
};
const CHARS = [
  { id: 'emily', name: 'Эмили',  role: 'Староста',  loc: 'university', game: 'match3', line: 'Ты вообще читаешь общий чат? Там важное.' },
  { id: 'chloe', name: 'Хлоя',   role: 'Художница', loc: 'park',       game: 'blocks', line: 'Сиди так, не двигайся. Я тебя рисую.' },
  { id: 'tyler', name: 'Тайлер', role: 'Спортсмен', loc: 'campus',     game: 'stack',  line: 'Пробежка завтра в семь. Отговорки не принимаются.' },
  { id: 'ethan', name: 'Итан',   role: 'Отличник',  loc: 'university', line: 'Опять в библиотеке до закрытия. Составишь компанию?' },
  { id: 'dylan', name: 'Дилан',  role: 'Музыкант',  loc: 'central',    line: 'Написал новую песню. Хочешь послушать первой?' },
  { id: 'casey', name: 'Кейси',  role: 'Соседка',   loc: 'dorm',       line: 'Кто доел мой йогурт? Признавайся.' },
];
const charById = id => CHARS.find(c => c.id === id);
const PLAYABLE = CHARS.filter(c => c.game);
const CALENDAR = ['class', 'class', 'finals'];
const DAY_LABEL = { class: 'Урок', finals: 'Зачёт' };
const BOOSTS = [
  { id: 'coffee', name: 'Кофе',      text: 'Больше ходов или медленнее падение', price: 60 },
  { id: 'crib',   name: 'Шпаргалка', text: 'Цель меньше на четверть',            price: 100 },
  { id: 'notes',  name: 'Конспект',  text: '+1 к отношениям за победу',          price: 80 },
  { id: 'energy', name: 'Энергетик', text: 'Монет на половину больше',           price: 120 },
];
const MAX_HEARTS = 3, MAX_BOOSTS = 2, MAX_LEVEL = 5, POINTS_PER_LEVEL = 3, LAYER_H = 112, RETAKE_PRICE = 50, CARD_PICKS = 2;

/* ---------- Saved progress ---------- */
const metaDefault = () => ({ coins: 300, cycle: 1, day: 0, wins: 0, stars: 0, rel: {}, scene: {}, facts: [], deck: [...STARTER_DECK], pendingCards: 0 });
function loadMeta() {
  try { return { ...metaDefault(), ...JSON.parse(localStorage.getItem('ogranka.meta2') || '{}') }; }
  catch (e) { return metaDefault(); }
}
let meta = loadMeta();
function saveMeta() { try { localStorage.setItem('ogranka.meta2', JSON.stringify(meta)); } catch (e) {} }
const relOf = id => meta.rel[id] || { level: 0, points: 0 };
const relLevel = id => relOf(id).level;
function addRel(id, points) {
  const r = { ...relOf(id) };
  r.points = Math.max(0, r.points + points);
  while (r.points >= POINTS_PER_LEVEL && r.level < MAX_LEVEL) {
    r.points -= POINTS_PER_LEVEL;
    r.level++;
    meta.scene[id] = true;
  }
  if (r.level >= MAX_LEVEL) r.points = 0;
  meta.rel[id] = r;
  saveMeta();
}

/* ---------- Screens and overlays ---------- */
const SCREENS = ['hub', 'runMap', 'prep', 'scene', 'runEnd', 'app', 'mini', 'battle', 'reward'];
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
let pendingConfirm = null;
function confirmSheet(title, text, yes, onYes) {
  pendingConfirm = onYes;
  openSheet(`<h2 class="title2">${title}</h2><p class="note">${text}</p>
    <button class="cta" data-act="confirmYes">${yes}</button>
    <button class="cta ghost" data-act="closeSheet">Отмена</button>`);
}
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
const cardHtml = (id, attrs = '') => {
  const c = cardInfo(id, relLevel);
  return `<button class="card" ${attrs}><span class="cost">${c.cost}</span><b>${c.name}</b><small>${c.flavor ? c.flavor + '. ' : ''}${cardText(c)}</small></button>`;
};

/* ---------- Hub ---------- */
const TABS = [['campus', 'Кампус', 'map'], ['people', 'Контакты', 'people'], ['bag', 'Рюкзак', 'bag'], ['tasks', 'Задания', 'tasks']];
let tab = 'campus';

function renderHub() {
  $('hubBar').innerHTML = `<div class="stub avatar" aria-hidden="true">Я</div>
    <div class="grow"><h1>Кампус</h1><div class="sub">Цикл ${meta.cycle}</div></div>${coinsHtml(meta.coins)}`;
  const anyScene = PLAYABLE.some(c => meta.scene[c.id]);
  $('tabs').innerHTML = TABS.map(([id, label, ic]) =>
    `<button class="tab" data-act="tab" data-id="${id}"${id === tab ? ' aria-current="page"' : ''}>${icon(ic)}${label}${id === 'people' && anyScene ? '<i class="ping" aria-label="Есть новая сцена"></i>' : ''}</button>`).join('');
  const view = $('hubView');
  view.classList.toggle('padded', tab !== 'campus');
  view.innerHTML = { campus: campusView, people: peopleView, bag: bagView, tasks: tasksView }[tab]();
}
function calendarHtml() {
  const classDays = CALENDAR.filter(d => d === 'class').length;
  let n = 0;
  return `<ol class="calendar" aria-label="Календарь">${CALENDAR.map((d, i) => {
    if (d === 'class') n++;
    const state = i < meta.day ? 'past' : i === meta.day ? 'now' : '';
    return `<li class="${state}"><small>${d === 'class' ? `День ${n}/${classDays}` : 'Неделя'}</small><b>${DAY_LABEL[d]}</b></li>`;
  }).join('')}</ol>`;
}
function campusView() {
  const c = LOCATIONS.central;
  const lines = ['university', 'park', 'dorm', 'campus'].map(k => `<line x1="${c.x}" y1="${c.y}" x2="${LOCATIONS[k].x}" y2="${LOCATIONS[k].y}" vector-effect="non-scaling-stroke"/>`).join('');
  const pins = Object.entries(LOCATIONS).map(([id, l]) => {
    const dots = CHARS.filter(ch => ch.loc === id).map(ch => `<span class="dot">${ch.name[0]}</span>`).join('');
    return `<button class="loc${l.main ? ' main' : ''}" style="left:${l.x}%;top:${l.y}%" data-act="loc" data-id="${id}">
      <span class="stub">Арт локации</span><span class="people">${dots}</span><span class="name">${l.name}</span></button>`;
  }).join('');
  const label = CALENDAR[meta.day] === 'finals' ? 'На зачётную неделю' : 'На уроки';
  return `${calendarHtml()}<div class="campus"><svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="#fff" stroke-width="14">${lines}</svg>${pins}</div>
    <div class="ctaWrap"><button class="cta" data-act="startRun">${label}</button></div>`;
}
function relRow(ch) {
  const r = relOf(ch.id), pending = meta.scene[ch.id];
  const game = ch.game ? `Кабинет: ${GAMES[ch.game].name}` : 'Кабинет появится позже';
  const progress = ch.game ? (r.level >= MAX_LEVEL ? 'Максимум' : `${r.points}/${POINTS_PER_LEVEL} до сцены`) : '';
  return `<button class="row" data-act="talk" data-id="${ch.id}"><span class="stub avatar">${ch.name[0]}</span>
    <span class="grow"><b>${ch.name}</b><small>${ch.role} · ${game}</small>${heartsHtml(r.level, MAX_LEVEL, true)}</span>
    <small class="${pending ? 'new' : ''}">${pending ? 'Новая сцена' : progress}</small></button>`;
}
function peopleView() {
  return `<p class="note">Отношения растут за победы в кабинете персонажа. Каждые ${POINTS_PER_LEVEL} очка открывают сцену.</p>` + CHARS.map(relRow).join('');
}
function bagView() {
  const counts = {};
  meta.deck.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  const facts = meta.facts.length ? meta.facts.map(i => `<div class="row"><span class="grow"><b>${FACTS[i]}</b><small>На экзамене это карта на 8 урона</small></span></div>`).join('')
    : '<p class="note">Пока пусто. Факты можно узнать на консультациях во время забега.</p>';
  return `<h2 class="title3">Колода: ${meta.deck.length}</h2><div class="cards">${Object.keys(counts).map(id => {
    const c = cardInfo(id, relLevel);
    return `<div class="card"><span class="cost">${c.cost}</span><b>${c.name}${counts[id] > 1 ? ` ×${counts[id]}` : ''}</b><small>${cardText(c)}</small></div>`;
  }).join('')}</div>
  <h2 class="title3">Факты о преподавателе: ${meta.facts.length} из ${FACTS.length}</h2>${facts}
  <h2 class="title3">Бонусы перед кабинетом</h2>${BOOSTS.map(b =>
    `<div class="row"><span class="grow"><b>${b.name}</b><small>${b.text}</small></span>${coinsHtml(b.price)}</div>`).join('')}`;
}
function tasksView() {
  const tasks = [['Сдать зачётную неделю', meta.wins, 1], ['Собрать 10 звёзд в кабинетах', meta.stars, 10], ['Узнать все факты о преподавателе', meta.facts.length, FACTS.length]];
  return `<p class="note">Награды за задания пока не выдаются.</p>` + tasks.map(([name, cur, max]) =>
    `<div class="row"><span class="grow"><b>${name}</b><small>${Math.min(cur, max)} из ${max}</small></span>${cur >= max ? icon('check') : ''}</div>`).join('');
}
function openLocation(id) {
  const l = LOCATIONS[id];
  const here = CHARS.filter(ch => ch.loc === id).map(relRow).join('');
  openSheet(`<div class="stub portrait">Арт локации: ${l.name}</div><h2 class="title2">${l.name}</h2><p class="note">${l.text}</p>${here}
    <button class="cta ghost" data-act="closeSheet">Закрыть</button>`);
}
function openTalk(id) {
  const ch = charById(id), pending = meta.scene[id], r = relOf(id);
  openSheet(`<div class="stub portrait">Портрет: ${ch.name}</div>
    <p class="line"><span class="speaker">${ch.name}${pending ? ` · Сцена ${r.level}` : ''}</span>${ch.line}</p>
    ${pending ? `<button class="cta" data-act="reply" data-id="${id}" data-d="1">Поддержать (+1 очко)</button>
      <button class="cta ghost" data-act="reply" data-id="${id}" data-d="-1">Подколоть (−1 очко)</button>`
      : `<p class="note">${ch.game ? `Новая сцена откроется после побед в кабинете: ${GAMES[ch.game].name}.` : 'Для этого персонажа кабинет появится позже.'}</p>
      <button class="cta ghost" data-act="closeSheet">Закрыть</button>`}`);
}

/* ---------- Rooms ---------- */
function roomConfig(game, hard) {
  const c = meta.cycle - 1;
  if (game === 'match3') {
    const base = Match3.levelConfig(Math.min(12, 2 + c + (hard ? 5 : 0)));
    return { ...base, moves: base.moves - (hard ? 1 : 0) };
  }
  if (game === 'blocks') {
    const lines = (hard ? 8 : 5) + c;
    return { lines, pieces: (hard ? 24 : 20) + c * 2, junk: hard ? 12 : 0, star2: lines * 150, star3: lines * 210 };
  }
  const lines = (hard ? 8 : 4) + c;
  return { lines, gravity: Math.max(220, (hard ? 480 : 750) - c * 40), garbage: hard ? 3 : 0, star2: lines * 170, star3: lines * 240 };
}
function goalHtml(game, cfg) {
  if (game === 'match3') {
    return `${Object.keys(cfg.goals).map(c => `<span class="goal">${spriteHtml(c, 34)}<b>${cfg.goals[c]}</b></span>`).join('')}<span class="grow2"><small>Ходы</small> <b>${cfg.moves}</b></span>`;
  }
  if (game === 'blocks') {
    return `<span><small>Линии</small> <b>${cfg.lines}</b></span><span><small>Фигуры</small> <b>${cfg.pieces}</b></span>${cfg.junk ? `<span><small>Занято клеток</small> <b>${cfg.junk}</b></span>` : ''}`;
  }
  return `<span><small>Линии</small> <b>${cfg.lines}</b></span><span><small>Скорость</small> <b>${(1000 / cfg.gravity).toFixed(1)}/с</b></span>${cfg.garbage ? `<span><small>Лишние ряды</small> <b>${cfg.garbage}</b></span>` : ''}`;
}
function applyBoosts(game, cfg, ids) {
  const out = { ...cfg };
  if (game === 'match3') {
    out.goals = { ...cfg.goals };
    if (ids.includes('coffee')) out.moves += 3;
    if (ids.includes('crib')) for (const c in out.goals) out.goals[c] = Math.ceil(out.goals[c] * .75);
  } else {
    if (ids.includes('coffee')) { if (game === 'blocks') out.pieces += 4; else out.gravity = Math.round(out.gravity * 1.35); }
    if (ids.includes('crib')) out.lines = Math.ceil(out.lines * .75);
  }
  return out;
}
let currentGame = null;
function launchRoom(game, cfg, title, handlers) {
  const room = {
    ...cfg, title,
    winTitle: 'Кабинет пройден', failTitle: 'Кабинет не пройден', failText: 'Минус одна сила.',
    rewardFor: stars => 40 + stars * 20,
    onExit() { confirmSheet('Сдаться?', 'Кабинет будет считаться непройденным.', 'Сдаться', () => forceCurrent(false)); },
    ...handlers,
  };
  currentGame = GAMES[game].mod;
  show(game === 'match3' ? 'app' : 'mini');
  currentGame.start(room);
}
function forceCurrent(won) {
  if (currentGame) { const g = currentGame; currentGame = null; g.force(won); return true; }
  if (!$('battle').hidden) { Battle.force(won); return true; }
  return false;
}
function stopCurrent() {
  if (currentGame === Match3) Match3.stop();
  else if (currentGame) Mini.stop();
  currentGame = null;
  if (Battle.st) Battle.st.over = true;
}

/* ---------- Run: map ---------- */
let run = null;
function shuffled(a) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function classNode(id, ch, hard) { return { id, type: 'class', char: ch.id, game: ch.game, cfg: roomConfig(ch.game, hard), next: [], done: false }; }
function generateMap(kind) {
  const hard = kind === 'finals';
  const [a, b, c] = shuffled(PLAYABLE);
  const layers = [
    [classNode('0-0', a, hard), classNode('0-1', b, hard)],
    [classNode('1-0', c, hard), { id: '1-1', type: 'fact', next: [], done: false }],
    [classNode('2-0', shuffled(PLAYABLE)[0], hard), { id: '2-1', type: 'cafe', next: [], done: false }],
  ];
  if (hard) layers.push([{ id: '3-0', type: 'boss', next: [], done: false }]);
  layers.forEach((layer, d) => layer.forEach((n, i) => { n.depth = d; n.x = layer.length === 1 ? 50 : i ? 72 : 28; }));
  for (let d = 0; d < layers.length - 1; d++) for (const n of layers[d]) n.next = [...layers[d + 1]];
  return layers;
}
const openNodes = () => run.at ? run.at.next : run.layers[0];
const findNode = id => run.layers.flat().find(n => n.id === id);
const nodeLabel = n => n.type === 'class' ? charById(n.char).name : { fact: 'Консультация', cafe: 'Столовая', boss: 'Экзамен' }[n.type];

function startRun(kind = CALENDAR[meta.day]) {
  closeSheet();
  stopCurrent();
  run = { kind, layers: generateMap(kind), at: null, hearts: MAX_HEARTS, earned: 0, stars: 0, rooms: 0, gains: {} };
  const title = kind === 'finals' ? 'Зачётная неделя' : 'Учебный день';
  wipe(title, kind === 'finals' ? 'Механики сложнее, в конце экзамен' : 'Выберите, к кому пойти', backToMap);
}
function backToMap() { renderMap(); show('runMap'); scrollMap(); }
function renderMap() {
  const open = openNodes(), total = run.layers.length;
  $('runBar').innerHTML = `<button class="icon" data-act="leaveRun" aria-label="Закончить день">${icon('door')}</button>
    <div class="grow"><h1>${run.kind === 'finals' ? 'Зачётная неделя' : 'Учебный день'}</h1>${heartsHtml(run.hearts, MAX_HEARTS)}</div>${coinsHtml(meta.coins)}`;
  const height = total * LAYER_H + 30;
  const yOf = n => (total - 1 - n.depth) * LAYER_H + 66;
  const lines = run.layers.flat().flatMap(a => a.next.map(b => {
    const walked = a.done && (b.done || open.includes(b));
    return `<line x1="${a.x}" y1="${yOf(a)}" x2="${b.x}" y2="${yOf(b)}" stroke="${walked ? '#1c0a10' : '#8fa0af'}" stroke-width="${walked ? 4 : 3}" stroke-dasharray="${walked ? 'none' : '2 9'}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  })).join('');
  const nodes = run.layers.flat().map(n => {
    const isOpen = open.includes(n);
    const cls = `node${n.done ? ' done' : isOpen ? ' open' : ' locked'}${n.type === 'boss' ? ' boss' : ''}`;
    const face = n.done ? icon('check') : n.type === 'class' ? `<b class="initial">${charById(n.char).name[0]}</b>` : icon(n.type);
    const sub = n.type === 'class' ? `<small>${GAMES[n.game].name}</small>` : '';
    return `<button class="${cls}" style="left:${n.x}%;top:${yOf(n)}px" ${isOpen ? `data-act="node" data-id="${n.id}"` : 'disabled'}>
      <span class="disc">${face}</span><span class="cap">${nodeLabel(n)}${sub}</span></button>`;
  }).join('');
  $('track').innerHTML = `<div id="trackIn" style="height:${height}px"><svg viewBox="0 0 100 ${height}" preserveAspectRatio="none" fill="none" aria-hidden="true">${lines}</svg>${nodes}</div>`;
}
function scrollMap() {
  const t = openNodes()[0];
  if (t) $('track').scrollTop = (run.layers.length - 1 - t.depth) * LAYER_H + 66 - $('track').clientHeight * .6;
}

/* ---------- Run: prep before a room ---------- */
let prepNode = null, picked = [];
function openPrep(node) { prepNode = node; picked = []; renderPrep(); show('prep'); }
const pickedCost = () => picked.reduce((s, id) => s + BOOSTS.find(b => b.id === id).price, 0);
function renderPrep() {
  const n = prepNode, ch = charById(n.char), left = meta.coins - pickedCost();
  const cfg = applyBoosts(n.game, n.cfg, picked);
  const prep = $('prep');
  prep.classList.add('padded');
  prep.innerHTML = `<div class="stub roomArt">Арт кабинета: ${ch.name}</div>
    <h2 class="title2">${ch.name}: ${GAMES[n.game].name}</h2>
    <p class="note">${run.kind === 'finals' ? 'Зачётная неделя: условия сложнее. ' : ''}Победа даст очки отношений с персонажем.</p>
    <div class="row goalsRow">${goalHtml(n.game, cfg)}</div>
    <div class="row plain"><b class="grow">Подготовка (до ${MAX_BOOSTS})</b>${coinsHtml(left)}</div>
    <div class="boosts">${BOOSTS.map(b => {
      const on = picked.includes(b.id), off = !on && (picked.length >= MAX_BOOSTS || b.price > left);
      return `<button class="boost" data-act="boost" data-id="${b.id}" aria-pressed="${on}"${off ? ' disabled' : ''}><b>${b.name}</b>${b.text}<span class="price"><i class="coin"></i>${b.price}</span></button>`;
    }).join('')}</div>
    <div class="foot"><button class="cta" data-act="enterRoom">Войти в кабинет</button>
    <button class="cta ghost" data-act="backToMap">К карте</button></div>`;
}
function enterRoom() {
  const node = prepNode, ch = charById(node.char), boosts = picked;
  meta.coins -= pickedCost();
  saveMeta();
  const mult = boosts.includes('energy') ? 1.5 : 1;
  const rewardFor = stars => Math.round((run.kind === 'finals' ? 70 : 40) * mult + stars * 20 * mult);
  launchRoom(node.game, applyBoosts(node.game, node.cfg, boosts), ch.name, {
    rewardFor,
    onDone(res) { finishRoom(node, res, rewardFor, boosts); },
  });
}
function finishRoom(node, res, rewardFor, boosts) {
  currentGame = null;
  run.rooms++;
  if (res.won) {
    const coins = rewardFor(res.stars);
    meta.coins += coins; meta.stars += res.stars;
    run.earned += coins; run.stars += res.stars;
    const gain = (res.stars >= 3 ? 2 : 1) + (boosts.includes('notes') ? 1 : 0);
    run.gains[node.char] = (run.gains[node.char] || 0) + gain;
    addRel(node.char, gain);
    saveMeta();
    toast(`${charById(node.char).name}: +${gain} к отношениям`);
  } else {
    run.hearts--;
    if (run.hearts <= 0) return endRun('dead');
  }
  completeNode(node);
}
function completeNode(node) {
  node.done = true;
  run.at = node;
  if (!node.next.length) return endRun('done');
  backToMap();
}

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
    return renderScene(node, 'Столовая', full ? 'Сил и так хватает. Можно сэкономить на обеде.' : 'Горячий обед восстанавливает силы.',
      [full ? { label: 'Сэкономить (+40 монет)', coins: 40 } : { label: 'Пообедать (+1 сила)', heal: 1 }], 'Арт: столовая');
  }
  const unknown = FACTS.map((_, i) => i).filter(i => !meta.facts.includes(i));
  if (!unknown.length) return renderScene(node, 'Консультация', 'О профессоре вы уже знаете всё, что можно. Зато вас угостили печеньем за усердие.', [{ label: 'Дальше (+30 монет)', coins: 30 }], 'Арт: консультация');
  const fact = shuffled(unknown)[0];
  renderScene(node, 'Консультация', `В разговоре выясняется факт о профессоре Моргане: «${FACTS[fact]}». На экзамене это пригодится.`, [{ label: 'Записать', fact }], 'Арт: консультация');
}
function applyChoice(c) {
  if (c.coins) { meta.coins += c.coins; run.earned += c.coins; toast(`Монеты: +${c.coins}`); }
  if (c.heal) { run.hearts = Math.min(MAX_HEARTS, run.hearts + c.heal); toast('Сила восстановлена'); }
  if (c.fact !== undefined) { meta.facts.push(c.fact); toast('Новый факт в рюкзаке'); }
  saveMeta();
  completeNode(sceneNode);
}

/* ---------- Exam ---------- */
function openExam(node) {
  sceneNode = node;
  const el = $('prep');
  el.classList.add('padded');
  el.innerHTML = `<div class="stub roomArt">Арт: аудитория</div><h2 class="title2">Экзамен: ${EXAMINER.name}</h2>
    <p class="note">Карточный бой. Опустите терпение профессора до нуля, пока у вас есть уверенность.</p>
    <div class="row goalsRow"><span><small>Карт в колоде</small> <b>${meta.deck.length}</b></span><span><small>Факты станут картами</small> <b>${meta.facts.length}</b></span></div>
    <div class="foot"><button class="cta" data-act="startExam">Начать экзамен</button><button class="cta ghost" data-act="backToMap">К карте</button></div>`;
  show('prep');
}
function startBattle(onDone) {
  Battle.start({
    deck: meta.deck, facts: meta.facts, relLevel, week: meta.cycle,
    onDone,
    onExit() { confirmSheet('Сдаться?', 'Экзамен будет считаться несданным.', 'Сдаться', () => Battle.force(false)); },
  });
  show('battle');
}
function startExam() {
  const node = sceneNode;
  startBattle(res => {
    run.rooms++;
    if (res.won) { node.done = true; return endRun('exam'); }
    examFailed();
  });
}
function examFailed() {
  const el = $('runEnd');
  el.classList.add('padded');
  const can = meta.coins >= RETAKE_PRICE;
  el.innerHTML = `<div class="stub sceneArt">Арт: провал экзамена</div><h2 class="title2">Экзамен не сдан</h2>
    <p class="note">Профессор разрешает пересдачу. Можно попробовать сразу или вернуться на кампус и начать зачётную неделю заново.</p>
    <div class="foot"><button class="cta" data-act="retake"${can ? '' : ' disabled'}>Пересдать (${RETAKE_PRICE} монет)</button>
    <button class="cta ghost" data-act="goHub">На кампус</button></div>`;
  show('runEnd');
}

/* ---------- Run: the end ---------- */
function endRun(how) {
  currentGame = null;
  const r = run;
  let title, text;
  if (r.kind === 'class') {
    meta.day++;
    if (CALENDAR[meta.day] === 'finals') meta.pendingCards = CARD_PICKS;
    title = how === 'done' ? 'День окончен' : how === 'dead' ? 'Силы закончились' : 'Вы ушли с уроков';
    text = meta.pendingCards ? 'Учебная неделя позади. За неё можно выбрать новые карты для экзамена.' : 'День засчитан. На кампусе можно посмотреть новые сцены.';
  } else if (how === 'exam') {
    meta.coins += 200; r.earned += 200; meta.wins++; meta.cycle++; meta.day = 0;
    title = 'Зачёт сдан!';
    text = 'Цикл пройден, начинается новый. Он будет немного сложнее.';
  } else {
    title = how === 'dead' ? 'Силы закончились' : 'Вы ушли с зачётной недели';
    text = 'Заработанное сохранилось. Зачётную неделю можно начать заново.';
  }
  saveMeta();
  const gains = Object.entries(r.gains).map(([id, n]) => `<div class="row"><span class="grow"><b>${charById(id).name}</b><small>${meta.scene[id] ? 'Открыта новая сцена' : 'Отношения выросли'}</small></span><b>+${n}</b></div>`).join('');
  const el = $('runEnd');
  el.classList.add('padded');
  el.innerHTML = `<div class="stub sceneArt">${how === 'done' || how === 'exam' ? 'Арт: итог дня' : 'Арт: утешающая сцена'}</div><h2 class="title2">${title}</h2><p class="note">${text}</p>
    <div class="row"><span class="grow"><small>Кабинеты</small><b>${r.rooms}</b></span><span class="grow"><small>Звёзды</small><b>${r.stars}</b></span><span class="grow"><small>Монеты</small><b>+${r.earned}</b></span></div>
    ${gains}
    <div class="foot"><button class="cta" data-act="goHub">${meta.pendingCards ? 'Выбрать карты' : 'На кампус'}</button></div>`;
  show('runEnd');
}
function goHub() {
  run = null;
  if (meta.pendingCards > 0) return openRewards();
  wipe('Кампус', 'С кем встретимся сегодня?', () => { tab = 'campus'; renderHub(); show('hub'); });
}
let rewardChoices = [];
function openRewards() {
  rewardChoices = shuffled(REWARD_POOL).slice(0, 3);
  const el = $('reward');
  el.classList.add('padded');
  el.innerHTML = `<h2 class="title2">Новая карта</h2><p class="note">Выберите одну карту в колоду. Осталось выборов: ${meta.pendingCards}.</p>
    <div class="cards">${rewardChoices.map(id => cardHtml(id, `data-act="pickCard" data-id="${id}"`)).join('')}</div>
    <div class="foot"><button class="cta ghost" data-act="skipCard">Пропустить</button></div>`;
  show('reward');
}
function nextReward() {
  meta.pendingCards--;
  saveMeta();
  if (meta.pendingCards > 0) openRewards(); else goHub();
}

/* ---------- Actions ---------- */
const ACTIONS = {
  tab(d) { tab = d.id; renderHub(); },
  loc(d) { openLocation(d.id); },
  talk(d) { openTalk(d.id); },
  reply(d) {
    const delta = Number(d.d);
    delete meta.scene[d.id];
    addRel(d.id, delta);
    saveMeta();
    closeSheet(); renderHub();
    toast(delta > 0 ? 'Отношения улучшились' : 'Отношения ухудшились');
  },
  closeSheet,
  confirmYes() { closeSheet(); const f = pendingConfirm; pendingConfirm = null; if (f) f(); },
  startRun() { startRun(); },
  leaveRun() { confirmSheet('Уйти?', run.kind === 'class' ? 'Учебный день закончится и будет засчитан.' : 'Придётся начинать зачётную неделю заново. Заработанное сохранится.', 'Уйти', () => endRun('left')); },
  node(d) {
    const n = findNode(d.id);
    if (n.type === 'class') openPrep(n);
    else if (n.type === 'boss') openExam(n);
    else openScene(n);
  },
  boost(d) {
    picked = picked.includes(d.id) ? picked.filter(x => x !== d.id) : [...picked, d.id];
    renderPrep();
  },
  enterRoom,
  backToMap,
  sceneChoice(d) { applyChoice(sceneChoices[Number(d.i)]); },
  startExam,
  retake() { meta.coins -= RETAKE_PRICE; saveMeta(); startExam(); },
  goHub,
  pickCard(d) { meta.deck.push(d.id); toast(`В колоду: ${cardInfo(d.id, relLevel).name}`); nextReward(); },
  skipCard() { nextReward(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled) { sound.unlock(); sound.tick(); ACTIONS[el.dataset.act](el.dataset); return; }
  if (e.target === $('sheetWrap')) closeSheet();
});

renderHub();
