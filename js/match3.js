'use strict';
/* ---------- Data ---------- */
const SIZE = 7; // matches the grid drawn in board.png
const BOARD_PX = 994; // grid side in board.png, the tray CSS positions the canvas over it
const COLORS = [
  { name: 'Коты',     file: 'cat',    hex: '#f0a030' },
  { name: 'Вороны',   file: 'crow',   hex: '#3a2f4d' },
  { name: 'Лягушки',  file: 'frog',   hex: '#86a832' },
  { name: 'Кролики',  file: 'rabbit', hex: '#f4b6a6' },
  { name: 'Носороги', file: 'rhino',  hex: '#a58a5f' },
];
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319];

function levelConfig(n) {
  const nColors = COLORS.length;
  const kinds = n === 1 ? 1 : n <= 3 ? 2 : 3;
  const perGoal = Math.min(26, 10 + n * 2);
  const moves = Math.min(20, 10 + kinds * 2 + Math.floor(n / 4));
  const goals = {};
  for (let i = 0; i < kinds; i++) goals[(n - 1 + i * 2) % nColors] = perGoal;
  return { nColors, goals, moves, star2: moves * 110, star3: moves * 160 };
}

/* ---------- State ---------- */
const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPRITES = COLORS.map(c => { const im = new Image(); im.src = `assets/${c.file}.png`; return im; });
let SPEED = reduced ? .4 : 1;
let grid = [], S = {}, busy = false, exitPending = false, active = false, raf = 0, nextId = 1;
let cell = 40, dpr = 1, now = performance.now();
let selected = null, hint = null, hintAt = 0, waveStart = 0, shake = 0;
const tweens = new Set();
let particles = [], fxList = [], popups = [];

const key = (r, c) => r * SIZE + c;
const unkey = k => [Math.floor(k / SIZE), k % SIZE];
const rnd = n => Math.floor(Math.random() * n);
const inBoard = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
const gemAt = k => { const [r, c] = unkey(k); return grid[r][c]; };

function newGem(r, c, color, kind = 'gem') {
  return { id: nextId++, color, kind, x: c, y: r, sc: 1, a: 1, spent: false };
}

/* ---------- Tweens ---------- */
function tween(ms, fn, ease = t => t, delay = 0) {
  if (SPEED === 0) { fn(1); return Promise.resolve(); }
  return new Promise(res => tweens.add({ t0: now + delay * SPEED, ms: ms * SPEED, fn, ease, res }));
}
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeIO = t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
const landing = t => { // falls, then a small rebound
  if (t < .8) return easeIn(t / .8);
  const u = (t - .8) / .2;
  return 1 - .05 * Math.sin(u * Math.PI);
};

/* ---------- Match logic ---------- */
function colorAt(g, r, c) { const x = g[r][c]; return x && x.kind !== 'star' ? x.color : -1; }

function findGroups(g) {
  const runs = [];
  for (let axis = 0; axis < 2; axis++) {
    for (let a = 0; a < SIZE; a++) {
      let b = 0;
      while (b < SIZE) {
        const at = i => axis ? colorAt(g, i, a) : colorAt(g, a, i);
        const col = at(b);
        if (col < 0) { b++; continue; }
        let e = b + 1;
        while (e < SIZE && at(e) === col) e++;
        if (e - b >= 3) {
          const cells = [];
          for (let i = b; i < e; i++) cells.push(axis ? key(i, a) : key(a, i));
          runs.push({ axis, color: col, cells });
        }
        b = e;
      }
    }
  }
  const groups = [];
  for (const run of runs) {
    const overlaps = groups.filter(gr => run.cells.some(k => gr.cells.has(k)));
    const merged = { color: run.color, cells: new Set(run.cells), runs: [run] };
    for (const o of overlaps) {
      o.cells.forEach(k => merged.cells.add(k));
      merged.runs.push(...o.runs);
      groups.splice(groups.indexOf(o), 1);
    }
    groups.push(merged);
  }
  return groups;
}

function specialFor(group) {
  const longest = Math.max(...group.runs.map(r => r.cells.length));
  if (longest >= 5) return 'star';
  if (new Set(group.runs.map(r => r.axis)).size > 1) return 'bomb';
  if (longest === 4) return 'line';
  return null;
}

