// ═══════════════════════════════════════════════
// UI EFFECTS - Particles, Stars, Audio, Dice Toast
// ═══════════════════════════════════════════════

// Particles system
const pCV = document.getElementById('pCv');
if (pCV) {
  pCV.width = innerWidth; pCV.height = innerHeight;
  const pCX = pCV.getContext('2d');
  let pPool = [];
  
  (function pLoop() {
    pCX.clearRect(0, 0, pCV.width, pCV.height);
    const now = performance.now();
    pPool = pPool.filter(p => {
      const t = (now - p.b) / p.l;
      if (t >= 1) return false;
      const e = 1 - t;
      p.vx *= 0.92; p.vy += 0.25; p.x += p.vx; p.y += p.vy;
      pCX.globalAlpha = e * e; pCX.fillStyle = p.c;
      pCX.beginPath(); pCX.arc(p.x, p.y, p.r * e, 0, Math.PI * 2); pCX.fill();
      return true;
    });
    pCX.globalAlpha = 1;
    requestAnimationFrame(pLoop);
  })();
}

window.burst = function(x, y, n = 14, big = false) {
  const cs = ['#FFE060', '#FFC030', '#FF9000', '#FFEA80', '#FF5020'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (big ? 3 : 2) + Math.random() * (big ? 6 : 4);
    pPool.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
      r: (big ? 4 : 3) + Math.random() * (big ? 5 : 3),
      c: cs[i % cs.length], b: performance.now(),
      l: (big ? 900 : 600) + Math.random() * 300
    });
  }
};

// Stars background
window.initStars = function() {
  const starCv = document.getElementById('starCv');
  if (!starCv) return;
  starCv.width = window.innerWidth;
  starCv.height = window.innerHeight;
  const ctx = starCv.getContext('2d');
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * starCv.width;
    const y = Math.random() * starCv.height * 0.8;
    const r = Math.random() * 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,215,140,${Math.random() * .5 + .05})`;
    ctx.fill();
  }
};

// Audio engine
let AX = null;
function getAX() {
  if (!AX) AX = new (window.AudioContext || window.webkitAudioContext)();
  return AX;
}

window.tone = function(f, t = 'sine', d = .15, v = .07, dl = 0) {
  try {
    const ctx = getAX(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(0, ctx.currentTime + dl);
    g.gain.linearRampToValueAtTime(v, ctx.currentTime + dl + .02);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + dl + d);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + dl); o.stop(ctx.currentTime + dl + d + .05);
  } catch (e) {}
};

window.sndCoin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', .12, .06, i * .06));
window.sndDice = () => { tone(200, 'square', .08, .12); setTimeout(() => tone(300, 'square', .06, .08), 80); };
window.sndScroll = () => [220, 277, 330].forEach((f, i) => tone(f, 'triangle', .22, .05, i * .08));

// Haptic
window.haptic = function(t = 'light') {
  if (!navigator.vibrate) return;
  const types = { light: 25, medium: 55, heavy: 100, success: [25, 40, 25] };
  navigator.vibrate(types[t] || types.light);
};

// Dice toast animation (2D canvas overlay)
window.showDiceToast = function(d1, d2, msg) {
  const dc = document.getElementById('diceCanvas');
  if (!dc) return;
  // Dice animation logic extracted from inline (see full impl in original neu.index.html)
  console.log(`🎲 Dice: ${d1}+${d2}=${d1+d2} ${msg}`);
};

// Global toast
window.toast = function(msg, dur = 1800) {
  const d = document.createElement('div');
  d.className = 'gameToast'; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add('show'), 10);
  setTimeout(() => {
    d.classList.remove('show');
    setTimeout(() => d.remove(), 400);
  }, dur);
};

// Timer
let timerSec = 45, timerRunning = false, timerInterval = null;
window.startTimer = () => {
  timerRunning = true; timerSec = 45;
  timerInterval = setInterval(() => {
    if (--timerSec <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      window.nextTurn();
    }
    const m = ~~(timerSec / 60), s = timerSec % 60;
    document.getElementById('timer')?.textContent = `${m}:${s < 10 ? '0' + s : s}`;
  }, 1000);
};

window.stopTimer = () => {
  clearInterval(timerInterval);
  timerRunning = false;
};

