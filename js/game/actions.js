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
        this._trade = { from: -1, to: -1, fromMoney: 0, toMoney: 0, fromProps: [], toProps: [] };

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
        else fx.burst(innerWidth / 2, innerHeight / 2, 20, true);

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
            hud.refreshTopBar();
            hud.refreshOpponentPanels();
            if (!G.players[pidx].isBankrupt) setTimeout(() => turnMgr.nextTurn(), 800);
        };
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

        document.getElementById('buyModalTitle').textContent   = sq.n || 'عقار';
        document.getElementById('buyModalPrice').textContent   = sq.price;
        document.getElementById('buyModalBalance').textContent = p.money.toLocaleString('en');
        document.getElementById('buyModalColor').style.background = sq.col || '#555';
        m.dataset.sqIdx = sqIdx;
        m.dataset.pidx  = pidx;
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
        const m     = document.getElementById('buyModal');
        const sqIdx = +m.dataset.sqIdx;
        const pidx  = +m.dataset.pidx;
        const sq    = BOARD_DATA[sqIdx];
        const p     = G.players[pidx];

        m.classList.remove('open');
        p.money -= sq.price;
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
       التجارة
    ══════════════════════════════════════════════════════════ */
    /** فتح نافذة التجارة */
    openTradeModal() {
        const pidx = G.turn;
        const p    = G.players[pidx];
        if (p.isBot) { hud.toast('البوت لا يتداول يدوياً'); return; }

        const partner = G.players.find((pp, i) => i !== pidx && !pp.isBankrupt);
        if (!partner) { hud.toast('لا يوجد لاعبون آخرون'); return; }

        const toIdx    = G.players.indexOf(partner);
        this._trade    = { from: pidx, to: toIdx, fromMoney: 0, toMoney: 0, fromProps: [], toProps: [] };
        this._renderTradeModal();
        document.getElementById('tradeModal').classList.add('open');
    }

    _renderTradeModal() {
        const from = G.players[this._trade.from];
        const to   = G.players[this._trade.to];

        document.getElementById('tradeFromName').textContent  = `${from.emoji} ${from.name}`;
        document.getElementById('tradeToName').textContent    = `${to.emoji} ${to.name}`;
        document.getElementById('tradeFromMoney').value       = this._trade.fromMoney;
        document.getElementById('tradeToMoney').value         = this._trade.toMoney;

        const fl     = document.getElementById('tradeFromProps');
        fl.innerHTML = '';
        from.props.forEach(sqIdx => {
            const sq = BOARD_DATA[sqIdx]; if (!sq) return;
            const sel = this._trade.fromProps.includes(sqIdx);
            fl.innerHTML += `<div class="tradeProp ${sel ? 'sel' : ''}"
              onclick="toggleTradeProp('from',${sqIdx})"
              style="border-color:${sq.col}"><span style="font-size:10px">${sq.n || ''}</span></div>`;
        });

        const tl     = document.getElementById('tradeToProps');
        tl.innerHTML = '';
        to.props.forEach(sqIdx => {
            const sq = BOARD_DATA[sqIdx]; if (!sq) return;
            const sel = this._trade.toProps.includes(sqIdx);
            tl.innerHTML += `<div class="tradeProp ${sel ? 'sel' : ''}"
              onclick="toggleTradeProp('to',${sqIdx})"
              style="border-color:${sq.col}"><span style="font-size:10px">${sq.n || ''}</span></div>`;
        });
    }

    /** تبديل عقار في عرض التجارة */
    toggleTradeProp(side, sqIdx) {
        const arr = side === 'from' ? this._trade.fromProps : this._trade.toProps;
        const idx = arr.indexOf(sqIdx);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(sqIdx);
        this._renderTradeModal();
    }

    /** إرسال عرض التجارة */
    submitTrade() {
        const fromM = +document.getElementById('tradeFromMoney').value || 0;
        const toM   = +document.getElementById('tradeToMoney').value   || 0;
        this._trade.fromMoney = fromM;
        this._trade.toMoney   = toM;

        const from = G.players[this._trade.from];
        const to   = G.players[this._trade.to];
        if (fromM > from.money) { hud.toast('ليس لديك كفاية من الدنانير'); return; }
        if (toM   > to.money)   { hud.toast('الطرف الآخر لا يملك كفاية');  return; }

        document.getElementById('tradeModal').classList.remove('open');

        if (to.isBot) {
            // البوت يقبل إن كان العرض عادلاً
            const fair = this._trade.fromProps.length + fromM >= this._trade.toProps.length + toM - 50;
            setTimeout(() => {
                if (fair) this.executeTrade();
                else hud.toast(`${to.emoji} رفض العرض`);
            }, 800);
        } else {
            document.getElementById('tradeResponseModal').classList.add('open');
            document.getElementById('tradeResDesc').textContent =
                `${from.emoji} يعرض ${fromM} + ${this._trade.fromProps.length} عقار مقابل ${toM} + ${this._trade.toProps.length} عقار`;
        }
    }

    /** تنفيذ صفقة التجارة */
    executeTrade() {
        const from = G.players[this._trade.from];
        const to   = G.players[this._trade.to];

        from.money -= this._trade.fromMoney; to.money   += this._trade.fromMoney;
        to.money   -= this._trade.toMoney;   from.money += this._trade.toMoney;

        this._trade.fromProps.forEach(sqIdx => {
            from.props = from.props.filter(p => p !== sqIdx);
            to.props.push(sqIdx);
            if (G.props[sqIdx]) G.props[sqIdx].owner = this._trade.to;
        });
        this._trade.toProps.forEach(sqIdx => {
            to.props = to.props.filter(p => p !== sqIdx);
            from.props.push(sqIdx);
            if (G.props[sqIdx]) G.props[sqIdx].owner = this._trade.from;
        });

        hud.toast(`${from.emoji} أتمّ الصفقة مع ${to.emoji} 🤝`);
        fx.sndCoin();
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
        document.getElementById('tradeResponseModal').classList.remove('open');
    }

    /** رفض عرض التجارة */
    rejectTrade() {
        document.getElementById('tradeResponseModal').classList.remove('open');
        hud.toast(`${G.players[this._trade.to].emoji} رفض العرض`);
    }

    /* ══════════════════════════════════════════════════════════
       المال والإفلاس
    ══════════════════════════════════════════════════════════ */
    /**
     * خصم مبلغ من لاعع وفحص الإفلاس
     * @param {number} pidx   - فهرس اللاعب
     * @param {number} amount - المبلغ المخصوم
     */
    deductMoney(pidx, amount) {
        const p   = G.players[pidx];
        p.money  -= amount;
        if (p.money < 0) this._checkBankruptcy(pidx);
        hud.refreshTopBar();
        hud.refreshOpponentPanels();
    }

    _checkBankruptcy(pidx) {
        const p = G.players[pidx];

        // محاولة رفع السيولة عبر الرهن التلقائي
        let raised = 0;
        p.props.forEach(sqIdx => {
            if (raised >= -p.money) return;
            const own = G.props[sqIdx];
            const sq  = BOARD_DATA[sqIdx];
            if (own && !own.mortgaged && own.houses === 0) {
                own.mortgaged = true;
                p.money      += sq.mg;
                raised       += sq.mg;
            }
        });

        if (p.money < 0) {
            // إعلان الإفلاس
            p.isBankrupt = true;
            p.props.forEach(sqIdx => { delete G.props[sqIdx]; });
            p.props = [];
            hud.toast(`${p.emoji} ${p.name} أفلس! 💀`);
            fx.haptic('heavy');
            document.getElementById('bankruptModal').classList.add('open');
            document.getElementById('bankruptName').textContent = `${p.emoji} ${p.name} أفلس!`;
            setTimeout(() => {
                document.getElementById('bankruptModal').classList.remove('open');
                hud.refreshOpponentPanels();
                turnMgr.nextTurn();
            }, 2500);
        }
    }

    /**
     * إصلاح جميع المباني (تأثير بطاقة الفرمان)
     * @param {number} pidx - فهرس اللاعب
     */
    repairAll(pidx) {
        const p   = G.players[pidx];
        let cost  = 0;
        p.props.forEach(sqIdx => {
            const own = G.props[sqIdx];
            const sq  = BOARD_DATA[sqIdx];
            if (!own || !sq) return;
            cost += own.houses * 40 + (own.houses === 5 ? 115 : 0);
        });
        this.deductMoney(pidx, cost);
    }

    /* ══════════════════════════════════════════════════════════
       نهاية اللعبة
    ══════════════════════════════════════════════════════════ */
    /**
     * إنهاء اللعبة وعرض الفائز
     * @param {Object} [winner] - كائن اللاعب الفائز (اختياري)
     */
    endGame(winner) {
        G.phase = 'over';
        camera.eventFocus(winner ? winner.sq : 0, false);
        setTimeout(() => camera.overview(), 1200);
        fx.burst(innerWidth / 2, innerHeight / 2, 40, true);

        const w = winner || G.players.reduce((a, b) =>
            (!a.isBankrupt && (b.isBankrupt || a.money > b.money)) ? a : b);

        document.getElementById('gameOverModal').classList.add('open');
        document.getElementById('gameOverWinner').textContent = `${w.emoji} ${w.name}`;
        document.getElementById('gameOverMoney').textContent  = w.money.toLocaleString('en');
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const actionHandler = new ActionHandler();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function sendToJail(pidx)           { actionHandler.sendToJail(pidx); }
function drawCard(pidx, deck)       { actionHandler.drawCard(pidx, deck); }
function showBuyModal(pidx, sqIdx)  { actionHandler.showBuyModal(pidx, sqIdx); }
function confirmBuy()               { actionHandler.confirmBuy(); }
function rejectBuy()                { actionHandler.rejectBuy(); }
function startAuction(sqIdx)        { actionHandler.startAuction(sqIdx); }
function submitMyAuction()          { actionHandler.submitMyAuction(); }
function resolveAuction()           { actionHandler.resolveAuction(); }
function openMortgageModal()        { actionHandler.openMortgageModal(); }
function mortgage(sqIdx)            { actionHandler.mortgage(sqIdx); }
function unmortgage(sqIdx)          { actionHandler.unmortgage(sqIdx); }
function openBuildModal()           { actionHandler.openBuildModal(); }
function buyHouse(sqIdx)            { actionHandler.buyHouse(sqIdx); }
function sellHouse(sqIdx)           { actionHandler.sellHouse(sqIdx); }
function openTradeModal()           { actionHandler.openTradeModal(); }
function toggleTradeProp(side, sq)  { actionHandler.toggleTradeProp(side, sq); }
function submitTrade()              { actionHandler.submitTrade(); }
function executeTrade()             { actionHandler.executeTrade(); }
function rejectTrade()              { actionHandler.rejectTrade(); }
function deductMoney(pidx, amount)  { actionHandler.deductMoney(pidx, amount); }
function repairAll(pidx)            { actionHandler.repairAll(pidx); }
function endGame(winner)            { actionHandler.endGame(winner); }