function spawnCell(group, swapKeys) {
  for (const k of swapKeys || []) if (group.cells.has(k)) return k;
  if (group.runs.length > 1) {
    const [a, b] = group.runs;
    const cross = a.cells.find(k => b.cells.includes(k));
    if (cross !== undefined) return cross;
  }
  const run = group.runs.reduce((m, r) => r.cells.length > m.cells.length ? r : m);
  return run.cells[Math.floor(run.cells.length / 2)];
}

function swapGrid(a, b) { const t = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = t; }

function findMove() {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc;
      if (!inBoard(r2, c2)) continue;
      const a = { r, c }, b = { r: r2, c: c2 }, ga = grid[r][c], gb = grid[r2][c2];
      if (isCombo(ga, gb)) return [a, b];
      swapGrid(a, b);
      const ok = findGroups(grid).length > 0;
      swapGrid(a, b);
      if (ok) return [a, b];
    }
  }
  return null;
}
const isCombo = (a, b) => a.kind === 'star' || b.kind === 'star' || (a.kind !== 'gem' && b.kind !== 'gem');

function mostCommonColor() {
  const n = new Array(COLORS.length).fill(0);
  for (const row of grid) for (const g of row) if (g && g.color >= 0) n[g.color]++;
  return n.indexOf(Math.max(...n));
}
function cellsOfColor(color) {
  const out = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] && grid[r][c].color === color) out.push(key(r, c));
  return out;
}
function rowsCols(r, c, radius) {
  const out = [];
  for (let i = 0; i < SIZE; i++) for (let d = -radius; d <= radius; d++) {
    if (inBoard(r + d, i)) out.push(key(r + d, i));
    if (inBoard(i, c + d)) out.push(key(i, c + d));
  }
  return out;
}
function square(r, c, radius, trimCorners) {
  const out = [];
  for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
    if (trimCorners && Math.abs(dr) === radius && Math.abs(dc) === radius) continue;
    if (inBoard(r + dr, c + dc)) out.push(key(r + dr, c + dc));
  }
  return out;
}

// What a special gem destroys when it goes off, plus its visual effect.
function fire(g, r, c, delay) {
  if (g.kind === 'line') {
    addFx({ type: 'beam', r, c, width: 1 }, delay);
    return rowsCols(r, c, 0);
  }
  if (g.kind === 'bomb') {
    addFx({ type: 'ring', r, c, radius: 2.6 }, delay);
    return square(r, c, 2, true);
  }
  const targets = cellsOfColor(g.target !== undefined ? g.target : mostCommonColor());
  addFx({ type: 'zap', r, c, targets }, delay);
  return targets;
}

function expand(seeds, protect) {
  const out = new Map();
  const q = [...seeds.entries()];
  while (q.length) {
    const [k, delay] = q.shift();
    if (out.has(k) || protect.has(k)) continue;
    const g = gemAt(k);
    if (!g) continue;
    out.set(k, delay);
    if (g.kind !== 'gem' && !g.spent) queueFire(g, k, delay, q);
  }
  return out;
}
function queueFire(g, k, delay, q) {
  const [r, c] = unkey(k);
  shake = Math.max(shake, g.kind === 'line' ? 4 : 8);
  sound.boom();
  for (const t of fire(g, r, c, delay)) {
    const [r2, c2] = unkey(t);
    q.push([t, delay + (Math.abs(r2 - r) + Math.abs(c2 - c)) * 28]);
  }
}

