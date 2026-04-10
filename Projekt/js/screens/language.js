/* ═══════════════════════════════════════════════════════════════
   SCREEN 1 — Language Selection
   ─────────────────────────────
   Renders a 4×3 grid of language buttons.
   On selection → saves to nav.state → transitions to Screen 2.
═══════════════════════════════════════════════════════════════ */



window.LanguageScreen = (() => {

  const LANGUAGES = [
    { flag: '🇸🇦', name: 'العربية',   code: 'ar' },
    { flag: '🇺🇸', name: 'English',   code: 'en' },
    { flag: '🇫🇷', name: 'Français',  code: 'fr' },
    { flag: '🇪🇸', name: 'Español',   code: 'es' },
    { flag: '🇩🇪', name: 'Deutsch',   code: 'de' },
  ];

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
          <div class="lang-title" data-i18n="languageScreen.title">GAME</div>
          <div class="lang-prompt" data-i18n="languageScreen.prompt">
            Choose Your Language
          </div>
        </div>
        <div class="lang-grid">
          ${btnsHTML}
        </div>
      </div>
    `;
  }

  function init(nav) {
    const screen = document.getElementById('screen-language');
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'en';

    screen.querySelectorAll('.lang-btn').forEach(btn => {
      const code = btn.dataset.code;

      if (code === savedLanguage) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', async () => {
        screen.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        btn.style.animation = 'pulse 0.6s ease';

        const loaded = await i18n.loadLanguage(code);

        if (loaded) {
          nav.state.language = code;
          i18n.translatePageElements();

          setTimeout(() => {
            nav.goTo('gamemode');  // أو الشاشة التالية
          }, 400);
        }
      });
    });

    i18n.translatePageElements();
    requestAnimationFrame(() => screen.classList.add('active'));
  }

  return { render, init, LANGUAGES };
})();


// 
