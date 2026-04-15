'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   كلاس الكاميرا ثنائية الأبعاد — نظام كاميرا 2D احترافي
   2D Camera Class — Professional flat camera for درب الحرير

   الحالات الثلاث:
   ┌─────────────────────────────────────────────────────────────────────┐
   │  OVERVIEW  → اللوحة كاملة، ثابتة، تسع الشاشة                      │
   │  FOLLOWER  → تتبع سلس للرمز المتحرك مع تكبير متوسط                │
   │  EVENT     → تقريب على خلية مهمة + اهتزاز اختياري + وميض          │
   └─────────────────────────────────────────────────────────────────────┘

   الواجهة العامة (توافق كامل مع الملفات القائمة):
     camOverview()
     camFollowSquare(sqIdx)
     camEventFocus(sqIdx, shake?, shakeLevel?)
     camera.overview()
     camera.followSquare(sqIdx)
     camera.eventFocus(sqIdx, shake?, shakeLevel?)

   اللوحة مسطحة تماماً — لا perspective، لا rotateX، لا rotateZ
   مربع البداية (GO) في أسفل اليسار
═══════════════════════════════════════════════════════════════════════════ */

class Camera {

    /* ══════════════════════════════════════════════════════════════════════
       البناء — يُشغَّل مرة واحدة عند تحميل الصفحة
    ══════════════════════════════════════════════════════════════════════ */
    constructor() {

        // ── العناصر ──
        this._board  = document.getElementById('boardGrid');
        this._wrap   = document.getElementById('boardArea') || this._board?.parentElement;
        this._flash  = document.getElementById('camFlash');

        // ── أسماء الحالات ──
        this.STATE = Object.freeze({
            OVERVIEW: 'overview',
            FOLLOWER: 'follower',
            EVENT:    'event',
        });

        /* ── حالة الكاميرا الحالية (تتغير كل فريم عبر SmoothDamp) ──
           scale   : مضاعف التكبير الحالي
           panX/Y  : إزاحة بيكسل عن مركز الـ wrapper
           velScale/velX/velY : سرعات SmoothDamp الداخلية
           shakeAmp/shakeDec  : اهتزاز الكاميرا
        */
        this._cur = {
            scale:    1.0,
            panX:     0,
            panY:     0,
            velScale: 0,
            velX:     0,
            velY:     0,
            shakeAmp: 0,
            shakeDec: 0,
            state:    this.STATE.OVERVIEW,
            followSq: 0,
            eventSq:  0,
        };

        /* ── إعدادات كل حالة — عدّل هنا لضبط السلوك ──
           scale      : مضاعف التكبير المستهدف
           offsetY    : إزاحة عمودية إضافية (نسبة من الـ board 660px)
           smoothTime : وقت الانتقال ثانية (أقل = أسرع)
        */
        this._cfg = {
            overview: { scale: 1.00, offsetFactor: 0.00,  smoothTime: 0.50 },
            follower: { scale: 1.60, offsetFactor: 0.08,  smoothTime: 0.25 },
            event:    { scale: 1.90, offsetFactor: 0.06,  smoothTime: 0.15 },
        };

        // ── ثوابت اللوحة (660×660، مركزها 330،330) ──
        this.BOARD_SIZE   = 660;
        this.BOARD_CENTER = { x: 330, y: 330 };

        // ── التكبير اليدوي (عجلة الماوس / الإصبعين) ──
        this._manual = {
            scale:   1.0,
            panX:    0,
            panY:    0,
            active:  false,    // هل المستخدم يتحكم يدوياً؟
            idleTimer: null,
        };
        this.MANUAL_SCALE_MIN = 0.6;
        this.MANUAL_SCALE_MAX = 3.5;

        // ── خيار: تدوير اللوحة بحيث يكون GO في أسفل اليسار ──
        // (إذا كانت لوحتك مُصمَّمة بـ GO في أسفل اليمين، اجعل هذا 90)
        // (إذا كانت مُصمَّمة بـ GO في أسفل اليسار بالفعل، اجعله 0)
        this.BOARD_BASE_ROTATION = 0; // درجات — عدّل حسب تصميم لوحتك

        this._lastT = 0;
        this._startLoop();
        this._bindControls();
    }

