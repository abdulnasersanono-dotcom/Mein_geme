/* ═══════════════════════════════════════════════════════════════════
   SCREEN 2 — Game Mode Selection
   الشاشة الثانية — اختيار وضع اللعبة
   ───────────────────────────────────────────────────────────────────
   Flow: Language → GameMode → NewGame → Board
═══════════════════════════════════════════════════════════════════ */

window.GameModeScreen = (() => {

  /* ── بناء HTML الشاشة ──────────────────────────────────────── */
  function render(nav) {
    return `
      <div id="screen-gamemode" class="screen screen-gamemode">
        <div class="gm-bg-pattern"></div>

        <!-- زر العودة للغات -->
        <button id="gm-back" class="gm-back-btn btn-ghost" aria-label="Back">
          ◀ &nbsp;BACK
        </button>

        <!-- اللوحة اليسرى الزخرفية -->
        <aside class="gm-side gm-side-left">
          <div class="gm-deco-icon">🐫</div>
          <div class="gm-deco-line"></div>
          <div class="gm-deco-dots">
            <span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span>
          </div>
        </aside>

        <!-- المنتصف: الشعار + الأزرار -->
        <main class="gm-center">

          <div class="gm-logo">
            <div class="gm-logo-icon">🐪</div>
            <div class="gm-logo-title">SILK ROAD</div>
            <div class="gm-logo-sub">✦ &nbsp; THE GOLDEN ERA &nbsp; ✦</div>
          </div>

          <hr class="gold-divider">

          <div class="gm-btn-stack">

            <button id="btn-online"    class="btn-3d btn-blue mode-btn" data-mode="online">
              <span class="btn-icon">🌐</span>
              <span class="btn-text">PLAY ONLINE</span>
            </button>

            <button id="btn-solo"      class="btn-3d btn-red mode-btn" data-mode="solo">
              <span class="btn-icon">⚔️</span>
              <span class="btn-text">PLAY SOLO</span>
            </button>

            <button id="btn-passnplay" class="btn-3d btn-red mode-btn" data-mode="pass">
              <span class="btn-icon">🤝</span>
              <span class="btn-text">PASS 'N' PLAY</span>
            </button>

            <button id="btn-howto"     class="btn-3d btn-ghost mode-btn" data-mode="howto">
              <span class="btn-icon">📖</span>
              <span class="btn-text">HOW TO PLAY?</span>
            </button>

          </div>

        </main>

        <!-- اللوحة اليمنى الزخرفية -->
        <aside class="gm-side gm-side-right">
          <div class="gm-deco-icon">🏺</div>
          <div class="gm-deco-line"></div>
          <div class="gm-deco-dots">
            <span>✦</span><span>✦</span><span>✦</span><span>✦</span><span>✦</span>
          </div>
        </aside>

      </div>
    `;
  }

  /* ── ربط الأحداث ────────────────────────────────────────────── */
  function init(nav) {
    const screen  = document.getElementById('screen-gamemode');
    const buttons = screen.querySelectorAll('.mode-btn');

    /* ─ تأثير دخول متتالي للأزرار ─ */
    buttons.forEach((btn, i) => {
      btn.style.opacity   = '0';
      btn.style.transform = 'translateY(20px)';
    });

    requestAnimationFrame(() => {
      screen.classList.add('active');
      requestAnimationFrame(() => {
        buttons.forEach((btn, i) => {
          btn.style.transition =
            `opacity .3s ease ${i * 80}ms, transform .3s ease ${i * 80}ms`;
          btn.style.opacity   = '1';
          btn.style.transform = 'translateY(0)';
        });
      });
    });

    /* ─ زر العودة ─ */
    document.getElementById('gm-back').addEventListener('click', () => {
      nav.goTo('language');
    });

    /* ─ PLAY SOLO ─ */
    document.getElementById('btn-solo').addEventListener('click', () => {
      nav.state.mode = 'solo';
      nav.goTo('newgame');
    });

    /* ─ PASS N PLAY ─ */
    document.getElementById('btn-passnplay').addEventListener('click', () => {
      nav.state.mode = 'pass';
      nav.goTo('newgame');
    });

    /* ─ ONLINE ─ */
document.getElementById('btn-online').addEventListener('click', () => {
  nav.state.mode = 'online';
  nav.goTo('online');
});

    /* ─ HOW TO PLAY ─ */
    document.getElementById('btn-howto').addEventListener('click', () => {
      _showToast('📖 Tutorial coming soon! / قريباً');
    });
  }

  /* ── رسالة Toast مؤقتة ─────────────────────────────────────── */
  function _showToast(msg) {
    let toast = document.getElementById('gm-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gm-toast';
      toast.className = 'gm-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  return { render, init };

})();
