'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس الكاميرا — نظام كاميرا ثلاثي الحالات
   Camera Class — 3-state professional camera system

   الحالة 1 OVERVIEW  : اللوحة كاملة، ثابتة
   الحالة 2 FOLLOWER  : تتبع سلس للرمز المتحرك
   الحالة 3 EVENT     : تقريب على خلية مهمة
═══════════════════════════════════════════════════════════════ */
class Camera {

    constructor() {
        // عنصر DOM للوحة (يُحوَّل بـ CSS transform)
        this._board = document.getElementById('boardGrid');

        // ── أسماء الحالات ──
        this.STATE = { OVERVIEW: 'overview', FOLLOWER: 'follower', EVENT: 'event' };

        // ── القيم الحالية للكاميرا (تتغير كل فريم) ──
        this._c = {
            tilt:     38,    // rotateX بالدرجات
            spin:     45,    // rotateZ بالدرجات
            scale:    1.0,
            panX:     0,
            panY:     0,
            // سرعات SmoothDamp
            velScale: 0,
            velX:     0,
            velY:     0,
            velTilt:  0,
            velSpin:  0,
            // اهتزاز الكاميرا
            shakeAmp: 0,
            shakeDec: 0,
            // آلة الحالة
            state:    'overview',
            followSq: 0,
            eventSq:  0,
        };

        // ── إعدادات كل حالة — تعديل هنا يغير زوايا الكاميرا ──
        this._cfg = {
            overview: { tilt: 38, spin: 45, scale: 1.00, offsetY:  0,     smoothTime: 0.55 },
            follower: { tilt: 30, spin: 45, scale: 1.38, offsetY: -0.08,  smoothTime: 0.28 },
            event:    { tilt: 26, spin: 45, scale: 1.55, offsetY: -0.06,  smoothTime: 0.18 },
        };

        this._BOARD_CENTER = { x: 330, y: 330 };
        this._lastT = 0;

        this._startLoop();
        this._bindTouch();
    }

    /* ══════════════════════════════════════════════════════════
       SmoothDamp — مكافئ Unity SmoothDamp لانتقالات سلسة
    ══════════════════════════════════════════════════════════ */
    _smoothDamp(current, target, velocity, smoothTime, dt) {
        const omega = 2 / smoothTime;
        const x     = omega * dt;
        const exp   = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = current - target;
        const temp   = (velocity + omega * change) * dt;
        velocity     = (velocity - omega * temp) * exp;
        return { value: target + (change + temp) * exp, vel: velocity };
    }

    /* ══════════════════════════════════════════════════════════
       حساب إزاحة التدوير لتمركز الكاميرا على خلية معينة
    ══════════════════════════════════════════════════════════ */
    _squarePanOffset(sqIdx, scaleMult) {
        const pos = SQ_CENTERS_GAME[sqIdx % 40];
        if (!pos) return { x: 0, y: 0 };
        const cfg  = this._cfg[this._c.state];
        const dx   = pos.x - this._BOARD_CENTER.x;
        const dy   = pos.y - this._BOARD_CENTER.y;
        const cosT = Math.cos(38 * Math.PI / 180);
        const vOff = cfg.offsetY * 660;
        return {
            x: -(dx) / scaleMult,
            y: -(dy * cosT) / scaleMult + vOff / scaleMult,
        };
    }

    /* ══════════════════════════════════════════════════════════
       تطبيق قيم الكاميرا على DOM
    ══════════════════════════════════════════════════════════ */
    _apply() {
        const now = performance.now() * 0.001;
        const sx  = this._c.shakeAmp * Math.sin(now * 47) * Math.cos(now * 31);
        const sy  = this._c.shakeAmp * Math.sin(now * 37) * Math.cos(now * 53);
        this._c.shakeAmp = Math.max(0, this._c.shakeAmp - this._c.shakeDec * (1 / 60));
        this._board.style.transform =
            `perspective(900px) ` +
            `rotateX(${this._c.tilt}deg) ` +
            `rotateZ(${this._c.spin}deg) ` +
            `scale(${this._c.scale}) ` +
            `translate(${this._c.panX + sx}px,${this._c.panY + sy}px)`;
    }

    /* ══════════════════════════════════════════════════════════
       حلقة التحديث — تعمل كل فريم
    ══════════════════════════════════════════════════════════ */
    _startLoop() {
        const loop = (now) => {
            requestAnimationFrame(loop);
            const dt = Math.min((now - this._lastT) / 1000, 0.05);
            if (dt <= 0) { this._lastT = now; return; }
            this._lastT = now;

            const cfg = this._cfg[this._c.state];
            let tgtScale = cfg.scale, tgtPanX = 0, tgtPanY = 0;

            // حساب الإزاحة حسب الحالة
            if (this._c.state === this.STATE.FOLLOWER) {
                const off = this._squarePanOffset(this._c.followSq, tgtScale);
                tgtPanX = off.x; tgtPanY = off.y;
            } else if (this._c.state === this.STATE.EVENT) {
                const off = this._squarePanOffset(this._c.eventSq, tgtScale);
                tgtPanX = off.x; tgtPanY = off.y;
            }

            // تطبيق SmoothDamp على كل بُعد
            let sd;
            sd = this._smoothDamp(this._c.scale, tgtScale,   this._c.velScale, cfg.smoothTime,       dt); this._c.scale  = sd.value; this._c.velScale = sd.vel;
            sd = this._smoothDamp(this._c.panX,  tgtPanX,    this._c.velX,     cfg.smoothTime,       dt); this._c.panX   = sd.value; this._c.velX     = sd.vel;
            sd = this._smoothDamp(this._c.panY,  tgtPanY,    this._c.velY,     cfg.smoothTime,       dt); this._c.panY   = sd.value; this._c.velY     = sd.vel;
            sd = this._smoothDamp(this._c.tilt,  cfg.tilt,   this._c.velTilt,  cfg.smoothTime * 1.2, dt); this._c.tilt   = sd.value; this._c.velTilt  = sd.vel;
            sd = this._smoothDamp(this._c.spin,  cfg.spin,   this._c.velSpin,  cfg.smoothTime * 1.2, dt); this._c.spin   = sd.value; this._c.velSpin  = sd.vel;

            this._apply();
        };
        requestAnimationFrame(loop);
    }

