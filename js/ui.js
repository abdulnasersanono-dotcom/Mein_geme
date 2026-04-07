/* ═══════════════════════════════════════════
   ui.js - وظائف الواجهة والتأثيرات البصرية
   
   يحتوي على:
   • الجسيمات والنجوم
   • الصوت والهزاز
   • العدادات (مال، مؤقت)
   • بناء SVG اللوحة
   • تحديث الألواح
   • Toast والإشعارات
═══════════════════════════════════════════ */

// ═══════════════════════════════════════════
// النجوم (ترسم مرة واحدة)
// ═══════════════════════════════════════════
let starCv;
export function initStars() {
  starCv = document.getElementById('starCv');
  if (!starCv) return;
  starCv.width = window.innerWidth;
  starCv.height = window.innerHeight;
  const ctx = starCv.getContext('2d');
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * starCv.width;
    const y = Math.random() * starCv.height * 0.8;
    const r = Math.random() * 1.2;
    const a = Math.random() * 0.5 + 0.05;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,215,140,${a})`;
    ctx.fill();
  }
}

// ═══════════════════════════════════════════
// نظام الجسيمات (Particles)
// ═══════════════════════════════════════════
let pCV, pCX, pPool = [];
export function initParticles() {
  pCV = document.getElementById('pCv');
  if (!pCV) return;
  pCV.width = innerWidth;
  pCV.height = innerHeight;
  pCX = pCV.getContext('2d');
  
  (function pLoop() {
    pCX.clearRect(0, 0, pCV.width, pCV.height);
    const now = performance.now();
    pPool = pPool.filter(p => {
      const t = (now - p.b) / p.l;
      if (t >= 1) return false;
      const e = 1 - t;
      p.vx *= 0.92;
      p.vy += 0.25;
      p.x += p.vx;
      p.y += p.vy;
      pCX.globalAlpha = e * e;
      pCX.fillStyle = p.c;
      pCX.beginPath();
      pCX.arc(p.x, p.y, p.r * e, 0, Math.PI * 2);
      pCX.fill();
      return true;
    });
    pCX.globalAlpha = 1;
    requestAnimationFrame(pLoop);
  })();
}

export function burst(x, y, n = 14, big = false) {
  const cs = ['#FFE060', '#FFC030', '#FF9000', '#FFEA80', '#FF5020'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (big ? 3 : 2) + Math.random() * (big ? 6 : 4);
    pPool.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
      r: (big ? 4 : 3) + Math.random() * (big ? 5 : 3),
      c: cs[i % cs.length],
      b: performance.now(),
      l: (big ? 900 : 600) + Math.random() * 300
    });
  }
}

// ═══════════════════════════════════════════
// الهزاز (Haptic Feedback)
export function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const vibes = {
    light: () => navigator.vibrate(25),
    medium: () => navigator.vibrate(55),
    heavy: () => navigator.vibrate(100),
    success: () => navigator.vibrate([25, 40, 25])
  };
  (vibes[type] || haptic)();
}

// ═══════════════════════════════════════════
// محرك الصوت (Web Audio API)
let AX = null;
function getAX() {
  if (!AX) AX = new (window.AudioContext || window.webkitAudioContext)();
  return AX;
}

export function tone(f, t = 'sine', d = .15, v = .07, dl = 0) {
  try {
    const ctx = getAX();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = t;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, ctx.currentTime + dl);
    g.gain.linearRampToValueAtTime(v, ctx.currentTime + dl + .02);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + dl + d);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + dl);
    o.stop(ctx.currentTime + dl + d + .05);
  } catch (e) { }
}

export function sndCoin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', .12, .06, i * .06));
}
export function sndDice() { 
  tone(200, 'square', .08, .12);
  setTimeout(() => tone(300, 'square', .06, .08), 80);
}
export function sndScroll() { 
  [220, 277, 330].forEach((f, i) => tone(f, 'triangle', .22, .05, i * .08)); 
}
export function sndErr() { tone(150, 'sawtooth', .15, .12); }
export function sndJail() { 
  tone(100, 'sawtooth', .35, .15);
  setTimeout(() => tone(80, 'sawtooth', .25, .12), 200);
}

// ═══════════════════════════════════════════
// عداد المال السلس (Lerp Counter)
let dispMoney = 1500, targMoney = 1500;
export function setMoney(v, animate = true) {
  targMoney = Math.max(0, v);
  const el = document.getElementById('moneyVal');
  if (animate) {
    el.classList.remove('animUp', 'animDown');
    void el.offsetWidth;
    el.classList.add(v > dispMoney ? 'animUp' : 'animDown');
  }
}

export function initMoneyLoop() {
  (function mLoop() {
    if (Math.abs(dispMoney - targMoney) > .5) {
      dispMoney += (targMoney - dispMoney) * .1;
      const el = document.getElementById('moneyVal');
      if (el) el.textContent = Math.round(dispMoney).toLocaleString('en');
    }
    requestAnimationFrame(mLoop);
  })();
}

// ═══════════════════════════════════════════
// المؤقت
let timerSec = 45, timerRunning = false, timerInterval = null;
export function startTimer() {
  timerRunning = true;
  timerSec = 45;
  timerInterval = setInterval(() => {
    if (--timerSec <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      nextTurn(); // استيراد من game.js ✓
    }
    const m = ~~(timerSec / 60), s = timerSec % 60;
    const el = document.getElementById('timer');
    if (el) el.textContent = `${m}:${s < 10 ? '0' + s : s}`;
  }, 1000);
}

export function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

// ═══════════════════════════════════════════
// بناء SVG اللوحة الكاملة
export function buildBoard() {
  const B = 660, C = 96, S = (B - 2 * C) / 9;
  const PC = {
    brown: '#5C3010', cyan: '#1A7A9A', purple: '#6B2FA0', orange: '#CC5500',
    red: '#8B1010', yellow: '#B8920A', green: '#1A5C2A', navy: '#0A1F6B'
  };

// دالة بناء كل مربع
  const buildCell = (id, x, y, w, h, side, data) => {
    const sq = data[id];
    const name = sq.n || '';
    const col = sq.col || '#888';
    const icon = sq.icon || '';
    const type = sq.type || 'empty';

    let html = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ry="8" fill="#2a1a0f" stroke="${col}" stroke-width="3"/>`;
    
    if (icon || type === 'go' || type === 'jail') {
      html += `<text x="${x + w/2}" y="${y + h/2 + 6}" text-anchor="middle" font-size="20" fill="#FFD060" font-weight="bold">${icon || sq.n?.slice(0,1) || '?'}</text>`;
    } else if (name) {
      html += `<text x="${x + w/2}" y="${y + h/2 + 4}" text-anchor="middle" font-size="12" fill="#e8d5a3" font-weight="600">${name}</text>`;
    }

    if (type === 'go') html += `<path d="M ${x+10} ${y+10} L ${x+w-10} ${y+10} L ${x+w-10} ${y+25}" stroke="#FFD060" stroke-width="4" fill="none"/>`;
    if (type === 'jail') html += `<rect x="${x + 8}" y="${y + 8}" width="12" height="12" fill="#8B4513" stroke="#654321" stroke-width="2"/>`;

    return html;
  };

  const svg = document.getElementById('boardSvg');
  if (svg) {
    let boardHTML = '<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    
    // بناء اللوحة كاملة
    const B = 660, C = 96, S = (B - 2 * C) / 9;
    for (let id = 0; id < 40; id++) {
      let x, y, w = S, h = S;
      
      if (id < 11) { // bottom
        x = C + id * S; y = B - C - S;
      } else if (id < 20) { // left
        x = C; y = B - C - (id - 10) * S;
      } else if (id < 30) { // top
        x = B - C - (id - 20) * S; y = C;
      } else { // right
        x = B - C - S; y = C + (id - 30) * S;
      }
      
      if (id % 10 === 0) { w = C; h = C; } // corners wider
      boardHTML += buildCell(id, x, y, w, h, w === S ? 'side' : 'corner', BOARD_DATA);
    }
    
    svg.innerHTML = boardHTML;
  }
}