    /* ══════════════════════════════════════════════════════════════════════
       SmoothDamp — انتقالات ناعمة بأسلوب Unity
       المرجع: Game Programming Gems — Critically Damped Spring
    ══════════════════════════════════════════════════════════════════════ */
    _sd(current, target, vel, smoothTime, dt) {
        const omega = 2.0 / Math.max(smoothTime, 0.0001);
        const x     = omega * dt;
        const exp   = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
        const delta = current - target;
        const temp  = (vel + omega * delta) * dt;
        const newVel = (vel - omega * temp) * exp;
        return {
            value: target + (delta + temp) * exp,
            vel:   newVel,
        };
    }

    /* ══════════════════════════════════════════════════════════════════════
       حساب إزاحة الـ pan لتمركز الكاميرا على خلية معينة
       sqIdx → رقم الخلية → موقعها في SQ_CENTERS_GAME → إزاحة بيكسل
    ══════════════════════════════════════════════════════════════════════ */
    _panForSquare(sqIdx, scale) {
        if (typeof SQ_CENTERS_GAME === 'undefined') return { x: 0, y: 0 };
        const pos = SQ_CENTERS_GAME[sqIdx % 40];
        if (!pos) return { x: 0, y: 0 };

        // المسافة بين الخلية ومركز اللوحة
        const dx = pos.x - this.BOARD_CENTER.x;
        const dy = pos.y - this.BOARD_CENTER.y;

        // إزاحة إضافية للأعلى لإبقاء الرمز في الجزء المرئي
        const cfg     = this._cfg[this._cur.state];
        const offsetY = -cfg.offsetFactor * this.BOARD_SIZE;

        // نقسم على scale لتصحيح الـ transform chain
        return {
            x: (-dx) / scale,
            y: (-dy + offsetY) / scale,
        };
    }

    /* ══════════════════════════════════════════════════════════════════════
       تطبيق transform على DOM
       اللوحة مسطحة: فقط scale + translate، بدون أي تدوير
    ══════════════════════════════════════════════════════════════════════ */
    _apply() {
        if (!this._board) return;

        const t   = performance.now() * 0.001;
        let   sx  = 0, sy = 0;

        // اهتزاز الكاميرا (يتلاشى تدريجياً)
        if (this._cur.shakeAmp > 0.1) {
            sx = this._cur.shakeAmp * Math.sin(t * 47.3) * Math.cos(t * 31.1);
            sy = this._cur.shakeAmp * Math.sin(t * 37.7) * Math.cos(t * 53.9);
            this._cur.shakeAmp = Math.max(
                0,
                this._cur.shakeAmp - this._cur.shakeDec * (1 / 60)
            );
        }

        const S   = this._manual.active
                    ? this._cur.scale * this._manual.scale
                    : this._cur.scale;
        const px  = this._manual.active
                    ? this._cur.panX + this._manual.panX / S
                    : this._cur.panX;
        const py  = this._manual.active
                    ? this._cur.panY + this._manual.panY / S
                    : this._cur.panY;

        /*
          2D transform نظيف:
          rotate(BOARD_BASE_ROTATION)  → يوجّه اللوحة حتى يكون GO أسفل اليسار
          scale(S)                     → تكبير / تصغير
          translate(px, py)            → إزاحة لتمركز الخلية
          (sx, sy تُضاف للـ translate للاهتزاز)
        */
        this._board.style.transform =
            `rotate(${this.BOARD_BASE_ROTATION}deg) ` +
            `scale(${S}) ` +
            `translate(${px + sx}px, ${py + sy}px)`;

        this._board.style.transformOrigin = '50% 50%';
    }

    /* ══════════════════════════════════════════════════════════════════════
       حلقة التحديث — requestAnimationFrame
    ══════════════════════════════════════════════════════════════════════ */
    _startLoop() {
        const tick = (now) => {
            requestAnimationFrame(tick);

            const dt = Math.min((now - this._lastT) / 1000, 0.05);
            this._lastT = now;
            if (dt <= 0) return;

            // إذا المستخدم يتحكم يدوياً نوقف الـ auto-pan
            if (this._manual.active) {
                this._apply();
                return;
            }

            const cfg   = this._cfg[this._cur.state];
            let tgtScale = cfg.scale;
            let tgtPanX  = 0;
            let tgtPanY  = 0;

            if (this._cur.state === this.STATE.FOLLOWER) {
                const off = this._panForSquare(this._cur.followSq, tgtScale);
                tgtPanX = off.x;
                tgtPanY = off.y;
            } else if (this._cur.state === this.STATE.EVENT) {
                const off = this._panForSquare(this._cur.eventSq, tgtScale);
                tgtPanX = off.x;
                tgtPanY = off.y;
            }

            // SmoothDamp على كل بُعد
            let r;
            r = this._sd(this._cur.scale, tgtScale, this._cur.velScale, cfg.smoothTime,       dt);
            this._cur.scale    = r.value; this._cur.velScale = r.vel;

            r = this._sd(this._cur.panX,  tgtPanX,  this._cur.velX,     cfg.smoothTime,       dt);
            this._cur.panX     = r.value; this._cur.velX     = r.vel;

            r = this._sd(this._cur.panY,  tgtPanY,  this._cur.velY,     cfg.smoothTime,       dt);
            this._cur.panY     = r.value; this._cur.velY     = r.vel;

            this._apply();
        };

        requestAnimationFrame(tick);
    }