// Swapping two specials, or a star with anything, fires without needing a match.
function comboSeeds(a, b) {
  const ga = grid[a.r][a.c], gb = grid[b.r][b.c];
  const seeds = new Map();
  const add = (keys, from) => keys.forEach(k => {
    const [r, c] = unkey(k);
    const d = (Math.abs(r - from.r) + Math.abs(c - from.c)) * 28;
    if (!seeds.has(k)) seeds.set(k, d);
  });
  shake = 10; sound.boom();
  if (ga.kind === 'star' && gb.kind === 'star') {
    ga.spent = gb.spent = true;
    addFx({ type: 'ring', r: b.r, c: b.c, radius: 11 }, 0);
    add(square(b.r, b.c, SIZE, false), b);
    return seeds;
  }
  if (ga.kind === 'star' || gb.kind === 'star') {
    const [sp, op] = ga.kind === 'star' ? [a, b] : [b, a];
    const star = grid[sp.r][sp.c], other = grid[op.r][op.c];
    star.spent = true;
    const targets = cellsOfColor(other.color);
    if (other.kind !== 'gem') {
      for (const k of targets) { const g = gemAt(k); if (g.kind === 'gem') g.kind = other.kind; }
    }
    addFx({ type: 'zap', r: sp.r, c: sp.c, targets }, 0);
    add([...targets, key(sp.r, sp.c)], sp);
    return seeds;
  }
  ga.spent = gb.spent = true;
  if (ga.kind === 'bomb' && gb.kind === 'bomb') {
    addFx({ type: 'ring', r: b.r, c: b.c, radius: 4.4 }, 0);
    add(square(b.r, b.c, 3, false), b);
  } else if (ga.kind === 'line' && gb.kind === 'line') {
    addFx({ type: 'beam', r: a.r, c: a.c, width: 1 }, 0);
    addFx({ type: 'beam', r: b.r, c: b.c, width: 1 }, 0);
    add([...rowsCols(a.r, a.c, 0), ...rowsCols(b.r, b.c, 0)], b);
  } else {
    addFx({ type: 'beam', r: b.r, c: b.c, width: 3 }, 0);
    add(rowsCols(b.r, b.c, 1), b);
  }
  return seeds;
}

/* ---------- Turn flow ---------- */
function animateSwap(a, b) {
  const ga = grid[a.r][a.c], gb = grid[b.r][b.c];
  return tween(150, t => {
    ga.x = a.c + (b.c - a.c) * t; ga.y = a.r + (b.r - a.r) * t;
    gb.x = b.c + (a.c - b.c) * t; gb.y = b.r + (a.r - b.r) * t;
  }, easeIO);
}

async function playTurn(a, b) {
  if (busy || S.over) return false;
  busy = true; selected = null; hint = null;
  sound.swap();
  const ga = grid[a.r][a.c], gb = grid[b.r][b.c];
  await animateSwap(a, b);
  swapGrid(a, b);
  let seeds = null;
  if (isCombo(ga, gb)) seeds = comboSeeds(a, b);
  else if (!findGroups(grid).length) {
    sound.bad();
    await animateSwap(a, b);
    swapGrid(a, b);
    idle();
    return false;
  }
  S.moves--;
  renderHud();
  await resolve([key(a.r, a.c), key(b.r, b.c)], seeds);
  await finishTurn();
  return true;
}

async function resolve(swapKeys, firstSeeds) {
  let combo = 0, pending = firstSeeds;
  while (true) {
    const groups = findGroups(grid);
    if (!groups.length && !pending) break;
    combo++;
    const seeds = new Map(pending || []);
    pending = null;
    const protect = new Map();
    const extraQ = [];
    let bonus = 0;
    for (const gr of groups) {
      const kind = specialFor(gr);
      let spawn = null;
      if (kind) {
        spawn = spawnCell(gr, swapKeys);
        protect.set(spawn, { kind, color: gr.color });
        bonus += kind === 'line' ? 40 : kind === 'bomb' ? 80 : 150;
        const here = gemAt(spawn);
        if (here.kind !== 'gem' && !here.spent) queueFire(here, spawn, 0, extraQ);
      }
      gr.cells.forEach(k => {
        if (k === spawn) return;
        seeds.set(k, 0);
        if (spawn !== null) gemAt(k).mergeTo = unkey(spawn);
      });
    }
    extraQ.forEach(([k, d]) => { if (!seeds.has(k)) seeds.set(k, d); });
    const cleared = expand(seeds, protect);
    if (combo > 1) popups.push({ x: SIZE / 2, y: SIZE / 2, text: 'Каскад ×' + combo, t0: now, life: 800, big: true });
    sound.match(combo);
    await animateClear(cleared);
    applyClear(cleared, combo, bonus);
    protect.forEach((p, k) => {
      const g = gemAt(k);
      g.kind = p.kind; g.spent = false; delete g.target;
      g.color = p.kind === 'star' ? -1 : p.color;
      tween(240, t => { g.sc = 1 + .5 * Math.sin(t * Math.PI); }, easeOut);
      sound.spawn();
    });
    await gravity();
    swapKeys = null;
  }
}

