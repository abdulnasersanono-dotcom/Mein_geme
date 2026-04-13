/* ═══════════════════════════════════════════════════════════════════
   NAVIGATOR — مدير انتقال الشاشات
   ───────────────────────────────────────────────────────────────────
   يربط: Language → GameMode → NewGame → Game (Board)
   
   الاستخدام:
     const nav = createNavigator();
     nav.start('language');         // ابدأ من شاشة اللغات
═══════════════════════════════════════════════════════════════════ */

window.createNavigator = function () {

  /* ── تسجيل الشاشات المتاحة ─────────────────────────────────── */
  const SCREENS = {
    language: window.LanguageScreen,
    gamemode: window.GameModeScreen,
    newgame:  window.NewGameScreen,
    game:     window.GameScreen,
  };

  /* ── الحالة المشتركة بين جميع الشاشات ─────────────────────── */
  const state = {
    language:        'en',
    dir:             'ltr',
    mode:            null,     // 'solo' | 'pass' | 'online'
    playerCount:     2,
    playerName:      'Player 1',
    startingMoney:   1500,
    robotDifficulty: 1,
    players:         null,
    // قواعد
    collectRentInJail: true,
    preboughtLands:    false,
    freeParkingBonus:  true,
    speedMode:         false,
  };

  let currentScreen = null;

  /* ── الانتقال إلى شاشة ─────────────────────────────────────── */
  function goTo(screenName) {
    const screenDef = SCREENS[screenName];
    if (!screenDef) {
      console.error(`❌ Screen not found: "${screenName}"`);
      return;
    }

    const container = document.getElementById('screen-container');
    if (!container) {
      console.error('❌ Element #screen-container not found in HTML!');
      return;
    }

    /* ─ إخفاء الشاشة الحالية بـ fade-out ─ */
    const oldScreen = container.querySelector('.screen.active');
    if (oldScreen) {
      oldScreen.classList.remove('active');
      oldScreen.classList.add('leaving');
      setTimeout(() => oldScreen.remove(), 300);
    }

    /* ─ حقن HTML الشاشة الجديدة ─ */
    const html = screenDef.render({ state, goTo });
    if (html) {
      container.insertAdjacentHTML('beforeend', html);
    }

    /* ─ تهيئة الشاشة الجديدة ─ */
    screenDef.init({ state, goTo });
    currentScreen = screenName;

    console.log(`📍 Navigated to: ${screenName}`, state);
  }

  /* ── نقطة البداية ──────────────────────────────────────────── */
  function start(firstScreen = 'language') {
    goTo(firstScreen);
  }

  return { start, goTo, state };
};
