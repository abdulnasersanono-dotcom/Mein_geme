// ═══════════════════════════════════════════════
// FULL MONOPOLY BOARD SVG - Uses data/board-data.js
// Complete 40-square SVG builder
// ═══════════════════════════════════════════════

import { BOARD_DATA, sqMap } from '../../data/board-data.js';

window.MonopolyBoard = {
  init: function() {
    const svg = document.getElementById('boardSvg');
    if (!svg) return console.error('No boardSvg found');
    
    svg.innerHTML = buildFullBoardSVG();
    console.log('✅ Full Monopoly board loaded from modules!');
  }
};

function buildFullBoardSVG() {
  const B = 660, C = 96, S = (B - 2 * C) / 9;
  const PC = {brown:'#5C3010', cyan:'#1A7A9A', purple:'#6B2FA0', orange:'#CC5500',
              red:'#8B1010', yellow:'#B8920A', green:'#1A5C2A', navy:'#0A1F6B'};
  let cells = '';

  // Build all 40 squares using BOARD_DATA
  for(let i = 0; i < BOARD_DATA.length; i++) {
    const s = sqMap[i];
    if (!s) continue;
    
    // Position calculation for each side (bottom/right/top/left)
    let x, y, w, h, side;
    if (i <= 10) { x = i === 0 ? B - C : i === 10 ? 0 : B - C - i * S; y = B - C; w = i === 0 || i === 10 ? C : S; h = C; side = 'bottom'; }
    else if (i <= 19) { x = 0; y = B - C - (i - 10) * S; w = C; h = S; side = 'left'; }
    else if (i <= 30) { x = i === 20 ? 0 : i === 30 ? B - C : C + (i - 20) * S; y = 0; w = i === 20 || i === 30 ? C : S; h = C; side = 'top'; }
    else { x = B - C; y = C + (i - 30) * S; w = C; h = S; side = 'right'; }
    
    cells += buildCell(i, x, y, w, h, side, s);
  }

  return `
    <defs>
      <pattern id="bgTile" width="44" height="44" patternUnits="userSpaceOnUse">
        <rect width="44" height="44" fill="#1F1000"/>
        <path d="M22 0L44 22L22 44L0 22Z" fill="none" stroke="#6B3A00" stroke-width=".55" opacity=".26"/>
      </pattern>
      <linearGradient id="parchment" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F5E6C0"/><stop offset="55%" stop-color="#EDDAA0"/><stop offset="100%" stop-color="#E0C470"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="${B}" height="${B}" fill="#0d0600"/>
    <rect x="2" y="2" width="${B-4}" height="${B-4}" fill="url(#parchment)" rx="2"/>
    <rect x="${C}" y="${C}" width="${B-2*C}" height="${B-2*C}" fill="url(#bgTile)" rx="2"/>
    ${cells}
    <rect x="${C}" y="${C}" width="${B-2*C}" height="${B-2*C}" fill="none" stroke="#8B6914" stroke-width="2"/>
    <text x="${B/2}" y="${B/2 + 22}" text-anchor="middle" font-size="13" fill="#FFD060" font-weight="900" filter="url(#glow)">SILK ROAD</text>
  `;
}

function buildCell(id, x, y, w, h, side, s) {
  const cx = x + w / 2, cy = y + h / 2;
  const rot = {bottom:0, right:-90, top:180, left:90}[side];
  
  if (s.t === 'go') {
    return `<g>
      <defs><linearGradient id="goBg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1A5A28"/><stop offset="100%" stop-color="#0C3418"/>
      </linearGradient></defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#goBg${id})" stroke="#8B6914" stroke-width=".7"/>
      <text x="${cx}" y="${cy-28}" text-anchor="middle" font-size="7.5" fill="rgba(160,255,140,.7)">انطلق</text>
      <text x="${cx}" y="${cy-3}" text-anchor="middle" font-size="32" fill="#FFFFFF" font-weight="900" font-family="Impact">GO</text>
    </g>`;
  }
  
  // Property/special squares...
  const bg = s.t === 'prop' ? 'rgba(255,250,232,.97)' : '#F5ECD5';
  return `<g transform="rotate(${rot},${cx},${cy})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" stroke="#8B6914" stroke-width=".7"/>
    ${s.i ? `<text x="${cx}" y="${cy-9}" text-anchor="middle" font-size="13">${s.i}</text>` : ''}
    <text x="${cx}" y="${cy+6}" text-anchor="middle" font-size="7.2" fill="#1a0800">${s.n}</text>
    ${s.p ? `<text x="${cx}" y="${cy+19}" text-anchor="middle" font-size="5.8" fill="#3a2000">${s.p} din</text>` : ''}
  </g>`;
}

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('boardSvg')) MonopolyBoard.init();
  });
} else if (document.getElementById('boardSvg')) {
  MonopolyBoard.init();
}


