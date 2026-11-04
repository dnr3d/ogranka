'use strict';
/* Block puzzle: drag pieces from the tray onto the board, full rows and columns clear.
   room: { title, lines, pieces, junk, star2, star3, winTitle, failTitle, failText, rewardFor, onDone, onExit } */
const Blocks = (() => {
  const N = 8;
  const SHAPES = [
    [[0, 0]],
    [[0, 0], [0, 1]], [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [0, 2], [1, 0]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
  ];
  const fresh = () => ({ shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], color: Math.floor(Math.random() * TILE_FILL.length) });
  const game = {
    room: null, over: false, grid: [], tray: [], lines: 0, score: 0, left: 0, drag: null, flashes: [],
    cell: 30, ox: 0, oy: 0, trayY: 0,

    start(room) {
      Object.assign(this, { room, over: false, lines: 0, score: 0, left: room.pieces, drag: null, flashes: [] });
      this.grid = Array.from({ length: N }, () => Array(N).fill(null));
      for (let i = 0; i < (room.junk || 0); i++) {
        const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
        this.grid[r][c] = Math.floor(Math.random() * TILE_FILL.length);
      }
      this.tray = [];
      this.deal();
      $('miniControls').innerHTML = '<p class="note">Перетащите фигуру на поле. Заполните ряд или столбец, чтобы убрать его.</p>';
      this.hud();
      Mini.start(this);
    },
    hud() { Mini.hud(this.room.title, `Линии: ${this.lines} из ${this.room.lines} · Очки: ${this.score}`, this.left, 'фигуры'); },
    layout() {
      const trayRows = 3.8;
      this.cell = Math.min(Mini.w / N, Mini.h / (N + trayRows));
      this.ox = (Mini.w - this.cell * N) / 2;
      this.oy = 0;
      this.trayY = this.cell * N + this.cell * .3;
    },
    canPlace(shape, r, c) {
      return shape.every(([dr, dc]) => r + dr >= 0 && c + dc >= 0 && r + dr < N && c + dc < N && this.grid[r + dr][c + dc] === null);
    },
    fits(shape) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.canPlace(shape, r, c)) return true;
      return false;
    },
    deal() {
      this.tray = [];
      for (let i = 0; i < 3; i++) {
        let p = fresh();
        // the first piece of a hand always fits, so a new hand never ends the game by itself
        for (let tries = 0; i === 0 && tries < 30 && !this.fits(p.shape); tries++) p = fresh();
        this.tray.push(p);
      }
    },
    place(i, r, c) {
      const p = this.tray[i];
      if (this.over || !p || !this.canPlace(p.shape, r, c)) return false;
      for (const [dr, dc] of p.shape) this.grid[r + dr][c + dc] = p.color;
      this.score += p.shape.length * 10;
      this.tray[i] = null;
      this.left--;
      this.clearLines();
      if (this.tray.every(x => !x)) this.deal();
      sound.swap();
      this.hud();
      this.check();
      return true;
    },
    clearLines() {
      const rows = [], cols = [];
      for (let i = 0; i < N; i++) {
        if (this.grid[i].every(v => v !== null)) rows.push(i);
        if (this.grid.every(row => row[i] !== null)) cols.push(i);
      }
      const n = rows.length + cols.length;
      if (!n) return;
      const wipe = (r, c) => {
        if (this.grid[r][c] !== null) this.flashes.push({ r, c, color: this.grid[r][c], t: 0 });
        this.grid[r][c] = null;
      };
      rows.forEach(r => { for (let c = 0; c < N; c++) wipe(r, c); });
      cols.forEach(c => { for (let r = 0; r < N; r++) wipe(r, c); });
      this.lines += n;
      this.score += 100 * n * n;
      sound.match(n);
    },
    check() {
      if (this.lines >= this.room.lines) return this.end(true);
      const live = this.tray.filter(Boolean);
      if (this.left <= 0) return this.end(false, 'Фигуры закончились.');
      if (!live.some(p => this.fits(p.shape))) this.end(false, 'Фигуры больше не помещаются.');
    },
    end(won, why) {
      this.over = true;
      this.drag = null;
      if (won) { this.score += this.left * 20; this.hud(); }
      Mini.finish(this.room, won, this.score, why);
    },
    force(won) { this.over = true; const room = this.room; Mini.stop(); room.onDone({ won, stars: won ? 3 : 0, score: this.score }); },
    update(dt) {
      for (const f of this.flashes) f.t += dt * 3.5;
      this.flashes = this.flashes.filter(f => f.t < 1);
    },
    slotBox(i) {
      const w = Mini.w / 3;
      return { x: i * w, y: this.trayY, w, h: Mini.h - this.trayY };
    },
    down(p) {
      if (this.over) return;
      for (let i = 0; i < 3; i++) {
        const b = this.slotBox(i);
        if (this.tray[i] && p.x >= b.x && p.x < b.x + b.w && p.y >= b.y - 10) { this.drag = { i, x: p.x, y: p.y }; return; }
      }
    },
    move(p) { if (this.drag) { this.drag.x = p.x; this.drag.y = p.y; } },
    target() {
      const d = this.drag, sh = this.tray[d.i].shape;
      const rows = Math.max(...sh.map(s => s[0])) + 1, cols = Math.max(...sh.map(s => s[1])) + 1;
      // the piece floats above the finger so it stays visible
      const x = d.x - cols * this.cell / 2, y = d.y - rows * this.cell - this.cell * .9;
      return { x, y, r: Math.round((y - this.oy) / this.cell), c: Math.round((x - this.ox) / this.cell) };
    },
    up() {
      if (!this.drag) return;
      const t = this.target(), i = this.drag.i;
      this.drag = null;
      if (!this.place(i, t.r, t.c)) sound.tick();
    },
    draw(c) {
      const s = this.cell;
      for (let r = 0; r < N; r++) for (let col = 0; col < N; col++) {
        c.fillStyle = (r + col) % 2 ? '#7a8796' : '#a4b4c6';
        c.fillRect(this.ox + col * s, this.oy + r * s, s, s);
      }
      c.strokeStyle = '#1c0a10'; c.lineWidth = 3;
      c.strokeRect(this.ox + 1.5, this.oy + 1.5, s * N - 3, s * N - 3);
      for (let r = 0; r < N; r++) for (let col = 0; col < N; col++) {
        if (this.grid[r][col] !== null) Mini.tile(c, this.ox + col * s, this.oy + r * s, s, this.grid[r][col]);
      }
      for (const f of this.flashes) Mini.tile(c, this.ox + f.c * s, this.oy + f.r * s, s, f.color, 1 - f.t);
      const ts = Math.min(s * .62, Mini.w / 3 / 5.4);
      this.tray.forEach((p, i) => {
        if (!p || (this.drag && this.drag.i === i)) return;
        const b = this.slotBox(i), sh = p.shape;
        const rows = Math.max(...sh.map(v => v[0])) + 1, cols = Math.max(...sh.map(v => v[1])) + 1;
        const x0 = b.x + (b.w - cols * ts) / 2, y0 = b.y + (b.h - rows * ts) / 2;
        for (const [dr, dc] of sh) Mini.tile(c, x0 + dc * ts, y0 + dr * ts, ts, p.color);
      });
      if (this.drag) {
        const t = this.target(), p = this.tray[this.drag.i];
        if (this.canPlace(p.shape, t.r, t.c)) {
          c.fillStyle = 'rgba(255,255,255,.65)';
          for (const [dr, dc] of p.shape) c.fillRect(this.ox + (t.c + dc) * s, this.oy + (t.r + dr) * s, s, s);
        }
        for (const [dr, dc] of p.shape) Mini.tile(c, t.x + dc * s, t.y + dr * s, s, p.color, .92);
      }
    },
  };
  return game;
})();
