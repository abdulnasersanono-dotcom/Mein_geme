'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس رسم النرد — أنيميشن نرد ثنائي الأبعاد على canvas
   DiceRenderer Class — animated 2D canvas dice on the board
   تعديل هذا الملف يغير شكل وحركة النرد
═══════════════════════════════════════════════════════════════ */
class DiceRenderer {

    constructor() {
        // إنشاء canvas النرد وتثبيته فوق اللوحة
        this._canvas = document.createElement('canvas');
        this._canvas.id = 'diceCanvas';
        this._canvas.style.cssText =
            'position:absolute;left:0;top:0;width:100%;height:100%;' +
            'pointer-events:none;z-index:30;';
        document.getElementById('boardArea').appendChild(this._canvas);

        // رقم الفريم الحالي لإلغاء الأنيميشن عند الحاجة
        this._rafId = null;

        // مواضع النقاط على كل وجه (مُطبَّعة 0–1)
        this._DOTS = {
            1: [[.5,  .5]],
            2: [[.25, .28], [.75, .72]],
            3: [[.25, .25], [.5,  .5],  [.75, .75]],
            4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]],
            5: [[.28, .28], [.72, .28], [.5,  .5],  [.28, .72], [.72, .72]],
            6: [[.28, .22], [.72, .22], [.28, .5],  [.72, .5],  [.28, .78], [.72, .78]],
        };
    }

    /* ══════════════════════════════════════════════════════════
       رسم نرد واحد على الـ canvas
    ══════════════════════════════════════════════════════════ */
    _drawDie(ctx, x, y, sz, face, rotation) {
        ctx.save();
        ctx.translate(x + sz / 2, y + sz / 2);
        ctx.rotate(rotation);

        // الظل
        ctx.shadowColor   = 'rgba(0,0,0,.55)';
        ctx.shadowBlur    = 10;
        ctx.shadowOffsetY = 3;

        // جسم النرد
        const grad = ctx.createLinearGradient(-sz/2, -sz/2, sz/2, sz/2);
        grad.addColorStop(0, '#FFFEF5');
        grad.addColorStop(1, '#F0E8D0');
        ctx.beginPath();
        this._roundRect(ctx, -sz/2, -sz/2, sz, sz, sz * 0.14);
        ctx.fillStyle = grad;
        ctx.fill();

        // الحافة
        ctx.shadowColor  = 'transparent';
        ctx.strokeStyle  = 'rgba(180,140,60,.55)';
        ctx.lineWidth    = 1.5;
        ctx.stroke();

        // بريق علوي
        ctx.beginPath();
        this._roundRect(ctx, -sz/2, -sz/2, sz * 0.95, sz * 0.48, sz * 0.12);
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.fill();

        // نقاط الوجه
        const dots = this._DOTS[face] || this._DOTS[1];
        ctx.shadowColor   = 'rgba(0,0,0,.3)';
        ctx.shadowBlur    = 2;
        ctx.shadowOffsetY = 1;
        dots.forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc((dx - .5) * sz, (dy - .5) * sz, sz * 0.075, 0, Math.PI * 2);
            ctx.fillStyle = '#2a1800';
            ctx.fill();
        });

        ctx.restore();
    }

    /* رسم مستطيل بزوايا دائرية */
    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);         ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
        ctx.lineTo(x + w, y + h - r);     ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);         ctx.quadraticCurveTo(x,     y + h, x, y + h - r);
        ctx.lineTo(x, y + r);             ctx.quadraticCurveTo(x,     y,     x + r, y);
        ctx.closePath();
    }

    /* ══════════════════════════════════════════════════════════
       عرض أنيميشن رمي النرد
       @param {number} d1  - قيمة النرد الأول
       @param {number} d2  - قيمة النرد الثاني
       @param {string} msg - النص أسفل النرد
    ══════════════════════════════════════════════════════════ */
    show(d1, d2, msg) {
        const dc = this._canvas;
        if (!dc) return;

        dc.width  = dc.offsetWidth  || 400;
        dc.height = dc.offsetHeight || 300;
        const ctx = dc.getContext('2d');

        const W = dc.width, H = dc.height;
        const sz     = Math.min(W, H) * 0.12;
        const gap    = sz * 0.22;
        const totalW = sz * 2 + gap;
        const cx = W / 2, cy = H / 2;
        const x1 = cx - totalW / 2;
        const x2 = x1 + sz + gap;
        const y0 = cy - sz / 2;

        let frame = 0;
        const TOTAL_FRAMES = 38;
        let lastD1 = 1, lastD2 = 1;

        cancelAnimationFrame(this._rafId);

        const animFrame = () => {
            ctx.clearRect(0, 0, W, H);
            const progress = frame / TOTAL_FRAMES;
            const settling = progress > 0.7;
            const spinRate = settling ? 0.05 * (1 - progress) * 4 : 0.45;

            const r1 = (frame * spinRate * Math.PI) % (Math.PI * 2);
            const r2 = (frame * spinRate * Math.PI * 1.3 + 1.2) % (Math.PI * 2);

            // وجوه عشوائية أثناء الدوران، الوجه الحقيقي عند الاستقرار
            const f1 = settling ? d1 : Math.ceil(Math.random() * 6);
            const f2 = settling ? d2 : Math.ceil(Math.random() * 6);
            if (!settling) { lastD1 = f1; lastD2 = f2; }

            const fr1     = settling ? r1 * (1 - progress) * 3 : r1;
            const fr2     = settling ? r2 * (1 - progress) * 3 : r2;
            const bounceY = settling ? 0 : Math.sin(frame * 0.4) * sz * 0.18 * (1 - progress);

            this._drawDie(ctx, x1, y0 - bounceY, sz, settling ? d1 : lastD1, fr1);
            this._drawDie(ctx, x2, y0 + bounceY, sz, settling ? d2 : lastD2, fr2);
            frame++;

            if (frame <= TOTAL_FRAMES) {
                this._rafId = requestAnimationFrame(animFrame);
            } else {
                // عرض النتيجة النهائية ثم التلاشي
                ctx.clearRect(0, 0, W, H);
                this._drawDie(ctx, x1, y0, sz, d1, 0);
                this._drawDie(ctx, x2, y0, sz, d2, 0);
                ctx.font      = `bold ${sz * 0.32}px 'Courier New',monospace`;
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,210,50,.92)';
                ctx.fillText(msg, cx, y0 + sz + sz * 0.38);

                // تلاشي بعد 1.6 ثانية
                setTimeout(() => {
                    let alpha = 1;
                    const fadeOut = () => {
                        ctx.clearRect(0, 0, W, H);
                        ctx.globalAlpha = alpha;
                        this._drawDie(ctx, x1, y0, sz, d1, 0);
                        this._drawDie(ctx, x2, y0, sz, d2, 0);
                        ctx.font      = `bold ${sz * 0.32}px 'Courier New',monospace`;
                        ctx.fillStyle = `rgba(255,210,50,${alpha * .92})`;
                        ctx.fillText(msg, cx, y0 + sz + sz * 0.38);
                        ctx.globalAlpha = 1;
                        alpha -= 0.045;
                        if (alpha > 0) requestAnimationFrame(fadeOut);
                        else ctx.clearRect(0, 0, W, H);
                    };
                    requestAnimationFrame(fadeOut);
                }, 1600);
            }
        };

        this._rafId = requestAnimationFrame(animFrame);
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const diceRenderer = new DiceRenderer();

// ── دالة تحويل للتوافق مع النداءات الموجودة ──
function showDiceToast(d1, d2, msg) { diceRenderer.show(d1, d2, msg); }
