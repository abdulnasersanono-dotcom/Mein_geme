'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس معالج الأحداث — يجمع: السجن، البطاقات، الشراء، المزاد،
                               الرهن، البناء، التجارة، الإفلاس،
                               وإنهاء اللعبة
   ActionHandler Class — jail, cards, buy, auction, mortgage,
                         building, trading, bankruptcy, game over
═══════════════════════════════════════════════════════════════ */
class ActionHandler {

    constructor() {
        // حالة المزاد الجارية
        this._auction = { sqIdx: -1, bids: {}, minBid: 10, timer: null, timeLeft: 30 };

          // عرض التجارة الجارية
        this._trade = { offeror:-1, receiver:-1, offerorMoney:0, receiverMoney:0, offerorProps:[], receiverProps:[] };
        this._tradeCounterDepth = 0;
        // مؤقت أنيميشن نص بطاقة الحدث
        this._typeTimer = null;
    }

    /* ══════════════════════════════════════════════════════════
       السجن
    ══════════════════════════════════════════════════════════ */
    /**
     * إرسال لاعب إلى السجن
     * @param {number} pidx - فهرس اللاعب
     */
    sendToJail(pidx) {
        const p     = G.players[pidx];
        p.sq        = 10;
        p.jailTurns = 3;
        moveTokenAnim(pidx, 10);
        camera.eventFocus(10, false);
        fx.haptic('heavy');
        fx.sndJail();
        hud.toast(`${p.emoji} اذهب للسجن! ⛓`);
        setTimeout(() => { camera.overview(); turnMgr.nextTurn(); }, 1800);
    }

    /* ══════════════════════════════════════════════════════════
       دوال مساعدة للبطاقات
    ══════════════════════════════════════════════════════════ */

    /**
     * تحريك لاعب إلى مربع محدد مع خيار جمع مكافأة الانطلاق
     * @param {number}  pidx           - فهرس اللاعب
     * @param {number}  targetSq       - رقم المربع المستهدف (0-39)
     * @param {boolean} collectSalary  - هل يجمع 200 عند المرور بالانطلاق؟
     */
    moveTo(pidx, targetSq, collectSalary) {
        const p = G.players[pidx];

        // إذا تجاوز خانة الانطلاق أثناء التنقل
        if (collectSalary && targetSq < p.sq) {
            p.money += 200;
            fx.sndCoin();
            hud.toast(`${p.emoji} مرّ على انطلق +200 💰`);
        }

        p.sq = targetSq;
        moveTokenAnim(pidx, targetSq);
        camera.followSquare(targetSq);
        hud.refreshTopBar();

        // تنفيذ حدث المربع بعد الانتقال
        setTimeout(() => {
            camera.overview();
            landingHandler.landOnSquare(pidx, targetSq);
        }, 600);
    }

    /**
     * جمع مبلغ من جميع اللاعبين الآخرين
     * @param {number} pidx   - فهرس اللاعب الجامع
     * @param {number} amount - المبلغ المجموع من كل لاعب
     */
    collectFromAllPlayers(pidx, amount) {
        const p = G.players[pidx];
        G.players.forEach((other, i) => {
            if (i === pidx || other.isBankrupt) return;
            const actual = Math.min(amount, other.money); // لا يدفع أكثر مما يملك
            other.money -= actual;
            p.money     += actual;
            if (other.money < 0) this._checkBankruptcy(i);
        });
        fx.sndCoin();
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
    }

    /**
     * دفع مبلغ لجميع اللاعبين الآخرين
     * @param {number} pidx   - فهرس اللاعب الدافع
     * @param {number} amount - المبلغ المدفوع لكل لاعب
     */
    payAllPlayers(pidx, amount) {
        const p     = G.players[pidx];
        const count = G.players.filter((o, i) => i !== pidx && !o.isBankrupt).length;
        const total = amount * count;

        if (p.money < total) {
            // إذا لم يكفِ ماله، يدفع ما يستطيع لكل لاعب
            G.players.forEach((other, i) => {
                if (i === pidx || other.isBankrupt) return;
                const actual = Math.min(amount, Math.max(0, p.money));
                p.money    -= actual;
                other.money += actual;
            });
        } else {
            G.players.forEach((other, i) => {
                if (i === pidx || other.isBankrupt) return;
                p.money    -= amount;
                other.money += amount;
            });
        }

        if (p.money < 0) this._checkBankruptcy(pidx);
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
    }

    /**
     * الانتقال إلى أقرب مربع من نوع معين
     * @param {number} pidx - فهرس اللاعب
     * @param {'railroad'|'utility'|'unowned'} type - نوع المربع
     */
    moveToNearest(pidx, type) {
        const p        = G.players[pidx];
        const current  = p.sq;
        let   nearest  = -1;
        let   minDist  = 999;

        BOARD_DATA.forEach((sq, i) => {
            let match = false;
            if (type === 'railroad') match = sq.type === 'railroad';
            if (type === 'utility')  match = sq.type === 'utility';
            if (type === 'unowned')  match = (sq.type === 'prop' || sq.type === 'railroad' || sq.type === 'utility')
                                             && !G.props[i];
            if (!match) return;

            // المسافة على الرقعة الدائرية
            const dist = (i - current + 40) % 40;
            if (dist > 0 && dist < minDist) { minDist = dist; nearest = i; }
        });

        if (nearest === -1) {
            hud.toast('لا يوجد مربع مناسب قريب');
            setTimeout(() => turnMgr.nextTurn(), 800);
            return;
        }

        this.moveTo(pidx, nearest, true);
    }

