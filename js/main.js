'use strict';

/* ═══════════════════════════════════════════════════════════════
   main.js — نقطة الدخول الوحيدة
   يُحمَّل آخر شيء بعد جميع الكلاسات
   يربط أزرار HTML بالكلاسات المُنشَأة ويُشغِّل اللعبة
═══════════════════════════════════════════════════════════════ */

/* ── أزرار اللعبة الرئيسية ────────────────────────────────── */

/** زر رمي النرد — onclick="rollDice()" */
function rollDice() { turnMgr.rollDice(); }

/** أزرار الإجراءات الثانوية — onclick="secAction('build')" */
function secAction(type) {
    fx.haptic('light');
    if      (type === 'build') actionHandler.openBuildModal();
    else if (type === 'trade') actionHandler.openTradeModal();
    else if (type === 'menu')  document.getElementById('setupModal').classList.add('open');
}

/** زر عقاراتي — يفتح نافذة الرهن */
function showPropSlide() { actionHandler.openMortgageModal(); }

/** إغلاق نافذة الرهن */
function hidePropSlide() {
    document.getElementById('mortgageModal').classList.remove('open');
}

/* ── endTurn — مُسلَّك لمؤقت الدور (effects.js) ────────────
   يُستدعى تلقائياً عند انتهاء الـ 45 ثانية
──────────────────────────────────────────────────────────── */
window.endTurn = function () {
    fx.stopTimer();
    hud.enableDiceBtn(false);
    turnMgr.nextTurn();
};

/* ── التشغيل الأول ──────────────────────────────────────── */
// فتح شاشة الإعداد عند أول تحميل
setupUI.open();

console.log('✅ Silk Road: The Golden Era — loaded');
