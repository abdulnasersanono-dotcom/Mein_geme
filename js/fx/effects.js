/* ═══════════════════════════════════════════════════════════════
   FX — Stars, Particles, Haptic, Audio, Money Counter, Timer
   تعديل هذا الملف يغير المؤثرات البصرية والصوتية فقط
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══ STARS (drawn once on canvas) ══════════════════════════════ */
(()=>{
  const c = document.getElementById('starCv');
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  for(let i = 0; i < 160; i++){
    const x = Math.random() * c.width;
    const y = Math.random() * c.height * 0.8;
    const r = Math.random() * 1.2;
    const a = Math.random() * 0.5 + 0.05;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,215,140,${a})`;
    ctx.fill();
  }
})();

/* ══ PARTICLES SYSTEM ══════════════════════════════════════════ */
const pCV = document.getElementById('pCv');
pCV.width  = innerWidth;
pCV.height = innerHeight;
const pCX = pCV.getContext('2d');
let pPool  = [];

(function pLoop(){
  pCX.clearRect(0, 0, pCV.width, pCV.height);
  const now = performance.now();
  pPool = pPool.filter(p => {
    const t = (now - p.b) / p.l;
    if(t >= 1) return false;
    const e = 1 - t;
    p.vx *= 0.92; p.vy += 0.25; p.x += p.vx; p.y += p.vy;
    pCX.globalAlpha = e * e;
    pCX.fillStyle   = p.c;
    pCX.beginPath();
    pCX.arc(p.x, p.y, p.r * e, 0, Math.PI * 2);
    pCX.fill();
    return true;
  });
  pCX.globalAlpha = 1;
  requestAnimationFrame(pLoop);
})();

/**
 * Spawn a burst of gold particles
 * @param {number} x
 * @param {number} y
 * @param {number} n  - count
 * @param {boolean} big - larger particles
 */
function burst(x, y, n = 14, big = false){
  const cs = ['#FFE060','#FFC030','#FF9000','#FFEA80','#FF5020'];
  for(let i = 0; i < n; i++){
    const a  = Math.random() * Math.PI * 2;
    const sp = (big ? 3 : 2) + Math.random() * (big ? 6 : 4);
    pPool.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2,
      r:  (big ? 4 : 3) + Math.random() * (big ? 5 : 3),
      c:  cs[i % cs.length],
      b:  performance.now(),
      l:  (big ? 900 : 600) + Math.random() * 300,
    });
  }
}

/* ══ HAPTIC ════════════════════════════════════════════════════ */
/**
 * Trigger device vibration
 * @param {'light'|'medium'|'heavy'|'success'} t
 */
function haptic(t = 'light'){
  if(!navigator.vibrate) return;
  ({
    light:   () => navigator.vibrate(25),
    medium:  () => navigator.vibrate(55),
    heavy:   () => navigator.vibrate(100),
    success: () => navigator.vibrate([25, 40, 25]),
  }[t] || haptic)();
}

/* ══ AUDIO ENGINE ══════════════════════════════════════════════ */
let AX = null;
function getAX(){
  if(!AX) AX = new (window.AudioContext || window.webkitAudioContext)();
  return AX;
}

/**
 * Play a single synthesized tone
 * @param {number} f   - frequency Hz
 * @param {string} t   - oscillator type
 * @param {number} d   - duration seconds
 * @param {number} v   - volume
 * @param {number} dl  - delay seconds
 */
function tone(f, t = 'sine', d = 0.15, v = 0.07, dl = 0){
  try {
    const ctx = getAX(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = t;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, ctx.currentTime + dl);
    g.gain.linearRampToValueAtTime(v, ctx.currentTime + dl + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dl + d);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + dl);
    o.stop(ctx.currentTime + dl + d + 0.05);
  } catch(e){}
}

// Named sound effects — تعديل هنا يغير أصوات اللعبة
function sndCoin()  { [523,659,784,1047].forEach((f,i) => tone(f,'sine',.12,.06,i*.06)); }
function sndDice()  { tone(200,'square',.08,.12); setTimeout(() => tone(300,'square',.06,.08), 80); }
function sndScroll(){ [220,277,330].forEach((f,i) => tone(f,'triangle',.22,.05,i*.08)); }
function sndErr()   { tone(150,'sawtooth',.15,.12); }
function sndJail()  { tone(100,'sawtooth',.35,.15); setTimeout(() => tone(80,'sawtooth',.25,.12), 200); }

/* ══ MONEY LERP COUNTER ════════════════════════════════════════ */
let dispMoney = 1500, targMoney = 1500;

/**
 * Animate money display toward a new value
 * @param {number} v - new target value
 * @param {boolean} animate
 */
function setMoney(v, animate = true){
  targMoney = Math.max(0, v);
  const el = document.getElementById('moneyVal');
  if(animate){
    el.classList.remove('animUp','animDown');
    void el.offsetWidth;
    el.classList.add(v > dispMoney ? 'animUp' : 'animDown');
  }
}

(function mLoop(){
  if(Math.abs(dispMoney - targMoney) > 0.5){
    dispMoney += (targMoney - dispMoney) * 0.1;
    document.getElementById('moneyVal').textContent =
      Math.round(dispMoney).toLocaleString('en');
  }
  requestAnimationFrame(mLoop);
})();

/* ══ TURN TIMER ════════════════════════════════════════════════ */
let timerSec = 45, timerRunning = false, timerInterval = null;

/** Start the 45-second per-turn timer */
function startTimer(){
  timerRunning = true;
  timerSec = 45;
  timerInterval = setInterval(() => {
    if(--timerSec <= 0){
      clearInterval(timerInterval);
      timerRunning = false;
      window.endTurn();       // endTurn wired in main.js
    }
    const m = ~~(timerSec / 60), s = timerSec % 60;
    document.getElementById('timer').textContent = `${m}:${s < 10 ? '0' + s : s}`;
  }, 1000);
}

/** Stop the timer without triggering endTurn */
function stopTimer(){
  clearInterval(timerInterval);
  timerRunning = false;
}

/* ══ RESIZE ════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  pCV.width  = innerWidth;
  pCV.height = innerHeight;
});
