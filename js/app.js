/* ═══════════════════════════════════════════════════════════════
   app.js — Navigation Controller & Boot
   ─────────────────────────────────────
   • Owns the shared game state object
   • Renders screens into #app
   • Handles fade-out → swap → fade-in transitions
   • Called by: language.js, gamemode.js, newgame.js
═══════════════════════════════════════════════════════════════ */

'use strict';

 /* ── SCREEN REGISTRY ─────────────────────────────────────────── */
const SCREENS = {
  language: window.LanguageScreen,
  gamemode: window.GameModeScreen,
  newgame: window.NewGameScreen,
  game: window.GameScreen
};


/* ── NAVIGATOR ───────────────────────────────────────────────── */
const nav = {

  /* Shared state — read / written by all screens */
  state: {
    language:          'en',
    mode:              'solo',
    playerCount:       2,
    startingMoney:     1500,
    robotDifficulty:   1,
    playerName:        'Player 1',
    collectRentInJail: true,
    preboughtLands:    false,
    freeParkingBonus:  true,
    speedMode:         false,
  },

  /* Currently visible screen key */
  current: null,

  /* ── Navigate to a screen by key ────────────────────────────── */
  goTo(screenKey) {
    const Screen = SCREENS[screenKey];
    if (!Screen) {
      console.error(`[nav] Unknown screen: "${screenKey}"`);
      return;
    }

    const app = document.getElementById('app');

    /* ① Fade out current screen (if any) */
    const old = app.querySelector('.screen.active');
    if (old) {
      old.classList.remove('active');          // triggers CSS opacity → 0
      old.style.pointerEvents = 'none';
      /* Wait for transition then replace */
      setTimeout(() => swap(app, Screen, screenKey), 360);
    } else {
      swap(app, Screen, screenKey);
    }
  },
};

/* ── Internal: replace DOM content & init new screen ─────────── */
function swap(app, Screen, key) {
  app.innerHTML = Screen.render(nav);
  Screen.init(nav);
  nav.current = key;
}

/* ── BOOT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  nav.goTo('language');
});
