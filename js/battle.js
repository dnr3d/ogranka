'use strict';
/* Card battle against the examiner. Rules live in Battle; the screen only reads them. */
const STARTER_DECK = ['answer', 'answer', 'answer', 'answer', 'answer', 'crib', 'crib', 'crib', 'crib', 'coffee'];
// bonus(lvl) adds the owner's relationship level to the effect
const CARDS = {
  answer:   { name: 'Ответ',              cost: 1, dmg: 6 },
  crib:     { name: 'Шпаргалка',          cost: 1, block: 5 },
  coffee:   { name: 'Кофе',               cost: 0, energy: 1, exhaust: true },
  essay:    { name: 'Развёрнутый ответ',  cost: 2, dmg: 14 },
  retell:   { name: 'Пересказ конспекта', cost: 1, dmg: 4, draw: 1 },
  confident:{ name: 'Уверенный тон',      cost: 1, block: 8 },
  stall:    { name: 'Тянуть время',       cost: 1, block: 3, weak: 4 },
  bluff:    { name: 'Блеф',               cost: 2, dmg: 8, block: 6 },
  breath:   { name: 'Глубокий вдох',      cost: 0, heal: 4, exhaust: true },
  c_emily:  { name: 'Совет Эмили',        cost: 1, draw: 2, owner: 'emily', bonus: 'block' },
  c_tyler:  { name: 'Поддержка Тайлера',  cost: 1, block: 6, owner: 'tyler', bonus: 'block' },
  c_chloe:  { name: 'Набросок Хлои',      cost: 1, dmg: 6, owner: 'chloe', bonus: 'dmg' },
};
const REWARD_POOL = ['essay', 'retell', 'confident', 'stall', 'bluff', 'breath', 'c_emily', 'c_tyler', 'c_chloe'];
const EXAMINER = {
  name: 'Профессор Морган', patience: 75,
  pattern: [
    { label: 'Каверзный вопрос', dmg: 11 },
    { label: 'Сложный билет', dmg: 8, block: 8 },
    { label: 'Строгий взгляд', dmg: 6, drain: 1 },
    { label: 'Дополнительный вопрос', dmg: 16 },
  ],
};
const FACTS = [
  'Пьёт только холодный кофе',
  'Сам когда-то пересдавал свой предмет',
  'Боится голубей',
  'Всегда спрашивает про 1987 год',
];
const FACT_CARD = { cost: 0, dmg: 8, exhaust: true };

function cardInfo(id, relLevel) {
  if (id.startsWith('fact:')) {
    const text = FACTS[Number(id.slice(5))];
    return { ...FACT_CARD, name: 'Факт', flavor: text };
  }
  const base = CARDS[id], c = { ...base };
  if (base.owner && base.bonus) c[base.bonus] = (c[base.bonus] || 0) + relLevel(base.owner) * 2;
  return c;
}
function cardText(c) {
  const parts = [];
  if (c.dmg) parts.push(`Урон ${c.dmg}`);
  if (c.block) parts.push(`Защита ${c.block}`);
  if (c.draw) parts.push(`Карты +${c.draw}`);
  if (c.energy) parts.push(`Энергия +${c.energy}`);
  if (c.weak) parts.push(`Следующий удар −${c.weak}`);
  if (c.heal) parts.push(`Уверенность +${c.heal}`);
  if (c.exhaust) parts.push('Один раз за бой');
  return parts.join('. ');
}

