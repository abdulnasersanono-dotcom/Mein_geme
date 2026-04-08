/* ════════════════════════════════════════════════
   SCREEN 4 — GAME (Silk Road Monopoly)
   ──────────────────────────────────────
   Full Monopoly game engine integrated.
   Receives nav.state from newgame screen.
═══════════════════════════════════════════════════════════════ */

const GameScreen = (() => {

  /* ── Init game from nav.state ────────────────────────────── */
function init(nav) {
    const state = nav.state;
    
    // Load Monopoly code
    const script = document.createElement('script');
    script.src = 'js/screens/monopoly.js';
    script.onload = () => {
      // Build players from state
      const players = [];
      for (let i = 0; i < state.playerCount; i++) {
        const isBot = i > 0;
        players.push({
          name: i === 0 ? state.playerName : `لاعب ${i+1} 🤖`,
          emoji: PLAYER_EMOJIS[i % PLAYER_EMOJIS.length],
          color: PLAYER_COLORS[i % PLAYER_COLORS.length],
          money: state.startingMoney,
          sq: 0,
          props: [],
          jailTurns: 0,
          isBot,
          isBankrupt: false,
          skipTurn: false,
          taxFree: false,
          active: true
        });
      }
      
      initGame(players);
      document.getElementById('gameUI').style.display = 'block';
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      camOverview();
      startTurn(0);
      console.log('🎮 Game started:', state);
    };
    document.head.appendChild(script);
  }

  /* ── Hide game screen (back to menu) ─────────────────────── */
  function render(nav) {
    // GameScreen doesn't render HTML — it activates the hidden Monopoly DOM
    // Triggered only by navigation, instantly shows gameUI
    return '';
  }

  return { render, init };

})();


