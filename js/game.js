/* ═══════════════════════════════════════════
   game.js - منطق اللعبة الأساسي
   
   يحتوي على:
   • حالة اللعبة G (لاعبين، عقارات، دور)
   • نظام الدورات والنرد
   • العقارات، الإيجارات، المزاد
   • الإفلاس، البوتات
   • تكامل مع camera/ui/config
   
   لماذا فصلناها؟ فصل المنطق عن الواجهة
═══════════════════════════════════════════ */

import { BOARD_DATA, GROUPS, LANTERN_CARDS, FIRMAN_CARDS, PLAYER_COLORS, PLAYER_EMOJIS, GAME_DEFAULTS } from './config.js';
import { camFollowSquare, camEventFocus, camOverview } from './camera.js';
import { toast, haptic, sndCoin, sndDice, sndJail, burst, refreshOpponentPanels, updateTurnPill, enableDiceBtn } from './ui.js';

// ═══════════════════════════════════════════
// حالة اللعبة العالمية G
// ═══════════════════════════════════════════
export const G = {
  players: [], turn: 0, phase: 'setup',
  props: {}, doublesCount: 0,
  auctionSq: -1, auctionBids: {}, auctionTimer: null,
  tradeOffer: null, bankMoney: GAME_DEFAULTS.bankMoney
};

// ═══════════════════════════════════════════
// تهيئة اللعبة
export function initGame(players) {
  G.players = players;
  G.turn = 0;
  G.phase = 'playing';
  G.props = {};
  G.doublesCount = 0;
  G.bankMoney = GAME_DEFAULTS.bankMoney;
  
  // إنشاء رموز اللاعبين
  createTokens();
  refreshOpponentPanels(G.players, G.turn);
  updateTurnPill(G.players[G.turn]);
  startTurn(0);
}

function createTokens() {
  const svg = document.getElementById('boardSvg');
  svg.querySelectorAll('.gToken').forEach(e => e.remove());
  G.players.forEach((p, i) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    g.setAttribute('class', 'gToken');
    g.setAttribute('id', `tok${i}`);
    g.setAttribute('font-size', '18');
    g.setAttribute('text-anchor', 'middle');
    g.setAttribute('dominant-baseline', 'middle');
    g.setAttribute('filter', 'url(#glow)');
    g.style.pointerEvents = 'none';
    g.style.transition = 'x .4s cubic-bezier(.34,1.2,.64,1), y .4s cubic-bezier(.34,1.2,.64,1)';
    g.textContent = p.emoji;
    placeToken(g, 0, i);
    svg.appendChild(g);
  });
}

function placeToken(el, sqIdx, playerIdx) {
  // حساب المواقع + إزاحة للرموز المتعددة
  // implementation here
}

function moveTokenAnim(playerIdx, toSq) {
  const el = document.getElementById(`tok${playerIdx}`);
  if (el) placeToken(el, toSq, playerIdx);
}

// ═══════════════════════════════════════════
// إدارة الدورات
// ═══════════════════════════════════════════
export function startTurn(pidx) {
  G.turn = pidx;
  G.doublesCount = 0;
  const p = G.players[pidx];
  if (!p || p.isBankrupt) {
    nextTurn();
    return;
  }

  if (p.skipTurn) {
    p.skipTurn = false;
    toast(`${p.emoji} ${p.name} — دور مُوقَف بالفرمان`);
    setTimeout(() => nextTurn(), 1600);
    return;
  }

  refreshOpponentPanels(G.players, G.turn);
  updateTurnPill(p);
  camOverview();

  if (p.isBot) {
    setTimeout(() => doRollDice(), 1000 + Math.random() * 800);
  } else {
    enableDiceBtn(true);
    startTimer();
  }
}

function nextTurn() {
  stopTimer();
  enableDiceBtn(false);
  let next = (G.turn + 1) % G.players.length;
  let loops = 0;
  while (G.players[next]?.isBankrupt) {
    next = (next + 1) % G.players.length;
    if (++loops > G.players.length) {
      endGame();
      return;
    }
  }

  const active = G.players.filter(p => !p.isBankrupt);
  if (active.length === 1) {
    endGame(active[0]);
    return;
  }
  setTimeout(() => startTurn(next), 600);
}

// ═══════════════════════════════════════════
// رمي النرد
// ═══════════════════════════════════════════
export function doRollDice() {
  if (G.phase !== 'playing') return;
  enableDiceBtn(false);
  stopTimer();
  haptic('medium');
  sndDice();

  camEventFocus(0, true);

  const d1 = ~~(Math.random() * 6) + 1;
  const d2 = ~~(Math.random() * 6) + 1;
  const total = d1 + d2;
  const isDouble = d1 === d2;
  if (isDouble) G.doublesCount++;
  else G.doublesCount = 0;

  if (G.doublesCount >= 3) {
    toast('ثلاثة توائم! اذهب للسجن');
    setTimeout(() => sendToJail(G.turn), 1400);
    return;
  }

  const p = G.players[G.turn];
  toast(`تتقدم ${total} خطوات`);

  if (p.jailTurns > 0) {
    if (isDouble) {
      p.jailTurns = 0;
      toast(`${p.emoji} خرج من السجن بالتوائم!`);
    } else {
      p.jailTurns--;
      if (p.jailTurns === 0) {
        deductMoney(G.turn, 50);
        toast(`${p.emoji} دفع 50 للخروج من السجن`);
      } else {
        toast(`${p.emoji} لا يزال في السجن (${p.jailTurns} دور)`);
        setTimeout(() => {
          camOverview();
          nextTurn();
        }, 1800);
        return;
      }
    }
  }

  setTimeout(() => {
    animateMovement(G.turn, total, () => {
      camOverview();
      landOnSquare(G.turn, p.sq);
      if (isDouble && p.jailTurns === 0) {
        setTimeout(() => {
          toast(`${p.emoji} توائم! ارم النرد مجدداً`);
          startTurn(G.turn);
        }, 1400);
      }
    });
  }, 1800);
}

// ... باقي الوظائف (landOnSquare, handlePropertyLanding, auction, etc.)
// سيتم إكمالها في الخطوة التالية

console.log('🎮 game.js محمل - منطق اللعبة جاهز 🏆');

// 🔧 BRIDGE لإصلاح endTurn error (للـ HTML inline JS)
// يربط nextTurn مع endTurn المتوقع global
window.endTurn = nextTurn;
console.log('✅ endTurn متاح كـ global bridge للـ HTML');

