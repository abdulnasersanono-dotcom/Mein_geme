/* ═══════════════════════════════════════════════════════════════
   JAIL
═══════════════════════════════════════════════════════════════ */
'use strict';

function sendToJail(pidx){
  const p = G.players[pidx];
  p.sq = 10; p.jailTurns = 3;
  moveTokenAnim(pidx, 10);
  camEventFocus(10, false);
  haptic('heavy'); sndJail();
  toast(`${p.emoji} اذهب للسجن! ⛓`);
  setTimeout(() => { camOverview(); nextTurn(); }, 1800);
}

/* ═══════════════════════════════════════════════════════════════
   CARDS (Lantern & Firman)
═══════════════════════════════════════════════════════════════ */
let _typeT = null;

function drawCard(pidx, deck){
  const cards  = deck === 'lant' ? LANTERN_CARDS : FIRMAN_CARDS;
  const card   = cards[~~(Math.random() * cards.length)];
  G.phase      = 'card';
  const isFirman = deck === 'firm';

  document.getElementById('sIcoEl').textContent  = isFirman ? '📜' : '🪔';
  document.getElementById('sTypEl').textContent  = isFirman ? 'فرمان الوالي' : 'الفانوس السحري';
  document.getElementById('sTitEl').textContent  = isFirman ? 'أمر سلطوي' : 'حظ سعيد!';
  document.getElementById('sRuleEl').textContent = card.rule;
  document.getElementById('sTxtEl').innerHTML    = '<span class="sCurEl"></span>';
  document.getElementById('cardOverlay').classList.add('open');

  sndScroll();
  if(isFirman) haptic('heavy'); else burst(innerWidth / 2, innerHeight / 2, 20, true);

  // Typewriter animation
  let i = 0; clearInterval(_typeT);
  _typeT = setInterval(() => {
    if(i >= card.txt.length){
      clearInterval(_typeT);
      document.getElementById('sTxtEl').innerHTML = card.txt;
      return;
    }
    document.getElementById('sTxtEl').innerHTML =
      card.txt.slice(0, i + 1) + '<span class="sCurEl"></span>';
    i++;
  }, 38);

  // Close button executes card effect
  document.querySelector('.sCloseEl').onclick = () => {
    clearInterval(_typeT);
    document.getElementById('cardOverlay').classList.remove('open');
    G.phase = 'playing';
    haptic('light');
    camOverview();
    if(card.fn) card.fn(G.players[pidx], pidx);
    refreshTopBar(); refreshOpponentPanels();
    if(!G.players[pidx].isBankrupt) setTimeout(() => nextTurn(), 800);
  };
}

/* ═══════════════════════════════════════════════════════════════
   BUY MODAL
═══════════════════════════════════════════════════════════════ */
function showBuyModal(pidx, sqIdx){
  const sq = BOARD_DATA[sqIdx], p = G.players[pidx];
  const m  = document.getElementById('buyModal');
  document.getElementById('buyModalTitle').textContent   = sq.n || 'عقار';
  document.getElementById('buyModalPrice').textContent   = sq.price;
  document.getElementById('buyModalBalance').textContent = p.money.toLocaleString('en');
  document.getElementById('buyModalColor').style.background = sq.col || '#555';
  m.dataset.sqIdx = sqIdx; m.dataset.pidx = pidx;
  m.classList.add('open');
  const rows = document.getElementById('buyModalRents');
  rows.innerHTML = '';
  if(sq.rent){
    const labels = ['أرض','منزل','منزلان','ثلاثة','أربعة','فندق'];
    sq.rent.forEach((r, i) => {
      rows.innerHTML += `<tr><td>${labels[i]}</td><td>${r} din</td></tr>`;
    });
  }
}

