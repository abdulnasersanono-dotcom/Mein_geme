'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس حالة اللعبة — المصدر الوحيد للحقيقة في اللعبة
   GameState Class — single source of truth for all game data
   كل الملفات الأخرى تقرأ وتكتب عبر الإنستانس G
═══════════════════════════════════════════════════════════════ */
class GameState {

    constructor() {
        // قائمة اللاعبين — كل عنصر: {name,emoji,color,money,sq,props,jailTurns,isBot,isBankrupt,skipTurn,taxFree}
        this.players = [];

        // فهرس اللاعب صاحب الدور الحالي
        this.turn = 0;

        // مرحلة اللعبة: setup | playing | auction | card | trading | over
        this.phase = 'setup';

        // العقارات المملوكة — مفتاح: رقم الخلية، قيمة: {owner, houses, mortgaged, sqId}
        this.props = {};

        // عدد التوائم المتتالية في الدور الحالي (3 توائم = سجن)
        this.doublesCount = 0;

        // ── بيانات المزاد الجاري ──
        this.auctionSq    = -1;
        this.auctionBids  = {};
        this.auctionTimer = null;

        // عرض التجارة الحالي (null = لا يوجد عرض)
        this.tradeOffer = null;

        // رصيد البنك الافتراضي
        this.bankMoney = 20580;
    }

    /**
     * إعادة ضبط الحالة كاملةً لبدء لعبة جديدة
     */
    reset() {
        this.players      = [];
        this.turn         = 0;
        this.phase        = 'setup';
        this.props        = {};
        this.doublesCount = 0;
        this.auctionSq    = -1;
        this.auctionBids  = {};
        this.auctionTimer = null;
        this.tradeOffer   = null;
        this.bankMoney    = 20580;
    }

    /**
     * بناء كائن لاعب جديد بالقيم الافتراضية
     * @param {string} name    - اسم اللاعب
     * @param {string} emoji   - رمز الأفاتار
     * @param {string} color   - اللون
     * @param {boolean} isBot  - هل هو بوت؟
     */
    createPlayer(name, emoji, color, isBot = false) {
        return {
            name,
            emoji,
            color,
            money:      1500,   // الرصيد الابتدائي
            sq:         0,      // موضع اللاعب على اللوحة (0–39)
            props:      [],     // مصفوفة أرقام الخلايا المملوكة
            jailTurns:  0,      // أدوار السجن المتبقية (0 = حر)
            isBot,
            isBankrupt: false,
            skipTurn:   false,  // تأثير الفرمان: تخطي دور
            taxFree:    false,  // تأثير الفانوس: إعفاء من الضريبة
            active:     true,
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي — يُستخدم من جميع ملفات اللعبة
const G = new GameState();

// رموز أفاتار اللاعبين — تعديل هنا يغير الرموز
const PLAYER_EMOJIS = ['🐪', '👑', '⚔️', '📚', '⚓', '💃'];

// لوحة ألوان اللاعبين — تعديل هنا يغير الألوان
const PLAYER_COLORS = ['#FF4040', '#4080FF', '#40CC40', '#FFD060', '#FF80FF', '#40DDDD'];