function animateClear(cleared) {
  const jobs = [];
  cleared.forEach((delay, k) => {
    const g = gemAt(k);
    const [r, c] = unkey(k);
    const x0 = g.x, y0 = g.y, to = g.mergeTo;
    jobs.push(tween(170, t => {
      if (to) { g.x = x0 + (to[1] - x0) * t; g.y = y0 + (to[0] - y0) * t; }
      else g.sc = 1 + .25 * t;
      g.a = 1 - t;
      if (t > 0 && !g.burst && !to) { g.burst = true; burst(c, r, g.color); }
    }, easeOut, delay));
  });
  return Promise.all(jobs);
}

function applyClear(cleared, combo, bonus) {
  const flown = {};
  let gained = bonus, sx = 0, sy = 0;
  cleared.forEach((_, k) => {
    const g = gemAt(k), [r, c] = unkey(k);
    gained += 10 * combo; sx += c; sy += r;
    if (S.goals[g.color] > 0) {
      S.goals[g.color]--;
      flown[g.color] = (flown[g.color] || 0) + 1;
      if (flown[g.color] <= 5) fly(g.color, c, r);
    }
    grid[r][c] = null;
  });
  S.score += gained;
  const n = Math.max(1, cleared.size);
  popups.push({ x: sx / n, y: sy / n, text: '+' + gained, t0: now, life: 650 });
  renderHud(Object.keys(flown));
}

function gravity() {
  const jobs = [];
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const g = grid[r][c];
      if (!g) continue;
      if (r !== write) { grid[write][c] = g; grid[r][c] = null; }
      write--;
    }
    let above = 1;
    for (let r = write; r >= 0; r--) {
      const g = newGem(r, c, rnd(S.cfg.nColors));
      g.y = -above++;
      grid[r][c] = g;
    }
    for (let r = 0; r < SIZE; r++) {
      const g = grid[r][c];
      if (g.y === r) continue;
      const from = g.y, dist = r - from;
      jobs.push(tween(140 + Math.sqrt(dist) * 95, t => { g.y = from + (r - from) * t; }, landing));
    }
  }
  return Promise.all(jobs);
}

async function finishTurn() {
  const done = goalsDone();
  if (done || S.moves <= 0) {
    S.over = true;
    if (done) { S.score += S.moves * 50; renderHud(); }
    exitPending = false;
    showResult(done);
    return;
  }
  if (!findMove()) await shuffle();
  idle();
  if (exitPending) leave();
}
function idle() { busy = false; hintAt = now + 5500; waveStart = now + 3000; }
const goalsDone = () => Object.values(S.goals).every(v => v <= 0);

async function shuffle() {
  popups.push({ x: SIZE / 2, y: SIZE / 2, text: 'Нет ходов, мешаем', t0: now, life: 1000, big: true });
  const all = grid.flat();
  do {
    for (let i = all.length - 1; i > 0; i--) { const j = rnd(i + 1); [all[i], all[j]] = [all[j], all[i]]; }
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) grid[r][c] = all[r * SIZE + c];
  } while (findGroups(grid).length || !findMove());
  const jobs = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const g = grid[r][c], x0 = g.x, y0 = g.y;
    jobs.push(tween(420, t => { g.x = x0 + (c - x0) * t; g.y = y0 + (r - y0) * t; }, easeIO));
  }
  await Promise.all(jobs);
}

function fillBoard(nColors) {
  do {
    grid = [];
    for (let r = 0; r < SIZE; r++) {
      grid.push([]);
      for (let c = 0; c < SIZE; c++) {
        let col;
        do col = rnd(nColors);
        while ((c >= 2 && grid[r][c - 1].color === col && grid[r][c - 2].color === col) ||
               (r >= 2 && grid[r - 1][c].color === col && grid[r - 2][c].color === col));
        grid[r].push(newGem(r, c, col));
      }
    }
  } while (!findMove());
}

