/* ═══════════════════════════════════════════════════════════════
   MAIN — global wiring, button handlers, boot sequence
   هذا الملف هو نقطة الدخول الوحيدة لتشغيل اللعبة
   يُحمَّل آخر شيء بعد جميع الملفات الأخرى
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Button wires (HTML onclick calls these) ────────────────── */

/** Called by the dice button */
function rollDice(){ doRollDice(); }

/** Called by secondary action buttons */
function secAction(t){
  haptic('light');
  if(t === 'build') openBuildModal();
  else if(t === 'trade') openTradeModal();
  else if(t === 'menu') document.getElementById('setupModal').classList.add('open');
}

/** Open mortgage/property management from the bottom-left button */
function showPropSlide(){ openMortgageModal(); }

/** Close property slide panel */
function hidePropSlide(){
  document.getElementById('mortgageModal').classList.remove('open');
}

/* ── endTurn — wired to the countdown timer ─────────────────── */
// The timer calls window.endTurn() when 45 s expire.
// We proxy it to the real nextTurn() so the timer has a stable target.
window.endTurn = function(){
  stopTimer();
  enableDiceBtn(false);
  nextTurn();
};

/* ── BOOT ───────────────────────────────────────────────────── */
// Open setup screen on first load
openSetup();

console.log('✅ Silk Road: The Golden Era — loaded');