function confirmBuy(){
  const m    = document.getElementById('buyModal');
  const sqIdx = +m.dataset.sqIdx, pidx = +m.dataset.pidx;
  const sq   = BOARD_DATA[sqIdx], p = G.players[pidx];
  m.classList.remove('open');
  p.money -= sq.price; p.props.push(sqIdx);
  G.props[sqIdx] = {owner:pidx, houses:0, mortgaged:false, sqId:sqIdx};
  sndCoin(); toast(`${p.emoji} اشترى ${sq.n} 🏠`);
  refreshTopBar(); refreshOpponentPanels();
  setTimeout(() => nextTurn(), 800);
}

function rejectBuy(){
  const m = document.getElementById('buyModal');
  const sqIdx = +m.dataset.sqIdx;
  m.classList.remove('open');
  startAuction(sqIdx);
}

/* ═══════════════════════════════════════════════════════════════
   AUCTION SYSTEM
═══════════════════════════════════════════════════════════════ */
let auctionState = {sqIdx:-1, bids:{}, minBid:10, timer:null, timeLeft:30};

function startAuction(sqIdx){
  G.phase = 'auction';
  auctionState = {sqIdx, bids:{}, minBid:10, timer:null, timeLeft:30};
  G.players.forEach((p, i) => { if(!p.isBankrupt) auctionState.bids[i] = 0; });
  // Bots auto-bid
  G.players.forEach((p, i) => {
    const sq = BOARD_DATA[sqIdx];
    if(p.isBot && !p.isBankrupt && p.money > sq.price * 0.4){
      auctionState.bids[i] = Math.min(p.money, ~~(sq.price * (0.5 + Math.random() * 0.6)));
    }
  });
  renderAuctionModal(BOARD_DATA[sqIdx]);
  document.getElementById('auctionModal').classList.add('open');
  auctionState.timer = setInterval(() => {
    auctionState.timeLeft--;
    document.getElementById('auctionTimer').textContent = auctionState.timeLeft;
    if(auctionState.timeLeft <= 0) resolveAuction();
  }, 1000);
}

function renderAuctionModal(sq){
  document.getElementById('auctionPropName').textContent     = sq.n || 'عقار';
  document.getElementById('auctionPropColor').style.background = sq.col || '#555';
  document.getElementById('auctionOrigPrice').textContent    = sq.price;
  document.getElementById('auctionTimer').textContent        = auctionState.timeLeft;
  document.getElementById('auctionMyBidInput').value = '';
  const bidList = document.getElementById('auctionBidList');
  bidList.innerHTML = '';
  G.players.forEach((p, i) => {
    if(p.isBankrupt) return;
    bidList.innerHTML += `<div class="aucBidRow">
      <span>${p.emoji} ${p.name}</span>
      <span class="aucBidAmt">${(auctionState.bids[i]||0).toLocaleString('en')} din</span>
    </div>`;
  });
}

function submitMyAuction(){
  const myIdx = G.players.findIndex((p, i) => !p.isBot && !p.isBankrupt && i <= G.turn);
  const input = +document.getElementById('auctionMyBidInput').value;
  if(!input || input < auctionState.minBid){ toast('المبلغ أقل من الحد الأدنى!'); return; }
  if(input > G.players[myIdx].money){ toast('ليس لديك كفاية!'); return; }
  auctionState.bids[myIdx] = input;
  renderAuctionModal(BOARD_DATA[auctionState.sqIdx]);
}

function resolveAuction(){
  clearInterval(auctionState.timer);
  document.getElementById('auctionModal').classList.remove('open');
  G.phase = 'playing';
  let winner = -1, top = 0;
  Object.entries(auctionState.bids).forEach(([i, b]) => {
    if(b > top && G.players[i].money >= b){ top = b; winner = +i; }
  });
  if(winner >= 0 && top > 0){
    const sq = BOARD_DATA[auctionState.sqIdx];
    G.players[winner].money -= top;
    G.players[winner].props.push(auctionState.sqIdx);
    G.props[auctionState.sqIdx] = {owner:winner, houses:0, mortgaged:false, sqId:auctionState.sqIdx};
    toast(`${G.players[winner].emoji} فاز بالمزاد بـ ${top} دينار!`); sndCoin();
  } else {
    toast('لا أحد شارك في المزاد — العقار للبنك');
  }
  refreshTopBar(); refreshOpponentPanels();
  setTimeout(() => nextTurn(), 1200);
}

