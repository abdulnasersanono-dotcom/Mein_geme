// ═══════════════════════════════════════════════
// MONOPOLY GAME ENGINE - Core Logic
// Game state, turns, dice, property handling, modals
// ═══════════════════════════════════════════════

let G = {
  players: [],
  turn: 0,
  phase: 'setup',
  props: {},
  doublesCount: 0,
  auctionSq: -1,
  auctionBids: {},
  auctionTimer: null,
  tradeOffer: null,
  bankMoney: 20580,
};

const PLAYER_COLORS = ['#FF4040','#4080FF','#40CC40','#FFD060','#FF80FF','#40DDDD'];
const PLAYER_EMOJIS = ['🐪','👑','⚔️','📚','⚓','💃'];

// Init game from nav.state
export function initGame(navState) {
  const playerCount = navState.playerCount || 2;
  const startingMoney = navState.startingMoney || 1500;
  
  G.players = [];
  for(let i = 0; i < playerCount; i++) {
    G.players.push({
      name: navState[`playerName${i}`] || `لاعب ${i+1}`,
      emoji: PLAYER_EMOJIS[i],
      color: PLAYER_COLORS[i],
      money: startingMoney,
      sq: 0,
      props: [],
      houses: 0,
      jailTurns: 0,
      isBot: i > 0, // Player 0 human, others bots
      isBankrupt: false,
      skipTurn: false,
      taxFree: false,
      active: true,
    });
  }
  
  G.turn = 0;
  G.phase = 'playing';
  G.props = {};
  G.doublesCount = 0;
  G.bankMoney = 20580;
  
  createTokens();
  refreshOpponentPanels();
  refreshTopBar();
  startTurn(0);
}

// Exported game functions (wired from game screen)
export function rollDice() {
  if(G.phase !== 'playing') return;
  enableDiceBtn(false);
  stopTimer();
  
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2;
  const isDouble = d1 === d2;
  
  if(isDouble) G.doublesCount++; else G.doublesCount = 0;
  
  if(G.doublesCount >= 3) {
    showDiceToast(d1, d2, 'ثلاثة توائم! اذهب للسجن');
    setTimeout(() => sendToJail(G.turn), 1400);
    return;
  }
  
  showDiceToast(d1, d2, `تتقدم ${total} خطوات`);
  
  const p = G.players[G.turn];
  
  // Jail escape logic...
  // animateMovement(G.turn, total, () => {
  //   landOnSquare(G.turn, p.sq);
  // });
  
  nextTurn(); // simplified for now
}

export function startTurn(pidx) {
  G.turn = pidx;
  const p = G.players[pidx];
  if(!p || p.isBankrupt) { nextTurn(); return; }
  
  refreshTopBar();
  refreshOpponentPanels();
  updateTurnPill(p);
  
  camOverview(); // camera state 1
  
  if(p.isBot) {
    setTimeout(() => rollDice(), 1000);
  } else {
    enableDiceBtn(true);
    startTimer();
  }
}

export function nextTurn() {
  stopTimer();
  enableDiceBtn(false);
  let next = (G.turn + 1) % G.players.length;
  // Skip bankrupt players...
  setTimeout(() => startTurn(next), 600);
}

// Property handling
export function landOnSquare(pidx, sqIdx) {
  const sq = BOARD_DATA[sqIdx];
  const p = G.players[pidx];
  // Handle taxes, properties, cards, etc.
  nextTurn(); // simplified
}

// Utility functions (called by UI)
export function refreshTopBar() { /* ... */ }
export function refreshOpponentPanels() { /* ... */ }
export function enableDiceBtn(on) { /* ... */ }

// Register globally for onclick wiring
window.G = G;
window.rollDice = rollDice;
window.startTurn = startTurn;
window.nextTurn = nextTurn;