    /**
     * الانتقال إلى أول عقار يمتلكه اللاعب من نوع معين
     * @param {number} pidx - فهرس اللاعب
     * @param {'railroad'|'prop'|'utility'} type - نوع العقار
     */
    moveToOwnedProp(pidx, type) {
        const p    = G.players[pidx];
        const prop = p.props.find(sqIdx => BOARD_DATA[sqIdx]?.type === type);

        if (prop === undefined) {
            hud.toast('لا تملك بوابات بعد');
            setTimeout(() => turnMgr.nextTurn(), 800);
            return;
        }

        this.moveTo(pidx, prop, true);
    }

    /**
     * مبادلة موضع لاعبَين على الرقعة
     * @param {number} pidx        - فهرس اللاعب الذي سحب البطاقة
     * @param {number} targetPidx  - فهرس اللاعب المستهدف
     */
    swapPositions(pidx, targetPidx) {
        const p      = G.players[pidx];
        const target = G.players[targetPidx];
        if (!target || target.isBankrupt) {
            hud.toast('لا يمكن التبادل مع هذا اللاعب');
            return;
        }

        // تبادل المربعين
        const tmpSq  = p.sq;
        p.sq         = target.sq;
        target.sq    = tmpSq;

        moveTokenAnim(pidx,       p.sq);
        moveTokenAnim(targetPidx, target.sq);
        camera.followSquare(p.sq);

        hud.toast(`${p.emoji} تبادل الموضع مع ${target.emoji} ↔`);
        fx.haptic('medium');

        // تطبيق حدث المربع الجديد
        setTimeout(() => {
            camera.overview();
            landingHandler.landOnSquare(pidx, p.sq);
        }, 800);
    }

    /**
     * ترقية منزل إلى فندق مجاناً (أول منزل متاح)
     * @param {number} pidx - فهرس اللاعب
     */
    freeUpgrade(pidx) {
        const p = G.players[pidx];

        // ابحث عن أول عقار يملك منازل وغير مرهون وليس فندقاً بعد
        const sqIdx = p.props.find(i => {
            const own = G.props[i];
            const sq  = BOARD_DATA[i];
            return own && sq?.type === 'prop' && !own.mortgaged
                   && own.houses > 0 && own.houses < 5;
        });

        if (sqIdx === undefined) {
            hud.toast('لا يوجد منزل قابل للترقية');
            return;
        }

        G.props[sqIdx].houses++;
        hud.toast(`${p.emoji} ترقية مجانية على ${BOARD_DATA[sqIdx].n} 🏨`);
        fx.sndCoin();
        hud.refreshTopBar();
    }

    /**
     * تحصيل ضعف إيجار أغنى عقار يمتلكه اللاعب
     * @param {number} pidx - فهرس اللاعب
     */
    collectDoubleRent(pidx) {
        const p = G.players[pidx];

        // إيجد العقار الأعلى إيجاراً
        let bestSqIdx = -1;
        let bestRent  = 0;

        p.props.forEach(sqIdx => {
            const own = G.props[sqIdx];
            const sq  = BOARD_DATA[sqIdx];
            if (!own || !sq?.rent || own.mortgaged) return;
            const h    = own.houses || 0;
            const rent = sq.rent[h] || 0;
            if (rent > bestRent) { bestRent = rent; bestSqIdx = sqIdx; }
        });

        if (bestSqIdx === -1 || bestRent === 0) {
            hud.toast('لا توجد عقارات لتحصيل إيجارها');
            return;
        }

        const doubled = bestRent * 2;
        p.money      += doubled;
        p.lastGain    = doubled;
        fx.sndCoin();
        hud.toast(`${p.emoji} إيجار مضاعف +${doubled} من ${BOARD_DATA[bestSqIdx].n} 💰`);
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
    }

    /* ══════════════════════════════════════════════════════════
       البطاقات (فانوس / فرمان)
    ══════════════════════════════════════════════════════════ */
    /**
     * سحب بطاقة وعرضها مع أنيميشن الكتابة
     * @param {number} pidx - فهرس اللاعب
     * @param {'lant'|'firm'} deck - نوع المجموعة
     */
    drawCard(pidx, deck) {
        const cards    = deck === 'lant' ? LANTERN_CARDS : FIRMAN_CARDS;
        const card     = cards[~~(Math.random() * cards.length)];
        G.phase        = 'card';
        const isFirman = deck === 'firm';

        // ملء نافذة البطاقة
        document.getElementById('sIcoEl').textContent  = isFirman ? '📜' : '🪔';
        document.getElementById('sTypEl').textContent  = isFirman ? 'فرمان الوالي' : 'الفانوس السحري';
        document.getElementById('sTitEl').textContent  = isFirman ? 'أمر سلطوي' : 'حظ سعيد!';
        document.getElementById('sRuleEl').textContent = card.rule;
        document.getElementById('sTxtEl').innerHTML    = '<span class="sCurEl"></span>';
        document.getElementById('cardOverlay').classList.add('open');

        fx.sndScroll();
        if (isFirman) fx.haptic('heavy');
        else          fx.burst(innerWidth / 2, innerHeight / 2, 20, true);

        // أنيميشن الكتابة التدريجية
        let i = 0;
        clearInterval(this._typeTimer);
        this._typeTimer = setInterval(() => {
            if (i >= card.txt.length) {
                clearInterval(this._typeTimer);
                document.getElementById('sTxtEl').innerHTML = card.txt;
                return;
            }
            document.getElementById('sTxtEl').innerHTML =
                card.txt.slice(0, i + 1) + '<span class="sCurEl"></span>';
            i++;
        }, 38);

        // زر الإغلاق: تنفيذ تأثير البطاقة
        document.querySelector('.sCloseEl').onclick = () => {
            clearInterval(this._typeTimer);
            document.getElementById('cardOverlay').classList.remove('open');
            G.phase = 'playing';
            fx.haptic('light');
            camera.overview();

            if (card.fn) card.fn(G.players[pidx], pidx);

            // معالجة التأثيرات التي تحتاج اختيار لاعب من واجهة المستخدم
            if (G.players[pidx].pendingFreeMove) {
                this._showFreeMoveUI(pidx);
                return; // لا ننتقل للدور التالي حتى يختار اللاعب
            }
            if (G.players[pidx].pendingSwap) {
                this._showSwapUI(pidx);
                return; // لا ننتقل للدور التالي حتى يختار اللاعب
            }

            hud.refreshTopBar();
            hud.refreshOpponentPanels();
            if (!G.players[pidx].isBankrupt) setTimeout(() => turnMgr.nextTurn(), 800);
        };
    }

