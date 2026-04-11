'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس معالجة الهبوط — ينفّذ تأثير كل خلية عند وقوف اللاعب
   LandingHandler Class — executes effects for each square type
   يعتمد على: state.js (G), data/board-data.js (BOARD_DATA, GROUPS),
              ui/hud.js (hud), game/turn.js (turnMgr),
              game/actions.js (actionHandler)
═══════════════════════════════════════════════════════════════ */
class LandingHandler {

    /* ══════════════════════════════════════════════════════════
       معالجة الهبوط على الخلية — نقطة الدخول الرئيسية
       @param {number} pidx  - فهرس اللاعب
       @param {number} sqIdx - رقم الخلية (0–39)
    ══════════════════════════════════════════════════════════ */
    landOnSquare(pidx, sqIdx) {
        const sq = BOARD_DATA[sqIdx];
        const p  = G.players[pidx];
        if (!sq) { turnMgr.nextTurn(); return; }

        switch (sq.type) {

            // خلية الانطلاق — اللاعب مرّ بها فعلاً (جمع 200 مُعالَج في animateMovement)
            case 'go':
                p.money += 200;
                fx.sndCoin();
                hud.toast('+200 💰 مررت بانطلق');
                turnMgr.nextTurn();
                break;

            // الاستراحة — لا يحدث شيء
            case 'free':
                hud.toast('استراحة — لا شيء يحدث ☕');
                turnMgr.nextTurn();
                break;

            // زيارة السجن — مجرد زيارة، لا عقوبة
            case 'jail':
                hud.toast('زيارة للسجن فقط 👀');
                turnMgr.nextTurn();
                break;

            // اذهب للسجن — السجن الفعلي
            case 'gojail':
                actionHandler.sendToJail(pidx);
                break;

            // الضريبة — خصم مبلغ محدد (مع تأثير إعفاء الفانوس)
            case 'tax':
                if (p.taxFree) {
                    p.taxFree = false;
                    hud.toast(`${p.emoji} معفى من الضريبة 🪔`);
                    turnMgr.nextTurn();
                } else {
                    actionHandler.deductMoney(pidx, sq.amount);
                    hud.toast(`${p.emoji} دفع ${sq.amount} ضريبة ⚔️`);
                    setTimeout(() => turnMgr.nextTurn(), 1200);
                }
                break;

            // عقار / بوابة / مرفق — فتح نافذة الشراء أو دفع الإيجار
            case 'prop':
            case 'gate':
            case 'util':
                camera.eventFocus(sqIdx, false);   // الحالة 3: تقريب على الخلية
                this._handlePropertyLanding(pidx, sqIdx);
                break;

            // بطاقة الفانوس
            case 'lant':
                camera.eventFocus(sqIdx, false);
                actionHandler.drawCard(pidx, 'lant');
                break;

            // بطاقة الفرمان
            case 'firm':
                camera.eventFocus(sqIdx, false);
                actionHandler.drawCard(pidx, 'firm');
                break;

            default:
                turnMgr.nextTurn();
        }
    }

    /* ══════════════════════════════════════════════════════════
       معالجة خلايا الملكية (عقار / بوابة / مرفق)
    ══════════════════════════════════════════════════════════ */
    _handlePropertyLanding(pidx, sqIdx) {
        const ownership = G.props[sqIdx];
        const sq        = BOARD_DATA[sqIdx];
        const p         = G.players[pidx];

        if (!ownership) {
            // غير مملوك — عرض الشراء أو المزاد
            if (p.money >= sq.price) {
                actionHandler.showBuyModal(pidx, sqIdx);
            } else {
                hud.toast(`${p.emoji} لا يملك كفاية — يبدأ المزاد!`);
                setTimeout(() => actionHandler.startAuction(sqIdx), 1000);
            }
        } else if (ownership.owner === pidx) {
            // عقار اللاعب نفسه
            hud.toast(`${p.emoji} تقف على عقارك الخاص`);
            setTimeout(() => turnMgr.nextTurn(), 900);
        } else if (ownership.mortgaged) {
            // مرهون — لا إيجار
            hud.toast(`${sq.n} مرهون — لا إيجار`);
            setTimeout(() => turnMgr.nextTurn(), 900);
        } else {
            // دفع الإيجار للمالك
            const rent  = this._calcRent(sqIdx, ownership);
            const owner = G.players[ownership.owner];
            hud.toast(`${p.emoji} يدفع ${rent} إيجاراً لـ ${owner.emoji}`);
            actionHandler.deductMoney(pidx, rent);
            G.players[ownership.owner].money += rent;
            fx.sndCoin();
            hud.refreshTopBar();
            hud.refreshOpponentPanels();
            setTimeout(() => turnMgr.nextTurn(), 1500);
        }
    }

