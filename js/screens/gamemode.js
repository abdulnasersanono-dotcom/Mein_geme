/* ═══════════════════════════════════════════════════════════════
   SCREEN 2 — Game Mode
   ─────────────────────
   Logo + 4 mode buttons in a landscape 3-column layout.
   Left / Right decorative panels flank the center.
═══════════════════════════════════════════════════════════════ */

window.GameModeScreen = (() => {


  /* ── Build HTML ─────────────────────────────────────────────── */
  function render(nav) {
    return `
      <div id="screen-gamemode" class="screen">

        <!-- Left decorative panel -->
        <aside class="deco-side">
          <div class="deco-icon">🐫</div>
          <div class="deco-dots">
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
          </div>
        </aside>

        <!-- Center: Logo + buttons -->
        <main class="mode-center">

          <div class="mode-logo-emoji">🐪</div>
          <div class="mode-logo-title">SILK ROAD</div>
          <div class="mode-logo-sub">✦&nbsp;&nbsp;THE GOLDEN ERA&nbsp;&nbsp;✦</div>

          <hr class="gold-divider" style="width:220px; align-self:center">

          <div class="mode-btn-stack">

            <button id="btn-online"   class="btn-3d btn-blue">
              <span>🌐&nbsp;&nbsp;PLAY ONLINE</span>
            </button>

            <button id="btn-solo"     class="btn-3d btn-red">
              <span>⚔️&nbsp;&nbsp;PLAY SOLO</span>
            </button>

            <button id="btn-passnplay" class="btn-3d btn-red">
              <span>🤝&nbsp;&nbsp;PASS 'N PLAY</span>
            </button>

            <button id="btn-howto"    class="btn-3d btn-ghost">
              <span>📖&nbsp;&nbsp;HOW TO PLAY?</span>
            </button>

          </div>

        </main>

        <!-- Right decorative panel -->
        <aside class="deco-side">
          <div class="deco-icon">🏺</div>
          <div class="deco-dots">
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
            <span class="deco-dot">✦</span>
          </div>
        </aside>

      </div>
    `;
  }

  /* ── Wire events ────────────────────────────────────────────── */
  function init(nav) {
    const screen = document.getElementById('screen-gamemode');

    /* Stagger-entrance animation for buttons */
    const buttons = screen.querySelectorAll('.mode-btn-stack .btn-3d');
    buttons.forEach((btn, i) => {
      btn.style.opacity     = '0';
      btn.style.transform   = 'translateY(18px)';
      btn.style.transition  =
        `opacity .28s ease ${i * 70}ms, transform .28s ease ${i * 70}ms`;
    });

    /* Activate screen → triggers fade-in */
    requestAnimationFrame(() => {
      screen.classList.add('active');
      /* Trigger button entrance on next frame */
      requestAnimationFrame(() => {
        buttons.forEach(btn => {
          btn.style.opacity   = '1';
          btn.style.transform = 'translateY(0)';
        });
      });
    });

    /* Button actions */
    document.getElementById('btn-solo').addEventListener('click', () => {
      nav.state.mode = 'solo';
      nav.goTo('newgame');
    });

    document.getElementById('btn-passnplay').addEventListener('click', () => {
      nav.state.mode = 'pass';
      nav.goTo('newgame');
    });

    document.getElementById('btn-online').addEventListener('click', () => {
      /* placeholder: navigate to online lobby */
      alert('Online mode coming soon! / قريباً');
    });

    document.getElementById('btn-howto').addEventListener('click', () => {
      /* placeholder: show tutorial */
      alert('Tutorial coming soon! / قريباً');
    });
  }

  return { render, init };

})();