    /* ══════════════════════════════════════════════════════════════════════
       ربط أحداث التحكم: عجلة الماوس، اللمس (pinch + drag)، الفأرة
    ══════════════════════════════════════════════════════════════════════ */
    _bindControls() {
        const el = this._wrap || this._board;
        if (!el) return;

        // ── متغيرات اللمس ──
        let touch1  = { x: 0, y: 0 };
        let pinchD0 = 0;
        let isDrag  = false;
        let isPin   = false;

        // ── متغيرات الفأرة ──
        let mouseDrag = false;
        let mouse0    = { x: 0, y: 0 };

        // ── تفعيل وضع اليد ──
        const activateManual = () => {
            this._manual.active = true;
            clearTimeout(this._manual.idleTimer);
        };

        // ── إعادة التحكم للكاميرا التلقائية بعد 4 ثانية من السكون ──
        const scheduleRelease = () => {
            clearTimeout(this._manual.idleTimer);
            this._manual.idleTimer = setTimeout(() => {
                this._manual.active = false;
                this._manual.panX   = 0;
                this._manual.panY   = 0;
                this._manual.scale  = 1.0;
            }, 4000);
        };

        /* ════ اللمس ════ */
        el.addEventListener('touchstart', (e) => {
            activateManual();
            if (e.touches.length === 1) {
                isDrag = true; isPin = false;
                touch1.x = e.touches[0].clientX;
                touch1.y = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                isPin = true; isDrag = false;
                pinchD0 = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY,
                );
            }
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (isDrag && e.touches.length === 1) {
                const dx = (e.touches[0].clientX - touch1.x) * 0.65;
                const dy = (e.touches[0].clientY - touch1.y) * 0.65;
                this._manual.panX += dx;
                this._manual.panY += dy;
                touch1.x = e.touches[0].clientX;
                touch1.y = e.touches[0].clientY;
                this._apply();
            } else if (isPin && e.touches.length === 2) {
                const d = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY,
                );
                const ratio = d / pinchD0;
                this._manual.scale = Math.max(
                    this.MANUAL_SCALE_MIN,
                    Math.min(this.MANUAL_SCALE_MAX, this._manual.scale * ratio),
                );
                pinchD0 = d;
                this._apply();
            }
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                isDrag = false; isPin = false;
                scheduleRelease();
            }
        }, { passive: true });

        /* ════ عجلة الماوس — تكبير / تصغير ════ */
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            activateManual();
            const factor = e.deltaY > 0 ? 0.90 : 1.11;
            this._manual.scale = Math.max(
                this.MANUAL_SCALE_MIN,
                Math.min(this.MANUAL_SCALE_MAX, this._manual.scale * factor),
            );
            this._apply();
            scheduleRelease();
        }, { passive: false });

        /* ════ سحب الفأرة — pan ════ */
        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            mouseDrag  = true;
            mouse0.x   = e.clientX;
            mouse0.y   = e.clientY;
            el.style.cursor = 'grabbing';
            activateManual();
        });

        window.addEventListener('mousemove', (e) => {
            if (!mouseDrag) return;
            const dx = (e.clientX - mouse0.x) * 0.80;
            const dy = (e.clientY - mouse0.y) * 0.80;
            this._manual.panX += dx;
            this._manual.panY += dy;
            mouse0.x = e.clientX;
            mouse0.y = e.clientY;
            this._apply();
        });

        window.addEventListener('mouseup', () => {
            if (!mouseDrag) return;
            mouseDrag = false;
            el.style.cursor = 'grab';
            scheduleRelease();
        });

        // مؤشر الفأرة
        el.style.cursor = 'grab';
    }

    /* ══════════════════════════════════════════════════════════════════════
       ═══ الواجهة العامة ═══
    ══════════════════════════════════════════════════════════════════════ */

    /**
     * OVERVIEW — اللوحة كاملة، لا تتبع
     * يلغي وضع اليد أيضاً ويعود للعرض الكامل
     */
    overview() {
        this._cur.state         = this.STATE.OVERVIEW;
        this._manual.active     = false;
        this._manual.panX       = 0;
        this._manual.panY       = 0;
        this._manual.scale      = 1.0;
        clearTimeout(this._manual.idleTimer);
        if (this._flash) this._flash.classList.remove('on');
    }

    /**
     * FOLLOWER — تتبع الرمز خطوة بخطوة مع تكبير متوسط
     * @param {number} sqIdx  رقم الخلية (0–39)
     */
    followSquare(sqIdx) {
        this._cur.state    = this.STATE.FOLLOWER;
        this._cur.followSq = sqIdx;
        this._manual.active = false;
        clearTimeout(this._manual.idleTimer);
    }

    /**
     * EVENT — تقريب حاد على خلية مهمة مع وميض واهتزاز اختياري
     * @param {number}  sqIdx       رقم الخلية (0–39)
     * @param {boolean} shake       تشغيل الاهتزاز؟  (افتراضي: false)
     * @param {string}  shakeLevel  شدة الاهتزاز: 'light' | 'medium' | 'heavy'
     */
    eventFocus(sqIdx, shake = false, shakeLevel = 'medium') {
        this._cur.state   = this.STATE.EVENT;
        this._cur.eventSq = sqIdx;
        this._manual.active = false;
        clearTimeout(this._manual.idleTimer);

        // وميض الكاميرا
        if (this._flash) {
            this._flash.classList.add('on');
            setTimeout(() => this._flash.classList.remove('on'), 380);
        }

        // اهتزاز
        if (shake) {
            const amps = { light: 3, medium: 7, heavy: 15 };
            const durs = { light: 25, medium: 32, heavy: 48 };
            this._cur.shakeAmp = amps[shakeLevel] ?? 7;
            this._cur.shakeDec = this._cur.shakeAmp / (durs[shakeLevel] ?? 32);

            // haptic على الجوال إذا وُجد
            if (typeof fx?.haptic === 'function') fx.haptic(shakeLevel);
        }
    }

    /**
     * ضبط سرعة الانتقال لحالة معينة
     * @param {'overview'|'follower'|'event'} state
     * @param {number} smoothTime  ثانية
     */
    setSmoothTime(state, smoothTime) {
        if (this._cfg[state]) this._cfg[state].smoothTime = smoothTime;
    }

    /**
     * ضبط مضاعف التكبير لحالة معينة
     * @param {'overview'|'follower'|'event'} state
     * @param {number} scale
     */
    setScale(state, scale) {
        if (this._cfg[state]) this._cfg[state].scale = scale;
    }

    /**
     * تدوير اللوحة الأساسي (لضبط اتجاه مربع البداية)
     * @param {number} deg  درجات (مثال: 90 لتحريك GO من أسفل يمين إلى أسفل يسار)
     */
    setBoardRotation(deg) {
        this.BOARD_BASE_ROTATION = deg;
    }

    /**
     * إعادة ضبط التكبير اليدوي والعودة للوضع التلقائي
     */
    resetManual() {
        this._manual.active = false;
        this._manual.panX   = 0;
        this._manual.panY   = 0;
        this._manual.scale  = 1.0;
        clearTimeout(this._manual.idleTimer);
    }

    /** الحالة الحالية للقراءة */
    get state() { return this._cur.state; }

    /** Scale الحالي للقراءة */
    get currentScale() { return this._cur.scale * this._manual.scale; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   الإنستانس العالمي — instance واحد للعبة كاملة
═══════════════════════════════════════════════════════════════════════════ */
const camera = new Camera();

/* ── دوال تحويل — للتوافق الكامل مع باقي الملفات ── */

/** اللوحة كاملة */
function camOverview()                                   { camera.overview(); }

/** تتبع رمز اللاعب */
function camFollowSquare(sqIdx)                          { camera.followSquare(sqIdx); }

/** تقريب على حدث */
function camEventFocus(sqIdx, shake, shakeLevel)         { camera.eventFocus(sqIdx, shake, shakeLevel); }

/** شيم للنداءات القديمة التي تمرر زاوية tilt */
function camAnimTo(tilt) {
    if      (tilt <= 28) camera.eventFocus(camera._cur.eventSq);
    else if (tilt <= 33) camera.followSquare(camera._cur.followSq);
    else                 camera.overview();
}

/** إعادة ضبط يدوي */
function camResetManual()                                { camera.resetManual(); }

/* ── الحالة الافتراضية عند تحميل الصفحة ── */
camera.overview();
