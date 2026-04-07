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
  const center = SQ_CENTERS[sqIdx % 40];
  if (!center) return;
  
  const angleOffset = (playerIdx - 0.5) * 12; // إزاحة للرموز المتعددة
  const radius = 18;
  const dx = Math.cos(angleOffset * Math.PI / 180) * radius;
  const dy = Math.sin(angleOffset * Math.PI / 180) * radius;
  
  el.setAttribute('x', center.x + dx);
  el.setAttribute('y', center.y + dy);
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

// إضافة SQ_CENTERS للتوافق مع main.js
const SQ_CENTERS = []; // سيتم تعبئتها من main.js

// دالة الهبوط على المربع
function landOnSquare(playerIdx, sqIdx) {
  const sq = BOARD_DATA[sqIdx % 40];
  const p = G.players[playerIdx];
  p.sq = sqIdx % 40;

  camFollowSquare(p.sq);

  switch (sq.type) {
    case 'go':
      toast('مررت على انطلق! +200 دينار 🪙');
      p.money += 200;
      G.bankMoney -= 200;
      setMoney(p.money);
      break;
    case 'tax':
      toast(`دفعت ${sq.amount} إتاوة 💸`);
      deductMoney(playerIdx, sq.amount);
      break;
    case 'prop':
      if (!G.props[sq.id]) {
        openBuyModal(playerIdx, sq);
      } else if (G.props[sq.id].owner !== playerIdx) {
        const owner = G.props[sq.id].owner;
        const rent = getRent(sq, G.props[sq.id].level || 0);
        toast(`إيجار ${rent} للاعب ${owner + 1}`);
        deductMoney(playerIdx, rent);
        addMoney(owner, rent);
      }
      break;
    case 'jail':
      sendToJail(playerIdx);
      break;
    case 'gojail':
      sendToJail(playerIdx);
      break;
    case 'lant':
      drawLanternCard();
      break;
    case 'firm':
      drawFirmanCard();
      break;
    default:
      toast(`وصلت ${sq.n || 'مربع فارغ'}`);
  }
  
  setTimeout(() => nextTurn(), 3000);
}

function deductMoney(playerIdx, amount) {
  const p = G.players[playerIdx];
  p.money = Math.max(0, p.money - amount);
  G.bankMoney += amount;
  setMoney(p.money);
  if (p.money === 0) bankrupt(playerIdx);
}

function addMoney(playerIdx, amount) {
  const p = G.players[playerIdx];
  p.money += amount;
  G.bankMoney -= amount;
  setMoney(p.money);
}

function sendToJail(playerIdx) {
  const p = G.players[playerIdx];
  p.sq = 10; // jail square
  p.jailTurns = 3;
  placeToken(document.getElementById(`tok${playerIdx}`), 10, playerIdx);
  sndJail();
  burst(330, 330, 20, true);
  toast(`${p.emoji} في السجن! ⛓`);
  camEventFocus(10, true);
  setTimeout(() => nextTurn(), 2000);
}

function getRent(sq, level) {
  return sq.rent[level || 0];
}

function openBuyModal(playerIdx, sq) {
  // TODO: فتح modal الشراء
  toast(`يمكن شراء ${sq.n} بـ ${sq.price} دينار`);
}

function bankrupt(playerIdx) {
  const p = G.players[playerIdx];
  p.isBankrupt = true;
  toast(`${p.emoji} أفلس! 💀`);
  // نقل العقارات للبنك
  setTimeout(() => nextTurn(), 1500);
}

// بطاقات
function drawLanternCard() {
  const card = LANTERN_CARDS[~~(Math.random() * LANTERN_CARDS.length)];
  toast(card.txt);
  // تنفيذ التأثير
}

function drawFirmanCard() {
  const card = FIRMAN_CARDS[~~(Math.random() * FIRMAN_CARDS.length)];
  toast(card.txt);
  // تنفيذ التأثير
}

function endGame(winner) {
  toast(`انتهت اللعبة! ${winner.emoji} الفائز 🏆`);
}



// 🔧 BRIDGE لإصلاح endTurn error (للـ HTML inline JS)
// يربط nextTurn مع endTurn المتوقع global
window.endTurn = nextTurn;


