/**
 * LINKEDIN // INTERPOL — Classification Protocol
 * Futuristic multiplayer quiz — compatible GitHub Pages (PeerJS P2P)
 */

(() => {
  'use strict';

  const MAX_ROUNDS = 10;

  // ========== STATE ==========
  const state = {
    mode: null, // 'solo' | 'multi'
    score: 0,
    streak: 0,
    bestScore: parseInt(localStorage.getItem('loi_bestScore') || '0', 10),
    bestStreak: parseInt(localStorage.getItem('loi_bestStreak') || '0', 10),
    round: 0,
    currentSubject: null,
    answered: false,
    soundEnabled: true,

    // Multi
    peer: null,
    peerId: null,
    isHost: false,
    roomCode: null,
    connections: new Map(), // peerId -> DataConnection
    players: new Map(), // peerId -> { name, score, ready, vote }
    myName: '',
    multiRound: 0,
    corrects: 0,
    multiSubject: null,
    votes: new Map(), // peerId -> 'linkedin'|'interpol'
    gameStarted: false
  };

  // ========== DOM ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    home: $('#screen-home'),
    solo: $('#screen-solo'),
    lobby: $('#screen-lobby'),
    room: $('#screen-room'),
    end: $('#screen-end')
  };

  // ========== UTILS ==========
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function toast(msg, duration = 2500) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.hidden = true, duration);
  }

  function showLoader(text = 'CONNEXION SÉCURISÉE...') {
    $('#loader-text').textContent = text;
    $('#loader').hidden = false;
  }

  function hideLoader() {
    $('#loader').hidden = true;
  }

  function playBeep(freq = 440, duration = 0.08, type = 'square') {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function randomId(len = 4) {
    return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
  }

  // ========== SUBJECT GENERATION ==========
  // Uses randomuser.me for always-different faces + generated identity
  const jobs = [
    'Software Engineer', 'Product Manager', 'Data Scientist', 'Marketing Director',
    'UX Designer', 'DevOps Engineer', 'Financial Analyst', 'HR Business Partner',
    'Sales Executive', 'AI Researcher', 'Cybersecurity Analyst', 'Project Manager',
    'Content Strategist', 'Cloud Architect', 'Business Analyst', 'Legal Counsel'
  ];

  const crimes = [
    'International fraud network', 'Cybercrime syndicate', 'Money laundering',
    'Arms trafficking', 'Identity theft on industrial scale', 'Corporate espionage',
    'Cryptocurrency scam', 'Human trafficking network', 'Document forgery ring',
    'Insider trading scheme', 'Ransomware operations', 'Art theft organization'
  ];

  async function generateSubject() {
    try {
      const res = await fetch('https://randomuser.me/api/?inc=name,picture,nat,dob&noinfo');
      const data = await res.json();
      const u = data.results[0];

      const isInterpol = Math.random() < 0.48; // slight bias to keep it interesting
      const first = u.name.first;
      const last = u.name.last;
      const name = `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
      const age = u.dob.age;
      const nat = u.nat;
      const photo = u.picture.large;

      let detail;
      if (isInterpol) {
        detail = crimes[Math.floor(Math.random() * crimes.length)];
      } else {
        detail = jobs[Math.floor(Math.random() * jobs.length)];
      }

      return {
        id: randomId(5),
        name,
        age,
        nat,
        photo,
        isInterpol,
        detail,
        type: isInterpol ? 'INTERPOL' : 'LINKEDIN'
      };
    } catch (err) {
      // Fallback if API fails
      return {
        id: randomId(5),
        name: 'Unknown Subject',
        age: 30 + Math.floor(Math.random() * 25),
        nat: 'XX',
        photo: `https://i.pravatar.cc/300?u=${Date.now()}`,
        isInterpol: Math.random() < 0.5,
        detail: Math.random() < 0.5 ? jobs[0] : crimes[0],
        type: Math.random() < 0.5 ? 'INTERPOL' : 'LINKEDIN'
      };
    }
  }

  // ========== SOLO MODE ==========
  async function startSolo() {
    state.mode = 'solo';
    state.score = 0;
    state.streak = 0;
    state.round = 0;
    state.corrects = 0;
    state.answered = false;
    updateSoloHUD();
    showScreen('solo');
    await nextSoloRound();
  }

  async function nextSoloRound() {
    state.round++;
    state.answered = false;
    updateSoloHUD();

    $('#solo-result').hidden = true;
    $('#solo-choices').hidden = false;
    $('#solo-status').textContent = 'ANALYZING...';
    $('#solo-name').textContent = 'LOADING...';
    $('#solo-nat').textContent = '—';
    $('#solo-age').textContent = '—';
    $('#solo-photo').src = '';
    $$('#solo-choices .choice-btn').forEach(b => b.disabled = true);

    showLoader('ACCÈS BASE DE DONNÉES...');
    const subject = await generateSubject();
    hideLoader();

    state.currentSubject = subject;

    $('#solo-id').textContent = subject.id;
    $('#solo-name').textContent = subject.name;
    $('#solo-nat').textContent = subject.nat;
    $('#solo-age').textContent = `${subject.age} ans`;
    $('#solo-photo').src = subject.photo;
    $('#solo-status').textContent = 'READY FOR CLASSIFICATION';
    $$('#solo-choices .choice-btn').forEach(b => b.disabled = false);
  }

  function handleSoloChoice(choice) {
    if (state.answered || !state.currentSubject) return;
    state.answered = true;
    playBeep(choice === 'linkedin' ? 520 : 380);

    const subject = state.currentSubject;
    const correct = (choice === 'interpol') === subject.isInterpol;

    $$('#solo-choices .choice-btn').forEach(b => b.disabled = true);

    if (correct) {
      state.score += 100 + state.streak * 25;
      state.streak++;
      state.corrects++;
      playBeep(660, 0.12, 'sine');
    } else {
      state.streak = 0;
      playBeep(180, 0.2, 'sawtooth');
    }

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('loi_bestScore', state.bestScore);
    }
    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
      localStorage.setItem('loi_bestStreak', state.bestStreak);
    }

    updateSoloHUD();
    updateHomeStats();

    const banner = $('#solo-result-banner');
    banner.className = 'result-banner ' + (correct ? 'correct' : 'wrong');
    $('#solo-result-icon').textContent = correct ? '✓' : '✗';
    $('#solo-result-text').textContent = correct ? 'CLASSIFICATION CORRECTE' : 'ERREUR DE CLASSIFICATION';

    const typeLabel = subject.isInterpol ? 'INTERPOL — Fugitif recherché' : 'LINKEDIN — Professionnel';
    $('#solo-result-details').innerHTML = `
      <strong>${subject.name}</strong> est un sujet <em>${typeLabel}</em>.<br>
      ${subject.isInterpol ? 'Chef d\'accusation' : 'Poste'} : ${subject.detail}
    `;

    $('#solo-result').hidden = false;
    $('#solo-choices').hidden = true;

    // After 10 rounds → end game
    const nextBtn = $('#btn-next-solo');
    if (state.round >= MAX_ROUNDS) {
      nextBtn.textContent = 'VOIR LES RÉSULTATS →';
    } else {
      nextBtn.textContent = 'PROCHAIN SUJET →';
    }
  }


  function endSoloGame() {
    $('#final-score').textContent = state.score;
    $('#end-correct').textContent = state.corrects + ' / ' + MAX_ROUNDS;
    $('#end-streak').textContent = state.streak; // dernière série de la partie
    showScreen('end');
  }

  function updateSoloHUD() {
    $('#solo-score').textContent = state.score;
    $('#solo-streak').textContent = state.streak;
    $('#solo-round').textContent = state.round + ' / ' + MAX_ROUNDS;
  }

  function updateHomeStats() {
    $('#best-score').textContent = state.bestScore;
    $('#best-streak').textContent = state.bestStreak;
  }

  // ========== MULTIPLAYER (PeerJS) ==========
  function initPeer() {
    return new Promise((resolve, reject) => {
      const peer = new Peer({
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', (id) => {
        state.peer = peer;
        state.peerId = id;
        resolve(id);
      });

      peer.on('error', (err) => {
        console.error('Peer error', err);
        reject(err);
      });

      // Incoming connections (for host)
      peer.on('connection', (conn) => {
        setupConnection(conn);
      });
    });
  }

  function setupConnection(conn) {
    conn.on('open', () => {
      state.connections.set(conn.peer, conn);

      // If we are host, send current room state
      if (state.isHost) {
        sendTo(conn, {
          type: 'room-state',
          players: Array.from(state.players.entries()).map(([id, p]) => ({ id, ...p })),
          roomCode: state.roomCode,
          gameStarted: state.gameStarted
        });
      }
    });

    conn.on('data', (data) => handlePeerData(conn.peer, data));

    conn.on('close', () => {
      state.connections.delete(conn.peer);
      state.players.delete(conn.peer);
      broadcastPlayers();
      renderPlayersList();
    });
  }

  function sendTo(conn, data) {
    if (conn && conn.open) conn.send(data);
  }

  function broadcast(data, excludeId = null) {
    state.connections.forEach((conn, id) => {
      if (id !== excludeId) sendTo(conn, data);
    });
  }

  function handlePeerData(fromId, data) {
    switch (data.type) {
      case 'join':
        if (state.isHost) {
          state.players.set(fromId, {
            name: data.name,
            score: 0,
            ready: false,
            vote: null
          });
          broadcastPlayers();
          renderPlayersList();
          // Welcome
          sendTo(state.connections.get(fromId), {
            type: 'welcome',
            roomCode: state.roomCode,
            hostName: state.players.get(state.peerId)?.name
          });
        }
        break;

      case 'room-state':
        // Received by joiner
        data.players.forEach(p => {
          state.players.set(p.id, { name: p.name, score: p.score, ready: p.ready, vote: p.vote });
        });
        state.roomCode = data.roomCode;
        state.gameStarted = data.gameStarted;
        renderPlayersList();
        $('#room-code').textContent = state.roomCode;
        if (data.gameStarted) {
          // sync later
        }
        break;

      case 'players-update':
        state.players.clear();
        data.players.forEach(p => {
          state.players.set(p.id, { name: p.name, score: p.score, ready: p.ready, vote: p.vote });
        });
        renderPlayersList();
        break;

      case 'start-game':
        state.gameStarted = true;
        state.multiRound = 0;
        $('#room-game').hidden = false;
        $('#host-controls').hidden = true;
        if (state.isHost) {
          startMultiRound();
        }
        break;

      case 'new-round':
        state.multiSubject = data.subject;
        state.votes.clear();
        state.multiRound = data.round;
        displayMultiSubject(data.subject);
        break;

      case 'vote':
        state.votes.set(fromId, data.choice);
        // Update player vote
        if (state.players.has(fromId)) {
          state.players.get(fromId).vote = data.choice;
        }
        checkAllVoted();
        break;

      case 'round-result':
        showMultiResult(data);
        break;

      case 'game-over':
        endMultiGame(data.scores);
        break;

      case 'score-update':
        if (state.players.has(data.id)) {
          state.players.get(data.id).score = data.score;
        }
        renderPlayersList();
        break;
    }
  }

  function broadcastPlayers() {
    const playersArr = Array.from(state.players.entries()).map(([id, p]) => ({ id, ...p }));
    broadcast({ type: 'players-update', players: playersArr });
  }

  async function createRoom() {
    const name = $('#host-name').value.trim() || 'Agent-' + randomId(3);
    state.myName = name;
    state.isHost = true;

    showLoader('ÉTABLISSEMENT DU LIEN P2P...');
    try {
      await initPeer();
      // Full peerId is the room code (PeerJS requires exact ID to connect)
      state.roomCode = state.peerId;

      state.players.set(state.peerId, {
        name: state.myName,
        score: 0,
        ready: true,
        vote: null
      });

      hideLoader();
      showScreen('room');
      $('#room-code').textContent = state.roomCode;
      $('#host-controls').hidden = false;
      renderPlayersList();
      toast('Salle créée — copiez le code complet');
    } catch (err) {
      hideLoader();
      toast('Erreur de connexion P2P. Réessayez.');
      console.error(err);
    }
  }

  async function joinRoom() {
    const name = $('#join-name').value.trim() || 'Agent-' + randomId(3);
    const code = $('#join-code').value.trim();
    if (!code || code.length < 8) {
      toast('Collez le code complet fourni par l\'hôte');
      return;
    }

    state.myName = name;
    state.isHost = false;
    state.roomCode = code;

    showLoader('CONNEXION À LA SALLE...');
    try {
      await initPeer();

      const conn = state.peer.connect(code, { reliable: true });
      setupConnection(conn);

      conn.on('open', () => {
        state.connections.set(code, conn);
        state.players.set(state.peerId, {
          name: state.myName,
          score: 0,
          ready: true,
          vote: null
        });
        sendTo(conn, { type: 'join', name: state.myName });
        hideLoader();
        showScreen('room');
        $('#room-code').textContent = code;
        $('#host-controls').hidden = true;
        toast('Connecté à la salle');
      });

      conn.on('error', () => {
        hideLoader();
        toast('Impossible de rejoindre. Vérifiez le code.');
      });

      setTimeout(() => {
        if (!state.connections.has(code)) {
          hideLoader();
          toast('Timeout — code incorrect ou hôte hors ligne');
        }
      }, 10000);

    } catch (err) {
      hideLoader();
      toast('Erreur P2P');
      console.error(err);
    }
  }

  function renderPlayersList() {
    const list = $('#players-list');
    list.innerHTML = '';
    let count = 0;
    state.players.forEach((p, id) => {
      count++;
      const li = document.createElement('li');
      if (id === state.peerId && state.isHost) li.classList.add('host');
      li.innerHTML = `<span>${p.name}${id === state.peerId ? ' (vous)' : ''}</span><span class="score">${p.score}</span>`;
      list.appendChild(li);
    });
    $('#players-count').textContent = count;
  }

  async function startMultiRound() {
    if (!state.isHost) return;
    if (state.multiRound >= MAX_ROUNDS) {
      // End multi game
      broadcast({ type: 'game-over', scores: Array.from(state.players.entries()).map(([id, p]) => ({ id, name: p.name, score: p.score })) });
      endMultiGame();
      return;
    }
    state.multiRound++;
    showLoader('NOUVEAU SUJET...');
    const subject = await generateSubject();
    hideLoader();
    state.multiSubject = subject;
    state.votes.clear();

    // Reset votes
    state.players.forEach(p => p.vote = null);

    const payload = {
      type: 'new-round',
      subject: {
        id: subject.id,
        name: subject.name,
        age: subject.age,
        nat: subject.nat,
        photo: subject.photo,
        // Do NOT send isInterpol or detail yet
      },
      round: state.multiRound
    };
    // Host also displays
    displayMultiSubject(payload.subject);
    broadcast(payload);
  }

  function displayMultiSubject(subject) {
    $('#multi-id').textContent = subject.id;
    $('#multi-name').textContent = subject.name;
    $('#multi-nat').textContent = subject.nat;
    $('#multi-age').textContent = `${subject.age} ans`;
    $('#multi-photo').src = subject.photo;
    $('#multi-status').textContent = 'CLASSIFIEZ LE SUJET';
    $('#multi-result').hidden = true;
    $('#multi-choices').hidden = false;
    $$('#multi-choices .choice-btn').forEach(b => b.disabled = false);
    $('#btn-next-multi').hidden = true;
  }

  function handleMultiChoice(choice) {
    if (!state.multiSubject) return;
    playBeep(choice === 'linkedin' ? 520 : 380);

    $$('#multi-choices .choice-btn').forEach(b => b.disabled = true);
    state.votes.set(state.peerId, choice);
    if (state.players.has(state.peerId)) {
      state.players.get(state.peerId).vote = choice;
    }

    // Send vote to host / all
    broadcast({ type: 'vote', choice });

    // If host, check
    if (state.isHost) {
      checkAllVoted();
    }
  }

  function checkAllVoted() {
    if (!state.isHost) return;
    const total = state.players.size;
    if (state.votes.size < total) return;

    // All voted — compute results
    const subject = state.multiSubject;
    // We need the real answer — host has it
    const correctChoice = subject.isInterpol ? 'interpol' : 'linkedin';

    // Update scores
    state.votes.forEach((vote, id) => {
      const correct = vote === correctChoice;
      if (correct && state.players.has(id)) {
        state.players.get(id).score += 100;
      }
    });

    const results = {
      type: 'round-result',
      correctChoice,
      isInterpol: subject.isInterpol,
      detail: subject.detail,
      name: subject.name,
      votes: Array.from(state.votes.entries()).map(([id, v]) => ({
        id,
        name: state.players.get(id)?.name || '?',
        vote: v,
        correct: v === correctChoice
      })),
      scores: Array.from(state.players.entries()).map(([id, p]) => ({ id, score: p.score }))
    };

    // Update local scores display
    results.scores.forEach(s => {
      if (state.players.has(s.id)) state.players.get(s.id).score = s.score;
    });
    renderPlayersList();

    showMultiResult(results);
    broadcast(results);
  }

  function showMultiResult(data) {
    const banner = $('#multi-result-banner');
    const myVote = state.votes.get(state.peerId);
    const iAmCorrect = myVote === data.correctChoice;

    banner.className = 'result-banner ' + (iAmCorrect ? 'correct' : 'wrong');
    banner.innerHTML = `<span>${iAmCorrect ? '✓' : '✗'}</span> <span>${iAmCorrect ? 'CORRECT' : 'INCORRECT'}</span>`;

    let html = `<div><strong>${data.name}</strong> → ${data.isInterpol ? 'INTERPOL' : 'LINKEDIN'}</div>`;
    html += `<div style="margin:8px 0;color:var(--text-dim)">${data.isInterpol ? 'Accusation' : 'Poste'} : ${data.detail}</div>`;
    html += '<div style="margin-top:10px;font-size:12px">Votes :</div>';
    data.votes.forEach(v => {
      html += `<div>${v.name}: ${v.vote.toUpperCase()} ${v.correct ? '✓' : '✗'}</div>`;
    });
    $('#votes-summary').innerHTML = html;

    $('#multi-result').hidden = false;
    $('#multi-choices').hidden = true;

    if (state.isHost) {
      $('#btn-next-multi').hidden = false;
      if (state.multiRound >= MAX_ROUNDS) {
        $('#btn-next-multi').textContent = 'VOIR LES RÉSULTATS →';
      } else {
        $('#btn-next-multi').textContent = 'PROCHAIN →';
      }
    }
  }


  function endMultiGame(scores) {
    // Find my score
    let myScore = 0;
    if (scores) {
      const me = scores.find(s => s.id === state.peerId);
      if (me) myScore = me.score;
    } else if (state.players.has(state.peerId)) {
      myScore = state.players.get(state.peerId).score;
    }
    $('#final-score').textContent = myScore;
    $('#end-correct').textContent = '—';
    $('#end-streak').textContent = '—';
    showScreen('end');
  }

  // ========== EVENTS ==========
  function bindEvents() {
    // Home
    $('#btn-solo').addEventListener('click', () => {
      playBeep(500);
      startSolo();
    });
    $('#btn-multi').addEventListener('click', () => {
      playBeep(500);
      showScreen('lobby');
    });

    // Solo
    $('#btn-back-solo').addEventListener('click', () => showScreen('home'));
    $('#btn-linkedin').addEventListener('click', () => handleSoloChoice('linkedin'));
    $('#btn-interpol').addEventListener('click', () => handleSoloChoice('interpol'));
    $('#btn-next-solo').addEventListener('click', () => {
      playBeep(440);
      if (state.round >= MAX_ROUNDS) {
        endSoloGame();
      } else {
        nextSoloRound();
      }
    });

    // Lobby
    $('#btn-back-lobby').addEventListener('click', () => showScreen('home'));
    $('#btn-create-room').addEventListener('click', createRoom);
    $('#btn-join-room').addEventListener('click', joinRoom);

    // Room
    $('#btn-leave-room').addEventListener('click', () => {
      if (state.peer) {
        state.peer.destroy();
        state.peer = null;
      }
      state.connections.clear();
      state.players.clear();
      state.gameStarted = false;
      showScreen('home');
    });
    $('#btn-copy-code').addEventListener('click', () => {
      navigator.clipboard.writeText(state.roomCode).then(() => toast('Code copié'));
    });
    $('#btn-start-game').addEventListener('click', () => {
      state.gameStarted = true;
      $('#room-game').hidden = false;
      $('#host-controls').hidden = true;
      broadcast({ type: 'start-game' });
      startMultiRound();
    });
    $('#btn-multi-linkedin').addEventListener('click', () => handleMultiChoice('linkedin'));
    $('#btn-multi-interpol').addEventListener('click', () => handleMultiChoice('interpol'));
    $('#btn-next-multi').addEventListener('click', () => {
      if (state.isHost) startMultiRound();
    });

    // End
    $('#btn-replay').addEventListener('click', () => {
      if (state.mode === 'multi') {
        // Go back to lobby for multi
        showScreen('lobby');
      } else {
        startSolo();
      }
    });
    $('#btn-home').addEventListener('click', () => showScreen('home'));

    // Mute
    $('#btn-mute').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      $('#btn-mute').textContent = state.soundEnabled ? '🔊' : '🔇';
    });
  }

  // ========== PARTICLES (simple) ==========
  function initParticles() {
    const container = $('#particles');
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position:absolute;
        width:2px;height:2px;
        background:rgba(0,240,255,${0.1 + Math.random() * 0.3});
        border-radius:50%;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation: float ${8 + Math.random() * 12}s linear infinite;
      `;
      container.appendChild(p);
    }
    // Add keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) translateX(${Math.random() * 40 - 20}px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ========== INIT ==========
  function init() {
    updateHomeStats();
    bindEvents();
    initParticles();
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (screens.solo.classList.contains('active') && !state.answered) {
        if (e.key === '1' || e.key.toLowerCase() === 'l') handleSoloChoice('linkedin');
        if (e.key === '2' || e.key.toLowerCase() === 'i') handleSoloChoice('interpol');
      }
    });
  }

  init();
})();
