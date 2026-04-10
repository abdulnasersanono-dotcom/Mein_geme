/* ═══════════════════════════════════════════════════════════════
   SCREEN 3 — New Game Settings
   ─────────────────────────────
   Layout:
     Header  — back button + title
     Body    — 2-column grid:
                 Left : player count toggles + 2 sliders
                 Right: player name input + 4 rule toggles
     Footer  — Resume + Start Game
═══════════════════════════════════════════════════════════════ */

window.NewGameScreen = (() => {


  /* ── Rule definitions ───────────────────────────────────────── */
  const RULES = [
    { id: 'collectRentInJail', label: '🏦&nbsp;&nbsp;Collect Rent in Jail', default: true  },
    { id: 'preboughtLands',    label: '🏠&nbsp;&nbsp;Prebought Lands',       default: false },
    { id: 'freeParkingBonus',  label: '💸&nbsp;&nbsp;Free Parking Bonus',    default: true  },
    { id: 'speedMode',         label: '⚡&nbsp;&nbsp;Speed Mode',            default: false },
  ];

  /* ── Build toggle pill HTML ─────────────────────────────────── */
  function toggleHTML(id, checked) {
    return `
      <label class="toggle-pill" aria-label="${id}">
        <input type="checkbox" id="toggle-${id}" ${checked ? 'checked' : ''}>
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </label>
    `;
  }

  /* ── Build HTML ─────────────────────────────────────────────── */
  function render(nav) {
    const rulesHTML = RULES.map(r => `
      <div class="rule-row">
        ${toggleHTML(r.id, r.default)}
        <span class="rule-label">${r.label}</span>
      </div>
    `).join('');

    return `
      <div id="screen-newgame" class="screen">

        <!-- HEADER -->
        <header class="ng-header">
          <button id="ng-back" class="btn-ghost btn-3d ng-back-btn">
            <span>◀&nbsp;&nbsp;BACK</span>
          </button>
          <h1 class="ng-header-title">⚔&nbsp;&nbsp;NEW GAME</h1>
          <span class="ng-version">v1.0</span>
        </header>

        <!-- BODY: 2 columns -->
        <div class="ng-body">

          <!-- LEFT COLUMN: Player settings -->
          <section class="ng-col">

            <div class="section-label">👥&nbsp;&nbsp;Number of Players</div>
            <div class="player-count-row">
              <button class="count-btn active" data-count="2">2</button>
              <button class="count-btn"        data-count="3">3</button>
              <button class="count-btn"        data-count="4">4</button>
            </div>

            <hr class="gold-divider">

            <div class="section-label">💰&nbsp;&nbsp;Starting Money</div>
            <div class="slider-row">
              <input
                type="range"
                id="slider-money"
                min="500" max="5000" step="100"
                value="1500"
              >
              <span class="slider-value" id="val-money">1,500 din</span>
            </div>

            <hr class="gold-divider">

            <div class="section-label">🤖&nbsp;&nbsp;Robot Difficulty</div>
            <div class="slider-row">
              <input
                type="range"
                id="slider-diff"
                min="1" max="3" step="1"
                value="1"
              >
              <span class="slider-value" id="val-diff">Easy</span>
            </div>

          </section>

          <!-- RIGHT COLUMN: Name + Rules -->
          <section class="ng-col">

            <div class="section-label">✏️&nbsp;&nbsp;Player Name</div>
            <input
              type="text"
              id="input-name"
              class="game-input"
              placeholder="Enter your name…"
              value="Player 1"
              maxlength="20"
            >

            <hr class="gold-divider">

            <div class="section-label">📋&nbsp;&nbsp;Game Rules</div>
            ${rulesHTML}

          </section>

        </div><!-- /ng-body -->

        <!-- FOOTER -->
        <footer class="ng-footer">
          <button id="btn-resume" class="btn-3d btn-ghost resume-btn">
            <span>▶&nbsp;&nbsp;RESUME GAME</span>
          </button>
          <button id="btn-start"  class="btn-3d btn-green start-btn">
            <span>🚀&nbsp;&nbsp;START GAME</span>
          </button>
        </footer>

      </div>
    `;
  }

  /* ── Wire events ────────────────────────────────────────────── */
  function init(nav) {
    const screen = document.getElementById('screen-newgame');
    requestAnimationFrame(() => screen.classList.add('active'));

    /* Back button */
    document.getElementById('ng-back').addEventListener('click', () => {
      nav.goTo('gamemode');
    });

    /* Player count toggles */
    screen.querySelectorAll('.count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        screen.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        nav.state.playerCount = Number(btn.dataset.count);
      });
    });

    /* Money slider */
    const moneySlider = document.getElementById('slider-money');
    const moneyVal    = document.getElementById('val-money');
    moneySlider.addEventListener('input', () => {
      const v = Number(moneySlider.value);
      moneyVal.textContent = v.toLocaleString() + ' din';
      nav.state.startingMoney = v;
    });

    /* Difficulty slider */
    const diffSlider = document.getElementById('slider-diff');
    const diffVal    = document.getElementById('val-diff');
    const DIFF_NAMES = ['Easy', 'Medium', 'Hard'];
    diffSlider.addEventListener('input', () => {
      const idx = Number(diffSlider.value) - 1;
      diffVal.textContent = DIFF_NAMES[idx];
      nav.state.robotDifficulty = idx + 1;
    });

    /* Player name */
    document.getElementById('input-name').addEventListener('input', e => {
      nav.state.playerName = e.target.value;
    });

    /* Rule toggles */
    RULES.forEach(rule => {
      const checkbox = document.getElementById(`toggle-${rule.id}`);
      nav.state[rule.id] = rule.default;           // set default in state
      checkbox.addEventListener('change', () => {
        nav.state[rule.id] = checkbox.checked;
      });
    });

    /* Start Game */
    document.getElementById('btn-start').addEventListener('click', () => {
      /* Collect final state then launch game engine */
      console.log('Starting game with state:', nav.state);
      /* nav.goTo('game');  ← uncomment when game screen is ready */
      alert('🚀 Game starting!\nState saved to nav.state — connect your game engine here.');
    });

    /* Resume */
    document.getElementById('btn-resume').addEventListener('click', () => {
      /* Load saved game */
      alert('No saved game found.');
    });
  }

  return { render, init };

})();
