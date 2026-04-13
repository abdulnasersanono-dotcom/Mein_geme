/* ═══════════════════════════════════════════════════════════════════
   SCREEN 4 — Game Board
   الشاشة الرابعة — رقعة اللعبة
   ───────────────────────────────────────────────────────────────────
   تستقبل nav.state من NewGameScreen وتُشغّل محرك اللعبة.
   هذه الشاشة لا تُنشئ HTML — بل تُنشّط gameUI الموجود مسبقاً.
═══════════════════════════════════════════════════════════════════ */

window.GameScreen = (() => {

  /* ── render: لا يُنشئ HTML (gameUI موجود بالفعل في index.html) */
  function render(_nav) {
    return '';   // رقعة اللعبة مُضمَّنة في index.html
  }

  /* ── init: تشغيل محرك اللعبة بإعدادات nav.state ────────────── */
  function init(nav) {
    const state = nav.state;

    /* إخفاء شاشات الـ Menu وإظهار الـ gameUI */
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const gameUI = document.getElementById('gameUI');
    if (gameUI) gameUI.style.display = 'block';

    /* التحقق من وجود محرك اللعبة */
    if (typeof initGame === 'function') {
      _launchGame(state);
    } else {
      /* تحميل monopoly.js ديناميكياً إذا لم يكن محملاً */
      _loadScript('js/screens/monopoly.js', () => _launchGame(state));
    }
  }

  /* ── تشغيل اللعبة بعد تحميل المحرك ──────────────────────────── */
  function _launchGame(state) {
    /* بناء اللاعبين من state.players أو إنشاؤهم من الصفر */
    const players = state.players ?? _buildPlayers(state);

    /* تمرير الإعدادات للمحرك */
    const gameConfig = {
      players,
      rules: {
        collectRentInJail: state.collectRentInJail ?? true,
        preboughtLands:    state.preboughtLands    ?? false,
        freeParkingBonus:  state.freeParkingBonus  ?? true,
        speedMode:         state.speedMode         ?? false,
      },
      robotDifficulty: state.robotDifficulty ?? 1,
    };

    console.log('🎮 Game config:', gameConfig);

    /* استدعاء دالة محرك اللعبة الرئيسية */
    if (typeof initGame === 'function')    initGame(players, gameConfig);
    if (typeof camOverview === 'function') camOverview();
    // startTurn(0) لا تُستدعى هنا — initGame تستدعيها داخلياً
  }

  /* ── بناء مصفوفة اللاعبين من الإعدادات ──────────────────────── */
  function _buildPlayers(state) {
    const count  = state.playerCount ?? 2;
    const money  = state.startingMoney ?? 1500;
    const isSolo = state.mode === 'solo';

    /* ألوان وإيموجي اللاعبين الافتراضية */
    const EMOJIS = ['🧑', '🤖', '👾', '🦊'];
    const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

    return Array.from({ length: count }, (_, i) => ({
      id:         i,
      name:       i === 0 ? (state.playerName || 'Player 1') : `Bot ${i} 🤖`,
      emoji:      EMOJIS[i % EMOJIS.length],
      color:      COLORS[i % COLORS.length],
      isBot:      isSolo ? i > 0 : false,
      money,
      sq:         0,
      props:      [],
      jailTurns:  0,
      isBankrupt: false,
      skipTurn:   false,
      taxFree:    false,
      active:     true,
    }));
  }

  /* ── تحميل سكريبت ديناميكياً ──────────────────────────────────── */
  function _loadScript(src, onLoad) {
    /* تجنُّب تحميل نفس السكريبت مرتين */
    if (document.querySelector(`script[src="${src}"]`)) {
      onLoad?.();
      return;
    }
    const script    = document.createElement('script');
    script.src      = src;
    script.onload   = onLoad;
    script.onerror  = () => console.error(`❌ Failed to load: ${src}`);
    document.head.appendChild(script);
  }

  return { render, init };

})();
