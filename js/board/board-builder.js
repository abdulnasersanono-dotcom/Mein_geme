'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس بناء اللوحة — يُولِّد SVG اللوحة من بيانات SQ
   BoardBuilder Class — generates the SVG board from square data
   يعتمد على: js/data/board-squares.js (SQ, sqMap, PC)
═══════════════════════════════════════════════════════════════ */
class BoardBuilder {

    constructor() {
        // ── أبعاد اللوحة (بكسل) ──
        this.B  = 660;                          // الحجم الكلي للوحة
        this.C  = 96;                           // حجم خلية الزاوية
        this.S  = (660 - 2 * 96) / 9;          // عرض خلية الجانب
        this.CB = 18;                           // سماكة شريط اللون

        // ألوان خلفية الخلايا الخاصة
        this._specBg = {
            lant: 'rgba(200,148,8,.12)',
            firm: 'rgba(90,8,8,.13)',
            gate: 'rgba(10,10,90,.11)',
            util: 'rgba(8,75,85,.11)',
            tax:  'rgba(115,8,8,.11)',
        };
    }

    /* ══════════════════════════════════════════════════════════
       بناء خلية واحدة وإعادة HTML الـ SVG الخاص بها
       @param {number} id   - رقم الخلية (0–39)
       @param {number} x,y  - موضع الزاوية العلوية اليسرى
       @param {number} w,h  - أبعاد الخلية
       @param {string} side - اتجاه الخلية: bottom|right|top|left
    ══════════════════════════════════════════════════════════ */
    _buildCell(id, x, y, w, h, side) {
        const s = sqMap[id];
        if (!s) return '';

        const cx  = x + w / 2;
        const cy  = y + h / 2;
        const rot = { bottom: 0, right: -90, top: 180, left: 90 }[side];

        // ── خلية الانطلاق (GO) ──
        if (s.t === 'go') {
            const ay = cy + 20;
            return `<g>
<defs><linearGradient id="goBg" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#1A5A28"/>
  <stop offset="100%" stop-color="#0C3418"/>
</linearGradient></defs>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#goBg)" stroke="#8B6914" stroke-width=".7"/>
<text x="${cx}" y="${cy-28}" text-anchor="middle" font-size="7.5" fill="rgba(160,255,140,.7)" font-family="Georgia,serif">انطلق</text>
<text x="${cx+1}" y="${cy-2}" text-anchor="middle" font-size="32" fill="rgba(0,0,0,.28)" font-weight="900" font-family="Impact,sans-serif">GO</text>
<text x="${cx}" y="${cy-3}" text-anchor="middle" font-size="32" fill="#FFFFFF" font-weight="900" font-family="Impact,sans-serif">GO</text>
<path d="M ${cx+20} ${ay} Q ${cx+2} ${ay+15} ${cx-20} ${ay}" fill="none" stroke="#FFD060" stroke-width="3.5" stroke-linecap="round"/>
<polygon points="${cx-20},${ay} ${cx-11},${ay-7} ${cx-11},${ay+7}" fill="#FFD060"/>
<text x="${cx}" y="${cy+39}" text-anchor="middle" font-size="6" fill="rgba(200,255,160,.5)" font-family="monospace">+200 din</text>
</g>`;
        }

        // ── خلايا الزوايا (سجن، استراحة، اذهب للسجن) ──
        if (s.t === 'corn') {
            return `<g>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${s.bg}" stroke="#8B6914" stroke-width=".7"/>
<text x="${cx}" y="${cy-17}" text-anchor="middle" font-size="26" dominant-baseline="middle">${s.i}</text>
<text x="${cx}" y="${cy+8}" text-anchor="middle" font-size="9" fill="#FFD060" font-weight="900" font-family="Georgia,serif">${s.n}</text>
${s.s2 ? `<text x="${cx}" y="${cy+22}" text-anchor="middle" font-size="6.5" fill="rgba(255,215,0,.45)">${s.s2}</text>` : ''}
</g>`;
        }

        // ── خلايا بقية الأنواع (عقار، بوابة، مرفق، ضريبة، بطاقة) ──
        const isNavy = s.ml === 'navy';
        const bg     = s.t === 'prop'
            ? (isNavy ? 'url(#navyCell)' : 'rgba(255,250,232,.97)')
            : (this._specBg[s.t] || 'rgba(245,232,200,.92)');

        // حساب موضع شريط اللون حسب اتجاه الخلية
        let cbx = x, cby = y, cbw = w, cbh = this.CB;
        if (s.t === 'prop') {
            if      (side === 'bottom') { cby = y;                cbh = this.CB; cbw = w; }
            else if (side === 'right')  { cbx = x;                cbw = this.CB; cbh = h; }
            else if (side === 'top')    { cby = y + h - this.CB;  cbh = this.CB; cbw = w; }
            else                        { cbx = x + w - this.CB;  cbw = this.CB; cbh = h; }
        }

        const bandFill  = isNavy ? 'url(#navyBand)' : (s.c || '#888');
        const nameColor = s.t === 'firm' ? '#6A0808' : s.t === 'lant' ? '#6B4500' : '#1a0800';

        // نص السعر أو التكلفة أسفل الخلية
        let priceText = '';
        if (s.p)
            priceText = `<text x="${cx}" y="${cy+19}" text-anchor="middle" font-size="5.8" fill="#3a2000" font-family="'Courier New',monospace" dominant-baseline="middle">${s.p} din</text>`;
        else if (s.sub)
            priceText = `<text x="${cx}" y="${cy+19}" text-anchor="middle" font-size="6.5" fill="#8A0000" font-weight="bold" font-family="monospace" dominant-baseline="middle">-${s.sub} din</text>`;
        else if (s.t === 'gate')
            priceText = `<text x="${cx}" y="${cy+19}" text-anchor="middle" font-size="5.8" fill="#10105A" font-family="monospace" dominant-baseline="middle">200 din</text>`;
        else if (s.t === 'util')
            priceText = `<text x="${cx}" y="${cy+19}" text-anchor="middle" font-size="5.8" fill="#0A3A3A" font-family="monospace" dominant-baseline="middle">150 din</text>`;

        return `<g>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" stroke="#8B6914" stroke-width=".7"/>
${s.t === 'prop' ? `<rect x="${cbx}" y="${cby}" width="${cbw}" height="${cbh}" fill="${bandFill}"/>` : ''}
<g transform="rotate(${rot},${cx},${cy})">
${s.i ? `<text x="${cx}" y="${cy-9}" text-anchor="middle" font-size="13" dominant-baseline="middle">${s.i}</text>` : ''}
<text x="${cx}" y="${cy+6}" text-anchor="middle" font-size="7.2" fill="${nameColor}" font-weight="800" font-family="Georgia,serif" dominant-baseline="middle">${s.n}</text>
${priceText}
</g>
</g>`;
    }