    /* ══════════════════════════════════════════════════════════
       واجهة عامة — ثلاث حالات
    ══════════════════════════════════════════════════════════ */

    /**
     * الحالة 1 — OVERVIEW: اللوحة كاملة، لا تتبع
     */
    overview() {
        this._c.state = this.STATE.OVERVIEW;
        document.getElementById('camFlash').classList.remove('on');
    }

    /**
     * الحالة 2 — FOLLOWER: تتبع الرمز خطوة بخطوة
     * @param {number} sqIdx - رقم الخلية المتبوعة
     */
    followSquare(sqIdx) {
        this._c.state    = this.STATE.FOLLOWER;
        this._c.followSq = sqIdx;
    }

    /**
     * الحالة 3 — EVENT: تقريب على خلية مهمة مع اهتزاز اختياري
     * @param {number}  sqIdx      - رقم الخلية
     * @param {boolean} shake      - تشغيل الاهتزاز؟
     * @param {string}  shakeLevel - شدة الاهتزاز: light|medium|heavy
     */
    eventFocus(sqIdx, shake = false, shakeLevel = 'medium') {
        this._c.state   = this.STATE.EVENT;
        this._c.eventSq = sqIdx;
        const flash = document.getElementById('camFlash');
        flash.classList.add('on');
        setTimeout(() => flash.classList.remove('on'), 350);
        if (shake) {
            const amps = { light: 3.5, medium: 8, heavy: 16 };
            this._c.shakeAmp = amps[shakeLevel] || 8;
            this._c.shakeDec = this._c.shakeAmp / (shakeLevel === 'heavy' ? 45 : 30);
            fx.haptic(shakeLevel);
        }
    }

    /* ══════════════════════════════════════════════════════════
       اللمس والتكبير باليد
    ══════════════════════════════════════════════════════════ */
    _bindTouch() {
        const ba = document.getElementById('boardArea');
        let t1x = 0, t1y = 0, pDist = 0;
        let isPin = false, isDrag = false;
        let manualPanX = 0, manualPanY = 0, manualScale = 1;
        const SCALE_MIN = 0.7, SCALE_MAX = 2.8;

        const applyManual = () => {
            ba.style.transformOrigin = 'center center';
            this._board.style.transform =
                `perspective(900px) rotateX(${this._c.tilt}deg) rotateZ(${this._c.spin}deg) ` +
                `scale(${this._c.scale * manualScale}) ` +
                `translate(${manualPanX / this._c.scale}px,${manualPanY / this._c.scale}px)`;
        };

        ba.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                isDrag = true; isPin = false;
                t1x = e.touches[0].clientX; t1y = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                isPin = true; isDrag = false;
                pDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
            }
            e.stopPropagation();
        }, { passive: true });

        ba.addEventListener('touchmove', e => {
            if (isDrag && e.touches.length === 1) {
                manualPanX += (e.touches[0].clientX - t1x) * 0.55;
                manualPanY += (e.touches[0].clientY - t1y) * 0.55;
                t1x = e.touches[0].clientX; t1y = e.touches[0].clientY;
                applyManual();
            } else if (isPin && e.touches.length === 2) {
                const d = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
                manualScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, manualScale * d / pDist));
                pDist = d;
                applyManual();
            }
            e.stopPropagation();
        }, { passive: true });

        ba.addEventListener('touchend', e => {
            if (e.touches.length === 0) { isDrag = false; isPin = false; }
        }, { passive: true });

        ba.addEventListener('wheel', e => {
            e.preventDefault();
            manualScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX,
                manualScale * (e.deltaY > 0 ? 0.92 : 1.09)));
            applyManual();
        }, { passive: false });
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const camera = new Camera();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function camOverview()                            { camera.overview(); }
function camFollowSquare(sqIdx)                   { camera.followSquare(sqIdx); }
function camEventFocus(sqIdx, shake, shakeLevel)  { camera.eventFocus(sqIdx, shake, shakeLevel); }
function camAnimTo(tilt) {
    // شيم للنداءات القديمة — يحوّل الزاوية إلى حالة
    if      (tilt <= 28) camera._c.state = camera.STATE.EVENT;
    else if (tilt <= 33) camera._c.state = camera.STATE.FOLLOWER;
    else                 camera._c.state = camera.STATE.OVERVIEW;
}

// ضبط الحالة الافتراضية
camera.overview();