/* ═══════════════════════════════════════════════════════════════
   MORTGAGE
═══════════════════════════════════════════════════════════════ */
function openMortgageModal(){
  const pidx = G.turn, p = G.players[pidx];
  if(p.isBot){ toast('البوت لا يحتاج إدارة عقارات'); return; }
  const list = document.getElementById('mortgageList');
  list.innerHTML = '';
  p.props.forEach(sqIdx => {
    const sq = BOARD_DATA[sqIdx], own = G.props[sqIdx];
    if(!sq || !own) return;
    const isMg = own.mortgaged;
    list.innerHTML += `<div class="mgRow">
      <span class="mgColor" style="background:${sq.col||'#555'}"></span>
      <span class="mgName">${sq.n||'عقار'}</span>
      <span class="mgMoney">${sq.mg} din</span>
      <button class="mgBtn ${isMg?'unmg':''}" onclick="${isMg?`unmortgage(${sqIdx})`:`mortgage(${sqIdx})`}">
        ${isMg?'استرداد':'رهن'}
      </button>
    </div>`;
  });
  document.getElementById('mortgageModal').classList.add('open');
}

function mortgage(sqIdx){
  const own = G.props[sqIdx], sq = BOARD_DATA[sqIdx], p = G.players[G.turn];
  if(!own || own.mortgaged || own.houses > 0){ toast('لا يمكن الرهن!'); return; }
  own.mortgaged = true; p.money += sq.mg;
  toast(`${p.emoji} رهن ${sq.n} واستلم ${sq.mg} دينار`); sndCoin();
  refreshTopBar(); openMortgageModal();
}

function unmortgage(sqIdx){
  const own = G.props[sqIdx], sq = BOARD_DATA[sqIdx], p = G.players[G.turn];
  const cost = ~~(sq.mg * 1.1);
  if(!own || !own.mortgaged || p.money < cost){ toast(`تحتاج ${cost} دينار للاسترداد`); return; }
  own.mortgaged = false; p.money -= cost;
  toast(`${p.emoji} استرد ${sq.n} بـ ${cost} دينار`);
  refreshTopBar(); openMortgageModal();
}

/* ═══════════════════════════════════════════════════════════════
   BUILDING (Houses & Hotels)
═══════════════════════════════════════════════════════════════ */
function openBuildModal(){
  const pidx = G.turn, p = G.players[pidx];
  if(p.isBot){ toast('البوت يدير البناء تلقائياً'); return; }
  const list = document.getElementById('buildList');
  list.innerHTML = '';
  p.props.forEach(sqIdx => {
    const sq = BOARD_DATA[sqIdx], own = G.props[sqIdx];
    if(!sq || sq.type !== 'prop' || own.mortgaged) return;
    if(!ownsFullGroup(pidx, sq.grp)) return;
    const h = own.houses || 0;
    list.innerHTML += `<div class="buildRow">
      <span class="buildColor" style="background:${sq.col}"></span>
      <span class="buildName">${sq.n}</span>
      <span class="buildHouses">${h < 5 ? '🏠'.repeat(h) : '🏨 فندق'}</span>
      <div class="buildActions">
        ${h<5&&p.money>=sq.hCost?`<button class="buildBuyBtn" onclick="buyHouse(${sqIdx})">+🏠 ${sq.hCost}</button>`:''}
        ${h>0?`<button class="buildSellBtn" onclick="sellHouse(${sqIdx})">-🏠 ${~~(sq.hCost/2)}</button>`:''}
      </div>
    </div>`;
  });
  if(!list.innerHTML)
    list.innerHTML = '<div style="text-align:center;color:#9a7a30;padding:16px;font-size:12px;">أكمل مجموعة لونية للبناء</div>';
  document.getElementById('buildModal').classList.add('open');
}