// room: { title, moves, goals, nColors, star2, star3, special: [kinds], winTitle, failTitle, failText, rewardFor(stars), onDone(result), onExit() }
function start(room) {
  S = { room, cfg: room, moves: room.moves, score: 0, goals: { ...room.goals }, over: false };
  tweens.clear(); particles = []; fxList = []; popups = [];
  selected = null; hint = null; exitPending = false;
  fillBoard(room.nColors);
  for (const kind of room.special || []) {
    let g;
    do g = grid[rnd(SIZE)][rnd(SIZE)]; while (g.kind !== 'gem');
    g.kind = kind;
  }
  $('result').hidden = true;
  $('levelLabel').textContent = room.title;
  $('tick2').style.left = (room.star2 / room.star3 * 100) + '%';
  buildGoals();
  renderHud();
  resize();
  now = last = performance.now();
  idle();
  if (!active) { active = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
}
function finish(result) {
  active = false;
  cancelAnimationFrame(raf);
  $('result').hidden = true;
  S.over = true;
  S.room.onDone(result);
}
function leave() {
  if (busy) { exitPending = true; return; }
  finish({ won: false, stars: 0, score: S.score, surrendered: true });
}

/* ---------- HUD ---------- */
function spriteHtml(color, size) {
  return `<img class="pic" src="${SPRITES[color].src}" width="${size}" height="${size}" alt="" draggable="false">`;
}
function starSvg(on) {
  return `<svg viewBox="0 0 24 24" fill="${on ? '#ffd34d' : '#e6dcde'}" aria-hidden="true"><path d="M12 2l3 6.6 7 .8-5.200 4.800 1.500 7L12 17.600 5.700 21.200l1.500-7L2 9.400l7-.8z"/></svg>`;
}
function buildGoals() {
  $('goals').innerHTML = Object.keys(S.goals).map(c =>
    `<div class="goal" id="goal${c}" aria-label="${COLORS[c].name}">${spriteHtml(c, 30)}<b></b></div>`).join('');
}
function renderHud(popped = []) {
  $('moves').textContent = S.moves;
  $('moves').classList.toggle('low', S.moves <= 3);
  $('score').textContent = S.score;
  $('fill').style.width = Math.min(100, S.score / S.cfg.star3 * 100) + '%';
  for (const c in S.goals) {
    const el = $('goal' + c);
    el.querySelector('b').textContent = S.goals[c] > 0 ? S.goals[c] : '✓';
    el.classList.toggle('done', S.goals[c] <= 0);
    if (popped.includes(c)) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }
}
function fly(color, c, r) {
  if (SPEED === 0 || reduced) return;
  const target = $('goal' + color);
  if (!target) return;
  const box = canvas.getBoundingClientRect(), to = target.getBoundingClientRect();
  const size = 30;
  const x0 = box.left + (c + .5) * cell - size / 2, y0 = box.top + (r + .5) * cell - size / 2;
  const el = document.createElement('div');
  el.className = 'flyer';
  el.innerHTML = spriteHtml(color, size);
  document.body.appendChild(el);
  el.animate([
    { transform: `translate(${x0}px,${y0}px) scale(1.3)` },
    { transform: `translate(${to.left}px,${to.top}px) scale(1)` },
  ], { duration: 460, easing: 'cubic-bezier(.5,0,.3,1)' }).finished.finally(() => el.remove());
}
function showResult(won) {
  const { room, score } = S;
  const stars = !won ? 0 : score >= room.star3 ? 3 : score >= room.star2 ? 2 : 1;
  $('resTitle').textContent = won ? room.winTitle : room.failTitle;
  $('stars').innerHTML = won ? [1, 2, 3].map(i => starSvg(i <= stars)).join('') : '';
  $('left').innerHTML = won ? '' : Object.keys(S.goals).filter(c => S.goals[c] > 0).map(c =>
    `<div class="goal">${spriteHtml(c, 44)}<b>${S.goals[c]}</b></div>`).join('');
  $('resText').textContent = won ? `Очки: ${score}. Монеты: +${room.rewardFor(stars)}` : room.failText;
  $('resBtn').textContent = 'Дальше';
  $('resBtn').onclick = () => finish({ won, stars, score });
  $('result').hidden = false;
  won ? sound.win() : sound.bad();
}

/* ---------- Effects ---------- */
function addFx(fx, delay) { fx.t0 = now + delay * SPEED; fx.life = 300; if (SPEED) fxList.push(fx); }
function burst(c, r, color) {
  if (reduced || SPEED === 0 || particles.length > 220) return;
  const hex = color >= 0 ? COLORS[color].hex : '#ffd34d';
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * 6.283, v = 2 + Math.random() * 4;
    particles.push({ x: c + .5, y: r + .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, hex, s: .05 + Math.random() * .07 });
  }
}

