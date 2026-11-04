'use strict';
/* Shared canvas, loop, tiles and result card for the block mini-games. */
const TILE_FILL = ['#ffd9a3', '#c9c1dc', '#d6e6a8', '#fde0d6', '#e3d6bd'];
const Mini = {
  canvas: $('miniCanvas'), ctx: $('miniCanvas').getContext('2d'),
  w: 300, h: 300, dpr: 1, game: null, raf: 0, last: 0,
  start(game) {
    this.stop();
    this.game = game;
    this.resize();
    this.last = performance.now();
    const loop = ts => {
      if (this.game !== game) return;
      const dt = Math.min(.1, (ts - this.last) / 1000); this.last = ts;
      game.update(dt);
      if (this.game !== game) return;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.clearRect(0, 0, this.w, this.h);
      game.draw(this.ctx);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); this.game = null; $('result').hidden = true; },
  resize() {
    const box = $('miniStage').getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.w = box.width; this.h = box.height;
    this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    if (this.game && this.game.layout) this.game.layout();
  },
  hud(title, goal, statValue, statLabel) {
    $('miniTitle').textContent = title;
    $('miniGoal').textContent = goal;
    $('miniStat').textContent = statValue;
    $('miniStatLabel').textContent = statLabel;
  },
  point(e) {
    const b = this.canvas.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  },
  tile(c, x, y, s, color, alpha = 1) {
    c.save();
    c.globalAlpha = alpha;
    const r = s * .16;
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + s, y, x + s, y + s, r); c.arcTo(x + s, y + s, x, y + s, r);
    c.arcTo(x, y + s, x, y, r); c.arcTo(x, y, x + s, y, r); c.closePath();
    c.fillStyle = TILE_FILL[color]; c.fill();
    c.strokeStyle = '#1c0a10'; c.lineWidth = Math.max(1, s * .05); c.stroke();
    const im = SPRITES[color];
    if (im.complete && im.naturalWidth) c.drawImage(im, x + s * .08, y + s * .08, s * .84, s * .84);
    c.restore();
  },
  finish(room, won, score, leftText) {
    const stars = !won ? 0 : score >= room.star3 ? 3 : score >= room.star2 ? 2 : 1;
    $('resTitle').textContent = won ? room.winTitle : room.failTitle;
    $('stars').innerHTML = won ? [1, 2, 3].map(i => starSvg(i <= stars)).join('') : '';
    $('left').innerHTML = '';
    $('resText').textContent = won ? `Очки: ${score}. Монеты: +${room.rewardFor(stars)}` : `${leftText} ${room.failText}`;
    $('resBtn').textContent = 'Дальше';
    $('resBtn').onclick = () => { $('result').hidden = true; this.stop(); room.onDone({ won, stars, score }); };
    $('result').hidden = false;
    won ? sound.win() : sound.bad();
  },
};
new ResizeObserver(() => Mini.resize()).observe($('miniStage'));
for (const [type, fn] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'], ['pointercancel', 'up']]) {
  Mini.canvas.addEventListener(type, e => {
    if (!Mini.game || !Mini.game[fn]) return;
    if (type === 'pointerdown') { sound.unlock(); Mini.canvas.setPointerCapture(e.pointerId); }
    e.preventDefault();
    Mini.game[fn](Mini.point(e));
  });
}
$('miniExit').addEventListener('click', () => {
  sound.unlock();
  if (Mini.game && Mini.game.room && !Mini.game.over) Mini.game.room.onExit();
});
