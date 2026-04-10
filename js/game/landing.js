/* ═══════════════════════════════════════════════════════════════
   LANDING ON SQUARES — handles all square effects
   يعتمد على: state.js, board-data.js, turn.js, buy.js, cards-logic.js, jail.js
═══════════════════════════════════════════════════════════════ */
'use strict';

/** Called after token lands on a square */
function landOnSquare(pidx, sqIdx){
  const sq = BOARD_DATA[sqIdx];
  const p  = G.players[pidx];
  if(!sq){ nextTurn(); return; }

  switch(sq.type){
    case 'go':
      p.money += 200; sndCoin(); toast('+200 💰 مررت بانطلق');
      nextTurn(); break;

    case 'free':
      toast('استراحة — لا شيء يحدث ☕');
      nextTurn(); break;

    case 'jail':
      toast('زيارة للسجن فقط 👀');
      nextTurn(); break;

    case 'gojail':
      sendToJail(pidx); break;

    case 'tax':
      if(p.taxFree){
        p.taxFree = false;
        toast(`${p.emoji} معفى من الضريبة 🪔`);
        nextTurn();
      } else {
        deductMoney(pidx, sq.amount);
        toast(`${p.emoji} دفع ${sq.amount} ضريبة ⚔️`);
        setTimeout(() => nextTurn(), 1200);
      }
      break;

    case 'prop':
    case 'gate':
    case 'util':
      camEventFocus(sqIdx, false);   // Camera State 3 — event
      handlePropertyLanding(pidx, sqIdx); break;

    case 'lant':
      camEventFocus(sqIdx, false);
      drawCard(pidx, 'lant'); break;

    case 'firm':
      camEventFocus(sqIdx, false);
      drawCard(pidx, 'firm'); break;

    default:
      nextTurn();
  }
}

/** Handle landing on a property/gate/utility square */
function handlePropertyLanding(pidx, sqIdx){
  const ownership = G.props[sqIdx];
  const sq  = BOARD_DATA[sqIdx];
  const p   = G.players[pidx];

  if(!ownership){
    // Unowned — offer buy or start auction
    if(p.money >= sq.price){
      showBuyModal(pidx, sqIdx);
    } else {
      toast(`${p.emoji} لا يملك كفاية — يبدأ المزاد!`);
      setTimeout(() => startAuction(sqIdx), 1000);
    }
  } else if(ownership.owner === pidx){
    toast(`${p.emoji} تقف على عقارك الخاص`);
    setTimeout(() => nextTurn(), 900);
  } else if(ownership.mortgaged){
    toast(`${sq.n} مرهون — لا إيجار`);
    setTimeout(() => nextTurn(), 900);
  } else {
    // Pay rent to owner
    const rent  = calcRent(sqIdx, ownership);
    const owner = G.players[ownership.owner];
    toast(`${p.emoji} يدفع ${rent} إيجاراً لـ ${owner.emoji}`);
    deductMoney(pidx, rent);
    G.players[ownership.owner].money += rent;
    sndCoin();
    refreshTopBar(); refreshOpponentPanels();
    setTimeout(() => nextTurn(), 1500);
  }
}

/** Calculate rent based on ownership state */
function calcRent(sqIdx, ownership){
  const sq = BOARD_DATA[sqIdx];
  if(!sq) return 0;

  if(sq.type === 'gate'){
    const n = Object.values(G.props).filter(p =>
      p.owner === ownership.owner && BOARD_DATA[p.sqId]?.type === 'gate'
    ).length;
    return [25, 50, 100, 200][Math.min(n - 1, 3)];
  }

  if(sq.type === 'util'){
    const n = Object.values(G.props).filter(p =>
      p.owner === ownership.owner && BOARD_DATA[p.sqId]?.type === 'util'
    ).length;
    return (n === 2 ? 10 : 4) * 7;
  }

  // Property: check houses/hotels
  const houses = ownership.houses || 0;
  const hasAll = ownsFullGroup(ownership.owner, sq.grp);
  if(houses === 5) return sq.rent[5];        // hotel
  if(houses > 0)  return sq.rent[houses];    // 1–4 houses
  if(hasAll)      return sq.rent[0] * 2;     // monopoly bonus
  return sq.rent[0];
}

/** Check if a player owns all squares in a colour group */
function ownsFullGroup(pidx, grp){
  if(!grp) return false;
  const members = GROUPS[grp] || [];
  return members.every(id => G.props[id]?.owner === pidx);
}

/** Teleport a token to a specific square (used by cards) */
function moveTo(pidx, sq, collectGo){
  const p = G.players[pidx];
  if(sq <= p.sq && collectGo){ p.money += 200; sndCoin(); toast(`${p.emoji} مرّ على انطلق +200 💰`); }
  p.sq = sq;
  moveTokenAnim(pidx, sq);
  setTimeout(() => landOnSquare(pidx, sq), 600);
}
