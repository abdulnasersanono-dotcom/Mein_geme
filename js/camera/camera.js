/* ═══════════════════════════════════════════════════════════════
   CAMERA SYSTEM — 3-State Professional Camera
   State 1 OVERVIEW  : full board visible, static
   State 2 FOLLOWER  : smooth tracking of moving token
   State 3 EVENT     : snap close-up on important squares
   تعديل هذا الملف يغير سلوك الكاميرا فقط
═══════════════════════════════════════════════════════════════ */
'use strict';

const board     = document.getElementById('boardGrid');
const CAM_STATE = { OVERVIEW: 'overview', FOLLOWER: 'follower', EVENT: 'event' };

// Current camera values (mutated each frame)
const cam = {
  tilt:     38,   // rotateX degrees
  spin:     45,   // rotateZ degrees
  scale:    1.0,
  panX:     0,
  panY:     0,
  // SmoothDamp velocities
  velScale: 0,
  velX:     0,
  velY:     0,
  velTilt:  0,
  velSpin:  0,
  // Camera shake
  shakeAmp: 0,
  shakeDec: 0,
  // State machine
  state:    CAM_STATE.OVERVIEW,
  followSq: 0,
  eventSq:  0,
};

// Per-state target configuration
// تعديل هذا القسم يغير زوايا الكاميرا لكل حالة
const CAM_CFG = {
  overview: { tilt:38, spin:45, scale:1.00, offsetY:  0,     smoothTime:0.55 },
  follower: { tilt:30, spin:45, scale:1.38, offsetY: -0.08,  smoothTime:0.28 },
  event:    { tilt:26, spin:45, scale:1.55, offsetY: -0.06,  smoothTime:0.18 },
};

const BOARD_CENTER_SVG = { x:330, y:330 };

/* ── SmoothDamp (Unity-equivalent) ─────────────────────────── */
function smoothDamp(current, target, velocity, smoothTime, dt){
  const omega  = 2 / smoothTime;
  const x      = omega * dt;
  const exp    = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp   = (velocity + omega * change) * dt;
  velocity     = (velocity - omega * temp) * exp;
  const out    = target + (change + temp) * exp;
  return { value: out, vel: velocity };
}

/* ── Compute pan offset to centre on a square ─────────────── */
function squarePanOffset(sqIdx, scaleMult){
  const pos = SQ_CENTERS_GAME[sqIdx % 40];
  if(!pos) return { x:0, y:0 };
  const cfg  = CAM_CFG[cam.state];
  const dx   = pos.x - BOARD_CENTER_SVG.x;
  const dy   = pos.y - BOARD_CENTER_SVG.y;
  const cosT = Math.cos(38 * Math.PI / 180);
  const vOff = cfg.offsetY * 660;
  return {
    x: -(dx) / scaleMult,
    y: -(dy * cosT) / scaleMult + vOff / scaleMult,
  };
}

/* ── Apply cam values to DOM ─────────────────────────────── */
function applyCam(){
  const now = performance.now() * 0.001;
  const sx  = cam.shakeAmp * Math.sin(now * 47) * Math.cos(now * 31);
  const sy  = cam.shakeAmp * Math.sin(now * 37) * Math.cos(now * 53);
  cam.shakeAmp = Math.max(0, cam.shakeAmp - cam.shakeDec * (1 / 60));
  const tx = cam.panX + sx;
  const ty = cam.panY + sy;
  board.style.transform =
    `perspective(900px) ` +
    `rotateX(${cam.tilt}deg) ` +
    `rotateZ(${cam.spin}deg) ` +
    `scale(${cam.scale}) ` +
    `translate(${tx}px,${ty}px)`;
}

/* ── Camera update loop ────────────────────────────────────── */
let lastCamT = 0;
(function camLoop(now){
  requestAnimationFrame(camLoop);
  const dt = Math.min((now - lastCamT) / 1000, 0.05);
  if(dt <= 0){ lastCamT = now; return; }
  lastCamT = now;

  const cfg = CAM_CFG[cam.state];
  let tgtScale = cfg.scale, tgtPanX = 0, tgtPanY = 0;

  if(cam.state === CAM_STATE.FOLLOWER){
    const off = squarePanOffset(cam.followSq, tgtScale);
    tgtPanX = off.x; tgtPanY = off.y;
  } else if(cam.state === CAM_STATE.EVENT){
    const off = squarePanOffset(cam.eventSq, tgtScale);
    tgtPanX = off.x; tgtPanY = off.y;
  }

  let sd; 
  sd = smoothDamp(cam.scale,  tgtScale,  cam.velScale, cfg.smoothTime,       dt); cam.scale  = sd.value; cam.velScale = sd.vel;
  sd = smoothDamp(cam.panX,   tgtPanX,   cam.velX,     cfg.smoothTime,       dt); cam.panX   = sd.value; cam.velX     = sd.vel;
  sd = smoothDamp(cam.panY,   tgtPanY,   cam.velY,     cfg.smoothTime,       dt); cam.panY   = sd.value; cam.velY     = sd.vel;
  sd = smoothDamp(cam.tilt,   cfg.tilt,  cam.velTilt,  cfg.smoothTime * 1.2, dt); cam.tilt   = sd.value; cam.velTilt  = sd.vel;
  sd = smoothDamp(cam.spin,   cfg.spin,  cam.velSpin,  cfg.smoothTime * 1.2, dt); cam.spin   = sd.value; cam.velSpin  = sd.vel;

  applyCam();
})(0);