    /**
     * عرض واجهة اختيار مربع للانتقال الحر (بساط الريح L17)
     * @param {number} pidx - فهرس اللاعب
     */
    _showFreeMoveUI(pidx) {
        const p = G.players[pidx];

        // بناء قائمة المربعات القابلة للاختيار (تستثني السجن ومربع اللاعب الحالي)
        const select           = document.getElementById('freeMoveModal') || this._createFreeMoveModal();
        const list             = select.querySelector('#freeMoveList');
        list.innerHTML         = '';

        BOARD_DATA.forEach((sq, i) => {
            if (!sq.n || i === p.sq || i === 10 || i === 30) return;
            const btn = document.createElement('button');
            btn.className   = 'freeMoveBtn';
            btn.textContent = `${i}. ${sq.n}`;
            btn.onclick     = () => {
                select.classList.remove('open');
                p.pendingFreeMove = false;
                this.moveTo(pidx, i, i < p.sq); // يجمع راتب الانطلاق إذا تجاوز خانة 0
            };
            list.appendChild(btn);
        });

        select.classList.add('open');
    }

    /**
     * عرض واجهة اختيار لاعب لتبادل الموضع (تبادل الأقدار L30)
     * @param {number} pidx - فهرس اللاعب
     */
    _showSwapUI(pidx) {
        const p      = G.players[pidx];
        const modal  = document.getElementById('swapModal') || this._createSwapModal();
        const list   = modal.querySelector('#swapList');
        list.innerHTML = '';

        G.players.forEach((other, i) => {
            if (i === pidx || other.isBankrupt) return;
            const btn = document.createElement('button');
            btn.className   = 'swapBtn';
            btn.textContent = `${other.emoji} ${other.name}`;
            btn.onclick     = () => {
                modal.classList.remove('open');
                p.pendingSwap = false;
                this.swapPositions(pidx, i);
            };
            list.appendChild(btn);
        });

        modal.classList.add('open');
    }

    /**
     * إنشاء نافذة الانتقال الحر ديناميكياً إذا لم تكن موجودة في HTML
     */
    _createFreeMoveModal() {
        const el       = document.createElement('div');
        el.id          = 'freeMoveModal';
        el.className   = 'gameModal';
        el.innerHTML   = `
            <div class="modalBox">
              <h3>🪔 بساط الريح — اختر مربعاً</h3>
              <div id="freeMoveList" class="freeMoveList"></div>
              <button onclick="document.getElementById('freeMoveModal').classList.remove('open');
                               turnMgr.nextTurn();" class="modalCancelBtn">إلغاء</button>
            </div>`;
        document.body.appendChild(el);
        return el;
    }

    /**
     * إنشاء نافذة تبادل الموضع ديناميكياً إذا لم تكن موجودة في HTML
     */
    _createSwapModal() {
        const el     = document.createElement('div');
        el.id        = 'swapModal';
        el.className = 'gameModal';
        el.innerHTML = `
            <div class="modalBox">
              <h3>🪔 تبادل الأقدار — اختر لاعباً</h3>
              <div id="swapList" class="swapList"></div>
              <button onclick="document.getElementById('swapModal').classList.remove('open');
                               turnMgr.nextTurn();" class="modalCancelBtn">إلغاء</button>
            </div>`;
        document.body.appendChild(el);
        return el;
    }