function buyHouse(sqIdx){
  const own = G.props[sqIdx], sq = BOARD_DATA[sqIdx], p = G.players[G.turn];
  if(own.houses >= 5 || p.money < sq.hCost) return;
  own.houses++; p.money -= sq.hCost;
  sndCoin(); refreshTopBar(); openBuildModal();
}

function sellHouse(sqIdx){
  const own = G.props[sqIdx], sq = BOARD_DATA[sqIdx], p = G.players[G.turn];
  if(own.houses <= 0) return;
  own.houses--; p.money += ~~(sq.hCost / 2);
  refreshTopBar(); openBuildModal();
}

/* ═══════════════════════════════════════════════════════════════
   TRADING SYSTEM
═══════════════════════════════════════════════════════════════ */
let tradeOffer = {from:-1, to:-1, fromMoney:0, toMoney:0, fromProps:[], toProps:[]};

function openTradeModal(){
  const pidx = G.turn, p = G.players[pidx];
  if(p.isBot){ toast('البوت لا يتداول يدوياً'); return; }
  const partner = G.players.find((pp, i) => i !== pidx && !pp.isBankrupt);
  if(!partner){ toast('لا يوجد لاعبون آخرون'); return; }
  const toIdx = G.players.indexOf(partner);
  tradeOffer = {from:pidx, to:toIdx, fromMoney:0, toMoney:0, fromProps:[], toProps:[]};
  renderTradeModal();
  document.getElementById('tradeModal').classList.add('open');
}

function renderTradeModal(){
  const from = G.players[tradeOffer.from], to = G.players[tradeOffer.to];
  document.getElementById('tradeFromName').textContent  = `${from.emoji} ${from.name}`;
  document.getElementById('tradeToName').textContent    = `${to.emoji} ${to.name}`;
  document.getElementById('tradeFromMoney').value       = tradeOffer.fromMoney;
  document.getElementById('tradeToMoney').value         = tradeOffer.toMoney;
  const fl = document.getElementById('tradeFromProps'); fl.innerHTML = '';
  from.props.forEach(sqIdx => {
    const sq = BOARD_DATA[sqIdx]; if(!sq) return;
    const sel = tradeOffer.fromProps.includes(sqIdx);
    fl.innerHTML += `<div class="tradeProp ${sel?'sel':''}" onclick="toggleTradeProp('from',${sqIdx})" style="border-color:${sq.col}"><span style="font-size:10px">${sq.n||''}</span></div>`;
  });
  const tl = document.getElementById('tradeToProps'); tl.innerHTML = '';
  to.props.forEach(sqIdx => {
    const sq = BOARD_DATA[sqIdx]; if(!sq) return;
    const sel = tradeOffer.toProps.includes(sqIdx);
    tl.innerHTML += `<div class="tradeProp ${sel?'sel':''}" onclick="toggleTradeProp('to',${sqIdx})" style="border-color:${sq.col}"><span style="font-size:10px">${sq.n||''}</span></div>`;
  });
}

function toggleTradeProp(side, sqIdx){
  const arr = side === 'from' ? tradeOffer.fromProps : tradeOffer.toProps;
  const i = arr.indexOf(sqIdx);
  i >= 0 ? arr.splice(i, 1) : arr.push(sqIdx);
  renderTradeModal();
}

function submitTrade(){
  const fromM = +document.getElementById('tradeFromMoney').value || 0;
  const toM   = +document.getElementById('tradeToMoney').value   || 0;
  tradeOffer.fromMoney = fromM; tradeOffer.toMoney = toM;
  const from = G.players[tradeOffer.from], to = G.players[tradeOffer.to];
  if(fromM > from.money){ toast('ليس لديك كفاية من الدنانير'); return; }
  if(toM   > to.money)  { toast('الطرف الآخر لا يملك كفاية'); return; }
  document.getElementById('tradeModal').classList.remove('open');
  if(to.isBot){
    const fair = tradeOffer.fromProps.length + fromM >= tradeOffer.toProps.length + toM - 50;
    setTimeout(() => { fair ? executeTrade() : toast(`${to.emoji} رفض العرض`); }, 800);
  } else {
    document.getElementById('tradeResponseModal').classList.add('open');
    document.getElementById('tradeResDesc').textContent =
      `${from.emoji} يعرض ${fromM} + ${tradeOffer.fromProps.length} عقار مقابل ${toM} + ${tradeOffer.toProps.length} عقار`;
  }
}