/* ---------- Render ---------- */
function spikes(c, n, outer, inner) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer, a = -Math.PI / 2 + i * Math.PI / n;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
}
// Draws one piece centered on the origin. Specials have no art yet, so they are drawn in code:
// line is the animal on a pink cross, bomb is the animal on a yellow burst, star is a star.
function drawPiece(c, kind, color, size) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = '#1c0a10';
  if (kind === 'star') {
    const g = c.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    ['#f0a030', '#f4b6a6', '#e8799a', '#7fb0d8', '#86a832'].forEach((h, i) => g.addColorStop(i / 4, h));
    spikes(c, 5, size * .52, size * .24);
    c.fillStyle = g; c.fill();
    c.lineWidth = Math.max(1.5, size * .045); c.stroke();
    return;
  }
  if (kind === 'line') {
    const arm = size * .42;
    for (const [w, h] of [[size * .3, '#1c0a10'], [size * .22, '#e8799a']]) {
      c.lineWidth = w; c.strokeStyle = h;
      c.beginPath(); c.moveTo(-arm, 0); c.lineTo(arm, 0); c.moveTo(0, -arm); c.lineTo(0, arm); c.stroke();
    }
  } else if (kind === 'bomb') {
    spikes(c, 10, size * .52, size * .36);
    c.fillStyle = '#ffd34d'; c.fill();
    c.strokeStyle = '#1c0a10'; c.lineWidth = Math.max(1.5, size * .04); c.stroke();
  }
  const s = size * (kind === 'gem' ? 1 : .72), im = SPRITES[color];
  if (im.complete && im.naturalWidth) {
    const w = s * im.naturalWidth / im.naturalHeight;
    c.drawImage(im, -w / 2, -s / 2, w, s);
  } else {
    c.fillStyle = COLORS[color].hex;
    c.beginPath(); c.arc(0, 0, s * .4, 0, 6.283); c.fill();
  }
}

function drawGem(g) {
  let sc = g.sc, rot = 0, hop = 0;
  if (g === selected) { rot = .16 * Math.sin(now / 80); sc *= 1.08; }
  else if (hint && (g === hint[0] || g === hint[1])) { rot = .12 * Math.sin(now / 120); sc *= 1 + .07 * Math.sin(now / 130); }
  else if (!reduced) {
    if (g.kind !== 'gem') rot = .07 * Math.sin(now / 380 + g.id);
    else if (!busy) {
      const d = (now - waveStart - (g.x + g.y) * 60) / 420;
      if (d > 0 && d < 1) hop = Math.sin(d * Math.PI) * .12;
    }
  }
  ctx.save();
  ctx.globalAlpha = g.a;
  ctx.translate((g.x + .5) * cell, (g.y + .5 - hop) * cell);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  drawPiece(ctx, g.kind, g.color, cell);
  ctx.restore();
}

function render(dt) {
  const w = canvas.width;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, w);
  ctx.save();
  if (shake > .3) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .86; }
  if (selected) {
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(selected.x * cell, selected.y * cell, cell, cell);
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, SIZE * cell, SIZE * cell); ctx.clip();
  for (const row of grid) for (const g of row) if (g) drawGem(g);
  ctx.restore();
  drawFx();
  drawParticles(dt);
  drawPopups();
  ctx.restore();
}