    /* ══════════════════════════════════════════════════════════
       نافذة الشراء
    ══════════════════════════════════════════════════════════ */
    /**
     * فتح نافذة عرض شراء عقار
     * @param {number} pidx  - فهرس اللاعب
     * @param {number} sqIdx - رقم الخلية
     */
    showBuyModal(pidx, sqIdx) {
        const sq = BOARD_DATA[sqIdx];
        const p  = G.players[pidx];
        const m  = document.getElementById('buyModal');

        // تطبيق خصم نصف السعر إذا كانت بطاقة بشارة الطريق نشطة
        const finalPrice = p.halfPriceNext ? Math.ceil(sq.price / 2) : sq.price;
        p.halfPriceNext  = false;

        document.getElementById('buyModalTitle').textContent   = sq.n || 'عقار';
        document.getElementById('buyModalPrice').textContent   = finalPrice;
        document.getElementById('buyModalBalance').textContent = p.money.toLocaleString('en');
        document.getElementById('buyModalColor').style.background = sq.col || '#555';
        m.dataset.sqIdx    = sqIdx;
        m.dataset.pidx     = pidx;
        m.dataset.price    = finalPrice; // السعر الفعلي بعد الخصم
        m.classList.add('open');

        // جدول الإيجارات
        const rows   = document.getElementById('buyModalRents');
        rows.innerHTML = '';
        if (sq.rent) {
            const labels = ['أرض', 'منزل', 'منزلان', 'ثلاثة', 'أربعة', 'فندق'];
            sq.rent.forEach((r, i) => {
                rows.innerHTML += `<tr><td>${labels[i]}</td><td>${r} din</td></tr>`;
            });
        }
    }

    /** تأكيد شراء العقار */
    confirmBuy() {
        const m      = document.getElementById('buyModal');
        const sqIdx  = +m.dataset.sqIdx;
        const pidx   = +m.dataset.pidx;
        const price  = +m.dataset.price; // يستخدم السعر المخزّن (قد يكون مخفّضاً)
        const sq     = BOARD_DATA[sqIdx];
        const p      = G.players[pidx];

        m.classList.remove('open');
        p.money -= price;
        p.lastGain = -price;
        p.props.push(sqIdx);
        G.props[sqIdx] = { owner: pidx, houses: 0, mortgaged: false, sqId: sqIdx };
        fx.sndCoin();
        hud.toast(`${p.emoji} اشترى ${sq.n} 🏠`);
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
        setTimeout(() => turnMgr.nextTurn(), 800);
    }

    /** رفض الشراء وبدء المزاد */
    rejectBuy() {
        const m     = document.getElementById('buyModal');
        const sqIdx = +m.dataset.sqIdx;
        m.classList.remove('open');
        this.startAuction(sqIdx);
    }

    /* ══════════════════════════════════════════════════════════
       المزاد
    ══════════════════════════════════════════════════════════ */
    /**
     * بدء جلسة مزاد على عقار
     * @param {number} sqIdx - رقم الخلية
     */
    startAuction(sqIdx) {
        G.phase = 'auction';
        this._auction = { sqIdx, bids: {}, minBid: 10, timer: null, timeLeft: 30 };

        // إعداد مزايدات البوتات تلقائياً
        G.players.forEach((p, i) => {
            if (!p.isBankrupt) this._auction.bids[i] = 0;
            const sq = BOARD_DATA[sqIdx];
            if (p.isBot && !p.isBankrupt && p.money > sq.price * 0.4)
                this._auction.bids[i] = Math.min(p.money,
                    ~~(sq.price * (0.5 + Math.random() * 0.6)));
        });

        this._renderAuctionModal(BOARD_DATA[sqIdx]);
        document.getElementById('auctionModal').classList.add('open');

        this._auction.timer = setInterval(() => {
            this._auction.timeLeft--;
            const el = document.getElementById('auctionTimer');
            if (el) el.textContent = this._auction.timeLeft;
            if (this._auction.timeLeft <= 0) this.resolveAuction();
        }, 1000);
    }

    _renderAuctionModal(sq) {
        document.getElementById('auctionPropName').textContent         = sq.n || 'عقار';
        document.getElementById('auctionPropColor').style.background   = sq.col || '#555';
        document.getElementById('auctionOrigPrice').textContent        = sq.price;
        document.getElementById('auctionTimer').textContent            = this._auction.timeLeft;
        document.getElementById('auctionMyBidInput').value             = '';

        const bidList     = document.getElementById('auctionBidList');
        bidList.innerHTML = '';
        G.players.forEach((p, i) => {
            if (p.isBankrupt) return;
            bidList.innerHTML += `<div class="aucBidRow">
              <span>${p.emoji} ${p.name}</span>
              <span class="aucBidAmt">${(this._auction.bids[i] || 0).toLocaleString('en')} din</span>
            </div>`;
        });
    }

    /** تسجيل مزايدة اللاعب البشري */
    submitMyAuction() {
        const myIdx = G.players.findIndex((p, i) => !p.isBot && !p.isBankrupt && i <= G.turn);
        const input = +document.getElementById('auctionMyBidInput').value;
        if (!input || input < this._auction.minBid) { hud.toast('المبلغ أقل من الحد الأدنى!'); return; }
        if (input > G.players[myIdx].money)         { hud.toast('ليس لديك كفاية!'); return; }
        this._auction.bids[myIdx] = input;
        this._renderAuctionModal(BOARD_DATA[this._auction.sqIdx]);
    }

    /** إنهاء المزاد وإعلان الفائز */
    resolveAuction() {
        clearInterval(this._auction.timer);
        document.getElementById('auctionModal').classList.remove('open');
        G.phase = 'playing';

        let winner = -1, top = 0;
        Object.entries(this._auction.bids).forEach(([i, b]) => {
            if (b > top && G.players[i].money >= b) { top = b; winner = +i; }
        });

        if (winner >= 0 && top > 0) {
            G.players[winner].money -= top;
            G.players[winner].props.push(this._auction.sqIdx);
            G.props[this._auction.sqIdx] = { owner: winner, houses: 0, mortgaged: false, sqId: this._auction.sqIdx };
            hud.toast(`${G.players[winner].emoji} فاز بالمزاد بـ ${top} دينار!`);
            fx.sndCoin();
        } else {
            hud.toast('لا أحد شارك في المزاد — العقار للبنك');
        }

        hud.refreshTopBar();
        hud.refreshOpponentPanels();
        setTimeout(() => turnMgr.nextTurn(), 1200);
    }

