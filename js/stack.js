'use strict';
/* Falling blocks: clear the target number of lines before the stack reaches the top.
   room: { title, lines, gravity (ms per row), garbage, star2, star3, winTitle, failTitle, failText, rewardFor, onDone, onExit } */
const Stack = (() => {
  const W = 10, H = 18;
  const PIECES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
  ];
  const rotate = m => m[0].map((_, c) => m.map(row => row[c]).reverse());
  const game = {
    room: null, over: false, grid: [], cur: null, next: null, bag: [], lines: 0, score: 0, t: 0, flash: 0, press: null,
    cell: 20, ox: 0, oy: 0,

    start(room) {
      Object.assign(this, { room, over: false, lines: 0, score: 0, t: 0, flash: 0, press: null, bag: [] });
      this.grid = Array.from({ length: H }, () => Array(W).fill(null));
      for (let i = 0; i < (room.garbage || 0); i++) {
        const hole = Math.floor(Math.random() * W);
        this.grid[H - 1 - i] = Array.from({ length: W }, (_, c) => c === hole ? null : Math.floor(Math.random() * TILE_FILL.length));
      }
      this.next = this.draw1();
      this.spawn();
      $('miniControls').innerHTML = `<div class="pad">
        <button class="padBtn" data-stack="left" aria-label="Влево">←</button>
        <button class="padBtn" data-stack="rotate" aria-label="Повернуть">⟳</button>
        <button class="padBtn" data-stack="drop" aria-label="Сбросить вниз">↓</button>
        <button class="padBtn" data-stack="right" aria-label="Вправо">→</button></div>`;
      this.hud();
      Mini.start(this);
    },
    hud() { Mini.hud(this.room.title, `Цель: ${this.room.lines} линий · Очки: ${this.score}`, this.lines, 'линии'); },
    layout() {
      this.cell = Math.min(Mini.w / (W + 4.4), Mini.h / H);
      this.ox = (Mini.w - this.cell * (W + 4.4)) / 2;
      this.oy = (Mini.h - this.cell * H) / 2;
    },
    draw1() {
      if (!this.bag.length) {
        this.bag = PIECES.map((_, i) => i);
        for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; }
      }
      const i = this.bag.pop();
      return { m: PIECES[i], color: i % TILE_FILL.length };
    },
    fits(m, r, c) {
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const ry = r + y, cx = c + x;
        if (cx < 0 || cx >= W || ry >= H) return false;
        if (ry >= 0 && this.grid[ry][cx] !== null) return false;
      }
      return true;
    },
    spawn() {
      const p = this.next;
      this.next = this.draw1();
      this.cur = { m: p.m, color: p.color, r: 0, c: Math.floor((W - p.m[0].length) / 2) };
      if (!this.fits(this.cur.m, this.cur.r, this.cur.c)) this.end(false, 'Блоки дошли до верха.');
    },
    moveX(d) { if (!this.over && this.fits(this.cur.m, this.cur.r, this.cur.c + d)) { this.cur.c += d; return true; } return false; },
    rotate() {
      if (this.over) return;
      const m = rotate(this.cur.m);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (this.fits(m, this.cur.r, this.cur.c + kick)) { this.cur.m = m; this.cur.c += kick; sound.tick(); return; }
      }
    },
    ghostRow() {
      let r = this.cur.r;
      while (this.fits(this.cur.m, r + 1, this.cur.c)) r++;
      return r;
    },
    hardDrop() {
      if (this.over) return;
      const r = this.ghostRow();
      this.score += (r - this.cur.r) * 2;
      this.cur.r = r;
      this.lock();
    },
    lock() {
      const { m, r, c, color } = this.cur;
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] && r + y >= 0) this.grid[r + y][c + x] = color;
      }
      const kept = this.grid.filter(row => row.some(v => v === null));
      const n = H - kept.length;
      if (n) {
        while (kept.length < H) kept.unshift(Array(W).fill(null));
        this.grid = kept;
        this.lines += n;
        this.score += [0, 100, 300, 500, 800][n];
        this.flash = 1;
        sound.match(n);
      } else sound.swap();
      this.hud();
      if (this.lines >= this.room.lines) return this.end(true);
      this.spawn();
    },
    end(won, why) {
      this.over = true;
      Mini.finish(this.room, won, this.score, why);
    },
    force(won) { this.over = true; const room = this.room; Mini.stop(); room.onDone({ won, stars: won ? 3 : 0, score: this.score }); },
    update(dt) {
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
      if (this.over) return;
      this.t += dt * 1000;
      if (this.t >= this.room.gravity) {
        this.t = 0;
        if (this.fits(this.cur.m, this.cur.r + 1, this.cur.c)) this.cur.r++;
        else this.lock();
      }
    },
    down(p) { this.press = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }; },
    move(p) {
      const pr = this.press;
      if (!pr || this.over) return;
      while (p.x - pr.x > this.cell) { this.moveX(1); pr.x += this.cell; pr.moved = true; }
      while (pr.x - p.x > this.cell) { this.moveX(-1); pr.x -= this.cell; pr.moved = true; }
      if (p.y - pr.sy > this.cell * 3 && !pr.moved) { pr.moved = true; this.press = null; this.hardDrop(); }
    },
    up() {
      const pr = this.press;
      this.press = null;
      if (pr && !pr.moved) this.rotate();
    },
    draw(c) {
      const s = this.cell, x0 = this.ox, y0 = this.oy;
      c.fillStyle = this.flash > 0 ? `rgb(${122 + 133 * this.flash},${135 + 120 * this.flash},${150 + 105 * this.flash})` : '#7a8796';
      c.fillRect(x0, y0, W * s, H * s);
      c.strokeStyle = 'rgba(28,10,16,.25)'; c.lineWidth = 1;
      for (let i = 1; i < W; i++) { c.beginPath(); c.moveTo(x0 + i * s, y0); c.lineTo(x0 + i * s, y0 + H * s); c.stroke(); }
      for (let i = 1; i < H; i++) { c.beginPath(); c.moveTo(x0, y0 + i * s); c.lineTo(x0 + W * s, y0 + i * s); c.stroke(); }
      c.strokeStyle = '#1c0a10'; c.lineWidth = 3; c.strokeRect(x0, y0, W * s, H * s);
      for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) {
        if (this.grid[r][col] !== null) Mini.tile(c, x0 + col * s, y0 + r * s, s, this.grid[r][col]);
      }
      if (!this.over) {
        const { m, r, c: cc, color } = this.cur, g = this.ghostRow();
        for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
          if (!m[y][x]) continue;
          if (g + y >= 0) Mini.tile(c, x0 + (cc + x) * s, y0 + (g + y) * s, s, color, .25);
          if (r + y >= 0) Mini.tile(c, x0 + (cc + x) * s, y0 + (r + y) * s, s, color);
        }
      }
      const nx = x0 + W * s + s * .6, ns = s * .85;
      c.fillStyle = '#6d5a61'; c.font = `${Math.max(11, s * .6)}px "Balsamiq Sans", sans-serif`; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText('Дальше', nx, y0);
      const m = this.next.m;
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
        if (m[y][x]) Mini.tile(c, nx + x * ns, y0 + s * 1.2 + y * ns, ns, this.next.color);
      }
    },
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-stack]');
    if (!b || !Mini.game || Mini.game !== game) return;
    sound.unlock();
    const a = b.dataset.stack;
    if (a === 'left') game.moveX(-1);
    if (a === 'right') game.moveX(1);
    if (a === 'rotate') game.rotate();
    if (a === 'drop') game.hardDrop();
  });
  return game;
})();