function drawFx() {
  ctx.save();
  fxList = fxList.filter(f => now < f.t0 + f.life);
  for (const f of fxList) {
    const t = (now - f.t0) / f.life;
    if (t < 0) continue;
    const a = 1 - t, full = SIZE * cell;
    if (f.type === 'beam') {
      const half = f.width === 3 ? 1.5 : .5, th = cell * half * 2 * (1 - t * .7);
      ctx.fillStyle = `rgba(255,240,245,${.85 * a})`;
      ctx.fillRect(0, (f.r + .5) * cell - th / 2, full, th);
      ctx.fillRect((f.c + .5) * cell - th / 2, 0, th, full);
    } else if (f.type === 'ring') {
      ctx.strokeStyle = `rgba(255,211,77,${a})`;
      ctx.lineWidth = cell * .4 * a + 1;
      ctx.beginPath(); ctx.arc((f.c + .5) * cell, (f.r + .5) * cell, f.radius * cell * easeOut(t), 0, 6.283); ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const k of f.targets) {
        const [r, c] = unkey(k);
        ctx.moveTo((f.c + .5) * cell, (f.r + .5) * cell);
        ctx.lineTo((c + .5) * cell, (r + .5) * cell);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawParticles(dt) {
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 9 * dt; p.life -= dt * 2.1;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.hex;
    const s = p.s * cell;
    ctx.fillRect(p.x * cell - s / 2, p.y * cell - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}
function drawPopups() {
  popups = popups.filter(p => now < p.t0 + p.life);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of popups) {
    const t = (now - p.t0) / p.life;
    const size = p.big ? cell * .62 : cell * .42;
    ctx.font = `700 ${size}px "Balsamiq Sans", "Comic Sans MS", sans-serif`;
    ctx.globalAlpha = t < .7 ? 1 : (1 - t) / .3;
    const x = p.x * cell, y = (p.y + (p.big ? .5 : .5)) * cell - t * cell * (p.big ? .3 : .8);
    ctx.lineWidth = size * .26; ctx.strokeStyle = '#fdf3f4'; ctx.lineJoin = 'round';
    ctx.strokeText(p.text, x, y);
    ctx.fillStyle = p.big ? '#a84f6c' : '#1c0a10';
    ctx.fillText(p.text, x, y);
  }
  ctx.globalAlpha = 1;
}

let last = now;
function loop(ts) {
  if (!active) return;
  now = ts;
  const dt = Math.min(.05, (ts - last) / 1000); last = ts;
  tweens.forEach(tw => {
    if (now < tw.t0) return;
    const t = Math.min(1, (now - tw.t0) / tw.ms);
    tw.fn(tw.ease(t));
    if (t >= 1) { tweens.delete(tw); tw.res(); }
  });
  if (!busy && !S.over) {
    if (now > hintAt && !hint) {
      const m = findMove();
      if (m) hint = [grid[m[0].r][m[0].c], grid[m[1].r][m[1].c]];
    }
    if (now > waveStart + 9000) waveStart = now;
  }
  render(dt);
  raf = requestAnimationFrame(loop);
}

function resize() {
  const box = $('stage').getBoundingClientRect();
  // tray shows board.png cropped to 1080x1350
  const k = Math.min(box.width / 1080, box.height / 1350);
  if (k <= 0) return;
  $('tray').style.setProperty('--k', k);
  const css = BOARD_PX * k;
  dpr = Math.min(3, window.devicePixelRatio || 1);
  cell = css / SIZE;
  canvas.style.width = canvas.style.height = css + 'px';
  canvas.width = canvas.height = Math.round(css * dpr);
}

/* ---------- Input ---------- */
let press = null;
function cellFromEvent(e) {
  const b = canvas.getBoundingClientRect();
  return { c: Math.floor((e.clientX - b.left) / cell), r: Math.floor((e.clientY - b.top) / cell) };
}
canvas.addEventListener('pointerdown', e => {
  sound.unlock();
  e.preventDefault();
  if (busy || S.over) return;
  const p = cellFromEvent(e);
  if (!inBoard(p.r, p.c)) return;
  canvas.setPointerCapture(e.pointerId);
  press = { ...p, x: e.clientX, y: e.clientY };
  hint = null; hintAt = now + 5500;
});
canvas.addEventListener('pointermove', e => {
  if (!press) return;
  const dx = e.clientX - press.x, dy = e.clientY - press.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * .3) return;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const to = { r: press.r + (horizontal ? 0 : Math.sign(dy)), c: press.c + (horizontal ? Math.sign(dx) : 0) };
  const from = { r: press.r, c: press.c };
  press = null;
  if (inBoard(to.r, to.c)) playTurn(from, to);
});
canvas.addEventListener('pointerup', () => {
  if (!press) return;
  const p = { r: press.r, c: press.c };
  press = null;
  const sel = selected;
  if (sel) {
    selected = null;
    if (Math.abs(sel.y - p.r) + Math.abs(sel.x - p.c) === 1) { playTurn({ r: sel.y, c: sel.x }, p); return; }
    if (sel === grid[p.r][p.c]) return;
  }
  selected = grid[p.r][p.c];
  sound.tick();
});
canvas.addEventListener('pointercancel', () => { press = null; });

$('btnExit').addEventListener('click', () => {
  sound.unlock();
  if (!S.over) S.room.onExit();
});
$('btnSound').addEventListener('click', () => {
  sound.unlock();
  sound.on = !sound.on;
  $('btnSound').setAttribute('aria-pressed', sound.on);
  try { localStorage.setItem('ogranka.sound', sound.on ? '1' : '0'); } catch (e) {}
});

/* ---------- Sound (synthesized) ---------- */
const sound = {
  ac: null, on: true,
  unlock() {
    if (!this.ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ac = new AC(); }
    if (this.ac && this.ac.state === 'suspended') this.ac.resume();
  },
  tone(f, dur, type = 'sine', vol = .12, when = 0) {
    if (!this.on || !this.ac || SPEED === 0) return;
    const t = this.ac.currentTime + when, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(this.ac.destination);
    o.start(t); o.stop(t + dur);
  },
  tick() { this.tone(1200, .04, 'triangle', .06); },
  swap() { this.tone(420, .07, 'triangle', .08); },
  bad() { this.tone(170, .16, 'sawtooth', .06); },
  match(combo) {
    const f = NOTES[Math.min(combo - 1, NOTES.length - 1)];
    this.tone(f, .22); this.tone(f * 1.5, .22, 'sine', .07, .05);
    this.buzz(12);
  },
  buzz(ms) {
    if (!this.ac || SPEED === 0) return; // ac exists only after the first tap
    try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {}
  },
  spawn() { this.tone(988, .12, 'triangle', .09); this.tone(1319, .2, 'triangle', .09, .08); },
  boom() {
    if (!this.on || !this.ac || SPEED === 0) return;
    const len = Math.floor(this.ac.sampleRate * .28), buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = .3;
    s.connect(f).connect(g).connect(this.ac.destination);
    s.start();
    this.buzz(30);
  },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .3, 'triangle', .1, i * .11)); },
};

