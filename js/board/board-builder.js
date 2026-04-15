'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   BoardBuilder — بنّاء لوحة درب الحرير
   توليد SVG احترافي كامل للوحة اللعبة

   يعتمد على:
     js/data/board-squares.js  ← SQ[], sqMap{}, PC{}
     (الكلاس لا يعرّف البيانات، يستهلكها فقط)

   الواجهة العامة (توافق مع باقي الملفات):
     boardBuilder.buildBoard()   ← البناء الرئيسي
     buildBoard()                ← شيم للنداءات القديمة

   يحقن النتيجة في:
     <svg id="boardSvg">  داخل  <div id="boardGrid">

   أبعاد اللوحة:
     660 × 660 px
     خلايا الزوايا : 96 × 96
     خلايا الجانب  : 52 × 96  (تقريباً)
═══════════════════════════════════════════════════════════════════════════ */

class BoardBuilder {

    constructor() {
        /* ── أبعاد اللوحة ── */
        this.B  = 660;                          // الحجم الكلي
        this.C  = 96;                           // حجم خلية الزاوية
        this.S  = (660 - 2 * 96) / 9;          // عرض خلية الجانب ≈ 52.44
        this.CB = 20;                           // سماكة شريط اللون

        /* ── ألوان الأنواع الخاصة ── */
        this._SPEC_BG = {
            lant: '#FFF8E6',   // بطاقة الفانوس
            firm: '#FFF0F0',   // بطاقة الفرمان
            gate: '#EEF2FF',   // بوابة / محطة
            util: '#E8F5F0',   // مرفق
            tax:  '#FFF0EC',   // ضريبة / جمارك
        };

        this._SPEC_ICON_COLOR = {
            lant: '#B07800',
            firm: '#8A0000',
            gate: '#1A2B9A',
            util: '#005C44',
            tax:  '#7A2000',
        };
    }

    /* ══════════════════════════════════════════════════════════════════════
       دوال SVG المساعدة
    ══════════════════════════════════════════════════════════════════════ */

    /** مستطيل مع حدود */
    _rect(x, y, w, h, fill, stroke = '#8B6914', sw = 0.8, rx = 0) {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="${rx}"/>`;
    }

    /** نص SVG */
    _text(x, y, content, size, fill, weight = 'normal', anchor = 'middle', extra = '') {
        return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${fill}" font-weight="${weight}" dominant-baseline="middle" font-family="'Scheherazade New','Amiri',Georgia,serif" ${extra}>${content}</text>`;
    }

