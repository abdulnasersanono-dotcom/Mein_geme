/* ═══════════════════════════════════════════
   main.js - نقطة الدخول والربط بين الملفات
   
   كيف ترتبط الملفات:
   config.js → بيانات ثابتة
         ↓
   ui.js ← game.js ← camera.js
   ↑       ↑
   main.js ربط + تهيئة
   ↑
   index.html
   
   يتم استيراد كل شيء هنا وتشغيل اللعبة
═══════════════════════════════════════════ */

import {
  BOARD_DATA, GROUPS, LANTERN_CARDS, FIRMAN_CARDS,
  PLAYER_COLORS, PLAYER_EMOJIS
} from './config.js';
import {
  camOverview, camFollowSquare, camEventFocus,
  initCameraLoop, initTouchControls
} from './camera.js';
import {
  initStars, initParticles, burst, haptic, sndCoin, sndDice,
  initMoneyLoop, startTimer, stopTimer, toast, enableDiceBtn,
  refreshOpponentPanels, updateTurnPill, buildBoard
} from './ui.js';
import {
  G, initGame, startTurn, doRollDice, nextTurn
} from './game.js';

// ═══════════════════════════════════════════
// حساب مراكز المربعات للكاميرا
const SQ_CENTERS = []; // حساب 40 نقطة SVG من config
// سيتم ملؤها باستخدام BOARD_DATA

// ═══════════════════════════════════════════
// تهيئة شاملة للعبة
export function initApp() {
  // 1. التأثيرات البصرية
  initStars();
  initParticles();
  initMoneyLoop();

  // 2. بناء اللوحة SVG
  buildBoard();

  // 3. نظام الكاميرا
  initCameraLoop(SQ_CENTERS);
  initTouchControls();
  camOverview();

  // 4. ربط DOM events
  setupEventListeners();

  // 5. فتح شاشة الإعداد
  openSetup();

  console.log('🚀 لعبة طريق الحرير مهيأة بالكامل!');
}

// ═══════════════════════════════════════════
// ربط DOM events (بدون inline onclick)
function setupEventListeners() {
  // النرد
  const diceBtn = document.getElementById('diceBtnFace');
  if (diceBtn) diceBtn.addEventListener('click', doRollDice);

  // الإعدادات
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', openSetup);

  // الأزرار الثانوية
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.dataset.action || e.target.closest('[data-action]').dataset.action;
      handleSecAction(action);
      haptic('light');
    });
  });
}

// معالج الأزرار الثانوية
function handleSecAction(action) {
  switch (action) {
    case 'build': openBuildModal(); break;
    case 'trade': openTradeModal(); break;
    case 'mortgage': openMortgageModal(); break;
  }
}

// ═══════════════════════════════════════════
// شاشة الإعداد (setup)
let setupPlayerCount = 2;
let setupPlayerTypes = ['human', 'bot', 'bot', 'bot', 'bot', 'bot'];

export function openSetup() {
  G.phase = 'setup';
  const modal = document.getElementById('setupModal');
  if (modal) modal.classList.add('open');
  renderSetupPlayers();
}

function renderSetupPlayers() {
  // Implementation
}

function startGameFromSetup() {
  const players = [];
  for (let i = 0; i < setupPlayerCount; i++) {
    players.push({
      name: `لاعب ${i + 1}`, emoji: PLAYER_EMOJIS[i],
      color: PLAYER_COLORS[i], money: 1500, sq: 0,
      props: [], jailTurns: 0, isBot: setupPlayerTypes[i] === 'bot',
      isBankrupt: false, skipTurn: false, taxFree: false, active: true
    });
  }
  initGame(players);
}

// ═══════════════════════════════════════════
// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);

// إعادة التهيئة عند تغيير الحجم
window.addEventListener('resize', () => {
  if (pCV) {
    pCV.width = innerWidth;
    pCV.height = innerHeight;
  }
});

console.log('🔗 main.js - نقطة الدخول جاهزة 🎯');