/* ---------- Boot ---------- */
for (const [kind, color, text] of [
  ['line', 0, '4 в ряд: крест'],
  ['bomb', 2, 'Уголок: взрыв'],
  ['star', 0, '5 в ряд: звезда'],
]) {
  const row = document.createElement('div');
  row.className = 'leg';
  const cv = document.createElement('canvas'), size = 34, d = 3;
  cv.width = cv.height = size * d;
  cv.style.width = cv.style.height = size + 'px';
  const paint = () => {
    const c = cv.getContext('2d');
    c.setTransform(d, 0, 0, d, size * d / 2, size * d / 2);
    c.clearRect(-size, -size, size * 2, size * 2);
    drawPiece(c, kind, color, size * .94);
  };
  paint();
  SPRITES[color].addEventListener('load', paint);
  const label = document.createElement('span');
  label.textContent = text;
  row.append(cv, label);
  $('legend').appendChild(row);
}

try {
  sound.on = localStorage.getItem('ogranka.sound') !== '0';
  $('btnSound').setAttribute('aria-pressed', sound.on);
} catch (e) {}
new ResizeObserver(resize).observe($('stage'));

const Match3 = {
  start, leave, levelConfig,
  stop() { active = false; cancelAnimationFrame(raf); tweens.clear(); busy = false; $('result').hidden = true; },
  force(won) {
    if (!active) return;
    tweens.clear(); busy = false;
    finish({ won, stars: won ? 3 : 0, score: S.score });
  },
};

// Test hook for balance checks.
window.__ogranka = {
  get S() { return S; }, get grid() { return grid; }, get busy() { return busy; },
  findGroups, findMove, playTurn, start, levelConfig, swapGrid, isCombo,
  setSpeed(v) { SPEED = v; },
};
