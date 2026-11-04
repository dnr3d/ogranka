'use strict';
/* Test panel: launch any part of the game directly and edit saved progress. Remove before release. */
let adminHard = false;
function adminRoom(game) {
  stopCurrent();
  launchRoom(game, roomConfig(game, adminHard), `Тест: ${GAMES[game].name}`, {
    failText: 'Это тестовый запуск.',
    onDone(res) { adminBack(`${GAMES[game].name}: ${res.won ? 'победа' : 'поражение'}, звёзды ${res.stars}`); },
  });
}
function adminBack(text) {
  currentGame = null;
  run = null;
  renderHub();
  show('hub');
  toast(text);
}
function renderAdmin() {
  const canForce = !$('app').hidden || !$('mini').hidden || !$('battle').hidden;
  $('adminBody').innerHTML = `
    <h3 class="title3">Запустить</h3>
    <label class="adminCheck"><input type="checkbox" id="adminHard"${adminHard ? ' checked' : ''}> Условия зачётной недели</label>
    <div class="adminGrid">
      <button class="adm" data-admin="room" data-game="match3">Три в ряд</button>
      <button class="adm" data-admin="room" data-game="blocks">Блок-пазл</button>
      <button class="adm" data-admin="room" data-game="stack">Падающие блоки</button>
      <button class="adm" data-admin="battle">Карточный бой</button>
      <button class="adm" data-admin="run" data-kind="class">Учебный день</button>
      <button class="adm" data-admin="run" data-kind="finals">Зачётная неделя</button>
      <button class="adm" data-admin="cards">Выбор карт</button>
      <button class="adm" data-admin="hub">На кампус</button>
    </div>
    <h3 class="title3">Текущая партия</h3>
    <div class="adminGrid">
      <button class="adm" data-admin="force" data-won="1"${canForce ? '' : ' disabled'}>Выиграть</button>
      <button class="adm" data-admin="force" data-won="0"${canForce ? '' : ' disabled'}>Проиграть</button>
    </div>
    <h3 class="title3">Прогресс</h3>
    <p class="note">Цикл ${meta.cycle}, день ${meta.day + 1} из ${CALENDAR.length}, монеты ${meta.coins}, карт ${meta.deck.length}, фактов ${meta.facts.length}</p>
    <div class="adminGrid">
      <button class="adm" data-admin="coins">+500 монет</button>
      <button class="adm" data-admin="day">Следующий день</button>
      <button class="adm" data-admin="rel">+1 уровень всем</button>
      <button class="adm" data-admin="facts">Все факты</button>
      <button class="adm" data-admin="allcards">Все карты в колоду</button>
      <button class="adm" data-admin="reset">Сбросить всё</button>
    </div>`;
}
const ADMIN = {
  room(d) { adminRoom(d.game); },
  battle() {
    stopCurrent();
    startBattle(res => adminBack(`Бой: ${res.won ? 'победа' : 'поражение'}, ход ${res.turns}`));
  },
  run(d) { startRun(d.kind); },
  cards() { stopCurrent(); run = null; meta.pendingCards = 1; openRewards(); },
  hub() { stopCurrent(); adminBack('Кампус'); },
  force(d) {
    if (!forceCurrent(d.won === '1')) toast('Сейчас нет партии');
  },
  coins() { meta.coins += 500; saveMeta(); },
  day() { meta.day = (meta.day + 1) % CALENDAR.length; if (CALENDAR[meta.day] === 'finals') meta.pendingCards = 0; saveMeta(); },
  rel() { PLAYABLE.forEach(c => addRel(c.id, POINTS_PER_LEVEL)); },
  facts() { meta.facts = FACTS.map((_, i) => i); saveMeta(); },
  allcards() { meta.deck.push(...REWARD_POOL.filter(id => !meta.deck.includes(id))); saveMeta(); },
  reset() { meta = metaDefault(); saveMeta(); stopCurrent(); adminBack('Прогресс сброшен'); },
};
const CLOSES_PANEL = new Set(['room', 'battle', 'run', 'cards', 'hub', 'force', 'reset']);
$('adminBtn').addEventListener('click', () => { renderAdmin(); $('admin').hidden = false; });
$('adminClose').addEventListener('click', () => { $('admin').hidden = true; });
document.addEventListener('change', e => { if (e.target.id === 'adminHard') adminHard = e.target.checked; });
$('adminBody').addEventListener('click', e => {
  const b = e.target.closest('[data-admin]');
  if (!b || b.disabled) return;
  sound.unlock();
  ADMIN[b.dataset.admin](b.dataset);
  if (CLOSES_PANEL.has(b.dataset.admin)) $('admin').hidden = true;
  else { renderAdmin(); if (!$('hub').hidden) renderHub(); }
});
window.__meta = { get meta() { return meta; }, get run() { return run; }, findNode, ACTIONS, ADMIN, Battle, Blocks, Stack, forceCurrent };
