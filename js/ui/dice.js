/* ═══════════════════════════════════════════════════════════════
   ANIMATED DICE — 2D canvas dice animation on the board
   تعديل هذا الملف يغير شكل وحركة النرد
═══════════════════════════════════════════════════════════════ */
'use strict';

// Create dice canvas overlaid on boardArea
(()=>{
  const dc = document.createElement('canvas');
  dc.id = 'diceCanvas';
  dc.style.cssText =
    `position:absolute;left:0;top:0;width:100%;height:100%;
     pointer-events:none;z-index:30;`;
  document.getElementById('boardArea').appendChild(dc);
})();

// Dot positions per face (normalized 0–1)
const DICE_DOTS = {
  1: [[.5,.5]],
  2: [[.25,.28],[.75,.72]],
  3: [[.25,.25],[.5,.5],[.75,.75]],
  4: [[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
  5: [[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],
  6: [[.28,.22],[.72,.22],[.28,.5],[.72,.5],[.28,.78],[.72,.78]],
};

/**
 * Show animated dice roll on the board canvas
 * @param {number} d1 - face value die 1
 * @param {number} d2 - face value die 2
 * @param {string} msg - label shown under dice
 */
function showDiceToast(d1, d2, msg){
  const dc = document.getElementById('diceCanvas');
  if(!dc) return;
  dc.width  = dc.offsetWidth  || 400;
  dc.height = dc.offsetHeight || 300;
  const ctx = dc.getContext('2d');

  const W = dc.width, H = dc.height;
  const sz       = Math.min(W, H) * 0.12;
  const gap      = sz * 0.22;
  const totalW   = sz * 2 + gap;
  const cx = W / 2, cy = H / 2;
  const x1 = cx - totalW / 2, x2 = x1 + sz + gap;
  const y0 = cy - sz / 2;

  let frame = 0;
  const totalFrames = 38;
  let lastD1 = 1, lastD2 = 1;
  let rafId;

  function _roundRect(ctx, x, y, w, h, r){
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  function drawDie(x, y, face, r){
    const s = sz;
    ctx.save();
    ctx.translate(x + s/2, y + s/2);
    ctx.rotate(r);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    const grad = ctx.createLinearGradient(-s/2,-s/2,s/2,s/2);
    grad.addColorStop(0,'#FFFEF5'); grad.addColorStop(1,'#F0E8D0');
    ctx.beginPath(); _roundRect(ctx,-s/2,-s/2,s,s,s*0.14);
    ctx.fillStyle = grad; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(180,140,60,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); _roundRect(ctx,-s/2,-s/2,s*0.95,s*0.48,s*0.12);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
    const dots = DICE_DOTS[face] || DICE_DOTS[1];
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
    dots.forEach(([dx,dy]) => {
      ctx.beginPath();
      ctx.arc((dx-.5)*s,(dy-.5)*s,s*0.075,0,Math.PI*2);
      ctx.fillStyle = '#2a1800'; ctx.fill();
    });
    ctx.restore();
  }

  function animFrame(){
    ctx.clearRect(0, 0, W, H);
    const progress  = frame / totalFrames;
    const settling  = progress > 0.7;
    const spinRate  = settling ? 0.05*(1-progress)*4 : 0.45;
    const r1 = (frame * spinRate * Math.PI) % (Math.PI*2);
    const r2 = (frame * spinRate * Math.PI * 1.3 + 1.2) % (Math.PI*2);
    const f1 = settling ? d1 : Math.ceil(Math.random()*6);
    const f2 = settling ? d2 : Math.ceil(Math.random()*6);
    if(!settling){ lastD1 = f1; lastD2 = f2; }
    const fr1     = settling ? r1*(1-progress)*3 : r1;
    const fr2     = settling ? r2*(1-progress)*3 : r2;
    const bounceY = settling ? 0 : Math.sin(frame*0.4)*sz*0.18*(1-progress);
    drawDie(x1, y0 - bounceY, settling ? d1 : lastD1, fr1);
    drawDie(x2, y0 + bounceY, settling ? d2 : lastD2, fr2);
    frame++;
    if(frame <= totalFrames){
      rafId = requestAnimationFrame(animFrame);
    } else {
      // Show final result
      ctx.clearRect(0,0,W,H);
      drawDie(x1,y0,d1,0); drawDie(x2,y0,d2,0);
      ctx.font        = `bold ${sz*0.32}px 'Courier New',monospace`;
      ctx.textAlign   = 'center';
      ctx.fillStyle   = 'rgba(255,210,50,.92)';
      ctx.fillText(msg, cx, y0 + sz + sz*0.38);
      // Fade out after 1.6 s
      setTimeout(() => {
        let alpha = 1;
        (function fadeOut(){
          ctx.clearRect(0,0,W,H);
          ctx.globalAlpha = alpha;
          drawDie(x1,y0,d1,0); drawDie(x2,y0,d2,0);
          ctx.font      = `bold ${sz*0.32}px 'Courier New',monospace`;
          ctx.fillStyle = `rgba(255,210,50,${alpha*.92})`;
          ctx.fillText(msg, cx, y0+sz+sz*0.38);
          ctx.globalAlpha = 1;
          alpha -= 0.045;
          if(alpha > 0) requestAnimationFrame(fadeOut);
          else ctx.clearRect(0,0,W,H);
        })();
      }, 1600);
    }
  }

  cancelAnimationFrame(rafId);
  frame = 0;
  rafId = requestAnimationFrame(animFrame);
}
