/* ═══════════════════════════════════════════════════════════════
   GAME INIT & TOKENS — initialise a new game, create SVG tokens
   يعتمد على: state.js, board-data.js, hud.js, turn.js
═══════════════════════════════════════════════════════════════ */
'use strict';

/** Initialise game with an array of player objects */
function initGame(players){
  G.players      = players;
  G.turn         = 0;
  G.phase        = 'playing';
  G.props        = {};
  G.doublesCount = 0;
  G.bankMoney    = 20580;
  createTokens();
  refreshOpponentPanels();
  refreshTopBar();
  startTurn(0);
}

/** Create one SVG text-element token per player */
function createTokens(){
  const svg = document.getElementById('boardSvg');
  svg.querySelectorAll('.gToken').forEach(e => e.remove());
  G.players.forEach((p, i) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg','text');
    g.setAttribute('class','gToken');
    g.setAttribute('id',`tok${i}`);
    g.setAttribute('font-size','18');
    g.setAttribute('text-anchor','middle');
    g.setAttribute('dominant-baseline','middle');
    g.setAttribute('filter','url(#glow)');
    g.setAttribute('style',
      'pointer-events:none;transition:x .4s cubic-bezier(.34,1.2,.64,1),y .4s cubic-bezier(.34,1.2,.64,1)');
    g.textContent = p.emoji;
    placeToken(g, 0, i);
    svg.appendChild(g);
  });
}

/** Position a token SVG element on the given square index */
function placeToken(el, sqIdx, playerIdx){
  const pos = SQ_CENTERS_GAME[sqIdx % 40];
  const offsets = [
    {dx:0,dy:0},{dx:12,dy:0},{dx:0,dy:12},
    {dx:-12,dy:0},{dx:0,dy:-12},{dx:8,dy:8},
  ];
  const off = offsets[playerIdx % 6];
  el.setAttribute('x', pos.x + off.dx);
  el.setAttribute('y', pos.y + off.dy);
}

/** Animate a player's token to move to a new square */
function moveTokenAnim(playerIdx, toSq){
  const el = document.getElementById(`tok${playerIdx}`);
  if(el) placeToken(el, toSq, playerIdx);
}
