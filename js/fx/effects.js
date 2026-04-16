'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس المؤثرات — يجمع: النجوم، الجسيمات، الاهتزاز، الصوت،
                          عداد المال، ومؤقت الدور
   FX Class — stars, particles, haptic, audio, money counter, timer
═══════════════════════════════════════════════════════════════ */
class FX {

    constructor() {
        // ── مجموعة جسيمات نشطة ──
        this._pPool = [];
        this._pCV   = document.getElementById('pCv');
        this._pCV.width  = innerWidth;
        this._pCV.height = innerHeight;
        this._pCX = this._pCV.getContext('2d');

        // ── محرك الصوت (يُنشأ عند أول استخدام لتجاوز قيود المتصفح) ──
        this._ax = null;

        // ── عداد المال المتحرك ──
        this._dispMoney = 1500;  // القيمة المعروضة حالياً
        this._targMoney = 1500;  // القيمة المستهدفة

        // ── مؤقت الدور ──
        this._timerSec      = 45;
        this._timerRunning  = false;
        this._timerInterval = null;

        // بدء الأنظمة الفرعية
        this._drawStars();
        this._startParticleLoop();
        this._startMoneyLoop();
        this._bindResize();
    }

    /* ══════════════════════════════════════════════════════════
       النجوم — تُرسم مرة واحدة عند تحميل الصفحة
    ══════════════════════════════════════════════════════════ */
    _drawStars() {
        const c   = document.getElementById('starCv');
        c.width   = window.innerWidth;
        c.height  = window.innerHeight;
        const ctx = c.getContext('2d');
        for (let i = 0; i < 160; i++) {
            const x = Math.random() * c.width;
            const y = Math.random() * c.height * 0.8;
            const r = Math.random() * 1.2;
            const a = Math.random() * 0.5 + 0.05;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,215,140,${a})`;
            ctx.fill();
        }
    }

    /* ══════════════════════════════════════════════════════════
       نظام الجسيمات — حلقة رسم مستمرة
    ══════════════════════════════════════════════════════════ */
    _startParticleLoop() {
        const loop = () => {
            this._pCX.clearRect(0, 0, this._pCV.width, this._pCV.height);
            const now = performance.now();
            this._pPool = this._pPool.filter(p => {
                const t = (now - p.b) / p.l;
                if (t >= 1) return false;   // جسيم منتهي
                const e = 1 - t;
                p.vx *= 0.92; p.vy += 0.25;
                p.x  += p.vx; p.y  += p.vy;
                this._pCX.globalAlpha = e * e;
                this._pCX.fillStyle   = p.c;
                this._pCX.beginPath();
                this._pCX.arc(p.x, p.y, p.r * e, 0, Math.PI * 2);
                this._pCX.fill();
                return true;
            });
            this._pCX.globalAlpha = 1;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /**
     * إطلاق انفجار جسيمات ذهبية
     * @param {number}  x   - موضع X على الشاشة
     * @param {number}  y   - موضع Y على الشاشة
     * @param {number}  n   - عدد الجسيمات
     * @param {boolean} big - جسيمات كبيرة (للاحتفالات)
     */
    burst(x, y, n = 14, big = false) {
        const colors = ['#FFE060', '#FFC030', '#FF9000', '#FFEA80', '#FF5020'];
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (big ? 3 : 2) + Math.random() * (big ? 6 : 4);
            this._pPool.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                r:  (big ? 4 : 3) + Math.random() * (big ? 5 : 3),
                c:  colors[i % colors.length],
                b:  performance.now(),
                l:  (big ? 900 : 600) + Math.random() * 300,
            });
        }
    }

    /* ══════════════════════════════════════════════════════════
       الاهتزاز (Haptic Feedback)
    ══════════════════════════════════════════════════════════ */
    /**
     * تشغيل اهتزاز الجهاز
     * @param {'light'|'medium'|'heavy'|'success'} t - شدة الاهتزاز
     */
    haptic(t = 'light') {
        if (!navigator.vibrate) return;
        const patterns = {
            light:   () => navigator.vibrate(25),
            medium:  () => navigator.vibrate(55),
            heavy:   () => navigator.vibrate(100),
            success: () => navigator.vibrate([25, 40, 25]),
        };
        (patterns[t] || patterns.light)();
    }

    /* ══════════════════════════════════════════════════════════
       محرك الصوت
    ══════════════════════════════════════════════════════════ */
    _getAX() {
        if (!this._ax)
            this._ax = new (window.AudioContext || window.webkitAudioContext)();
        return this._ax;
    }

    /**
     * تشغيل نغمة واحدة مُولَّدة برمجياً
     * @param {number} f  - التردد بالهرتز
     * @param {string} t  - نوع الموجة (sine / square / triangle / sawtooth)
     * @param {number} d  - المدة بالثواني
     * @param {number} v  - مستوى الصوت
     * @param {number} dl - تأخير البدء بالثواني
     */
    tone(f, t = 'sine', d = 0.15, v = 0.07, dl = 0) {
        try {
            const ctx = this._getAX();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = t;
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0, ctx.currentTime + dl);
            gain.gain.linearRampToValueAtTime(v, ctx.currentTime + dl + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dl + d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + dl);
            osc.stop(ctx.currentTime + dl + d + 0.05);
        } catch (e) {}
    }

    // ── أصوات اللعبة — تعديل هنا يغير الأصوات ──

    /** صوت جمع العملة */
    sndCoin()   { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 'sine', .12, .06, i * .06)); }
    /** صوت رمي النرد */
    sndDice()   { this.tone(200, 'square', .08, .12); setTimeout(() => this.tone(300, 'square', .06, .08), 80); }
    /** صوت سحب البطاقة */
    sndScroll() { [220, 277, 330].forEach((f, i) => this.tone(f, 'triangle', .22, .05, i * .08)); }
    /** صوت الخطأ */
    sndErr()    { this.tone(150, 'sawtooth', .15, .12); }
    /** صوت السجن */
    sndJail()   { this.tone(100, 'sawtooth', .35, .15); setTimeout(() => this.tone(80, 'sawtooth', .25, .12), 200); }

    /* ══════════════════════════════════════════════════════════
       عداد المال — انتقال سلس بين القيم
    ══════════════════════════════════════════════════════════ */
    /** تحديث القيمة المستهدفة لعداد المال */
    setMoneyTarget(v) {
        this._targMoney = Math.max(0, v);
    }

    _startMoneyLoop() {
        const loop = () => {
            if (Math.abs(this._dispMoney - this._targMoney) > 0.5) {
                this._dispMoney += (this._targMoney - this._dispMoney) * 0.1;
                const el = document.getElementById('moneyVal');
                if (el) el.textContent = Math.round(this._dispMoney).toLocaleString('en');
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    /* ══════════════════════════════════════════════════════════
       مؤقت الدور — 45 ثانية لكل دور
    ══════════════════════════════════════════════════════════ */
    /** بدء العد التنازلي */
    startTimer() {
        this._timerRunning  = true;
        this._timerSec      = 45;
        this._timerInterval = setInterval(() => {
            if (--this._timerSec <= 0) {
                clearInterval(this._timerInterval);
                this._timerRunning = false;
                if (window.endTurn) window.endTurn();   // مُسلَّك في main.js
            }
            const m  = ~~(this._timerSec / 60);
            const s  = this._timerSec % 60;
            const el = document.getElementById('timer');
            if (el) el.textContent = `${m}:${s < 10 ? '0' + s : s}`;
        }, 1000);
    }

    /** إيقاف المؤقت دون تشغيل endTurn */
    stopTimer() {
        clearInterval(this._timerInterval);
        this._timerRunning = false;
    }

    /* ══════════════════════════════════════════════════════════
       إعادة الحجم
    ══════════════════════════════════════════════════════════ */
    _bindResize() {
        window.addEventListener('resize', () => {
            this._pCV.width  = innerWidth;
            this._pCV.height = innerHeight;
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const fx = new FX();

// ── دوال تحويل للتوافق مع النداءات الموجودة في بقية الملفات ──
function burst(x, y, n, big)   { fx.burst(x, y, n, big); }
function haptic(t)              { fx.haptic(t); }
function tone(f, t, d, v, dl)  { fx.tone(f, t, d, v, dl); }
function sndCoin()              { fx.sndCoin(); }
function sndDice()              { fx.sndDice(); }
function sndScroll()            { fx.sndScroll(); }
function sndErr()               { fx.sndErr(); }
function sndMagic()             { fx.tone(523, 'sine', 0.3, 0.1); }
function sndJail()              { fx.sndJail(); }
function startTimer()           { fx.startTimer(); }
function stopTimer()            { fx.stopTimer(); }
