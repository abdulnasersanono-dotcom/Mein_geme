'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس إدارة الأدوار — يتحكم في تسلسل الأدوار ورمي النرد
   TurnManager Class — manages turn flow and dice rolling
   يعتمد على: state.js (G), ui/hud.js (hud), camera.js (camera),
              fx/effects.js (fx), game/landing.js (landingHandler),
              game/actions.js (actionHandler)
═══════════════════════════════════════════════════════════════ */
class TurnManager {

    /* ══════════════════════════════════════════════════════════
       بدء دور لاعب معين
       @param {number} pidx - فهرس اللاعب
    ══════════════════════════════════════════════════════════ */
    startTurn(pidx) {
        G.turn         = pidx;
        G.doublesCount = 0;
        const p        = G.players[pidx];

        // تخطي اللاعب المُفلِس
        if (!p || p.isBankrupt) { this.nextTurn(); return; }

        // تأثير الفرمان: تخطي دور
        if (p.skipTurn) {
            p.skipTurn = false;
            hud.toast(`${p.emoji} ${p.name} — دور مُوقَف بالفرمان`);
            setTimeout(() => this.nextTurn(), 1600);
            return;
        }

        hud.refreshTopBar();
        hud.refreshOpponentPanels();
        hud.updateTurnPill(p);
        camera.overview();   // الحالة 1: نظرة عامة أثناء الانتظار

        if (p.isBot) {
            // البوت يرمي تلقائياً بعد تأخير عشوائي
            setTimeout(() => this.rollDice(), 1000 + Math.random() * 800);
        } else {
            hud.enableDiceBtn(true);
            fx.startTimer();
        }
    }

    /* ══════════════════════════════════════════════════════════
       الانتقال إلى اللاعب التالي غير المُفلِس
    ══════════════════════════════════════════════════════════ */
    nextTurn() {
        fx.stopTimer();
        hud.enableDiceBtn(false);

        let next  = (G.turn + 1) % G.players.length;
        let loops = 0;

        // تخطي المُفلِسين
        while (G.players[next].isBankrupt) {
            next = (next + 1) % G.players.length;
            if (++loops > G.players.length) { actionHandler.endGame(); return; }
        }

        // شرط الفوز: بقي لاعب واحد فقط
        const active = G.players.filter(p => !p.isBankrupt);
        if (active.length === 1) { actionHandler.endGame(active[0]); return; }

        setTimeout(() => this.startTurn(next), 600);
    }

    /* ══════════════════════════════════════════════════════════
       رمي النرد ومعالجة النتيجة
    ══════════════════════════════════════════════════════════ */
    rollDice() {
        if (G.phase !== 'playing') return;

        hud.enableDiceBtn(false);
        fx.stopTimer();
        fx.haptic('medium');
        fx.sndDice();

        // وميض الكاميرا
        const flash = document.getElementById('camFlash');
        flash.classList.add('on');
        setTimeout(() => flash.classList.remove('on'), 380);

        // توليد النرد
        const d1       = ~~(Math.random() * 6) + 1;
        const d2       = ~~(Math.random() * 6) + 1;
        const total    = d1 + d2;
        const isDouble = d1 === d2;

        if (isDouble) G.doublesCount++;
        else          G.doublesCount = 0;

        // ثلاثة توائم متتالية → سجن
        if (G.doublesCount >= 3) {
            showDiceToast(d1, d2, 'ثلاثة توائم! اذهب للسجن');
            setTimeout(() => actionHandler.sendToJail(G.turn), 1400);
            return;
        }

        showDiceToast(d1, d2, `تتقدم ${total} خطوات`);
        const p = G.players[G.turn];

        // منطق الخروج من السجن
        if (p.jailTurns > 0) {
            if (isDouble) {
                p.jailTurns = 0;
                hud.toast(`${p.emoji} خرج من السجن بالتوائم!`);
            } else {
                p.jailTurns--;
                if (p.jailTurns === 0) {
                    actionHandler.deductMoney(G.turn, 50);
                    hud.toast(`${p.emoji} دفع 50 ديناراً للخروج من السجن`);
                } else {
                    hud.toast(`${p.emoji} لا يزال في السجن (${p.jailTurns} دور متبقي)`);
                    setTimeout(() => { camAnimTo(38, 45, 600); this.nextTurn(); }, 1800);
                    return;
                }
            }
        }

        // تحريك الرمز خطوة بخطوة بعد أنيميشن النرد
        setTimeout(() => {
            this._animateMovement(G.turn, total, () => {
                camera.overview();
                landingHandler.landOnSquare(G.turn, G.players[G.turn].sq);
                // التوائم تمنح رمية إضافية
                if (isDouble && G.players[G.turn].jailTurns === 0) {
                    setTimeout(() => {
                        hud.toast(`${G.players[G.turn].emoji} توائم! ارم النرد مجدداً`);
                        this.startTurn(G.turn);
                    }, 1400);
                }
            });
        }, 1800);
    }

    /* ══════════════════════════════════════════════════════════
       تحريك رمز اللاعب خطوة بخطوة عبر اللوحة
       @param {number}   pidx   - فهرس اللاعب
       @param {number}   steps  - عدد الخطوات
       @param {Function} onDone - دالة تُستدعى بعد الانتهاء
    ══════════════════════════════════════════════════════════ */
    _animateMovement(pidx, steps, onDone) {
        const p   = G.players[pidx];
        let moved = 0;

        const interval = setInterval(() => {
            moved++;
            p.sq = (p.sq + 1) % 40;

            // جمع 200 عند المرور بخلية الانطلاق
            if (p.sq === 0 && moved > 0) {
                p.money += 200;
                fx.sndCoin();
                hud.toast(`${p.emoji} مرّ على انطلق +200 💰`);
            }

            moveTokenAnim(pidx, p.sq);
            camera.followSquare(p.sq);   // الحالة 2: تتبع الرمز

            if (moved >= steps) {
                clearInterval(interval);
                setTimeout(onDone, 300);
            }
        }, 200);
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const turnMgr = new TurnManager();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function startTurn(pidx) { turnMgr.startTurn(pidx); }
function nextTurn()      { turnMgr.nextTurn(); }
function doRollDice()    { turnMgr.rollDice(); }
