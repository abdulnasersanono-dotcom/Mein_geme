/* ═══════════════════════════════════════════════════════════════════
   SCREEN 1 — Language Selection
   الشاشة الأولى — اختيار اللغة
   ───────────────────────────────────────────────────────────────────
   Flow: Language → GameMode → NewGame → Board
═══════════════════════════════════════════════════════════════════ */

window.LanguageScreen = (() => {

  /* ── قائمة اللغات المدعومة ─────────────────────────────────── */
  const LANGUAGES = [
    { flag: '🇸🇦', name: 'العربية',  code: 'ar', dir: 'rtl' },
    { flag: '🇺🇸', name: 'English',  code: 'en', dir: 'ltr' },
    { flag: '🇫🇷', name: 'Français', code: 'fr', dir: 'ltr' },
    { flag: '🇪🇸', name: 'Español',  code: 'es', dir: 'ltr' },
    { flag: '🇩🇪', name: 'Deutsch',  code: 'de', dir: 'ltr' },
    { flag: '🇹🇷', name: 'Türkçe',   code: 'tr', dir: 'ltr' },
  ];

  /* ── بناء HTML الشاشة ──────────────────────────────────────── */
  function render(nav) {
    const btnsHTML = LANGUAGES.map((l, i) => `
      <button
        class="lang-btn"
        data-code="${l.code}"
        data-dir="${l.dir}"
        aria-label="${l.name}"
        style="animation-delay: ${i * 80}ms"
      >
        <span class="lang-flag">${l.flag}</span>
        <span class="lang-name">${l.name}</span>
      </button>
    `).join('');

    return `
      <div id="screen-language" class="screen screen-language">
        <div class="lang-bg-pattern"></div>

        <div class="lang-content">
          <!-- شعار اللعبة -->
          <div class="lang-logo">
            <div class="lang-logo-icon">🐪</div>
            <div class="lang-logo-title">SILK ROAD</div>
            <div class="lang-logo-sub">✦ THE GOLDEN ERA ✦</div>
          </div>

          <!-- عنوان اختيار اللغة -->
          <div class="lang-prompt">Choose Your Language</div>

          <!-- شبكة اللغات -->
          <div class="lang-grid">
            ${btnsHTML}
          </div>
        </div>
      </div>
    `;
  }

  /* ── ربط الأحداث والمنطق ───────────────────────────────────── */
  function init(nav) {
    const screen  = document.getElementById('screen-language');
    const savedLang = localStorage.getItem('silkroad_lang') || 'en';

    /* تمييز اللغة المحفوظة مسبقاً */
    screen.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.dataset.code === savedLang) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', () => _onSelect(btn, nav, screen));
    });

    /* تفعيل الشاشة بتأثير fade-in */
    requestAnimationFrame(() => screen.classList.add('active'));
  }

  /* ── معالج الضغط على زر اللغة ─────────────────────────────── */
  async function _onSelect(btn, nav, screen) {
    const code = btn.dataset.code;
    const dir  = btn.dataset.dir;

    /* تحديث CSS التحديد */
    screen.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    /* حفظ الاختيار في الحالة العامة والـ localStorage */
    nav.state.language = code;
    nav.state.dir      = dir;
    localStorage.setItem('silkroad_lang', code);

    /* تطبيق اتجاه الصفحة (RTL/LTR) */
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', code);

    /* تحميل ملف الترجمة إذا كان متاحاً */
    if (window.i18n?.loadLanguage) {
      await window.i18n.loadLanguage(code);
      window.i18n.translatePageElements?.();
    }

    /* الانتقال للشاشة التالية بعد تأخير قصير */
    setTimeout(() => nav.goTo('gamemode'), 350);
  }

  return { render, init };

})();
