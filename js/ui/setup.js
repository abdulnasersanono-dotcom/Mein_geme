'use strict';

/* ═══════════════════════════════════════════════════════════════
   كلاس شاشة الإعداد — اختيار عدد اللاعبين وأنواعهم قبل البدء
   SetupUI Class — player count & type selection before game start
   يعتمد على: state.js (G, PLAYER_EMOJIS, PLAYER_COLORS),
              game/init.js (tokenMgr)
═══════════════════════════════════════════════════════════════ */
class SetupUI {

    constructor() {
        // عدد اللاعبين المختار (2–6)
        this._count = 2;

        // نوع كل لاعب: 'human' أو 'bot'
        this._types = ['human', 'bot', 'bot', 'bot', 'bot', 'bot'];
    }

    /* ══════════════════════════════════════════════════════════
       فتح نافذة الإعداد
    ══════════════════════════════════════════════════════════ */
    open() {
        G.phase = 'setup';
        document.getElementById('setupModal').classList.add('open');
        this._render();
    }

    /* ══════════════════════════════════════════════════════════
       رسم قائمة اللاعبين داخل النافذة
    ══════════════════════════════════════════════════════════ */
    _render() {
        const list     = document.getElementById('setupPlayerList');
        list.innerHTML = '';

        for (let i = 0; i < this._count; i++) {
            const isHuman = this._types[i] === 'human';
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

        document.getElementById('setupCountVal').textContent = this._count;
    }

    /* ══════════════════════════════════════════════════════════
       تبديل نوع لاعب بين بشري / بوت
       @param {number} i - فهرس اللاعب
    ══════════════════════════════════════════════════════════ */
    toggleType(i) {
        this._types[i] = this._types[i] === 'human' ? 'bot' : 'human';
        this._render();
    }

    /* ══════════════════════════════════════════════════════════
       تغيير عدد اللاعبين
       @param {number} delta - +1 أو -1
    ══════════════════════════════════════════════════════════ */
    changeCount(delta) {
        this._count = Math.max(2, Math.min(6, this._count + delta));
        this._render();
    }

    /* ══════════════════════════════════════════════════════════
       بناء مصفوفة اللاعبين وبدء اللعبة
    ══════════════════════════════════════════════════════════ */
    startGame() {
        document.getElementById('setupModal').classList.remove('open');

        const players = [];
        for (let i = 0; i < this._count; i++) {
            players.push(G.createPlayer(
                `لاعب ${i + 1}`,
                PLAYER_EMOJIS[i],
                PLAYER_COLORS[i],
                this._types[i] === 'bot'
            ));
        }

        tokenMgr.initGame(players);
    }
}

// ═══════════════════════════════════════════════════════════════
// الإنستانس العالمي
const setupUI = new SetupUI();

// ── دوال تحويل للتوافق مع النداءات الموجودة ──
function openSetup()              { setupUI.open(); }
function renderSetupPlayers()     { setupUI._render(); }
function togglePlayerType(i)      { setupUI.toggleType(i); }
function setupCountChange(d)      { setupUI.changeCount(d); }
function startGameFromSetup()     { setupUI.startGame(); }
