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

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 جاري تشغيل اللعبة...');

  // تسجيل الشاشات
  nav.registerScreen('language', window.LanguageScreen);
  // nav.registerScreen('gamemode', window.GameModeScreen);
  // nav.registerScreen('game', window.GameScreen);

  // تحميل اللغة المحفوظة أو الافتراضية
  const savedLang = localStorage.getItem('selectedLanguage') || 'en';
  await i18n.loadLanguage(savedLang);

  // الانتقال إلى شاشة اختيار اللغة
  nav.goTo('language');

  console.log('✅ تم تحميل اللعبة بنجاح!');
  console.log(`📝 اللغة الحالية: ${i18n.getCurrentLanguage()}`);
});


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
// حساب مراكز المربعات للكاميرا (660x660 SVG)
// دالة حساب مراكز 40 مربع في لوحة Monopoly قياسية 660x660
function computeSquareCenters(boardData) {
  const centers = [];
  const B = 660, C = 96, S = (B - 2 * C) / 9; // side ~60
  const half = B / 2;
  
  for (let id = 0; id < 40; id++) {
    let x, y;
    if (id < 11) { // bottom
      x = C + id * S + S/2;
      y = B - C - S/2;
    } else if (id < 20) { // left
      x = C + S/2;
      y = B - C - (id - 10) * S - S/2;
    } else if (id < 30) { // top
      x = B - C - (id - 20) * S - S/2;
      y = C + S/2;
    } else { // right
      x = B - C - S/2;
      y = C + (id - 30) * S + S/2;
    }
    centers[id] = {x, y};
  }
  return centers;
}

const SQ_CENTERS = computeSquareCenters(BOARD_DATA);

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
  
  setupSetupEvents();
}

// معالج الأزرار الثانوية
function handleSecAction(action) {
  toast(`زر ${action} غير مُنفذ بعد`);
}

// ═══════════════════════════════════════════
// إضافة event listeners لشاشة الإعداد
function setupSetupEvents() {
  // Ensure vars defined
  window.setupPlayerCount = window.setupPlayerCount || 2;
  window.setupPlayerTypes = window.setupPlayerTypes || ['human', 'bot', 'bot', 'bot', 'bot', 'bot'];
  
  // Count buttons
  const minusBtn = document.getElementById('setupCountMinus');
  if (minusBtn) minusBtn.addEventListener('click', () => {
    if (window.setupPlayerCount > 2) {
      window.setupPlayerCount--;
      document.getElementById('setupCountVal').textContent = window.setupPlayerCount;
      window.renderSetupPlayers();
    }
  });
  
  const plusBtn = document.getElementById('setupCountPlus');
  if (plusBtn) plusBtn.addEventListener('click', () => {
    if (setupPlayerCount < 6) {
      setupPlayerCount++;
      document.getElementById('setupCountVal').textContent = setupPlayerCount;
      renderSetupPlayers();
    }
  });
  
  // Start button
  const startBtn = document.getElementById('startGameBtn');
  if (startBtn) startBtn.addEventListener('click', startGameFromSetup);
}

// ═══════════════════════════════════════════
// شاشة الإعداد (setup) - Global for access
window.setupPlayerCount = 2;
window.setupPlayerTypes = ['human', 'bot', 'bot', 'bot', 'bot', 'bot'];

export function openSetup() {
  G.phase = 'setup';
  const modal = document.getElementById('setupModal');
  if (modal) modal.classList.add('open');
  window.renderSetupPlayers();
}

window.renderSetupPlayers = function() {
  const listEl = document.getElementById('setupPlayerList');
  if (!listEl) return;
  
  listEl.innerHTML = '';
  for (let i = 0; i < setupPlayerCount; i++) {
    const div = document.createElement('div');
    div.className = 'setupPlayerRow';
    div.innerHTML = `
      <div class="setupPlayerInfo">
        <span class="setupEmoji">${PLAYER_EMOJIS[i] || '👤'}</span>
        <span>لاعب ${i+1}</span>
      </div>
      <div class="setupPlayerType">
        <label class="typeLabel">
          <input type="radio" name="p${i}" value="human" ${setupPlayerTypes[i] === 'human' ? 'checked' : ''}>
          بشري
        </label>
        <label class="typeLabel">
          <input type="radio" name="p${i}" value="bot" ${setupPlayerTypes[i] === 'bot' ? 'checked' : ''}>
          بوت
        </label>
      </div>`;
    listEl.appendChild(div);
  }
}

function startGameFromSetup() {
  // Update types from radio buttons
  for (let i = 0; i < setupPlayerCount; i++) {
    const radio = document.querySelector(`input[name="p${i}"]:checked`);
    setupPlayerTypes[i] = radio ? radio.value : 'bot';
  }
  
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
  if (typeof pCV !== 'undefined' && pCV) {
    pCV.width = innerWidth;
    pCV.height = innerHeight;
  }
});


