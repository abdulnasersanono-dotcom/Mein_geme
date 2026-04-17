'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   multiplayer.js — نظام اللعب الجماعي عبر الإنترنت
   يعتمد على Firebase Realtime Database
   يتكامل مع G (GameState) دون تعديل الملفات الأخرى
═══════════════════════════════════════════════════════════════════════ */

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, push,
         onValue, onDisconnect, serverTimestamp }
                                  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ─── إعدادات Firebase ─────────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyAbiiq3zZLpMIacga1eGqlNKIKdICnjh_c",
  authDomain:        "silk-rote.firebaseapp.com",
  databaseURL:       "https://silk-rote-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "silk-rote",
  storageBucket:     "silk-rote.firebasestorage.app",
  messagingSenderId: "191689407878",
  appId:             "1:191689407878:web:43683c6e85657c8b104007",
};

const fbApp = initializeApp(firebaseConfig);
const db    = getDatabase(fbApp);

/* ═══════════════════════════════════════════════════════════════════
   MP — كائن اللعب الجماعي العالمي
   يُستخدم من بقية الملفات عبر: window.MP
═══════════════════════════════════════════════════════════════════ */
const MP = {
  /* ─── الحالة الداخلية ─── */
  roomId:      null,   // كود الغرفة (6 أحرف)
  myIndex:     -1,     // فهرس اللاعب الحالي في G.players
  isHost:      false,  // صاحب الغرفة (player0)
  active:      false,  // هل وضع الأونلاين فعّال؟
  _listeners:  [],     // مراجع onValue لإلغاء الاشتراك لاحقاً

  /* ─── مراجع Firebase ─── */
  _roomRef:    null,
  _stateRef:   null,
  _chatRef:    null,
  _actionRef:  null,

  /* ══════════════════════════════════════════════════════
     إنشاء غرفة جديدة
     ══════════════════════════════════════════════════════ */
  async createRoom(playerName, playerEmoji) {
    const roomId = MP._genRoomCode();
    MP.roomId    = roomId;
    MP.myIndex   = 0;
    MP.isHost    = true;
    MP.active    = true;

    MP._initRefs(roomId);

    await set(MP._roomRef, {
      created:   serverTimestamp(),
      status:    'waiting',          // waiting | playing | over
      hostIndex: 0,
      players: {
        0: { name: playerName, emoji: playerEmoji, connected: true, index: 0 }
      },
      gameState: null,
      chat:      null,
      action:    null,
    });

    /* انقطاع الاتصال — احذف بيانات اللاعب */
    onDisconnect(ref(db, `rooms/${roomId}/players/0/connected`)).set(false);

    MP._listenRoom();
    return roomId;
  },

  /* ══════════════════════════════════════════════════════
     الانضمام لغرفة موجودة
     ══════════════════════════════════════════════════════ */
  async joinRoom(roomId, playerName, playerEmoji) {
    MP.roomId  = roomId.toUpperCase();
    MP.active  = true;
    MP._initRefs(MP.roomId);

    /* تحقق من وجود الغرفة */
    const snap = await get(MP._roomRef);
    if (!snap.exists()) throw new Error('الغرفة غير موجودة!');

    const data = snap.val();
    if (data.status === 'playing') throw new Error('اللعبة بدأت بالفعل!');

    /* احجز فهرساً */
    const takenIndices = Object.keys(data.players || {}).map(Number);
    let idx = 1;
    while (takenIndices.includes(idx)) idx++;
    MP.myIndex = idx;

    await update(ref(db, `rooms/${MP.roomId}/players/${idx}`), {
      name: playerName, emoji: playerEmoji, connected: true, index: idx
    });

    onDisconnect(ref(db, `rooms/${MP.roomId}/players/${idx}/connected`)).set(false);

    MP._listenRoom();
    return MP.roomId;
  },

  /* ══════════════════════════════════════════════════════
     بدء اللعبة (Host فقط)
     ══════════════════════════════════════════════════════ */
  async startGame() {
    if (!MP.isHost) return;

    /* ابنِ G.players من بيانات الغرفة */
    const snap    = await get(ref(db, `rooms/${MP.roomId}/players`));
    const pData   = snap.val();
    const indices = Object.keys(pData).map(Number).sort();

    G.reset();
    indices.forEach(i => {
      const p = pData[i];
      G.players.push(G.createPlayer(p.name, p.emoji, PLAYER_COLORS[i], false));
    });
    G.phase = 'playing';

    await MP.pushState();
    await update(MP._roomRef, { status: 'playing' });
  },

  /* ══════════════════════════════════════════════════════
     رفع حالة اللعبة كاملة إلى Firebase
     ══════════════════════════════════════════════════════ */
  async pushState() {
    if (!MP.active) return;
    const snapshot = MP._serializeG();
    await set(MP._stateRef, snapshot);
  },

  /* ══════════════════════════════════════════════════════
     إرسال إجراء (action) — يُستخدم للأحداث السريعة
     ══════════════════════════════════════════════════════ */
  async pushAction(type, payload = {}) {
    if (!MP.active) return;
    await set(MP._actionRef, {
      type,
      payload,
      by:        MP.myIndex,
      timestamp: serverTimestamp(),
    });
  },

  /* ══════════════════════════════════════════════════════
     إرسال رسالة دردشة
     ══════════════════════════════════════════════════════ */
  sendChat(text) {
    if (!MP.active || !text.trim()) return;
    push(MP._chatRef, {
      sender:    G.players[MP.myIndex]?.name || 'لاعب',
      emoji:     G.players[MP.myIndex]?.emoji || '🐪',
      text:      text.trim(),
      timestamp: serverTimestamp(),
    });
  },

  /* ══════════════════════════════════════════════════════
     هل دور اللاعب الحالي؟
     ══════════════════════════════════════════════════════ */
  isMyTurn() {
    return !MP.active || G.turn === MP.myIndex;
  },

  /* ══════════════════════════════════════════════════════
     الاستماع لتغييرات الغرفة (Room Listener)
     ══════════════════════════════════════════════════════ */
  _listenRoom() {
    /* ① الحالة الكاملة للعبة */
    const unsubState = onValue(MP._stateRef, snap => {
      if (!snap.exists()) return;
      const remote = snap.val();
      /* لا تطبّق إذا كان دورك أنت (تجنّب الحلقة) */
      if (remote._lastBy === MP.myIndex) return;
      MP._applyState(remote);
    });

    /* ② الدردشة */
    const unsubChat = onValue(MP._chatRef, snap => {
      if (!snap.exists()) return;
      const msgs = [];
      snap.forEach(c => msgs.push(c.val()));
      MP._renderChat(msgs);
    });

    /* ③ اللاعبون المتصلون */
    const unsubPlayers = onValue(ref(db, `rooms/${MP.roomId}/players`), snap => {
      if (!snap.exists()) return;
      MP._updateConnectionBadges(snap.val());
    });

    MP._listeners.push(unsubState, unsubChat, unsubPlayers);
  },

  /* ══════════════════════════════════════════════════════
     تطبيق الحالة القادمة من Firebase على G المحلي
     ══════════════════════════════════════════════════════ */
  _applyState(remote) {
    /* انسخ الحقول الرئيسية */
    G.turn         = remote.turn         ?? G.turn;
    G.phase        = remote.phase        ?? G.phase;
    G.props        = remote.props        ?? {};
    G.doublesCount = remote.doublesCount ?? 0;
    G.bankMoney    = remote.bankMoney    ?? G.bankMoney;
    G.tradeOffer   = remote.tradeOffer   ?? null;
    G.auctionSq    = remote.auctionSq    ?? -1;
    G.auctionBids  = remote.auctionBids  ?? {};

    /* حدّث اللاعبين */
    if (remote.players && Array.isArray(remote.players)) {
      remote.players.forEach((rp, i) => {
        if (!G.players[i]) return;
        Object.assign(G.players[i], rp);
      });
    }

    /* أعد رسم الواجهة */
    MP._refreshUI();
  },

  /* ══════════════════════════════════════════════════════
     تسلسل G → كائن JSON قابل للرفع
     ══════════════════════════════════════════════════════ */
  _serializeG() {
    return {
      _lastBy:      MP.myIndex,
      _ts:          Date.now(),
      turn:         G.turn,
      phase:        G.phase,
      props:        G.props,
      doublesCount: G.doublesCount,
      bankMoney:    G.bankMoney,
      tradeOffer:   G.tradeOffer,
      auctionSq:    G.auctionSq,
      auctionBids:  G.auctionBids,
      players:      G.players.map(p => ({
        name:       p.name,
        emoji:      p.emoji,
        color:      p.color,
        money:      p.money,
        sq:         p.sq,
        props:      p.props,
        jailTurns:  p.jailTurns,
        isBot:      p.isBot,
        isBankrupt: p.isBankrupt,
        skipTurn:   p.skipTurn,
        taxFree:    p.taxFree,
        active:     p.active,
      })),
    };
  },

  /* ══════════════════════════════════════════════════════
     تحديث الواجهة بعد تغيير الحالة
     ══════════════════════════════════════════════════════ */
  _refreshUI() {
    try {
      if (typeof refreshTopBar        === 'function') refreshTopBar();
      if (typeof refreshOpponentPanels=== 'function') refreshOpponentPanels();
      if (typeof moveAllTokensToPos   === 'function') moveAllTokensToPos();
    } catch(e) { /* الدوال قد لا تكون محمّلة بعد */ }

    /* تحديث حالة أزرار الإجراءات */
    const isMyTurn = MP.isMyTurn();
    const diceBtn  = document.getElementById('diceBtn');
    if (diceBtn) {
      diceBtn.style.opacity      = isMyTurn ? '1'       : '0.4';
      diceBtn.style.pointerEvents= isMyTurn ? 'auto'    : 'none';
    }
    ['build','trade'].forEach(id => {
      const btn = document.querySelector(`[onclick="secAction('${id}')"]`);
      if (btn) {
        btn.style.opacity      = isMyTurn ? '1'  : '0.4';
        btn.style.pointerEvents= isMyTurn ? 'auto': 'none';
      }
    });
  },

  /* ══════════════════════════════════════════════════════
     رسم واجهة الدردشة
     ══════════════════════════════════════════════════════ */
  _renderChat(msgs) {
    const box = document.getElementById('mp-chat-messages');
    if (!box) return;
    box.innerHTML = msgs.slice(-50).map(m => `
      <div class="mp-msg ${m.sender === G.players[MP.myIndex]?.name ? 'mp-msg--me' : ''}">
        <span class="mp-msg-emoji">${m.emoji}</span>
        <div class="mp-msg-body">
          <span class="mp-msg-name">${m.sender}</span>
          <span class="mp-msg-text">${m.text}</span>
        </div>
      </div>`).join('');
    box.scrollTop = box.scrollHeight;
  },

  /* ══════════════════════════════════════════════════════
     تحديث شارات الاتصال
     ══════════════════════════════════════════════════════ */
  _updateConnectionBadges(players) {
    Object.entries(players).forEach(([i, p]) => {
      const dot = document.querySelector(`.mp-dot[data-idx="${i}"]`);
      if (dot) dot.classList.toggle('mp-dot--off', !p.connected);
    });
  },

  /* ── مساعدات ── */
  _genRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  },

  _initRefs(roomId) {
    MP._roomRef   = ref(db, `rooms/${roomId}`);
    MP._stateRef  = ref(db, `rooms/${roomId}/gameState`);
    MP._chatRef   = ref(db, `rooms/${roomId}/chat`);
    MP._actionRef = ref(db, `rooms/${roomId}/action`);
  },

  destroy() {
    MP._listeners.forEach(unsub => unsub());
    MP._listeners = [];
    MP.active     = false;
  },
};

