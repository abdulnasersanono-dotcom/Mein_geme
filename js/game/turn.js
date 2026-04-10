/* ═══════════════════════════════════════════════════════════════
   TURN MANAGEMENT & DICE ROLL
   يعتمد على: state.js, hud.js, camera.js, fx/effects.js, landing.js
═══════════════════════════════════════════════════════════════ */
'use strict';

/** Begin a player's turn */
function startTurn(pidx){
  G.turn = pidx; G.doublesCount = 0;
  const p = G.players[pidx];
  if(!p || p.isBankrupt){ nextTurn(); return; }

  // Handle skip turn (Firman effect)
  if(p.skipTurn){
    p.skipTurn = false;
    toast(`${p.emoji} ${p.name} — دور مُوقَف بالفرمان`);
    setTimeout(() => nextTurn(), 1600);
    return;
  }

  refreshTopBar();
  refreshOpponentPanels();
  updateTurnPill(p);
  camOverview();   // Camera State 1 — overview while waiting

  if(p.isBot){
    setTimeout(() => doRollDice(), 1000 + Math.random() * 800);
  } else {
    enableDiceBtn(true);
    startTimer();
  }
}

/** Advance to the next non-bankrupt player */
function nextTurn(){
  stopTimer();
  enableDiceBtn(false);
  let next  = (G.turn + 1) % G.players.length;
  let loops = 0;
  while(G.players[next].isBankrupt){
    next = (next + 1) % G.players.length;
    if(++loops > G.players.length){ endGame(); return; }
  }
  // Win condition: only one player left
  const active = G.players.filter(p => !p.isBankrupt);
  if(active.length === 1){ endGame(active[0]); return; }
  setTimeout(() => startTurn(next), 600);
}

/** Roll dice and move the current player */
function doRollDice(){
  if(G.phase !== 'playing') return;
  enableDiceBtn(false);
  stopTimer();
  haptic('medium'); sndDice();

  // Camera flash on roll
  const flash = document.getElementById('camFlash');
  flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 380);

  const d1 = ~~(Math.random() * 6) + 1;
  const d2 = ~~(Math.random() * 6) + 1;
  const total    = d1 + d2;
  const isDouble = d1 === d2;
  if(isDouble) G.doublesCount++; else G.doublesCount = 0;

  // Three doubles → jail
  if(G.doublesCount >= 3){
    showDiceToast(d1, d2, `ثلاثة توائم! اذهب للسجن`);
    setTimeout(() => sendToJail(G.turn), 1400);
    return;
  }

  showDiceToast(d1, d2, `تتقدم ${total} خطوات`);
  const p = G.players[G.turn];

  // Jail escape logic
  if(p.jailTurns > 0){
    if(isDouble){
      p.jailTurns = 0;
      toast(`${p.emoji} خرج من السجن بالتوائم!`);
    } else {
      p.jailTurns--;
      if(p.jailTurns === 0){
        deductMoney(G.turn, 50);
        toast(`${p.emoji} دفع 50 ديناراً للخروج من السجن`);
      } else {
        toast(`${p.emoji} لا يزال في السجن (${p.jailTurns} دور متبقي)`);
        setTimeout(() => { camAnimTo(38, 45, 600); nextTurn(); }, 1800);
        return;
      }
    }
  }

  setTimeout(() => {
    animateMovement(G.turn, total, () => {
      camOverview();
      landOnSquare(G.turn, G.players[G.turn].sq);
      if(isDouble && G.players[G.turn].jailTurns === 0){
        setTimeout(() => {
          toast(`${G.players[G.turn].emoji} توائم! ارم النرد مجدداً`);
          startTurn(G.turn);
        }, 1400);
      }
    });
  }, 1800);
}

/** Animate token step-by-step across the board */
function animateMovement(pidx, steps, onDone){
  const p = G.players[pidx];
  let moved = 0;
  const iv = setInterval(() => {
    moved++;
    p.sq = (p.sq + 1) % 40;
    if(p.sq === 0 && moved > 0){ p.money += 200; sndCoin(); toast(`${p.emoji} مرّ على انطلق +200 💰`); }
    moveTokenAnim(pidx, p.sq);
    camFollowSquare(p.sq);   // Camera State 2 — follow
    if(moved >= steps){ clearInterval(iv); setTimeout(onDone, 300); }
  }, 200);
}