const Battle = {
  st: null, opts: null,
  // opts: { deck, facts, relLevel, week, onDone({ won, turns }), onExit }
  start(opts) {
    this.opts = opts;
    const scale = 1 + .15 * (opts.week - 1);
    const deck = [...opts.deck, ...opts.facts.map(i => 'fact:' + i)];
    this.st = {
      boss: { name: EXAMINER.name, hp: Math.round(EXAMINER.patience * scale), max: Math.round(EXAMINER.patience * scale), block: 0, step: 0, scale },
      hp: 40, maxHp: 40, block: 0, energy: 0, drain: 0, weak: 0, turn: 0,
      draw: this.shuffle(deck.map((id, n) => ({ id, n }))), hand: [], discard: [], over: false, log: 'Экзамен начался. Билет на столе.',
    };
    this.startTurn();
    this.render();
  },
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  intent() {
    const s = this.st, p = EXAMINER.pattern[s.boss.step % EXAMINER.pattern.length];
    return { ...p, dmg: Math.round(p.dmg * s.boss.scale), block: p.block ? Math.round(p.block * s.boss.scale) : 0 };
  },
  drawCards(n) {
    const s = this.st;
    for (let i = 0; i < n; i++) {
      if (!s.draw.length) { s.draw = this.shuffle(s.discard); s.discard = []; }
      if (!s.draw.length) return;
      s.hand.push(s.draw.pop());
    }
  },
  startTurn() {
    const s = this.st;
    s.turn++;
    s.block = 0;
    s.energy = Math.max(1, 3 - s.drain);
    s.drain = 0;
    this.drawCards(4);
  },
  info(id) { return cardInfo(id, this.opts.relLevel); },
  play(index) {
    const s = this.st, card = s.hand[index];
    if (!card || s.over) return false;
    const c = this.info(card.id);
    if (c.cost > s.energy) return false;
    s.energy -= c.cost;
    s.hand.splice(index, 1);
    if (!c.exhaust) s.discard.push(card);
    if (c.dmg) {
      const hit = Math.max(0, c.dmg - s.boss.block);
      s.boss.block = Math.max(0, s.boss.block - c.dmg);
      s.boss.hp = Math.max(0, s.boss.hp - hit);
    }
    if (c.block) s.block += c.block;
    if (c.energy) s.energy += c.energy;
    if (c.weak) s.weak += c.weak;
    if (c.heal) s.hp = Math.min(s.maxHp, s.hp + c.heal);
    if (c.draw) this.drawCards(c.draw);
    s.log = c.flavor ? `Вы вспомнили: ${c.flavor.toLowerCase()}.` : `${c.name}: ${cardText(c).toLowerCase()}.`;
    sound.swap();
    if (s.boss.hp <= 0) this.finish(true);
    return true;
  },
  endTurn() {
    const s = this.st;
    if (s.over) return;
    s.discard.push(...s.hand);
    s.hand = [];
    s.boss.block = 0;
    const it = this.intent();
    if (it.block) s.boss.block = it.block;
    if (it.drain) s.drain = it.drain;
    const dmg = Math.max(0, it.dmg - s.weak);
    s.weak = 0;
    const hit = Math.max(0, dmg - s.block);
    s.block = Math.max(0, s.block - dmg);
    s.hp = Math.max(0, s.hp - hit);
    s.boss.step++;
    s.log = `${it.label}: ${hit ? `минус ${hit} уверенности` : 'вы удержались'}.`;
    if (hit) sound.bad();
    if (s.hp <= 0) return this.finish(false);
    this.startTurn();
  },
  finish(won) {
    const s = this.st;
    s.over = true;
    won ? sound.win() : sound.bad();
    this.opts.onDone({ won, turns: s.turn });
  },
  force(won) { if (this.st && !this.st.over) this.finish(won); },
  render() {
    const s = this.st, it = this.intent(), el = $('battle');
    const bar = (cur, max, cls) => `<div class="meter ${cls}"><i style="width:${cur / max * 100}%"></i><span>${cur} / ${max}</span></div>`;
    const intentParts = [];
    if (it.dmg) intentParts.push(`удар ${it.dmg}`);
    if (it.block) intentParts.push(`защита ${it.block}`);
    if (it.drain) intentParts.push(`энергия −${it.drain}`);
    el.innerHTML = `<header class="bar"><div class="grow"><h1>Экзамен</h1><div class="sub">Ход ${s.turn}</div></div>
        <button class="icon" data-battle="exit" aria-label="Сдаться">${icon('door')}</button></header>
      <div class="padded battleBody">
        <div class="bossBox"><div class="stub bossArt">Портрет: ${s.boss.name}</div>
          <div class="grow bossInfo"><b>${s.boss.name}</b>
            <span class="label">Терпение${s.boss.block ? ` · защита ${s.boss.block}` : ''}</span>${bar(s.boss.hp, s.boss.max, 'boss')}
            <span class="intent"><b>${it.label}</b>: ${intentParts.join(', ')}</span></div></div>
        <p class="log" role="status">${s.log}</p>
        <div class="me"><span class="label">Уверенность${s.block ? ` · защита ${s.block}` : ''}${s.weak ? ` · следующий удар −${s.weak}` : ''}</span>${bar(s.hp, s.maxHp, 'mine')}
          <div class="piles"><span class="energy">${s.energy}</span><span class="label">энергия</span><span class="label grow" style="text-align:right">В колоде ${s.draw.length} · Сброс ${s.discard.length}</span></div></div>
        <div class="hand">${s.hand.map((card, i) => {
          const c = this.info(card.id);
          return `<button class="card" data-battle="play" data-i="${i}"${c.cost > s.energy ? ' disabled' : ''}><span class="cost">${c.cost}</span><b>${c.name}</b><small>${c.flavor ? c.flavor + '. ' : ''}${cardText(c)}</small></button>`;
        }).join('')}</div>
        <button class="cta" data-battle="end">Закончить ход</button>
      </div>`;
  },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-battle]');
  if (!b || b.disabled || !Battle.st) return;
  sound.unlock();
  const a = b.dataset.battle;
  if (a === 'exit') return Battle.opts.onExit();
  if (Battle.st.over) return;
  if (a === 'play') Battle.play(Number(b.dataset.i));
  if (a === 'end') Battle.endTurn();
  if (!Battle.st.over) Battle.render();
});