/* ═══════════════════════════════════════════════════════════════════
   Hook — يلتف حول rollDice و actionHandler لإرسال التغييرات تلقائياً
   يُستدعى بعد تحميل main.js
═══════════════════════════════════════════════════════════════════ */
function installMPHooks() {
  /* rollDice */
  const _origRoll = window.rollDice;
  window.rollDice = function(...args) {
    if (!MP.isMyTurn()) {
      toast('ليس دورك!', '⏳'); return;
    }
    const result = _origRoll?.(...args);
    MP.pushState();
    return result;
  };

  /* actionHandler */
  if (window.actionHandler) {
    ['confirmBuy','rejectBuy','submitMyAuction','confirmMortgage',
     'confirmBuild','submitTrade','acceptTrade','rejectTrade'].forEach(fn => {
      const orig = window.actionHandler[fn];
      if (!orig) return;
      window.actionHandler[fn] = function(...args) {
        const r = orig.apply(this, args);
        MP.pushState();
        return r;
      };
    });
  }

  /* nextTurn */
  const _origNext = window.nextTurn;
  window.nextTurn = function(...args) {
    const r = _origNext?.(...args);
    MP.pushState();
    return r;
  };
}

/* ═══════════════════════════════════════════════════════════════════
   تعريض MP عالمياً
═══════════════════════════════════════════════════════════════════ */
window.MP = MP;
window.installMPHooks = installMPHooks;
