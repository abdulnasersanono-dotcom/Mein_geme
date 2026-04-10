/* ═══════════════════════════════════════════════════════════════
   SETUP SCREEN — player count & type selection before game
   يعتمد على: state.js, game/init.js
═══════════════════════════════════════════════════════════════ */
'use strict';

let setupPlayerCount = 2;
// 'human' or 'bot' per slot
let setupPlayerTypes = ['human','bot','bot','bot','bot','bot'];

/** Open the setup modal */
function openSetup(){
  G.phase = 'setup';
  document.getElementById('setupModal').classList.add('open');
  renderSetupPlayers();
}

/** Render the player list inside the setup modal */
function renderSetupPlayers(){
  const list = document.getElementById('setupPlayerList');
  list.innerHTML = '';
  for(let i = 0; i < setupPlayerCount; i++){
    const isHuman = setupPlayerTypes[i] === 'human';
    const div     = document.createElement('div');
    div.className = 'setupPlayer';
    div.innerHTML = `
      <span class="spEmoji" style="background:${PLAYER_COLORS[i]}">${PLAYER_EMOJIS[i]}</span>
      <span class="spName">لاعب ${i + 1}</span>
      <button class="spTypeBtn ${isHuman ? 'human' : ''}" onclick="togglePlayerType(${i})">
        ${isHuman ? '👤 بشري' : '🤖 بوت'}
      </button>`;
    list.appendChild(div);
  }
  document.getElementById('setupCountVal').textContent = setupPlayerCount;
}

/** Toggle a slot between human / bot */
function togglePlayerType(i){
  setupPlayerTypes[i] = setupPlayerTypes[i] === 'human' ? 'bot' : 'human';
  renderSetupPlayers();
}

/** Increase or decrease player count */
function setupCountChange(d){
  setupPlayerCount = Math.max(2, Math.min(6, setupPlayerCount + d));
  renderSetupPlayers();
}

/** Build player array and start the game */
function startGameFromSetup(){
  document.getElementById('setupModal').classList.remove('open');
  const players = [];
  for(let i = 0; i < setupPlayerCount; i++){
    players.push({
      name:       `لاعب ${i + 1}`,
      emoji:      PLAYER_EMOJIS[i],
      color:      PLAYER_COLORS[i],
      money:      1500,
      sq:         0,
      props:      [],
      jailTurns:  0,
      isBot:      setupPlayerTypes[i] === 'bot',
      isBankrupt: false,
      skipTurn:   false,
      taxFree:    false,
      active:     true,
    });
  }
  initGame(players);
}