    /* ══════════════════════════════════════════════════════════
       حساب الإيجار المستحق بناءً على حالة الملكية
       @param {number} sqIdx     - رقم الخلية
       @param {Object} ownership - كائن الملكية {owner, houses, mortgaged}
       @returns {number} - قيمة الإيجار
    ══════════════════════════════════════════════════════════ */
    _calcRent(sqIdx, ownership) {
        const sq = BOARD_DATA[sqIdx];
        if (!sq) return 0;

        // إيجار البوابات: يتضاعف بعدد البوابات المملوكة
        if (sq.type === 'gate') {
            const count = Object.values(G.props).filter(p =>
                p.owner === ownership.owner && BOARD_DATA[p.sqId]?.type === 'gate'
            ).length;
            return [25, 50, 100, 200][Math.min(count - 1, 3)];
        }

        // إيجار المرافق: يعتمد على عدد المرافق المملوكة
        if (sq.type === 'util') {
            const count = Object.values(G.props).filter(p =>
                p.owner === ownership.owner && BOARD_DATA[p.sqId]?.type === 'util'
            ).length;
            return (count === 2 ? 10 : 4) * 7;
        }

        // إيجار العقار: حسب عدد المنازل / الفندق
        const houses = ownership.houses || 0;
        const hasAll = this.ownsFullGroup(ownership.owner, sq.grp);
        if (houses === 5) return sq.rent[5];          // فندق
        if (houses > 0)  return sq.rent[houses];      // 1–4 منازل
        if (hasAll)      return sq.rent[0] * 2;       // احتكار: ضعف الإيجار
        return sq.rent[0];
    }

    /* ══════════════════════════════════════════════════════════
       التحقق من امتلاك مجموعة لونية كاملة
       @param {number} pidx - فهرس اللاعب
       @param {string} grp  - اسم المجموعة
       @returns {boolean}
    ══════════════════════════════════════════════════════════ */
    ownsFullGroup(pidx, grp) {
        if (!grp) return false;
        const members = GROUPS[grp] || [];
        return members.every(id => G.props[id]?.owner === pidx);
    }

    /* ══════════════════════════════════════════════════════════
       نقل لاعب مباشرةً إلى خلية معينة (تأثير البطاقات)
       @param {number}  pidx       - فهرس اللاعب
       @param {number}  sq         - الخلية المستهدفة
       @param {boolean} collectGo  - جمع 200 عند تجاوز الانطلاق
    ══════════════════════════════════════════════════════════ */
    moveTo(pidx, sq, collectGo) {
        const p = G.players[pidx];
        if (sq <= p.sq && collectGo) {
            p.money += 200;
            fx.sndCoin();
            hud.toast(`${p.emoji} مرّ على انطلق +200 💰`);
        }
        p.sq = sq;
        moveTokenAnim(pidx, sq);
        setTimeout(() => this.landOnSquare(pidx, sq), 600);
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const landingHandler = new LandingHandler();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function landOnSquare(pidx, sqIdx)         { landingHandler.landOnSquare(pidx, sqIdx); }
function ownsFullGroup(pidx, grp)          { return landingHandler.ownsFullGroup(pidx, grp); }
function moveTo(pidx, sq, collectGo)       { landingHandler.moveTo(pidx, sq, collectGo); }
