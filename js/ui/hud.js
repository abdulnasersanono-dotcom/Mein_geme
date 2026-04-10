/* ═══════════════════════════════════════════════════════════════
   HUD — refreshes the top bar, left player panel, toasts, event log
   يعتمد على: state.js, board-data.js, fx/effects.js
═══════════════════════════════════════════════════════════════ */
'use strict';

/** Refresh the top-bar stats (money shown = first human player's balance) */
function refreshTopBar(){
  const p     = G.players[G.turn]; if(!p) return;
  const myIdx = G.players.findIndex(pp => !pp.isBot && !pp.isBankrupt);
  const me    = G.players[Math.max(0, myIdx)];
  targMoney   = me ? me.money : 1500;
  document.getElementById('moneyVal').textContent = Math.round(targMoney).toLocaleString('en');
}

/** Rebuild the left panel with all players */
function refreshOpponentPanels(){
  const panel = document.getElementById('leftPanel');
  if(!panel || !G.players.length) return;
  panel.innerHTML = '';
  G.players.forEach((p, i) => {
    const isActive = G.turn === i && G.phase !== 'setup';
    const pct      = Math.max(3, Math.min(100, p.money / 20));
    const propDots = p.props.map(sqIdx => {
      const sq = BOARD_DATA[sqIdx];
      return sq?.col ? `<div class="prDotProp" style="background:${sq.col}"></div>` : '';
    }).join('');
    const jailBadge = p.jailTurns > 0 ? `<div class="prJailBadge">⛓${p.jailTurns}</div>` : '';
    const row       = document.createElement('div');
    row.className   = 'playerRow'
      + (isActive      ? ' active'   : '')
      + (p.isBankrupt  ? ' bankrupt' : '')
      + (p.jailTurns>0 ? ' jailed'   : '');
    row.innerHTML = `
      <div class="prAvatar">${p.emoji}<div class="prDot"></div></div>
      <div class="prInfo">
        <div class="prName">${p.name}${p.isBot ? ' 🤖' : ''}</div>
        <div class="prMoney">${p.money.toLocaleString('en')} <span class="prMoneyLabel">din</span></div>
        <div class="prBar"><div class="prBarFill" style="width:${pct}%"></div></div>
        <div class="prProps">${propDots}</div>
      </div>
      ${jailBadge}`;
    panel.appendChild(row);
  });
}

/** Update the turn pill with current player */
function updateTurnPill(p){
  const el = document.getElementById('turnPill');
  el.textContent        = `${p.emoji} ${p.name} — دورك`;
  el.style.borderColor  = p.color;
  el.style.color        = p.color;
}

/** Enable or disable the dice button */
function enableDiceBtn(on){
  const b  = document.getElementById('diceBtnFace');
  const db = document.getElementById('diceBtn');
  b.style.pointerEvents = on ? 'auto' : 'none';
  b.style.opacity       = on ? '1' : '0.5';
  db.classList.toggle('pulse', on);
}

/** Show a floating toast message */
function toast(msg, dur = 1800){
  const d = document.createElement('div');
  d.className  = 'gameToast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add('show'), 10);
  setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 400); }, dur);
  pushEventLog(msg);
}

/* ── Event log ticker ──────────────────────────────────────── */
const eventQueue = [];

function pushEventLog(msg){
  eventQueue.push(msg);
  const ticker = document.getElementById('eventTicker');
  if(!ticker) return;
  const combined = eventQueue.slice(-8).join('   ✦   ');
  ticker.textContent = combined + '          ' + combined;
  ticker.style.animation = 'none';
  void ticker.offsetWidth;
  ticker.style.animation = 'tickerScroll 20s linear infinite';
}
