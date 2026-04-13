/* ═══════════════════════════════════════════════════════════════════
   SCREEN 3 — New Game Settings
   الشاشة الثالثة — إعدادات اللعبة الجديدة
   ───────────────────────────────────────────────────────────────────
   Flow: Language → GameMode → NewGame → Board
   
   كل إعداد يُحفظ في nav.state ويُمرَّر مباشرة للـ GameScreen
═══════════════════════════════════════════════════════════════════ */

window.NewGameScreen = (() => {

  /* ── قواعد اللعبة مع قيمها الافتراضية ─────────────────────── */
  const RULES = [
    { id: 'collectRentInJail', icon: '🏦', label: 'Collect Rent in Jail', default: true  },
    { id: 'preboughtLands',    icon: '🏠', label: 'Prebought Lands',       default: false },
    { id: 'freeParkingBonus',  icon: '💸', label: 'Free Parking Bonus',    default: true  },
    { id: 'speedMode',         icon: '⚡', label: 'Speed Mode',            default: false },
  ];

  /* ── أسماء مستويات الصعوبة ─────────────────────────────────── */
  const DIFFICULTY = ['Easy 🟢', 'Medium 🟡', 'Hard 🔴'];

  /* ── بناء HTML الشاشة ──────────────────────────────────────── */
  function render(nav) {
    const rulesHTML = RULES.map(r => `
      <div class="rule-row">
        <span class="rule-icon">${r.icon}</span>
        <span class="rule-label">${r.label}</span>
        <label class="toggle-pill" aria-label="${r.label}">
          <input type="checkbox" id="toggle-${r.id}" ${r.default ? 'checked' : ''}>
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </label>
      </div>
    `).join('');

    return `
      <div id="screen-newgame" class="screen screen-newgame">
        <div class="ng-bg-pattern"></div>

        <!-- ─── HEADER ────────────────────────────────────────── -->
        <header class="ng-header">
          <button id="ng-back" class="btn-ghost ng-back-btn" aria-label="Back">
            ◀ &nbsp;BACK
          </button>
          <h1 class="ng-title">⚔ &nbsp; NEW GAME</h1>
          <span class="ng-version">v1.0</span>
        </header>

        <!-- ─── BODY: عمودان ──────────────────────────────────── -->
        <div class="ng-body">

          <!-- العمود الأيسر: إعدادات اللاعبين -->
          <section class="ng-col">

            <div class="ng-section-label">👥 Number of Players</div>
            <div class="ng-count-row" id="count-row">
              <button class="count-btn active" data-count="2">2</button>
              <button class="count-btn"        data-count="3">3</button>
              <button class="count-btn"        data-count="4">4</button>
            </div>

            <hr class="gold-divider">

            <div class="ng-section-label">✏️ Player Name</div>
            <input
              type="text"
              id="input-name"
              class="ng-input"
              placeholder="Enter your name…"
              value="Player 1"
              maxlength="20"
              autocomplete="off"
            >

            <hr class="gold-divider">

            <div class="ng-section-label">💰 Starting Money</div>
            <div class="ng-slider-row">
              <input type="range" id="slider-money"
                min="500" max="5000" step="100" value="1500">
              <span class="ng-slider-val" id="val-money">1,500 din</span>
            </div>

            <hr class="gold-divider">

            <div class="ng-section-label">🤖 Robot Difficulty</div>
            <div class="ng-slider-row">
              <input type="range" id="slider-diff"
                min="1" max="3" step="1" value="1">
              <span class="ng-slider-val" id="val-diff">Easy 🟢</span>
            </div>

          </section>

          <!-- العمود الأيمن: القواعد -->
          <section class="ng-col">

            <div class="ng-section-label">📋 Game Rules</div>
            <div class="ng-rules">
              ${rulesHTML}
            </div>

            <hr class="gold-divider">

            <!-- ملخص الإعدادات المختارة -->
            <div class="ng-summary" id="ng-summary">
              <div class="summary-title">⚙️ Settings Summary</div>
              <div class="summary-line" id="sum-players">👥 Players: 2</div>
              <div class="summary-line" id="sum-money">💰 Money: 1,500 din</div>
              <div class="summary-line" id="sum-diff">🤖 Bot: Easy</div>
              <div class="summary-line" id="sum-mode">🎮 Mode: —</div>
            </div>

          </section>

        </div><!-- /ng-body -->

        <!-- ─── FOOTER ────────────────────────────────────────── -->
        <footer class="ng-footer">
          <button id="btn-resume" class="btn-3d btn-ghost">
            <span>▶ &nbsp;RESUME GAME</span>
          </button>
          <button id="btn-start" class="btn-3d btn-green">
            <span>🚀 &nbsp;START GAME</span>
          </button>
        </footer>

      </div>
    `;
  }

  /* ── ربط الأحداث والمنطق ───────────────────────────────────── */
  function init(nav) {
    const screen = document.getElementById('screen-newgame');

    /* ─ قيم افتراضية في nav.state ─ */
    nav.state.playerCount      = 2;
    nav.state.playerName       = 'Player 1';
    nav.state.startingMoney    = 1500;
    nav.state.robotDifficulty  = 1;
    RULES.forEach(r => { nav.state[r.id] = r.default; });

    requestAnimationFrame(() => screen.classList.add('active'));

    /* ─ زر العودة ─ */
    document.getElementById('ng-back').addEventListener('click', () => {
      nav.goTo('gamemode');
    });

    /* ─ عدد اللاعبين ─ */
    document.getElementById('count-row').querySelectorAll('.count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        nav.state.playerCount = Number(btn.dataset.count);
        _updateSummary(nav);
      });
    });

    /* ─ اسم اللاعب ─ */
    document.getElementById('input-name').addEventListener('input', e => {
      nav.state.playerName = e.target.value.trim() || 'Player 1';
    });

    /* ─ المال الابتدائي ─ */
    const moneySlider = document.getElementById('slider-money');
    const moneyVal    = document.getElementById('val-money');
    moneySlider.addEventListener('input', () => {
      const v = Number(moneySlider.value);
      moneyVal.textContent       = v.toLocaleString() + ' din';
      nav.state.startingMoney    = v;
      _updateSummary(nav);
    });

    /* ─ مستوى الصعوبة ─ */
    const diffSlider = document.getElementById('slider-diff');
    const diffVal    = document.getElementById('val-diff');
    diffSlider.addEventListener('input', () => {
      const idx = Number(diffSlider.value) - 1;
      diffVal.textContent         = DIFFICULTY[idx];
      nav.state.robotDifficulty   = idx + 1;
      _updateSummary(nav);
    });

    /* ─ قواعد اللعبة ─ */
    RULES.forEach(rule => {
      document.getElementById(`toggle-${rule.id}`).addEventListener('change', e => {
        nav.state[rule.id] = e.target.checked;
      });
    });

    /* ─ زر بدء اللعبة (الرئيسي) ─ */
    document.getElementById('btn-start').addEventListener('click', () => {
      _startGame(nav);
    });

    /* ─ زر استئناف اللعبة ─ */
    document.getElementById('btn-resume').addEventListener('click', () => {
      _resumeGame(nav);
    });

    /* ─ عرض وضع اللعبة في الملخص ─ */
    _updateSummary(nav);
  }

  /* ── تحديث ملخص الإعدادات ─────────────────────────────────── */
  function _updateSummary(nav) {
    const s = nav.state;
    const diffNames = ['Easy', 'Medium', 'Hard'];
    document.getElementById('sum-players').textContent =
      `👥 Players: ${s.playerCount}`;
    document.getElementById('sum-money').textContent =
      `💰 Money: ${s.startingMoney?.toLocaleString()} din`;
    document.getElementById('sum-diff').textContent =
      `🤖 Bot: ${diffNames[(s.robotDifficulty || 1) - 1]}`;
    document.getElementById('sum-mode').textContent =
      `🎮 Mode: ${s.mode === 'solo' ? 'Solo ⚔️' : s.mode === 'pass' ? 'Pass N Play 🤝' : '—'}`;
  }

  /* ── بدء لعبة جديدة ────────────────────────────────────────── */
  function _startGame(nav) {
    const s = nav.state;

    /* التحقق من اسم اللاعب */
    const nameInput = document.getElementById('input-name');
    s.playerName = nameInput.value.trim() || 'Player 1';

    /* بناء مصفوفة اللاعبين → ستُستخدَم في GameScreen */
    s.players = [];
    for (let i = 0; i < s.playerCount; i++) {
      const isBot = (s.mode === 'solo') ? i > 0 : false;
      s.players.push({
        id:         i,
        name:       i === 0 ? s.playerName : `Bot ${i} 🤖`,
        isBot,
        money:      s.startingMoney,
        sq:         0,
        props:      [],
        jailTurns:  0,
        isBankrupt: false,
        skipTurn:   false,
        active:     true,
      });
    }

    console.log('🚀 Starting game with state:', JSON.stringify(s, null, 2));

    /* الانتقال للعبة */
    nav.goTo('game');
  }

  /* ── استئناف لعبة محفوظة ───────────────────────────────────── */
  function _resumeGame(nav) {
    const saved = localStorage.getItem('silkroad_savegame');
    if (saved) {
      try {
        nav.state = { ...nav.state, ...JSON.parse(saved) };
        nav.goTo('game');
      } catch (e) {
        _showError('❌ Corrupted save file.');
      }
    } else {
      _showError('📂 No saved game found.');
    }
  }

  /* ── عرض رسالة خطأ مؤقتة ──────────────────────────────────── */
  function _showError(msg) {
    let el = document.getElementById('ng-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ng-error';
      el.className = 'ng-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
  }

  return { render, init };

})();
