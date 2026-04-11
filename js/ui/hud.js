'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس واجهة اللعبة — يُحدِّث الشريط العلوي، لوحة اللاعبين،
                        الرسائل المنبثقة، وسجل الأحداث
   HUD Class — top bar, player panel, toasts, event log
   يعتمد على: state.js (G), data/board-data.js (BOARD_DATA), fx/effects.js (fx)
═══════════════════════════════════════════════════════════════ */
class HUD {

    constructor() {
        // رسائل سجل الأحداث (آخر 8 رسائل)
        this._eventQueue = [];
    }

    /* ══════════════════════════════════════════════════════════
       الشريط العلوي — يعرض مال اللاعب البشري الأول
    ══════════════════════════════════════════════════════════ */
    refreshTopBar() {
        const p = G.players[G.turn];
        if (!p) return;

        // البحث عن أول لاعب بشري نشط
        const myIdx = G.players.findIndex(pp => !pp.isBot && !pp.isBankrupt);
        const me    = G.players[Math.max(0, myIdx)];
        const money = me ? me.money : 1500;

        // تحديث العداد المتحرك في FX
        fx.setMoneyTarget(money);
        const el = document.getElementById('moneyVal');
        if (el) el.textContent = Math.round(money).toLocaleString('en');
    }

    /* ══════════════════════════════════════════════════════════
       لوحة اللاعبين اليسرى — تُبنى من جديد كل دور
    ══════════════════════════════════════════════════════════ */
    refreshOpponentPanels() {
        const panel = document.getElementById('leftPanel');
        if (!panel || !G.players.length) return;
        panel.innerHTML = '';

        G.players.forEach((p, i) => {
            const isActive = G.turn === i && G.phase !== 'setup';
            // نسبة شريط المال (3%–100%)
            const pct      = Math.max(3, Math.min(100, p.money / 20));
            // نقاط ملكية العقارات
            const propDots = p.props.map(sqIdx => {
                const sq = BOARD_DATA[sqIdx];
                return sq?.col ? `<div class="prDotProp" style="background:${sq.col}"></div>` : '';
            }).join('');
            // شارة السجن
            const jailBadge = p.jailTurns > 0
                ? `<div class="prJailBadge">⛓${p.jailTurns}</div>` : '';

            const row = document.createElement('div');
            row.className = 'playerRow'
                + (isActive     ? ' active'   : '')
                + (p.isBankrupt ? ' bankrupt'  : '')
                + (p.jailTurns > 0 ? ' jailed' : '');

            row.innerHTML = `
              <div class="prAvatar">${p.emoji}<div class="prDot"></div></div>
              <div class="prInfo">
                <div class="prName">${p.name}${p.isBot ? ' 🤖' : ''}</div>
                <div class="prMoney">${p.money.toLocaleString('en')} <span class="prMoneyLabel">din</span></div>
                <div class="prBar"><div class="prBarFill" style="width:${pct}%"></div></div>
                <div class="prProps">${propDots}</div>
              </div>
              ${jailBadge}`;
            panel.appendChild(row);
        });
    }

    /* ══════════════════════════════════════════════════════════
       شريط الدور — يظهر اسم اللاعب الحالي
    ══════════════════════════════════════════════════════════ */
    /**
     * تحديث شريط اسم اللاعب الحالي
     * @param {{ emoji: string, name: string, color: string }} p - بيانات اللاعب
     */
    updateTurnPill(p) {
        const el = document.getElementById('turnPill');
        if (!el) return;
        el.textContent       = `${p.emoji} ${p.name} — دورك`;
        el.style.borderColor = p.color;
        el.style.color       = p.color;
    }

    /* ══════════════════════════════════════════════════════════
       زر النرد — تفعيل / تعطيل
    ══════════════════════════════════════════════════════════ */
    /**
     * @param {boolean} on - true لتفعيل الزر، false لتعطيله
     */
    enableDiceBtn(on) {
        const face = document.getElementById('diceBtnFace');
        const btn  = document.getElementById('diceBtn');
        if (!face || !btn) return;
        face.style.pointerEvents = on ? 'auto' : 'none';
        face.style.opacity       = on ? '1' : '0.5';
        btn.classList.toggle('pulse', on);
    }

    /* ══════════════════════════════════════════════════════════
       رسائل Toast المنبثقة
    ══════════════════════════════════════════════════════════ */
    /**
     * عرض رسالة منبثقة مؤقتة
     * @param {string} msg - نص الرسالة
     * @param {number} dur - مدة العرض بالميلي ثانية
     */
    toast(msg, dur = 1800) {
        const d = document.createElement('div');
        d.className   = 'gameToast';
        d.textContent = msg;
        document.body.appendChild(d);
        setTimeout(() => d.classList.add('show'), 10);
        setTimeout(() => {
            d.classList.remove('show');
            setTimeout(() => d.remove(), 400);
        }, dur);
        this.pushEventLog(msg);
    }

    /* ══════════════════════════════════════════════════════════
       شريط سجل الأحداث المتحرك
    ══════════════════════════════════════════════════════════ */
    /**
     * إضافة رسالة لسجل الأحداث وتحديث الشريط المتحرك
     * @param {string} msg - نص الحدث
     */
    pushEventLog(msg) {
        this._eventQueue.push(msg);
        const ticker = document.getElementById('eventTicker');
        if (!ticker) return;
        const combined = this._eventQueue.slice(-8).join('   ✦   ');
        ticker.textContent = combined + '          ' + combined;
        ticker.style.animation = 'none';
        void ticker.offsetWidth;    // إعادة تشغيل الأنيميشن
        ticker.style.animation = 'tickerScroll 20s linear infinite';
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const hud = new HUD();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function refreshTopBar()          { hud.refreshTopBar(); }
function refreshOpponentPanels()  { hud.refreshOpponentPanels(); }
function updateTurnPill(p)        { hud.updateTurnPill(p); }
function enableDiceBtn(on)        { hud.enableDiceBtn(on); }
function toast(msg, dur)          { hud.toast(msg, dur); }
function pushEventLog(msg)        { hud.pushEventLog(msg); }