/* ── Public API ───────────────────────────────────────────── */

/** State 1 — OVERVIEW: full board, no follow */
function camOverview(){
  cam.state = CAM_STATE.OVERVIEW;
  document.getElementById('camFlash').classList.remove('on');
}

/** State 2 — FOLLOWER: smooth track token square by square */
function camFollowSquare(sqIdx){
  cam.state    = CAM_STATE.FOLLOWER;
  cam.followSq = sqIdx;
}

/** State 3 — EVENT: snap close-up, optional shake */
function camEventFocus(sqIdx, shake = false, shakeLevel = 'medium'){
  cam.state   = CAM_STATE.EVENT;
  cam.eventSq = sqIdx;
  document.getElementById('camFlash').classList.add('on');
  setTimeout(() => document.getElementById('camFlash').classList.remove('on'), 350);
  if(shake){
    const amps = { light:3.5, medium:8, heavy:16 };
    cam.shakeAmp = amps[shakeLevel] || 8;
    cam.shakeDec = cam.shakeAmp / (shakeLevel === 'heavy' ? 45 : 30);
    haptic(shakeLevel);
  }
}

/** Legacy shim — keeps old camAnimTo() calls working */
function camAnimTo(tilt, spin, dur = 500){
  if(tilt <= 28)      cam.state = CAM_STATE.EVENT;
  else if(tilt <= 33) cam.state = CAM_STATE.FOLLOWER;
  else                cam.state = CAM_STATE.OVERVIEW;
}

/* ── Touch pan + pinch-zoom on board ─────────────────────── */
(()=>{
  const ba = document.getElementById('boardArea');
  let t1x = 0, t1y = 0, pDist = 0, isPin = false, isDrag = false;
  let manualPanX = 0, manualPanY = 0, manualScale = 1;
  const SCALE_MIN = 0.7, SCALE_MAX = 2.8;

  function applyManual(){
    board.style.transformOrigin = 'center center';
    const baseTilt  = cam ? cam.tilt  : 38;
    const baseSpin  = cam ? cam.spin  : 45;
    const baseScale = cam ? cam.scale : 1;
    board.style.transform =
      `perspective(900px) rotateX(${baseTilt}deg) rotateZ(${baseSpin}deg) ` +
      `scale(${baseScale * manualScale}) ` +
      `translate(${manualPanX / baseScale}px,${manualPanY / baseScale}px)`;
  }

  ba.addEventListener('touchstart', e => {
    if(e.touches.length === 1){
      isDrag = true; isPin = false;
      t1x = e.touches[0].clientX; t1y = e.touches[0].clientY;
    } else if(e.touches.length === 2){
      isPin = true; isDrag = false;
      pDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY);
    }
    e.stopPropagation();
  }, {passive:true});

  ba.addEventListener('touchmove', e => {
    if(isDrag && e.touches.length === 1){
      manualPanX += (e.touches[0].clientX - t1x) * 0.55;
      manualPanY += (e.touches[0].clientY - t1y) * 0.55;
      t1x = e.touches[0].clientX; t1y = e.touches[0].clientY;
      applyManual();
    } else if(isPin && e.touches.length === 2){
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY);
      manualScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, manualScale * d / pDist));
      pDist = d;
      applyManual();
    }
    e.stopPropagation();
  }, {passive:true});

  ba.addEventListener('touchend', e => {
    if(e.touches.length === 0){ isDrag = false; isPin = false; }
  }, {passive:true});

  ba.addEventListener('wheel', e => {
    e.preventDefault();
    manualScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX,
      manualScale * (e.deltaY > 0 ? 0.92 : 1.09)));
    applyManual();
  }, {passive:false});
})();

// Set initial overview state
camOverview();