    /* ══════════════════════════════════════════════════════════
       رسم نجمة ثمانية الرؤوس — للزينة في المنتصف
       @param {number} cx,cy - المركز
       @param {number} r1    - نصف قطر خارجي
       @param {number} r2    - نصف قطر داخلي
    ══════════════════════════════════════════════════════════ */
    _starBurst(cx, cy, r1, r2) {
        return Array.from({ length: 16 }, (_, i) => {
            const a = i * Math.PI / 8 - Math.PI / 2;
            const r = i % 2 ? r2 : r1;
            return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        }).join(' ');
    }

    /* ══════════════════════════════════════════════════════════
       بناء اللوحة كاملةً وحقنها في boardSvg
    ══════════════════════════════════════════════════════════ */
    buildBoard() {
        const { B, C, S } = this;
        const mid  = B / 2;
        let cells  = '';

        // الصف السفلي (خلايا 0–10، من اليمين لليسار)
        for (let i = 0; i <= 10; i++) {
            const isCorner = i === 0 || i === 10;
            const w = isCorner ? C : S;
            const x = i === 0 ? B - C : i === 10 ? 0 : B - C - i * S;
            cells += this._buildCell(i, x, B - C, w, C, 'bottom');
        }

        // العمود الأيسر (خلايا 11–19)
        for (let i = 0; i < 9; i++)
            cells += this._buildCell(11 + i, 0, B - C - (i + 1) * S, C, S, 'left');

        // الصف العلوي (خلايا 20–30، من اليسار لليمين)
        for (let i = 0; i <= 10; i++) {
            const isCorner = i === 0 || i === 10;
            const w = isCorner ? C : S;
            const x = i === 0 ? 0 : i === 10 ? B - C : C + (i - 1) * S;
            cells += this._buildCell(20 + i, x, 0, w, C, 'top');
        }

        // العمود الأيمن (خلايا 31–39)
        for (let i = 0; i < 9; i++)
            cells += this._buildCell(31 + i, B - C, C + i * S, C, S, 'right');

        // حقن SVG الكامل
        document.getElementById('boardSvg').innerHTML = `
<defs>
  <!-- نمط خلفية المنتصف -->
  <pattern id="bgTile" width="44" height="44" patternUnits="userSpaceOnUse">
    <rect width="44" height="44" fill="#1F1000"/>
    <path d="M22 0L44 22L22 44L0 22Z" fill="none" stroke="#6B3A00" stroke-width=".55" opacity=".26"/>
    <circle cx="22" cy="22" r="8.5" fill="none" stroke="#6B3A00" stroke-width=".28" opacity=".16"/>
  </pattern>
  <!-- تدرجات الألوان -->
  <linearGradient id="parchment" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#F5E6C0"/>
    <stop offset="55%" stop-color="#EDDAA0"/>
    <stop offset="100%" stop-color="#E0C470"/>
  </linearGradient>
  <radialGradient id="centerBg" cx="50%" cy="50%" r="55%">
    <stop offset="0%" stop-color="#2C1400" stop-opacity=".97"/>
    <stop offset="100%" stop-color="#100600" stop-opacity=".99"/>
  </radialGradient>
  <linearGradient id="navyBand" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#040C28"/>
    <stop offset="50%" stop-color="#3858D8"/>
    <stop offset="100%" stop-color="#040C28"/>
  </linearGradient>
  <linearGradient id="navyCell" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#F0F4FF"/>
    <stop offset="100%" stop-color="#D5DEFF"/>
  </linearGradient>
  <!-- فلتر التوهج للرموز -->
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<!-- خلفية اللوحة -->
<rect width="${B}" height="${B}" fill="#0d0600"/>
<rect x="2" y="2" width="${B-4}" height="${B-4}" fill="url(#parchment)" rx="2"/>

<!-- منطقة المنتصف -->
<rect x="${C}" y="${C}" width="${B-2*C}" height="${B-2*C}" fill="url(#bgTile)" rx="2"/>
<rect x="${C}" y="${C}" width="${B-2*C}" height="${B-2*C}" fill="url(#centerBg)" rx="2"/>

<!-- خلايا اللوحة -->
${cells}

<!-- إطار المنتصف -->
<rect x="${C}" y="${C}" width="${B-2*C}" height="${B-2*C}" fill="none" stroke="#8B6914" stroke-width="2"/>

<!-- زخارف المنتصف -->
<circle cx="${mid}" cy="${mid}" r="113" fill="none" stroke="#8B6914" stroke-width=".6" stroke-dasharray="6 4" opacity=".28"/>
<polygon points="${this._starBurst(mid,mid,97,44)}" fill="none" stroke="#8B6914" stroke-width=".8" opacity=".26"/>
<polygon points="${this._starBurst(mid,mid,97,44)}" fill="none" stroke="#C4A040" stroke-width=".4" opacity=".14" transform="rotate(22.5,${mid},${mid})"/>
${[0,45,90,135,180,225,270,315].map(a =>
    `<ellipse cx="${mid}" cy="${mid-57}" rx="9" ry="19" fill="none" stroke="#8B6914" stroke-width=".4" opacity=".18" transform="rotate(${a},${mid},${mid})"/>`
).join('')}

<!-- دائرة المركز -->
<circle cx="${mid}" cy="${mid}" r="67" fill="#1C0C00" opacity=".9"/>
<circle cx="${mid}" cy="${mid}" r="64" fill="none" stroke="#C4A040" stroke-width="1.3" opacity=".47"/>

<!-- بطاقة الفانوس -->
<rect x="${mid-92}" y="${mid-48}" width="72" height="57" rx="5" fill="rgba(180,130,0,.10)" stroke="rgba(200,160,0,.35)" stroke-width=".8"/>
<text x="${mid-56}" y="${mid-27}" text-anchor="middle" font-size="18">🪔</text>
<text x="${mid-56}" y="${mid-8}" text-anchor="middle" font-size="6.5" fill="#D4A020" font-weight="bold">الفانوس السحري</text>
<text x="${mid-56}" y="${mid+6}" text-anchor="middle" font-size="5" fill="rgba(210,160,20,.58)">ميزات فقط</text>

<!-- بطاقة الفرمان -->
<rect x="${mid+20}" y="${mid-48}" width="72" height="57" rx="5" fill="rgba(80,10,10,.11)" stroke="rgba(150,40,40,.38)" stroke-width=".8"/>
<text x="${mid+56}" y="${mid-27}" text-anchor="middle" font-size="18">📜</text>
<text x="${mid+56}" y="${mid-8}" text-anchor="middle" font-size="6.5" fill="#C03030" font-weight="bold">فرمان الوالي</text>
<text x="${mid+56}" y="${mid+6}" text-anchor="middle" font-size="5" fill="rgba(190,60,60,.58)">عقوبات فقط</text>

<!-- اسم اللعبة -->
<text x="${mid}" y="${mid+22}" text-anchor="middle" font-size="13" fill="#FFD060" font-weight="900" font-family="Impact,sans-serif" filter="url(#glow)" letter-spacing="2">SILK ROAD</text>
<text x="${mid}" y="${mid+37}" text-anchor="middle" font-size="8.5" fill="#C4A040">The Golden Era</text>
<text x="${mid}" y="${mid+52}" text-anchor="middle" font-size="8.5" fill="#C4A040" font-family="serif">🐪  درب الأمصار  🐪</text>

<!-- نقاط زوايا اللوحة -->
${[[C,C],[B-C,C],[C,B-C],[B-C,B-C]].map(([px,py]) =>
    `<circle cx="${px}" cy="${py}" r="6" fill="#8B6914" opacity=".52"/>`
).join('')}

<!-- الإطار الخارجي -->
<rect x="1" y="1" width="${B-2}" height="${B-2}" fill="none" stroke="#5A3808" stroke-width="5" rx="3"/>
<rect x="10" y="10" width="${B-20}" height="${B-20}" fill="none" stroke="#9B7A14" stroke-width="1.2" rx="2"/>`;
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const boardBuilder = new BoardBuilder();

// ── دالة تحويل للتوافق مع الكود القديم ──
function buildBoard() { boardBuilder.buildBoard(); }

// بناء اللوحة فور تحميل الملف
boardBuilder.buildBoard();
