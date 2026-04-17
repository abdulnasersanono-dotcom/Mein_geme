'use strict';
/* ═══════════════════════════════════════════════════════════════════
   online.js — شاشة اللعب الجماعي (إنشاء / انضمام / انتظار)
   تتكامل مع نظام Navigator الموجود
═══════════════════════════════════════════════════════════════════ */

function createOnlineScreen(container, nav) {

  /* ─── الحالة الداخلية ─── */
  let phase    = 'lobby';   // lobby | waiting | chat
  let roomPlayers = {};

  /* ══════════════════════════════════════════════════
     HTML الكامل للشاشة
  ══════════════════════════════════════════════════ */
  container.innerHTML = `
  <style>
    /* ── متغيرات خاصة بشاشة الأونلاين ── */
    :root {
      --on-gold:   #FFD060;
      --on-amber:  #C8860A;
      --on-dark:   #120A00;
      --on-panel:  rgba(30,16,0,0.92);
      --on-border: rgba(200,134,10,0.35);
      --on-green:  #40CC80;
      --on-red:    #FF4455;
    }

    #onlineScreen {
      position: fixed; inset: 0;
      background: radial-gradient(ellipse at 30% 40%, #2a1400 0%, #0a0500 70%);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      overflow: hidden;
      z-index: 100;
    }

    /* ── خلفية نجوم متحركة ── */
    #onlineScreen::before {
      content: '';
      position: absolute; inset: 0;
      background-image:
        radial-gradient(1px 1px at 20% 30%, rgba(255,210,100,.6) 0%, transparent 100%),
        radial-gradient(1px 1px at 60% 70%, rgba(255,210,100,.4) 0%, transparent 100%),
        radial-gradient(1px 1px at 80% 20%, rgba(255,210,100,.5) 0%, transparent 100%),
        radial-gradient(2px 2px at 40% 80%, rgba(255,210,100,.3) 0%, transparent 100%);
      animation: twinkle 4s ease-in-out infinite alternate;
    }
    @keyframes twinkle { to { opacity: 0.5; } }

    /* ── الصندوق الرئيسي ── */
    .on-box {
      position: relative;
      background: var(--on-panel);
      border: 1px solid var(--on-border);
      border-radius: 20px;
      padding: 32px 28px;
      width: min(420px, 92vw);
      box-shadow: 0 0 60px rgba(200,134,10,.2), inset 0 1px 0 rgba(255,210,100,.1);
    }

    /* ── العنوان ── */
    .on-title {
      text-align: center;
      font-size: 22px;
      font-weight: 900;
      color: var(--on-gold);
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .on-sub {
      text-align: center;
      font-size: 12px;
      color: rgba(200,160,40,.6);
      letter-spacing: 2px;
      margin-bottom: 28px;
    }

    /* ── حقول الإدخال ── */
    .on-field { margin-bottom: 14px; }
    .on-label {
      display: block;
      font-size: 11px;
      color: rgba(255,210,100,.7);
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
    .on-input {
      width: 100%; box-sizing: border-box;
      background: rgba(255,210,100,.06);
      border: 1px solid var(--on-border);
      border-radius: 10px;
      padding: 10px 14px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: border-color .2s;
      text-align: right;
      font-family: inherit;
    }
    .on-input:focus { border-color: var(--on-gold); }

    /* ── أزرار الأفاتار ── */
    .on-emoji-row {
      display: flex; gap: 8px; flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .on-emoji-btn {
      width: 44px; height: 44px;
      border-radius: 50%;
      border: 2px solid var(--on-border);
      background: rgba(255,210,100,.06);
      font-size: 22px;
      cursor: pointer;
      transition: all .15s;
      display: flex; align-items: center; justify-content: center;
    }
    .on-emoji-btn.selected {
      border-color: var(--on-gold);
      background: rgba(255,210,100,.18);
      transform: scale(1.15);
    }

    /* ── الأزرار الرئيسية ── */
    .on-btn {
      width: 100%;
      padding: 13px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: .5px;
      transition: all .18s;
      font-family: inherit;
      margin-bottom: 10px;
    }
    .on-btn--gold {
      background: linear-gradient(135deg, #C8860A, #FFD060);
      color: #1a0a00;
    }
    .on-btn--gold:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,210,100,.4); }
    .on-btn--outline {
      background: transparent;
      border: 1px solid var(--on-border);
      color: rgba(255,210,100,.8);
    }
    .on-btn--outline:hover { border-color: var(--on-gold); color: var(--on-gold); }
    .on-btn--red {
      background: rgba(255,68,85,.15);
      border: 1px solid rgba(255,68,85,.4);
      color: var(--on-red);
    }

    /* ── فاصل ── */
    .on-divider {
      text-align: center;
      color: rgba(200,134,10,.5);
      font-size: 12px;
      margin: 4px 0 14px;
      position: relative;
    }
    .on-divider::before, .on-divider::after {
      content: '';
      position: absolute;
      top: 50%; width: 40%;
      height: 1px;
      background: var(--on-border);
    }
    .on-divider::before { right: 0; }
    .on-divider::after  { left: 0; }

    /* ── شاشة الانتظار ── */
    .on-waiting-title {
      text-align: center;
      font-size: 16px;
      color: var(--on-gold);
      margin-bottom: 6px;
    }

    .on-room-code {
      text-align: center;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: var(--on-gold);
      font-family: monospace;
      background: rgba(255,210,100,.06);
      border: 1px dashed var(--on-border);
      border-radius: 12px;
      padding: 16px;
      margin: 14px 0;
      cursor: pointer;
      transition: background .2s;
    }
    .on-room-code:hover { background: rgba(255,210,100,.12); }
    .on-room-code-hint {
      text-align: center;
      font-size: 11px;
      color: rgba(200,134,10,.6);
      margin-bottom: 20px;
    }

    /* ── قائمة اللاعبين المنتظرين ── */
    .on-player-list {
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 20px;
      max-height: 200px;
      overflow-y: auto;
    }
    .on-player-item {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,210,100,.05);
      border: 1px solid var(--on-border);
      border-radius: 10px;
      padding: 10px 14px;
      animation: slideIn .3s ease;
    }
    @keyframes slideIn { from { opacity:0; transform:translateX(10px); } }
    .on-player-emoji { font-size: 24px; }
    .on-player-name  { flex: 1; color: #fff; font-size: 14px; }
    .on-player-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .on-player-badge--host { background: rgba(255,210,100,.2); color: var(--on-gold); }
    .on-player-badge--you  { background: rgba(64,204,128,.2);  color: var(--on-green); }

    /* نقطة الاتصال */
    .mp-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--on-green);
      flex-shrink: 0;
    }
    .mp-dot--off { background: var(--on-red); }

    /* ── الدردشة ── */
    .on-chat-wrap {
      border-top: 1px solid var(--on-border);
      margin-top: 16px;
      padding-top: 14px;
    }
    .on-chat-title {
      font-size: 12px;
      color: rgba(255,210,100,.6);
      margin-bottom: 8px;
    }
    #mp-chat-messages {
      height: 120px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }
    .mp-msg {
      display: flex; align-items: flex-start; gap: 6px;
    }
    .mp-msg--me { flex-direction: row-reverse; }
    .mp-msg-emoji { font-size: 16px; flex-shrink: 0; }
    .mp-msg-body  { display: flex; flex-direction: column; max-width: 80%; }
    .mp-msg-name  { font-size: 10px; color: rgba(255,210,100,.6); margin-bottom: 2px; }
    .mp-msg-text  {
      background: rgba(255,210,100,.08);
      border-radius: 8px;
      padding: 5px 9px;
      font-size: 13px;
      color: #eee;
    }
    .mp-msg--me .mp-msg-text {
      background: rgba(64,204,128,.12);
      color: #fff;
    }
    .on-chat-row {
      display: flex; gap: 8px;
    }
    .on-chat-input {
      flex: 1;
      background: rgba(255,210,100,.06);
      border: 1px solid var(--on-border);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      outline: none;
      font-family: inherit;
      text-align: right;
    }
    .on-chat-send {
      background: var(--on-amber);
      border: none; border-radius: 8px;
      padding: 8px 14px;
      color: #1a0a00;
      font-size: 16px;
      cursor: pointer;
    }

    /* ── spinner ── */
    .on-spinner {
      text-align: center;
      font-size: 28px;
      animation: spin 1s linear infinite;
      margin: 10px 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── خطأ ── */
    .on-error {
      background: rgba(255,68,85,.1);
      border: 1px solid rgba(255,68,85,.3);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--on-red);
      margin-bottom: 12px;
      display: none;
    }
    .on-error.show { display: block; }
  </style>

  <div id="onlineScreen">
    <div class="on-box" id="onLobby">
      <!-- اللوبي الأول -->
    </div>
  </div>`;

  const box = container.querySelector('#onLobby');

  /* ══════════════════════════════════════════════════
     الحالة: لوبي (اختيار اسم + إنشاء/انضمام)
  ══════════════════════════════════════════════════ */
  function renderLobby() {
    const emojis = ['🐪','👑','⚔️','📚','⚓','💃'];
    let chosen   = emojis[0];

    box.innerHTML = `
      <div class="on-title">🌐 اللعب الجماعي</div>
      <div class="on-sub">ONLINE MULTIPLAYER</div>

      <div class="on-field">
        <label class="on-label">اسمك في اللعبة</label>
        <input class="on-input" id="onName" placeholder="أدخل اسمك..." maxlength="16">
      </div>

      <label class="on-label">اختر أفاتارك</label>
      <div class="on-emoji-row" id="onEmojiRow">
        ${emojis.map((e,i) => `
          <button class="on-emoji-btn ${i===0?'selected':''}" data-emoji="${e}">${e}</button>
        `).join('')}
      </div>

      <div id="onError" class="on-error"></div>

      <button class="on-btn on-btn--gold" id="onCreateBtn">✨ إنشاء غرفة جديدة</button>
      <div class="on-divider">أو</div>

      <div class="on-field">
        <label class="on-label">كود الغرفة للانضمام</label>
        <input class="on-input" id="onJoinCode" placeholder="XXXXXX" maxlength="6"
               style="text-align:center;letter-spacing:8px;font-size:20px;font-weight:900">
      </div>
      <button class="on-btn on-btn--outline" id="onJoinBtn">🚪 انضمام للغرفة</button>
      <button class="on-btn on-btn--outline" style="margin-top:4px" onclick="nav.go('gamemode')">← رجوع</button>
    `;

    /* اختيار الأفاتار */
    box.querySelectorAll('.on-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        box.querySelectorAll('.on-emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        chosen = btn.dataset.emoji;
      });
    });

    /* إنشاء غرفة */
    box.querySelector('#onCreateBtn').addEventListener('click', async () => {
      const name = box.querySelector('#onName').value.trim() || 'لاعب';
      showError('');
      showSpinner('إنشاء الغرفة...');
      try {
        await MP.createRoom(name, chosen);
        renderWaiting(name);
      } catch(e) { showError(e.message); hideSpinner(); }
    });

    /* انضمام */
    box.querySelector('#onJoinBtn').addEventListener('click', async () => {
      const name = box.querySelector('#onName').value.trim() || 'لاعب';
      const code = box.querySelector('#onJoinCode').value.trim().toUpperCase();
      if (code.length < 4) { showError('أدخل كود الغرفة الصحيح'); return; }
      showError('');
      showSpinner('جاري الانضمام...');
      try {
        await MP.joinRoom(code, name, chosen);
        renderWaiting(name);
      } catch(e) { showError(e.message); hideSpinner(); }
    });
  }

  /* ══════════════════════════════════════════════════
     الحالة: غرفة الانتظار
  ══════════════════════════════════════════════════ */
  function renderWaiting(myName) {
    box.innerHTML = `
      <div class="on-waiting-title">⏳ في انتظار اللاعبين</div>
      <div style="font-size:12px;color:rgba(200,134,10,.6);text-align:center;margin-bottom:4px">
        شارك الكود مع أصدقائك
      </div>
      <div class="on-room-code" id="onRoomCode" title="انسخ الكود">
        ${MP.roomId}
      </div>
      <div class="on-room-code-hint">اضغط على الكود لنسخه 📋</div>

      <div class="on-player-list" id="onPlayerList">
        <div class="on-spinner">🌐</div>
      </div>

      ${MP.isHost ? `
        <button class="on-btn on-btn--gold" id="onStartBtn" disabled
                style="opacity:.5">▶ ابدأ اللعبة (يحتاج لاعبَين على الأقل)</button>
      ` : `
        <div style="text-align:center;color:rgba(255,210,100,.6);font-size:13px;padding:10px">
          بانتظار صاحب الغرفة لبدء اللعبة...
          <div class="on-spinner" style="font-size:20px;margin-top:6px">⏳</div>
        </div>
      `}

      <div class="on-chat-wrap">
        <div class="on-chat-title">💬 الدردشة</div>
        <div id="mp-chat-messages"></div>
        <div class="on-chat-row">
          <input class="on-chat-input" id="onChatIn" placeholder="اكتب رسالة...">
          <button class="on-chat-send" id="onChatSend">↑</button>
        </div>
      </div>

      <button class="on-btn on-btn--red" style="margin-top:12px" onclick="MP.destroy();nav.go('gamemode')">
        ✕ مغادرة الغرفة
      </button>
    `;

    /* نسخ الكود */
    box.querySelector('#onRoomCode').addEventListener('click', () => {
      navigator.clipboard?.writeText(MP.roomId);
      toast('تم نسخ الكود!', '📋');
    });

    /* الدردشة */
    const chatIn   = box.querySelector('#onChatIn');
    const chatSend = box.querySelector('#onChatSend');
    const sendMsg  = () => { MP.sendChat(chatIn.value); chatIn.value = ''; };
    chatSend.addEventListener('click', sendMsg);
    chatIn.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });

    /* استمع لقائمة اللاعبين من Firebase */
    const { onValue, ref } = window._fbImports || {};
    if (!onValue) { _listenPlayersPolyfill(); return; }

    /* ── زر البدء (Host) ── */
    const startBtn = box.querySelector('#onStartBtn');

    /* استمع لتحديثات اللاعبين */
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js")
      .then(({ onValue, ref }) => {
        const db = window._fbDB || getDatabase();

        onValue(ref(db, `rooms/${MP.roomId}/players`), snap => {
          if (!snap.exists()) return;
          const players = snap.val();
          renderPlayerList(players, myName);

          if (startBtn) {
            const count = Object.keys(players).length;
            const enabled = count >= 2;
            startBtn.disabled = !enabled;
            startBtn.style.opacity = enabled ? '1' : '0.5';
            startBtn.textContent = enabled
              ? `▶ ابدأ اللعبة (${count} لاعبين)`
              : `▶ ابدأ اللعبة (يحتاج لاعبَين على الأقل)`;
          }
        });

        /* مراقبة بدء اللعبة (للاعب غير Host) */
        onValue(ref(db, `rooms/${MP.roomId}/status`), snap => {
          if (snap.val() === 'playing') {
            /* انتقل لشاشة اللعبة */
            document.getElementById('onlineScreen')?.remove();
            document.getElementById('gameUI').style.display = '';
            if (typeof initGame === 'function') {
              /* G سيُحدَّث من Firebase تلقائياً عبر MP listener */
            }
          }
        });
      });

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        await MP.startGame();
        /* الانتقال يحدث عبر listener الـ status */
      });
    }
  }

  /* ── رسم قائمة اللاعبين ── */
  function renderPlayerList(players, myName) {
    const list = box.querySelector('#onPlayerList');
    if (!list) return;
    const entries = Object.entries(players).sort((a,b) => +a[0] - +b[0]);
    list.innerHTML = entries.map(([i, p]) => `
      <div class="on-player-item">
        <span class="mp-dot ${p.connected ? '' : 'mp-dot--off'}" data-idx="${i}"></span>
        <span class="on-player-emoji">${p.emoji}</span>
        <span class="on-player-name">${p.name}</span>
        ${+i === 0 ? '<span class="on-player-badge on-player-badge--host">مضيف</span>' : ''}
        ${p.name === myName ? '<span class="on-player-badge on-player-badge--you">أنت</span>' : ''}
      </div>
    `).join('');
  }

  /* ── خطأ / spinner ── */
  function showError(msg) {
    const el = box.querySelector('#onError');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('show', !!msg);
  }
  function showSpinner(msg) {
    const btn = box.querySelector('#onCreateBtn') || box.querySelector('#onJoinBtn');
    if (btn) { btn.disabled = true; btn.textContent = msg; }
  }
  function hideSpinner() {
    const btn = box.querySelector('#onCreateBtn') || box.querySelector('#onJoinBtn');
    if (btn) { btn.disabled = false; }
  }

    /* ── ابدأ بالـ lobby ── */
  renderLobby();
}

/* ════════════════════════════════════════════════════════
   تسجيل الشاشة في نظام Navigator
════════════════════════════════════════════════════════ */
window.createOnlineScreen = createOnlineScreen;

window.OnlineScreen = {
  render: () => `<div class="screen active" id="onlineScreenWrapper"></div>`,
  init: ({ state, goTo }) => {
    const container = document.getElementById('onlineScreenWrapper');
    createOnlineScreen(container, { go: goTo, state });
  }
};
