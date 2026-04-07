/* ═══════════════════════════════════════════
   camera.js - نظام الكاميرا المتقدم 3D
   3 حالات: OVERVIEW (عام) | FOLLOWER (متابعة) | EVENT (حدث)
   
   ميزات:
   • SmoothDamp (مثل Unity)
   • Pan/zoom يدوي (لمس + عجلة فأرة)
   • Shake للأحداث المهمة
   • تكامل مع اللوحة SVG
═══════════════════════════════════════════ */

// ═══════════════════════════════════════════
// حالات الكاميرا
// ═══════════════════════════════════════════
export const CAM_STATE = { 
  OVERVIEW: 'overview', 
  FOLLOWER: 'follower', 
  EVENT: 'event' 
};

// ═══════════════════════════════════════════
// الكاميرا الحالية (يتم تعديلها في الحلقة)
let cam = {
  // الإمالة والدوران (rotateX / rotateZ)
  tilt:   38,
  spin:   45,
  // مقياس أرثوغرافي
  scale:  1.0,
  panX:   0, panY:   0,
  // سرعات SmoothDamp
  velScale: 0, velX: 0, velY: 0, velTilt: 0, velSpin: 0,
  // اهتزاز
  shakeAmp: 0, shakeDec: 0,
  state: CAM_STATE.OVERVIEW,
  followSq: 0,
  eventSq:  0,
};

// ═══════════════════════════════════════════
// إعدادات كل حالة
const CAM_CFG = {
  overview: {
    tilt: 38, spin: 45, scale: 1.0, offsetY: 0, smoothTime: 0.55,
  },
  follower: {
    tilt: 30, spin: 45, scale: 1.38, offsetY: -0.08, smoothTime: 0.28,
  },
  event: {
    tilt: 26, spin: 45, scale: 1.55, offsetY: -0.06, smoothTime: 0.18,
  },
};

// اللوحة مركز SVG
const BOARD_CENTER_SVG = { x: 330, y: 330 };

/* ═══════════════════════════════════════════
   SmoothDamp - بديل Unity في JavaScript
   حركة سلسة مع التسارع/التباطؤ الطبيعي
═══════════════════════════════════════════ */
function smoothDamp(current, target, velocity, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  velocity = (velocity - omega * temp) * exp;
  const out = target + (change + temp) * exp;
  return { value: out, vel: velocity };
}

/* ═══════════════════════════════════════════
   تطبيق قيم الكاميرا على DOM
   يجمع shake + pan + scale + rotate
═══════════════════════════════════════════ */
export function applyCam() {
  // اهتزاز (Perlin-like باستخدام sin)
  const now = performance.now() * 0.001;
  const sx = cam.shakeAmp * Math.sin(now * 47) * Math.cos(now * 31);
  const sy = cam.shakeAmp * Math.sin(now * 37) * Math.cos(now * 53);
  cam.shakeAmp = Math.max(0, cam.shakeAmp - cam.shakeDec * (1 / 60));

  const boardGrid = document.getElementById('boardGrid');
  if (!boardGrid) return;

  const tx = cam.panX + sx;
  const ty = cam.panY + sy;

  boardGrid.style.transform =
    `perspective(900px) ` +
    `rotateX(${cam.tilt}deg) ` +
    `rotateZ(${cam.spin}deg) ` +
    `scale(${cam.scale}) ` +
    `translate(${tx}px, ${ty}px)`;
}

/* ═══════════════════════════════════════════
   حساب إزاحة لمركز مربع معيّن
═══════════════════════════════════════════ */
function squarePanOffset(sqIdx, scaleMult, centers) {
  const pos = centers[sqIdx % 40];
  if (!pos) return { x: 0, y: 0 };
  const cfg = CAM_CFG[cam.state];
  const dx = (pos.x - BOARD_CENTER_SVG.x);
  const dy = (pos.y - BOARD_CENTER_SVG.y);
  const cosT = Math.cos(38 * Math.PI / 180);
  const vOffset = cfg.offsetY * 660;
  return {
    x: -(dx) / scaleMult,
    y: -(dy * cosT) / scaleMult + vOffset / scaleMult,
  };
}