    /* ══════════════════════════════════════════════════════════
       الرهن
    ══════════════════════════════════════════════════════════ */
    /** فتح نافذة إدارة الرهن */
    openMortgageModal() {
        const pidx = G.turn;
        const p    = G.players[pidx];
        if (p.isBot) { hud.toast('البوت لا يحتاج إدارة عقارات'); return; }

        const list     = document.getElementById('mortgageList');
        list.innerHTML = '';
        p.props.forEach(sqIdx => {
            const sq  = BOARD_DATA[sqIdx];
            const own = G.props[sqIdx];
            if (!sq || !own) return;
            const isMg = own.mortgaged;
            list.innerHTML += `<div class="mgRow">
              <span class="mgColor" style="background:${sq.col||'#555'}"></span>
              <span class="mgName">${sq.n || 'عقار'}</span>
              <span class="mgMoney">${sq.mg} din</span>
              <button class="mgBtn ${isMg ? 'unmg' : ''}"
                onclick="${isMg ? `unmortgage(${sqIdx})` : `mortgage(${sqIdx})`}">
                ${isMg ? 'استرداد' : 'رهن'}
              </button>
            </div>`;
        });
        document.getElementById('mortgageModal').classList.add('open');
    }

    /**
     * رهن عقار للحصول على سيولة
     * @param {number} sqIdx - رقم الخلية
     */
    mortgage(sqIdx) {
        const own = G.props[sqIdx];
        const sq  = BOARD_DATA[sqIdx];
        const p   = G.players[G.turn];
        if (!own || own.mortgaged || own.houses > 0) { hud.toast('لا يمكن الرهن!'); return; }
        own.mortgaged = true;
        p.money += sq.mg;
        hud.toast(`${p.emoji} رهن ${sq.n} واستلم ${sq.mg} دينار`);
        fx.sndCoin();
        hud.refreshTopBar();
        this.openMortgageModal();
    }

    /**
     * استرداد عقار مرهون
     * @param {number} sqIdx - رقم الخلية
     */
    unmortgage(sqIdx) {
        const own  = G.props[sqIdx];
        const sq   = BOARD_DATA[sqIdx];
        const p    = G.players[G.turn];
        const cost = ~~(sq.mg * 1.1);
        if (!own || !own.mortgaged || p.money < cost) {
            hud.toast(`تحتاج ${cost} دينار للاسترداد`); return;
        }
        own.mortgaged = false;
        p.money -= cost;
        hud.toast(`${p.emoji} استرد ${sq.n} بـ ${cost} دينار`);
        hud.refreshTopBar();
        this.openMortgageModal();
    }

    /* ══════════════════════════════════════════════════════════
       البناء (منازل وفنادق)
    ══════════════════════════════════════════════════════════ */
    /** فتح نافذة البناء */
    openBuildModal() {
        const pidx = G.turn;
        const p    = G.players[pidx];
        if (p.isBot) { hud.toast('البوت يدير البناء تلقائياً'); return; }

        const list     = document.getElementById('buildList');
        list.innerHTML = '';
        p.props.forEach(sqIdx => {
            const sq  = BOARD_DATA[sqIdx];
            const own = G.props[sqIdx];
            if (!sq || sq.type !== 'prop' || own.mortgaged) return;
            if (!landingHandler.ownsFullGroup(pidx, sq.grp)) return;
            const h = own.houses || 0;
            list.innerHTML += `<div class="buildRow">
              <span class="buildColor" style="background:${sq.col}"></span>
              <span class="buildName">${sq.n}</span>
              <span class="buildHouses">${h < 5 ? '🏠'.repeat(h) : '🏨 فندق'}</span>
              <div class="buildActions">
                ${h < 5 && p.money >= sq.hCost
                    ? `<button class="buildBuyBtn" onclick="buyHouse(${sqIdx})">+🏠 ${sq.hCost}</button>`
                    : ''}
                ${h > 0
                    ? `<button class="buildSellBtn" onclick="sellHouse(${sqIdx})">-🏠 ${~~(sq.hCost/2)}</button>`
                    : ''}
              </div>
            </div>`;
        });

        if (!list.innerHTML)
            list.innerHTML = '<div style="text-align:center;color:#9a7a30;padding:16px;font-size:12px;">أكمل مجموعة لونية للبناء</div>';

        document.getElementById('buildModal').classList.add('open');
    }

    /** شراء منزل على خلية */
    buyHouse(sqIdx) {
        const own = G.props[sqIdx];
        const sq  = BOARD_DATA[sqIdx];
        const p   = G.players[G.turn];
        if (own.houses >= 5 || p.money < sq.hCost) return;
        own.houses++;
        p.money -= sq.hCost;
        fx.sndCoin();
        hud.refreshTopBar();
        this.openBuildModal();
    }