    /** نقطة تحويل مجموعة */
    _g(content, transform = '') {
        return transform ? `<g transform="${transform}">${content}</g>` : `<g>${content}</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       بناء خلية واحدة
       @param {number} id   رقم الخلية 0–39
       @param {number} x,y  الزاوية العلوية اليسرى
       @param {number} w,h  الأبعاد
       @param {string} side bottom | right | top | left
    ══════════════════════════════════════════════════════════════════════ */
    _buildCell(id, x, y, w, h, side) {
        const s = sqMap[id];
        if (!s) return `<!-- missing sq ${id} -->`;

        const cx  = x + w / 2;
        const cy  = y + h / 2;

        switch (s.t) {
            case 'go':    return this._cellGo(s, x, y, w, h, cx, cy);
            case 'corn':  return this._cellCorner(s, x, y, w, h, cx, cy);
            case 'prop':  return this._cellProp(s, id, x, y, w, h, cx, cy, side);
            default:      return this._cellSpecial(s, id, x, y, w, h, cx, cy, side);
        }
    }

    /* ══════════════════════════════════════════════════════════════════════
       خلية GO — الانطلاق
    ══════════════════════════════════════════════════════════════════════ */
    _cellGo(s, x, y, w, h, cx, cy) {
        const { C } = this;
        return `<g id="sq-go">
  <defs>
    <linearGradient id="goBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#16522A"/>
      <stop offset="100%" stop-color="#0A2D16"/>
    </linearGradient>
    <radialGradient id="goGlow" cx="50%" cy="45%" r="50%">
      <stop offset="0%"   stop-color="#3AFF70" stop-opacity=".18"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  ${this._rect(x, y, w, h, 'url(#goBg)', '#5A9A30', 1.5)}
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#goGlow)"/>

  <!-- إطار داخلي ذهبي -->
  <rect x="${x+4}" y="${y+4}" width="${w-8}" height="${h-8}" fill="none" stroke="#8FCC50" stroke-width=".7" rx="4" stroke-dasharray="4 3" opacity=".55"/>

  <!-- نص انطلق -->
  <text x="${cx}" y="${cy-30}" text-anchor="middle" font-size="7.5"
    fill="rgba(180,255,140,.75)" font-family="'Amiri',serif" font-weight="bold">${s.n || 'انطلق'}</text>

  <!-- GO الكبير -->
  <text x="${cx+1.5}" y="${cy-4}" text-anchor="middle" font-size="34"
    fill="rgba(0,0,0,.35)" font-weight="900" font-family="'Impact','Arial Black',sans-serif">GO</text>
  <text x="${cx}" y="${cy-5}" text-anchor="middle" font-size="34"
    fill="#FFFFFF" font-weight="900" font-family="'Impact','Arial Black',sans-serif"
    filter="url(#goTextGlow)">GO</text>

  <!-- سهم دائري -->
  <path d="M ${cx+22} ${cy+21} Q ${cx} ${cy+36} ${cx-22} ${cy+21}"
    fill="none" stroke="#FFD060" stroke-width="3" stroke-linecap="round"/>
  <polygon points="${cx-22},${cy+21} ${cx-13},${cy+14} ${cx-13},${cy+28}" fill="#FFD060"/>

  <!-- المكافأة -->
  <text x="${cx}" y="${cy+45}" text-anchor="middle" font-size="6"
    fill="rgba(180,255,140,.65)" font-family="monospace">+200 دينار</text>
</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       خلية زاوية — سجن / استراحة / اذهب للسجن
    ══════════════════════════════════════════════════════════════════════ */
    _cellCorner(s, x, y, w, h, cx, cy) {
        return `<g>
  ${this._rect(x, y, w, h, s.bg || '#2A1800', '#8B6914', 1.2)}
  <rect x="${x+4}" y="${y+4}" width="${w-8}" height="${h-8}" fill="none"
    stroke="rgba(200,160,50,.3)" stroke-width=".6" rx="3"/>
  <text x="${cx}" y="${cy-20}" text-anchor="middle" font-size="30"
    dominant-baseline="middle">${s.i || '?'}</text>
  <text x="${cx}" y="${cy+10}" text-anchor="middle" font-size="9.5"
    fill="#FFD060" font-weight="bold" font-family="'Amiri',serif"
    dominant-baseline="middle">${s.n || ''}</text>
  ${s.s2 ? `<text x="${cx}" y="${cy+24}" text-anchor="middle" font-size="6.5"
    fill="rgba(255,215,0,.5)" dominant-baseline="middle">${s.s2}</text>` : ''}
</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       خلية عقار — prop
    ══════════════════════════════════════════════════════════════════════ */
    _cellProp(s, id, x, y, w, h, cx, cy, side) {
        const { CB } = this;
        const isNavy  = s.ml === 'navy';
        const cellBg  = isNavy ? 'url(#navyCell)' : '#FFFAEC';

        // موضع شريط اللون (يكون دائماً نحو الخارج)
        let band = '';
        if (side === 'bottom') {
            band = `<rect x="${x}" y="${y}"           width="${w}"  height="${CB}" fill="${isNavy ? 'url(#navyBand)' : s.c}" rx="0"/>`;
        } else if (side === 'top') {
            band = `<rect x="${x}" y="${y+h-CB}"      width="${w}"  height="${CB}" fill="${isNavy ? 'url(#navyBand)' : s.c}" rx="0"/>`;
        } else if (side === 'right') {
            band = `<rect x="${x}"     y="${y}"        width="${CB}" height="${h}"  fill="${isNavy ? 'url(#navyBand)' : s.c}" rx="0"/>`;
        } else {
            band = `<rect x="${x+w-CB}" y="${y}"       width="${CB}" height="${h}"  fill="${isNavy ? 'url(#navyBand)' : s.c}" rx="0"/>`;
        }

        // تدوير المحتوى حسب الجانب
        const rot = { bottom: 0, right: -90, top: 180, left: 90 }[side];

        // حساب المساحة المتاحة بعد الشريط
        // للأسفل/الأعلى: ارتفاع متاح = h - CB، للأيسر/الأيمن: عرض متاح = h - CB
        const innerH = h - CB;
        const icx = cx, icy = side === 'bottom' ? y + CB + innerH/2 : cy;

        return `<g>
  ${this._rect(x, y, w, h, cellBg, '#B8960A', 0.7)}
  ${band}
  <!-- تظليل الشريط -->
  <rect x="${side === 'bottom' ? x : side === 'top' ? x : side === 'right' ? x : x+w-CB}"
        y="${side === 'bottom' ? y : side === 'top' ? y+h-CB : y}"
        width="${side === 'bottom' || side === 'top' ? w : CB}"
        height="${side === 'bottom' || side === 'top' ? CB : h}"
        fill="rgba(255,255,255,.12)"/>
  <g transform="rotate(${rot},${cx},${cy})">
    <!-- أيقونة أو رمز الخلية -->
    ${s.i ? `<text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="14" dominant-baseline="middle">${s.i}</text>` : ''}
    <!-- اسم الخلية -->
    <text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="6.8"
      fill="#1A0800" font-weight="800" font-family="'Amiri','Scheherazade New',serif"
      dominant-baseline="middle">${s.n || ''}</text>
    <!-- السعر -->
    ${s.p ? `<text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="5.8"
      fill="#3A2000" font-family="'Courier New',monospace" dominant-baseline="middle"
      >${s.p} دينار</text>` : ''}
  </g>
</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       خلية خاصة — bawaba / util / lant / firm / tax
    ══════════════════════════════════════════════════════════════════════ */
    _cellSpecial(s, id, x, y, w, h, cx, cy, side) {
        const bg       = this._SPEC_BG[s.t]       || '#FAF4E8';
        const txtColor = this._SPEC_ICON_COLOR[s.t] || '#2A1000';
        const rot      = { bottom: 0, right: -90, top: 180, left: 90 }[side];

        // خط الإطار الداخلي حسب النوع
        const accentColor = {
            lant: 'rgba(180,120,0,.4)',
            firm: 'rgba(140,0,0,.4)',
            gate: 'rgba(30,50,180,.35)',
            util: 'rgba(0,100,70,.35)',
            tax:  'rgba(160,60,0,.4)',
        }[s.t] || 'rgba(139,105,20,.25)';

        // نص السعر / العقوبة
        let subText = '';
        if (s.sub) {
            subText = `<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="6.2"
              fill="${txtColor}" font-family="monospace" dominant-baseline="middle">−${s.sub} دينار</text>`;
        } else if (s.t === 'gate') {
            subText = `<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="6.2"
              fill="${txtColor}" font-family="monospace" dominant-baseline="middle">200 دينار</text>`;
        } else if (s.t === 'util') {
            subText = `<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="6.2"
              fill="${txtColor}" font-family="monospace" dominant-baseline="middle">150 دينار</text>`;
        } else if (s.p) {
            subText = `<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="6.2"
              fill="${txtColor}" font-family="monospace" dominant-baseline="middle">${s.p} دينار</text>`;
        }

        return `<g>
  ${this._rect(x, y, w, h, bg, accentColor.replace('.', '_').includes('_') ? '#B8960A' : '#B8960A', 0.7)}
  <!-- إطار داخلي ملوّن -->
  <rect x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" fill="none"
    stroke="${accentColor}" stroke-width="1.2" rx="1"/>
  <g transform="rotate(${rot},${cx},${cy})">
    ${s.i ? `<text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="15" dominant-baseline="middle">${s.i}</text>` : ''}
    <text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="6.8"
      fill="${txtColor}" font-weight="800" font-family="'Amiri',serif"
      dominant-baseline="middle">${s.n || ''}</text>
    ${subText}
  </g>
</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       نجمة ثمانية — للزخرفة
    ══════════════════════════════════════════════════════════════════════ */
    _star(cx, cy, r1, r2, points = 8) {
        return Array.from({ length: points * 2 }, (_, i) => {
            const a = i * Math.PI / points - Math.PI / 2;
            const r = i % 2 ? r2 : r1;
            return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
        }).join(' ');
    }

    /* ══════════════════════════════════════════════════════════════════════
       SVG الـ defs الرئيسي — تدرجات، فلاتر، أنماط
    ══════════════════════════════════════════════════════════════════════ */
    _buildDefs() {
        const { B, C } = this;
        const mid = B / 2;
        return `<defs>
  <!-- ═══ تدرجات الخلفية ═══ -->
  <linearGradient id="boardEdge" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"   stop-color="#2C1800"/>
    <stop offset="50%"  stop-color="#1A0E00"/>
    <stop offset="100%" stop-color="#2C1800"/>
  </linearGradient>
  <linearGradient id="parchment" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"   stop-color="#F8EDCC"/>
    <stop offset="40%"  stop-color="#F0DC9E"/>
    <stop offset="100%" stop-color="#DEC460"/>
  </linearGradient>
  <radialGradient id="centerBg" cx="50%" cy="50%" r="55%">
    <stop offset="0%"   stop-color="#2C1600" stop-opacity=".98"/>
    <stop offset="100%" stop-color="#0E0600" stop-opacity="1"/>
  </radialGradient>
  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#FF9900" stop-opacity=".07"/>
    <stop offset="100%" stop-color="transparent"/>
  </radialGradient>

  <!-- ═══ تدرجات العقارات الكحلية ═══ -->
  <linearGradient id="navyBand" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#020C22"/>
    <stop offset="40%"  stop-color="#2A46C8"/>
    <stop offset="100%" stop-color="#020C22"/>
  </linearGradient>
  <linearGradient id="navyCell" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"   stop-color="#EEF2FF"/>
    <stop offset="100%" stop-color="#D8E0FF"/>
  </linearGradient>

  <!-- ═══ نمط خلفية المنتصف ═══ -->
  <pattern id="centerPattern" width="52" height="52" patternUnits="userSpaceOnUse">
    <rect width="52" height="52" fill="#1C0C00"/>
    <path d="M26 0 L52 26 L26 52 L0 26Z" fill="none" stroke="#7A4400" stroke-width=".5" opacity=".3"/>
    <circle cx="26" cy="26" r="10" fill="none" stroke="#6B3800" stroke-width=".3" opacity=".2"/>
    <circle cx="0"  cy="0"  r="3"  fill="#6B3800" opacity=".15"/>
    <circle cx="52" cy="52" r="3"  fill="#6B3800" opacity=".15"/>
    <circle cx="52" cy="0"  r="3"  fill="#6B3800" opacity=".15"/>
    <circle cx="0"  cy="52" r="3"  fill="#6B3800" opacity=".15"/>
  </pattern>

  <!-- ═══ فلاتر الإضاءة ═══ -->
  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="2.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="goTextGlow" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur stdDeviation="1.5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="shadow" x="-5%" y="-5%" width="115%" height="125%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".35"/>
  </filter>

  <!-- ═══ تدرج شريط الإطار الخارجي ═══ -->
  <linearGradient id="borderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#D4A040"/>
    <stop offset="50%"  stop-color="#8B6914"/>
    <stop offset="100%" stop-color="#D4A040"/>
  </linearGradient>
</defs>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       زخارف وسط اللوحة
    ══════════════════════════════════════════════════════════════════════ */
    _buildCenter() {
        const { B, C } = this;
        const mid = B / 2;
        const iw  = B - 2 * C;   // عرض المنطقة الداخلية ≈ 468

        // خطوط الزخرفة الدائرية
        const rings = [108, 90, 72].map((r, i) =>
            `<circle cx="${mid}" cy="${mid}" r="${r}"
              fill="none" stroke="#8B6914" stroke-width="${i === 0 ? 0.8 : 0.4}"
              stroke-dasharray="${i === 2 ? '5 3' : 'none'}" opacity="${0.35 - i*0.08}"/>`
        ).join('\n  ');

        // خطوط الشعاع
        const rays = Array.from({ length: 12 }, (_, i) => {
            const a = i * 30 * Math.PI / 180;
            const x1 = mid + 74  * Math.cos(a), y1 = mid + 74  * Math.sin(a);
            const x2 = mid + 106 * Math.cos(a), y2 = mid + 106 * Math.sin(a);
            return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#8B6914" stroke-width=".5" opacity=".28"/>`;
        }).join('\n  ');

        return `<g id="boardCenter">
  <!-- خلفية المنتصف -->
  <rect x="${C}" y="${C}" width="${iw}" height="${iw}" fill="url(#centerPattern)" rx="3"/>
  <rect x="${C}" y="${C}" width="${iw}" height="${iw}" fill="url(#centerBg)"      rx="3"/>
  <rect x="${C}" y="${C}" width="${iw}" height="${iw}" fill="url(#centerGlow)"    rx="3"/>

  <!-- حدود المنتصف الذهبية -->
  <rect x="${C}" y="${C}" width="${iw}" height="${iw}" fill="none"
    stroke="#8B6914" stroke-width="2.5" rx="3"/>
  <rect x="${C+4}" y="${C+4}" width="${iw-8}" height="${iw-8}" fill="none"
    stroke="rgba(200,160,50,.25)" stroke-width=".8" rx="2"/>

  <!-- حلقات الزخرفة -->
  ${rings}

  <!-- أشعة الزينة -->
  ${rays}

  <!-- نجمة المركز -->
  <polygon points="${this._star(mid, mid, 95, 45)}"
    fill="none" stroke="#8B6914" stroke-width=".9" opacity=".3"/>
  <polygon points="${this._star(mid, mid, 95, 45)}"
    fill="none" stroke="#C4A040" stroke-width=".4" opacity=".15"
    transform="rotate(22.5,${mid},${mid})"/>

  <!-- هالة مركزية -->
  <circle cx="${mid}" cy="${mid}" r="66" fill="#160900" opacity=".92"/>
  <circle cx="${mid}" cy="${mid}" r="63" fill="none" stroke="#C4A040" stroke-width="1.4" opacity=".55"/>
  <circle cx="${mid}" cy="${mid}" r="58" fill="none" stroke="rgba(196,160,64,.2)" stroke-width=".5"/>

  <!-- ════ بطاقة الفانوس السحري (يسار) ════ -->
  <g filter="url(#shadow)">
    <rect x="${mid-105}" y="${mid-54}" width="82" height="66" rx="6"
      fill="rgba(60,35,0,.75)" stroke="rgba(200,150,0,.55)" stroke-width="1.2"/>
    <rect x="${mid-103}" y="${mid-52}" width="78" height="62" rx="5"
      fill="none" stroke="rgba(200,150,0,.2)" stroke-width=".5"/>
  </g>
  <text x="${mid-64}" y="${mid-30}" text-anchor="middle" font-size="20">🪔</text>
  <text x="${mid-64}" y="${mid-7}" text-anchor="middle" font-size="7.5"
    fill="#FFCC44" font-weight="bold" font-family="'Amiri',serif">الفانوس السحري</text>
  <text x="${mid-64}" y="${mid+8}" text-anchor="middle" font-size="6"
    fill="rgba(255,200,100,.6)">ميزات فقط</text>

  <!-- ════ بطاقة الفرمان (يمين) ════ -->
  <g filter="url(#shadow)">
    <rect x="${mid+23}" y="${mid-54}" width="82" height="66" rx="6"
      fill="rgba(50,0,0,.78)" stroke="rgba(200,50,50,.5)" stroke-width="1.2"/>
    <rect x="${mid+25}" y="${mid-52}" width="78" height="62" rx="5"
      fill="none" stroke="rgba(200,50,50,.18)" stroke-width=".5"/>
  </g>
  <text x="${mid+64}" y="${mid-30}" text-anchor="middle" font-size="20">📜</text>
  <text x="${mid+64}" y="${mid-7}" text-anchor="middle" font-size="7.5"
    fill="#FF6666" font-weight="bold" font-family="'Amiri',serif">فرمان الوالي</text>
  <text x="${mid+64}" y="${mid+8}" text-anchor="middle" font-size="6"
    fill="rgba(255,120,120,.6)">عقوبات فقط</text>

  <!-- ════ اسم اللعبة — المركز ════ -->
  <text x="${mid}" y="${mid+27}" text-anchor="middle" font-size="14.5"
    fill="#FFD060" font-weight="900" font-family="'Impact','Arial Black',sans-serif"
    filter="url(#glow)" letter-spacing="3">SILK ROAD</text>
  <text x="${mid}" y="${mid+42}" text-anchor="middle" font-size="8"
    fill="#C4A040" font-family="Georgia,serif" letter-spacing="1">The Golden Era</text>

  <!-- خط فاصل رفيع -->
  <line x1="${mid-48}" y1="${mid+49}" x2="${mid+48}" y2="${mid+49}"
    stroke="#8B6914" stroke-width=".7" opacity=".5"/>

  <text x="${mid}" y="${mid+60}" text-anchor="middle" font-size="9"
    fill="#C4A040" font-family="'Amiri','Scheherazade New',serif">🐪 درب الأمصار 🐪</text>

  <!-- نقاط تقاطع الحدود -->
  ${[[C,C],[B-C,C],[C,B-C],[B-C,B-C]].map(([px,py]) =>
      `<circle cx="${px}" cy="${py}" r="7" fill="#8B6914" opacity=".6"/>
       <circle cx="${px}" cy="${py}" r="3.5" fill="#FFD060" opacity=".5"/>`
  ).join('\n  ')}
</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       بناء خلايا الأربعة جوانب
    ══════════════════════════════════════════════════════════════════════ */
    _buildAllCells() {
        const { B, C, S } = this;
        let out = '';

        /* ── الصف السفلي: الخلايا 0–10 (من اليمين لليسار) ── */
        for (let i = 0; i <= 10; i++) {
            const isCorner = i === 0 || i === 10;
            const w = isCorner ? C : S;
            let x;
            if      (i === 0)  x = B - C;          // GO — أسفل يمين
            else if (i === 10) x = 0;               // سجن — أسفل يسار
            else               x = B - C - i * S;
            out += this._buildCell(i, x, B - C, w, C, 'bottom');
        }

        /* ── العمود الأيسر: الخلايا 11–19 (من أسفل لأعلى) ── */
        for (let i = 0; i < 9; i++)
            out += this._buildCell(11 + i, 0, B - C - (i + 1) * S, C, S, 'left');

        /* ── الصف العلوي: الخلايا 20–30 (من اليسار لليمين) ── */
        for (let i = 0; i <= 10; i++) {
            const isCorner = i === 0 || i === 10;
            const w = isCorner ? C : S;
            let x;
            if      (i === 0)  x = 0;
            else if (i === 10) x = B - C;
            else               x = C + (i - 1) * S;
            out += this._buildCell(20 + i, x, 0, w, C, 'top');
        }

        /* ── العمود الأيمن: الخلايا 31–39 (من أعلى لأسفل) ── */
        for (let i = 0; i < 9; i++)
            out += this._buildCell(31 + i, B - C, C + i * S, C, S, 'right');

        return out;
    }

    /* ══════════════════════════════════════════════════════════════════════
       الإطار الخارجي المزخرف
    ══════════════════════════════════════════════════════════════════════ */
    _buildFrame() {
        const { B } = this;
        return `<g id="boardFrame">
  <!-- الطبقة الخارجية الداكنة -->
  <rect x="0" y="0" width="${B}" height="${B}" fill="url(#boardEdge)" rx="4"/>
  <!-- خلفية الرق -->
  <rect x="3" y="3" width="${B-6}" height="${B-6}" fill="url(#parchment)" rx="3"/>
  <!-- الحدود الذهبية الخارجية -->
  <rect x="1"  y="1"  width="${B-2}"  height="${B-2}"  fill="none" stroke="#4A2800" stroke-width="6"  rx="4"/>
  <rect x="5"  y="5"  width="${B-10}" height="${B-10}" fill="none" stroke="url(#borderGrad)" stroke-width="2" rx="2"/>
  <rect x="9"  y="9"  width="${B-18}" height="${B-18}" fill="none" stroke="rgba(180,130,20,.35)" stroke-width=".7" rx="1"/>
  <!-- نقاط الزوايا الأربع -->
  ${[[5,5],[B-5,5],[5,B-5],[B-5,B-5]].map(([px,py]) =>
      `<circle cx="${px}" cy="${py}" r="5" fill="#8B6914"/>
       <circle cx="${px}" cy="${py}" r="2.5" fill="#FFD060" opacity=".7"/>`
  ).join('\n  ')}
</g>`;
    }

    /* ══════════════════════════════════════════════════════════════════════
       البناء الرئيسي — يُحقن في <svg id="boardSvg">
    ══════════════════════════════════════════════════════════════════════ */
    buildBoard() {
        const { B } = this;
        const svg = document.getElementById('boardSvg');
        if (!svg) {
            console.error('[BoardBuilder] لم يُعثر على #boardSvg');
            return;
        }

        // ضبط أبعاد SVG
        svg.setAttribute('viewBox', `0 0 ${B} ${B}`);
        svg.setAttribute('width',  `${B}`);
        svg.setAttribute('height', `${B}`);

        svg.innerHTML =
            this._buildDefs()    +   // تعريفات SVG
            this._buildFrame()   +   // الإطار الخارجي
            this._buildAllCells()+   // خلايا اللوحة الـ 40
            this._buildCenter();     // زخارف وبطاقات المنتصف

        // إشعار باقتمال البناء
        document.dispatchEvent(new CustomEvent('boardReady'));
        console.log('[BoardBuilder] ✓ اللوحة جاهزة');
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   الإنستانس العالمي — instance واحد للعبة كاملة
═══════════════════════════════════════════════════════════════════════════ */
const boardBuilder = new BoardBuilder();

/* ── شيم للتوافق مع النداءات القديمة ── */
function buildBoard() { boardBuilder.buildBoard(); }

/* ── بناء اللوحة فور تحميل الملف ── */
boardBuilder.buildBoard();