/* ═══════════════════════════════════════════
   حلقة الكاميرا الرئيسية (60fps)
═══════════════════════════════════════════ */
export function initCameraLoop(centers) {
  let lastCamT = 0;
  SQ_CENTERS = centers; // Global for backward compat

  (function camLoop(now) {
    requestAnimationFrame(camLoop);
    const dt = Math.min((now - lastCamT) / 1000, 0.05);
    if (dt <= 0) { lastCamT = now; return; }
    lastCamT = now;

    const cfg = CAM_CFG[cam.state];
    let tgtScale = cfg.scale;
    let tgtPanX = 0, tgtPanY = 0;

    if (cam.state === CAM_STATE.FOLLOWER) {
      const off = squarePanOffset(cam.followSq, tgtScale, centers);
      tgtPanX = off.x; tgtPanY = off.y;
    } else if (cam.state === CAM_STATE.EVENT) {
      const off = squarePanOffset(cam.eventSq, tgtScale, centers);
      tgtPanX = off.x; tgtPanY = off.y;
    }

    // SmoothDamp جميع المحاور
    const sdScale = smoothDamp(cam.scale, tgtScale, cam.velScale, cfg.smoothTime, dt);
    cam.scale = sdScale.value; cam.velScale = sdScale.vel;

    const sdX = smoothDamp(cam.panX, tgtPanX, cam.velX, cfg.smoothTime, dt);
    cam.panX = sdX.value; cam.velX = sdX.vel;

    const sdY = smoothDamp(cam.panY, tgtPanY, cam.velY, cfg.smoothTime, dt);
    cam.panY = sdY.value; cam.velY = sdY.vel;

    const sdTilt = smoothDamp(cam.tilt, cfg.tilt, cam.velTilt, cfg.smoothTime * 1.2, dt);
    cam.tilt = sdTilt.value; cam.velTilt = sdTilt.vel;

    const sdSpin = smoothDamp(cam.spin, cfg.spin, cam.velSpin, cfg.smoothTime * 1.2, dt);
    cam.spin = sdSpin.value; cam.velSpin = sdSpin.vel;

    applyCam();
  })(0);
}

// ═══════════════════════════════════════════
// واجهة عامة (Public API)
// ═══════════════════════════════════════════
export function camOverview() {
  cam.state = CAM_STATE.OVERVIEW;
  const flash = document.getElementById('camFlash');
  if (flash) flash.classList.remove('on');
}

export function camFollowSquare(sqIdx) {
  cam.state = CAM_STATE.FOLLOWER;
  cam.followSq = sqIdx;
}

export function camEventFocus(sqIdx, shake = false, shakeLevel = 'medium') {
  cam.state = CAM_STATE.EVENT;
  cam.eventSq = sqIdx;
  const flash = document.getElementById('camFlash');
  if (flash) flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 350);

  if (shake) {
    const shakeAmps = { light: 3.5, medium: 8, heavy: 16 };
    cam.shakeAmp = shakeAmps[shakeLevel] || 8;
    cam.shakeDec = cam.shakeAmp / (shakeLevel === 'heavy' ? 45 : 30);
  }
}

// Legacy shim
export function camAnimTo(tilt, spin, dur = 500) {
  if (tilt <= 28) {
    cam.state = CAM_STATE.EVENT;
    cam.eventSq = cam.followSq;
  } else if (tilt <= 33) {
    cam.state = CAM_STATE.FOLLOWER;
  } else {
    cam.state = CAM_STATE.OVERVIEW;
  }
}

/* ═══════════════════════════════════════════
   لمس Pan + Pinch Zoom (mobile/desktop)
═══════════════════════════════════════════ */
export function initTouchControls() {
  const ba = document.getElementById('boardArea');
  let t1x=0,t1y=0,pDist=0,isPin=false,isDrag=false;
  let manualPanX=0,manualPanY=0,manualScale=1;
  const SCALE_MIN=0.7, SCALE_MAX=2.8;

  function applyManual() {
    const b = document.getElementById('boardGrid');
    if (!b) return;
    b.style.transformOrigin = 'center center';
    const baseTilt = cam.tilt, baseSpin = cam.spin, baseScale = cam.scale;
    b.style.transform = 
      `perspective(900px) rotateX(${baseTilt}deg) rotateZ(${baseSpin}deg) `+
      `scale(${baseScale * manualScale}) `+
      `translate(${manualPanX/baseScale}px,${manualPanY/baseScale}px)`;
  }

  ba.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDrag = true; isPin = false;
      t1x = e.touches[0].clientX; t1y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isPin = true; isDrag = false;
      pDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  ba.addEventListener('touchmove', (e) => {
    if (isDrag && e.touches.length === 1) {
      const dx = e.touches[0].clientX - t1x;
      const dy = e.touches[0].clientY - t1y;
      manualPanX += dx * 0.55;
      manualPanY += dy * 0.55;
      t1x = e.touches[0].clientX; t1y = e.touches[0].clientY;
      applyManual();
    } else if (isPin && e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = d / pDist;
      manualScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, manualScale * ratio));
      pDist = d;
      applyManual();
    }
  }, { passive: true });

  // عجلة الفأرة (desktop)
  ba.addEventListener('wheel', (e) => {
    e.preventDefault();
    manualScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, manualScale * (e.deltaY > 0 ? 0.92 : 1.09)));
    applyManual();
  }, { passive: false });
}

console.log('📹 camera.js محمل - نظام الكاميرا 3D جاهز 🚀');