    /** بيع منزل على خلية */
    sellHouse(sqIdx) {
        const own = G.props[sqIdx];
        const sq  = BOARD_DATA[sqIdx];
        const p   = G.players[G.turn];
        if (own.houses <= 0) return;
        own.houses--;
        p.money += ~~(sq.hCost / 2);
        hud.refreshTopBar();
        this.openBuildModal();
    }

    /* ══════════════════════════════════════════════════════════
       التجارة — Professional Trade Overlay
    ══════════════════════════════════════════════════════════ */
    /** توافق مع الكود القديم — يجد أول خصم ويستدعي openTradeInterface */
    openTradeModal() {
        const pidx = G.turn;
        const p    = G.players[pidx];
        const partner = G.players.find((pp, i) => i !== pidx && !pp.isBankrupt);
        if (!partner) { hud.toast('لا يوجد لاعبون آخرون'); return; }
        this.openTradeInterface(pidx, G.players.indexOf(partner));
    }
    /**
     * فتح واجهة التبادل الاحترافية
     * @param {number} player1Idx - فهرس اللاعب العارض (يسار)
     * @param {number} player2Idx - فهرس اللاعب المستقبل (يمين)
     */
    openTradeInterface(player1Idx, player2Idx) {
        this._trade = {
            offeror:      player1Idx,
            receiver:     player2Idx,
            offerorMoney: 0,
            receiverMoney:0,
            offerorProps: [],
            receiverProps:[],
        };
        this._tradeCounterDepth = 0;
        const overlay = document.getElementById('tradeOverlay');
        overlay.dataset.phase = 'build';
        this._renderTradeOverlay();
        overlay.classList.add('open');
    }
    /** يملأ كلا العمودين بالبيانات الحالية */
    _renderTradeOverlay() {
        const { offeror, receiver, offerorProps, receiverProps } = this._trade;
        const p1 = G.players[offeror];
        const p2 = G.players[receiver];
        document.getElementById('tradeLeftEmoji').textContent  = p1.emoji;
        document.getElementById('tradeLeftName').textContent   = p1.name;
        document.getElementById('tradeLeftMoney').textContent  = p1.money.toLocaleString('en') + ' دينار';
        document.getElementById('tradeLeftCash').value         = this._trade.offerorMoney  || '';
        document.getElementById('tradeLeftCashBadge').textContent =
            (this._trade.offerorMoney || 0).toLocaleString('en') + ' ﷼';
        document.getElementById('tradeRightEmoji').textContent = p2.emoji;
        document.getElementById('tradeRightName').textContent  = p2.name;
        document.getElementById('tradeRightMoney').textContent = p2.money.toLocaleString('en') + ' دينار';
        document.getElementById('tradeRightCash').value        = this._trade.receiverMoney || '';
        document.getElementById('tradeRightCashBadge').textContent =
            (this._trade.receiverMoney || 0).toLocaleString('en') + ' ﷼';
        this._renderTradeSide('left',  offeror,   offerorProps);
        this._renderTradeSide('right', receiver,  receiverProps);
    }
    /**
     * يبني بطاقات العقارات لعمود واحد
     * @param {'left'|'right'} side
     * @param {number} pidx          - مؤشر اللاعب
     * @param {number[]} selectedArr - العقارات المختارة
     */
    _renderTradeSide(side, pidx, selectedArr) {
        const player  = G.players[pidx];
        const availEl = document.getElementById(side === 'left' ? 'tradeLeftAvail' : 'tradeRightAvail');
        const offerEl = document.getElementById(side === 'left' ? 'tradeLeftOffer' : 'tradeRightOffer');
        const sideKey = side === 'left' ? 'offeror' : 'receiver';
        availEl.innerHTML = '';
        offerEl.innerHTML = '';
        player.props.forEach(sqIdx => {
            const sq  = BOARD_DATA[sqIdx];
            const own = G.props[sqIdx];
            if (!sq || sq.type !== 'prop') return;
            const isBlocked  = !!(own && (own.mortgaged || own.houses > 0));
            const isSelected = selectedArr.includes(sqIdx);
            const html       = this._buildTradePropCard(sqIdx, sq, isBlocked, isSelected, sideKey);
            if (isSelected) offerEl.insertAdjacentHTML('beforeend', html);
            else            availEl.insertAdjacentHTML('beforeend', html);
        });
        const empty = '<div style="font-size:10px;color:#9a7a30;padding:8px;text-align:center;direction:rtl">لا يوجد</div>';
        if (!availEl.innerHTML) availEl.innerHTML = empty;
        if (!offerEl.innerHTML) offerEl.innerHTML = empty;
    }
    /** يبني HTML لبطاقة عقار مصغّرة */
    _buildTradePropCard(sqIdx, sq, isBlocked, isSelected, sideKey) {
        const cls    = 'tradePropCard' + (isBlocked ? ' blocked' : '') + (isSelected ? ' inOffer' : '');
        const click  = isBlocked
            ? 'onclick="tradeBlockedPropClick()"'
            : `onclick="clickTradeProp('${sideKey}',${sqIdx},this)"`;
        return `<div class="${cls}" data-sqidx="${sqIdx}" data-sidekey="${sideKey}"
                     style="border-color:${sq.col}" ${click}>
                  <div class="tpcBand" style="background:${sq.col}"></div>
                  <div class="tpcName">${sq.n || ''}</div>
                  <div class="tpcPrice">${sq.price} ﷼</div>
                </div>`;
    }
    /**
     * تبديل عقار بين متاح/معروض — مع أنيميشن طيران
     * @param {'offeror'|'receiver'} sideKey
     * @param {number} sqIdx
     * @param {Element} cardEl
     */
    clickTradeProp(sideKey, sqIdx, cardEl) {
        const arr = sideKey === 'offeror' ? this._trade.offerorProps : this._trade.receiverProps;
        const fromRect = cardEl.getBoundingClientRect();
        if (arr.includes(sqIdx)) arr.splice(arr.indexOf(sqIdx), 1);
        else                     arr.push(sqIdx);
        this._renderTradeOverlay();
        // Find card in new position for fly animation
        const toEl = document.querySelector(
            `[data-sqidx="${sqIdx}"][data-sidekey="${sideKey}"]`
        );
        if (toEl) {
            const toRect = toEl.getBoundingClientRect();
            this._flyCard(fromRect, toRect, cardEl.style.borderColor || '#C89010');
        }
        fx.haptic('light');
    }
    /**
     * أنيميشن طيران بطاقة من موضع إلى آخر (تقنية FLIP)
     * @param {DOMRect} fromRect - موضع البداية
     * @param {DOMRect} toRect   - موضع النهاية
     * @param {string}  color    - لون الحدود
     */
    _flyCard(fromRect, toRect, color) {
        const clone = document.createElement('div');
        clone.className = 'tradeFlyCard';
        clone.style.cssText = [
            `width:${fromRect.width}px`,
            `height:${fromRect.height}px`,
            `left:${fromRect.left}px`,
            `top:${fromRect.top}px`,
            `border:2px solid ${color}`,
            `background:rgba(255,240,180,.88)`,
            `opacity:1`,
        ].join(';');
        document.body.appendChild(clone);
        const dx = toRect.left - fromRect.left;
        const dy = toRect.top  - fromRect.top;
        const sx = toRect.width  / (fromRect.width  || 1);
        const sy = toRect.height / (fromRect.height || 1);
        // Double-rAF: first frame paints at source, second triggers transition
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                clone.style.transform = `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
                clone.style.opacity   = '0';
            });
        });
        clone.addEventListener('transitionend', () => clone.remove(), { once: true });
    }
    /** يحدّث badge الرصيد فوراً عند الكتابة */
    updateTradeCashLabel(side) {
        const val = Math.max(0, parseInt(
            document.getElementById(side === 'left' ? 'tradeLeftCash' : 'tradeRightCash').value
        ) || 0);
        document.getElementById(side === 'left' ? 'tradeLeftCashBadge' : 'tradeRightCashBadge')
            .textContent = val.toLocaleString('en') + ' ﷼';
        if (side === 'left') this._trade.offerorMoney  = val;
        else                 this._trade.receiverMoney = val;
    }
    /** إرسال العرض — التحقق والتوجيه للبوت أو الإنسان */
    submitTradeOffer() {
        // مزامنة الكاش
        this._trade.offerorMoney  = Math.max(0, parseInt(document.getElementById('tradeLeftCash').value)  || 0);
        this._trade.receiverMoney = Math.max(0, parseInt(document.getElementById('tradeRightCash').value) || 0);
        const p1 = G.players[this._trade.offeror];
        const p2 = G.players[this._trade.receiver];
        if (this._trade.offerorMoney  > p1.money) { hud.toast(`${p1.emoji} لا تملك هذا المبلغ`);     fx.sndErr(); return; }
        if (this._trade.receiverMoney > p2.money) { hud.toast(`${p2.emoji} لا يملك هذا المبلغ`);     fx.sndErr(); return; }
        const hasOffer =
            this._trade.offerorProps.length  > 0 || this._trade.offerorMoney  > 0 ||
            this._trade.receiverProps.length > 0 || this._trade.receiverMoney > 0;
        if (!hasOffer) { hud.toast('أضف عقاراً أو مبلغاً للعرض'); fx.sndErr(); return; }
        if (p2.isBot) {
            document.getElementById('tradeOverlay').classList.remove('open');
            const decision = this._botTradeDecision();
            setTimeout(() => {
                if (decision === 'accept') this._executeTradeOverlay();
                else { hud.toast(`${p2.emoji} رفض العرض`); fx.haptic('medium'); }
            }, 900);
        } else {
            const overlay = document.getElementById('tradeOverlay');
            overlay.dataset.phase = 'respond';
            this._renderRespondDesc();
            this._renderTradeOverlay();
        }
    }
    /** يكتب ملخص العرض للطرف المستقبل */
    _renderRespondDesc() {
        const p1  = G.players[this._trade.offeror];
        const p2  = G.players[this._trade.receiver];
        const oP  = this._trade.offerorProps.length;
        const rP  = this._trade.receiverProps.length;
        const oM  = this._trade.offerorMoney;
        const rM  = this._trade.receiverMoney;
        let txt = `${p1.emoji} ${p1.name} يعرض:\n`;
        if (oM > 0) txt += `${oM.toLocaleString('en')} دينار `;
        if (oP > 0) txt += `+ ${oP} عقار`;
        if (oM === 0 && oP === 0) txt += 'لا شيء';
        txt += `\n\nمقابل:\n`;
        if (rM > 0) txt += `${rM.toLocaleString('en')} دينار `;
        if (rP > 0) txt += `+ ${rP} عقار`;
        if (rM === 0 && rP === 0) txt += 'لا شيء (هبة)';
        document.getElementById('tradeResDesc').textContent = txt;
    }
    /** الطرف المستقبل يقبل */
    acceptTradeOffer() { this._executeTradeOverlay(); }
    /** الطرف المستقبل يرفض */
    rejectTradeOffer() {
        document.getElementById('tradeOverlay').classList.remove('open');
        this._tradeCounterDepth = 0;
        hud.toast(`${G.players[this._trade.receiver].emoji} رفض العرض`);
        fx.haptic('medium');
    }
    /** الطرف المستقبل يقدم عرضاً مضاداً */
    counterTradeOffer() {
        if (this._tradeCounterDepth >= 2) {
            hud.toast('لا يمكن تبادل العروض أكثر من مرتين'); fx.sndErr(); return;
        }
        this._tradeCounterDepth++;
        // عكس الأدوار مع تحميل مسبق للعرض المعكوس
        const prev = { ...this._trade };
        this._trade = {
            offeror:      prev.receiver,
            receiver:     prev.offeror,
            offerorMoney: prev.receiverMoney,
            receiverMoney:prev.offerorMoney,
            offerorProps: [...prev.receiverProps],
            receiverProps:[...prev.offerorProps],
        };
        const overlay = document.getElementById('tradeOverlay');
        overlay.dataset.phase = 'build';
        this._renderTradeOverlay();
        hud.toast(`${G.players[this._trade.offeror].emoji} يقدم عرضاً مضاداً`);
    }
    /** تنفيذ الصفقة — نقل الأموال والعقارات + مؤثرات */
    _executeTradeOverlay() {
        const { offeror, receiver, offerorMoney, receiverMoney, offerorProps, receiverProps } = this._trade;
        const p1 = G.players[offeror];
        const p2 = G.players[receiver];
        p1.money -= offerorMoney;  p2.money += offerorMoney;
        p2.money -= receiverMoney; p1.money += receiverMoney;
        offerorProps.forEach(sqIdx => {
            p1.props = p1.props.filter(s => s !== sqIdx);
            p2.props.push(sqIdx);
            if (G.props[sqIdx]) G.props[sqIdx].owner = receiver;
        });
        receiverProps.forEach(sqIdx => {
            p2.props = p2.props.filter(s => s !== sqIdx);
            p1.props.push(sqIdx);
            if (G.props[sqIdx]) G.props[sqIdx].owner = offeror;
        });
        document.getElementById('tradeOverlay').classList.remove('open');
        this._tradeCounterDepth = 0;
        fx.sndCoin();
        fx.haptic('success');
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        setTimeout(() => fx.burst(cx, cy, 28, true), 100);
        hud.toast(`${p1.emoji} أتمّ الصفقة مع ${p2.emoji} 🤝`);
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
    }
    /** إلغاء وإغلاق الواجهة */
    cancelTradeOverlay() {
        document.getElementById('tradeOverlay').classList.remove('open');
        this._tradeCounterDepth = 0;
        this._trade = { offeror:-1, receiver:-1, offerorMoney:0, receiverMoney:0, offerorProps:[], receiverProps:[] };
    }
    /** ردّ فعل على النقر على بطاقة محظورة */
    tradeBlockedPropClick() {
        hud.toast('لا يمكن تداول عقارات مرهونة أو عليها مبانٍ 🔒');
        fx.sndErr();
        fx.haptic('medium');
    }
    /**
     * قرار البوت: يقبل إذا كانت قيمة ما يستقبله ≥ 85% مما يعطيه
     * @returns {'accept'|'reject'}
     */
    _botTradeDecision() {
        const propVal = arr => arr.reduce((s, sqIdx) => {
            const sq = BOARD_DATA[sqIdx]; return s + (sq ? sq.price : 0);
        }, 0);
        const receiving = propVal(this._trade.offerorProps)  + this._trade.offerorMoney;
        const giving    = propVal(this._trade.receiverProps) + this._trade.receiverMoney;
        if (giving === 0) return 'accept';
        return (receiving / giving) >= 0.85 ? 'accept' : 'reject';
    }
    /* ══════════════════════════════════════════════════════════
function buyHouse(sqIdx)                     { actionHandler.buyHouse(sqIdx); }
function sellHouse(sqIdx)                    { actionHandler.sellHouse(sqIdx); }
function openTradeModal()                    { actionHandler.openTradeModal(); }
function openTradeInterface(p1, p2)          { actionHandler.openTradeInterface(p1, p2); }
function clickTradeProp(sk, sq, el)          { actionHandler.clickTradeProp(sk, sq, el); }
function updateTradeCashLabel(side)          { actionHandler.updateTradeCashLabel(side); }
function submitTradeOffer()                  { actionHandler.submitTradeOffer(); }
function acceptTradeOffer()                  { actionHandler.acceptTradeOffer(); }
function rejectTradeOffer()                  { actionHandler.rejectTradeOffer(); }
function counterTradeOffer()                 { actionHandler.counterTradeOffer(); }
function cancelTradeOverlay()                { actionHandler.cancelTradeOverlay(); }
function tradeBlockedPropClick()             { actionHandler.tradeBlockedPropClick(); }
function deductMoney(pidx, amount)           { actionHandler.deductMoney(pidx, amount); }
function repairAll(pidx, hCost, htCost)      { actionHandler.repairAll(pidx, hCost, htCost); }
function endGame(winner)                     { actionHandler.endGame(winner); }