function executeTrade(){
  const from = G.players[tradeOffer.from], to = G.players[tradeOffer.to];
  from.money -= tradeOffer.fromMoney; to.money   += tradeOffer.fromMoney;
  to.money   -= tradeOffer.toMoney;   from.money += tradeOffer.toMoney;
  tradeOffer.fromProps.forEach(sqIdx => {
    from.props = from.props.filter(p => p !== sqIdx); to.props.push(sqIdx);
    if(G.props[sqIdx]) G.props[sqIdx].owner = tradeOffer.to;
  });
  tradeOffer.toProps.forEach(sqIdx => {
    to.props = to.props.filter(p => p !== sqIdx); from.props.push(sqIdx);
    if(G.props[sqIdx]) G.props[sqIdx].owner = tradeOffer.from;
  });
  toast(`${from.emoji} أتمّ الصفقة مع ${to.emoji} 🤝`); sndCoin();
  refreshTopBar(); refreshOpponentPanels();
  document.getElementById('tradeResponseModal').classList.remove('open');
}

function rejectTrade(){
  document.getElementById('tradeResponseModal').classList.remove('open');
  toast(`${G.players[tradeOffer.to].emoji} رفض العرض`);
}

/* ═══════════════════════════════════════════════════════════════
   BANKRUPTCY
═══════════════════════════════════════════════════════════════ */
function deductMoney(pidx, amount){
  const p = G.players[pidx];
  p.money -= amount;
  if(p.money < 0) checkBankruptcy(pidx);
  refreshTopBar(); refreshOpponentPanels();
}

function checkBankruptcy(pidx){
  const p = G.players[pidx];
  // Try to raise funds via mortgaging
  let raised = 0;
  p.props.forEach(sqIdx => {
    if(raised >= -p.money) return;
    const own = G.props[sqIdx], sq = BOARD_DATA[sqIdx];
    if(own && !own.mortgaged && own.houses === 0){ own.mortgaged = true; p.money += sq.mg; raised += sq.mg; }
  });
  if(p.money < 0){
    p.isBankrupt = true;
    p.props.forEach(sqIdx => { delete G.props[sqIdx]; });
    p.props = [];
    toast(`${p.emoji} ${p.name} أفلس! 💀`); haptic('heavy');
    document.getElementById('bankruptModal').classList.add('open');
    document.getElementById('bankruptName').textContent = `${p.emoji} ${p.name} أفلس!`;
    setTimeout(() => {
      document.getElementById('bankruptModal').classList.remove('open');
      refreshOpponentPanels(); nextTurn();
    }, 2500);
  }
}

/** Repair all buildings (used by Firman card) */
function repairAll(pidx){
  const p = G.players[pidx];
  let cost = 0;
  p.props.forEach(sqIdx => {
    const own = G.props[sqIdx], sq = BOARD_DATA[sqIdx];
    if(!own || !sq) return;
    cost += own.houses * 40 + (own.houses === 5 ? 115 : 0);
  });
  deductMoney(pidx, cost);
}

/* ═══════════════════════════════════════════════════════════════
   GAME OVER
═══════════════════════════════════════════════════════════════ */
function endGame(winner){
  G.phase = 'over';
  camEventFocus(winner ? winner.sq : 0, false);
  setTimeout(() => camOverview(), 1200);
  burst(innerWidth / 2, innerHeight / 2, 40, true);
  const w = winner || G.players.reduce((a, b) =>
    (!a.isBankrupt && (b.isBankrupt || a.money > b.money)) ? a : b);
  document.getElementById('gameOverModal').classList.add('open');
  document.getElementById('gameOverWinner').textContent = `${w.emoji} ${w.name}`;
  document.getElementById('gameOverMoney').textContent  = w.money.toLocaleString('en');
}