// ═══════════════════════════════════════════
// تحديث لوحة اللاعبين (اللوحة اليسرى)
export function refreshOpponentPanels(players, turn) {
  const panel = document.getElementById('leftPanel');
  if (!panel || !players) return;
  
  panel.innerHTML = '';
  players.forEach((p, i) => {
    const isActive = turn === i;
    const pct = Math.max(3, Math.min(100, p.money / 20));
    
    const propDots = p.props.map(sqIdx => {
      const sq = BOARD_DATA[sqIdx];
      return sq?.col ? `<div class="prDotProp" style="background:${sq.col}"></div>` : '';
    }).join('');

    const jailBadge = p.jailTurns > 0 ? `<div class="prJailBadge">⛓${p.jailTurns}</div>` : '';

    const row = document.createElement('div');
    row.className = `playerRow${isActive ? ' active' : ''}${p.isBankrupt ? ' bankrupt' : ''}${p.jailTurns > 0 ? ' jailed' : ''}`;
    row.innerHTML = `
      <div class="prAvatar">
        ${p.emoji}
        <div class="prDot"></div>
      </div>
      <div class="prInfo">
        <div class="prName">${p.name}${p.isBot ? ' 🤖' : ''}</div>
        <div class="prMoney">${p.money.toLocaleString('en')} <span class="prMoneyLabel">din</span></div>
        <div class="prBar"><div class="prBarFill" style="width:${pct}%"></div></div>
        <div class="prProps">${propDots}</div>
      </div>
      ${jailBadge}`;
    panel.appendChild(row);
  });
}

// ═══════════════════════════════════════════
// تحديث حبة الدور
export function updateTurnPill(player) {
  const el = document.getElementById('turnPill');
  if (el && player) {
    el.textContent = `${player.emoji} ${player.name} — دورك`;
    el.style.borderColor = player.color;
    el.style.color = player.color;
  }
}

// ═══════════════════════════════════════════
// الإشعار العائم (Toast)
export function toast(msg, dur = 1800) {
  const d = document.createElement('div');
  d.className = 'gameToast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add('show'), 10);
  setTimeout(() => {
    d.classList.remove('show');
    setTimeout(() => d.remove(), 400);
  }, dur);
}

// ═══════════════════════════════════════════
// تفعيل/إلغاء زر النرد
export function enableDiceBtn(on) {
  const b = document.getElementById('diceBtnFace');
  const db = document.getElementById('diceBtn');
  if (b) b.style.pointerEvents = on ? 'auto' : 'none';
  if (b) b.style.opacity = on ? '1' : '0.5';
  if (db) db.classList.toggle('pulse', on);
}


