/* ═══════════════════════════════════════════════════════════════
   SCREEN 1 — Language Selection
   ─────────────────────────────
   Renders a 4×3 grid of language buttons.
   On selection → saves to nav.state → transitions to Screen 2.
═══════════════════════════════════════════════════════════════ */

const LanguageScreen = (() => {

  const LANGUAGES = [
    { flag: '🇸🇦', name: 'العربية',   code: 'ar' },
    { flag: '🇺🇸', name: 'English',   code: 'en' },
    { flag: '🇫🇷', name: 'Français',  code: 'fr' },
    { flag: '🇪🇸', name: 'Español',   code: 'es' },
    { flag: '🇩🇪', name: 'Deutsch',   code: 'de' },
    { flag: '🇹🇷', name: 'Türkçe',    code: 'tr' },
    { flag: '🇮🇹', name: 'Italiano',  code: 'it' },
    { flag: '🇧🇷', name: 'Português', code: 'pt' },
    { flag: '🇷🇺', name: 'Русский',   code: 'ru' },
    { flag: '🇯🇵', name: '日本語',    code: 'ja' },
    { flag: '🇨🇳', name: '中文',      code: 'zh' },
    { flag: '🇰🇷', name: '한국어',    code: 'ko' },
  ];

  /* ── Build HTML ─────────────────────────────────────────────── */
  function render(nav) {
    const btnsHTML = LANGUAGES.map(l => `
      <button
        class="lang-btn"
        data-code="${l.code}"
        aria-label="${l.name}"
      >
        <span class="flag">${l.flag}</span>
        <span class="lname">${l.name}</span>
      </button>
    `).join('');

    return `
      <div id="screen-language" class="screen">

        <div class="lang-header">
          <div class="lang-camel">🐪</div>
          <div class="lang-title">SILK ROAD</div>
          <div class="lang-prompt">
            Choose Your Language &nbsp;·&nbsp; اختر لغتك &nbsp;·&nbsp; Choisissez votre langue
          </div>
        </div>

        <div class="lang-grid">
          ${btnsHTML}
        </div>

      </div>
    `;
  }

  /* ── Wire events after HTML is in DOM ──────────────────────── */
  function init(nav) {
    const screen = document.getElementById('screen-language');

    screen.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;

        /* Visual feedback */
        screen.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        /* Save state */
        nav.state.language = code;

        /* Brief delay so the user sees the highlight, then navigate */
        setTimeout(() => nav.goTo('gamemode'), 320);
      });
    });

    /* Activate (fade-in) */
    requestAnimationFrame(() => screen.classList.add('active'));
  }

  return { render, init };

})();
