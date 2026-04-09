/**
 * ═══════════════════════════════════════════════════════════════
 * نظام اللغات المتعدد (Internationalization System)
 * ─────────────────────────────────────────────────────────────
 * يدير تحميل وتطبيق الترجمات على كامل اللعبة
 * ═══════════════════════════════════════════════════════════════
 */

window.i18n = (() => {
  let currentLanguage = 'en'; // اللغة الافتراضية
  let translations = {}; // تخزين الترجمات

  /**
   * تحميل ملف اللغة من السيرفر
   * @param {string} langCode - رمز اللغة (ar, en, fr, etc)
   */
  async function loadLanguage(langCode) {
    try {
      const response = await fetch(`./languages/${langCode}.json`);
      if (!response.ok) throw new Error(`Failed to load ${langCode}.json`);
      
      const data = await response.json();
      translations = data;
      currentLanguage = langCode;

      // حفظ اللغة في localStorage
      localStorage.setItem('selectedLanguage', langCode);

      // تطبيق اتجاه النص (RTL/LTR)
      applyLanguageDirection();

      return true;
    } catch (error) {
      console.error('❌ خطأ في تحميل اللغة:', error);
      return false;
    }
  }

  /**
   * الحصول على نص مترجم
   * @param {string} key - مفتاح الترجمة (مثال: "game.title")
   * @param {object} params - معاملات للاستبدال (اختياري)
   */
  function t(key, params = {}) {
    let text = key.split('.').reduce((obj, k) => obj?.[k], translations) || key;

    // استبدال المتغيرات إن وجدت
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });

    return text;
  }

  /**
   * تطبيق اتجاه النص (RTL للعربية، LTR للغيرها)
   */
  function applyLanguageDirection() {
    const isRTL = currentLanguage === 'ar';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', isRTL);
    document.body.classList.toggle('ltr', !isRTL);
  }

  /**
   * ترجمة جميع عناصر الصفحة تلقائياً
   * استخدم: data-i18n="game.title" في HTML
   */
  function translatePageElements() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const translation = t(key);

      // التعامل مع placeholder
      if (el.placeholder !== undefined) {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    });
  }

  /**
   * الحصول على اللغة الحالية
   */
  function getCurrentLanguage() {
    return currentLanguage;
  }

  /**
   * الحصول على كل الترجمات (للاستخدام المتقدم)
   */
  function getAllTranslations() {
    return translations;
  }

  return {
    loadLanguage,
    t,
    applyLanguageDirection,
    translatePageElements,
    getCurrentLanguage,
    getAllTranslations
  };
})();
