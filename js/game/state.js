/* ═══════════════════════════════════════════════════════════════
   GAME STATE — central G object + player constants
   كل منطق اللعبة يقرأ ويكتب في هذا الكائن
═══════════════════════════════════════════════════════════════ */
'use strict';

// Central game state — shared by all game modules
const G = {
  players:       [],     // [{name,emoji,color,money,sq,props,jailTurns,isBot,isBankrupt,skipTurn,taxFree,active}]
  turn:          0,      // index of current player
  phase:         'setup',// setup | playing | auction | card | trading | over
  props:         {},     // {sqId: {owner, houses, mortgaged, sqId}}
  doublesCount:  0,      // consecutive doubles this turn
  auctionSq:     -1,
  auctionBids:   {},
  auctionTimer:  null,
  tradeOffer:    null,
  bankMoney:     20580,
};

// Player avatar emojis — تعديل هنا يغير رموز اللاعبين
const PLAYER_EMOJIS  = ['🐪','👑','⚔️','📚','⚓','💃'];

// Player color palette — تعديل هنا يغير ألوان اللاعبين
const PLAYER_COLORS  = ['#FF4040','#4080FF','#40CC40','#FFD060','#FF80FF','#40DDDD'];
