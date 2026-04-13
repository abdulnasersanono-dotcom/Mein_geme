'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس إدارة الرموز — ينشئ رموز SVG للاعبين ويحركها على اللوحة
   TokenManager Class — creates and animates player SVG tokens
   يعتمد على: state.js (G), data/board-data.js (SQ_CENTERS_GAME),
              ui/hud.js (hud), game/turn.js (turnMgr)
═══════════════════════════════════════════════════════════════ */
class TokenManager {

    constructor() {
        // إزاحات الرموز لتفادي التداخل بين اللاعبين على نفس الخلية
        this._OFFSETS = [
            { dx:  0,  dy:  0 },
            { dx: 12,  dy:  0 },
            { dx:  0,  dy: 12 },
            { dx: -12, dy:  0 },
            { dx:  0,  dy: -12 },
            { dx:  8,  dy:  8 },
        ];
    }

    /* ══════════════════════════════════════════════════════════
       تهيئة اللعبة وبدء الدور الأول
       @param {Object[]} players - مصفوفة بيانات اللاعبين
    ══════════════════════════════════════════════════════════ */
   initGame(players, config) {           // ← أضف config هنا فقط
    // ضبط الحالة المركزية
    G.players      = players;
    G.turn         = 0;
    G.phase        = 'playing';
    G.props        = {};
    G.doublesCount = 0;
    G.bankMoney    = 20580;

    // ← أضف هذا السطر الواحد هنا
    if (config?.rules) G.rules = config.rules;

    // بناء الرموز وتحديث الواجهة
    this.createTokens();
    hud.refreshOpponentPanels();
    hud.refreshTopBar();

    // بدء الدور الأول
    turnMgr.startTurn(0);
}

    /* ══════════════════════════════════════════════════════════
       إنشاء عنصر SVG لكل لاعب وتثبيته على خلية الانطلاق
    ══════════════════════════════════════════════════════════ */
    createTokens() {
        const svg = document.getElementById('boardSvg');

        // حذف الرموز القديمة إن وُجدت
        svg.querySelectorAll('.gToken').forEach(el => el.remove());

        G.players.forEach((p, i) => {
            const token = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            token.setAttribute('class', 'gToken');
            token.setAttribute('id', `tok${i}`);
            token.setAttribute('font-size', '18');
            token.setAttribute('text-anchor', 'middle');
            token.setAttribute('dominant-baseline', 'middle');
            token.setAttribute('filter', 'url(#glow)');
            token.setAttribute('style',
                'pointer-events:none;' +
                'transition:x .4s cubic-bezier(.34,1.2,.64,1),' +
                'y .4s cubic-bezier(.34,1.2,.64,1)');
            token.textContent = p.emoji;
            this._placeToken(token, 0, i);
            svg.appendChild(token);
        });
    }

    /* ══════════════════════════════════════════════════════════
       وضع رمز على الخلية المحددة (بدون أنيميشن)
       @param {SVGElement} el        - عنصر SVG للرمز
       @param {number}     sqIdx     - رقم الخلية (0–39)
       @param {number}     playerIdx - فهرس اللاعب (للإزاحة)
    ══════════════════════════════════════════════════════════ */
    _placeToken(el, sqIdx, playerIdx) {
        const pos = SQ_CENTERS_GAME[sqIdx % 40];
        const off = this._OFFSETS[playerIdx % 6];
        el.setAttribute('x', pos.x + off.dx);
        el.setAttribute('y', pos.y + off.dy);
    }

    /* ══════════════════════════════════════════════════════════
       تحريك رمز لاعب إلى خلية جديدة (مع أنيميشن CSS)
       @param {number} playerIdx - فهرس اللاعب
       @param {number} toSq      - رقم الخلية المستهدفة
    ══════════════════════════════════════════════════════════ */
    moveToken(playerIdx, toSq) {
        const el = document.getElementById(`tok${playerIdx}`);
        if (el) this._placeToken(el, toSq, playerIdx);
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const tokenMgr = new TokenManager();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function initGame(players)               { tokenMgr.initGame(players); }
function createTokens()                  { tokenMgr.createTokens(); }
function moveTokenAnim(playerIdx, toSq)  { tokenMgr.moveToken(playerIdx, toSq); }
