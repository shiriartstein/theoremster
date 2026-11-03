/* Theorem Timeline: the interface, for one shared screen or online play. All rules live in game.js. */
(function () {
  'use strict';
  const G = window.TimelineGame;
  const Online = window.TimelineOnline;
  const M = window.TimelineMath;
  const D = window.TimelineDecks;
  const S = window.TimelineSetup;
  const CARDS = window.THEOREM_CARDS || [];
  const byId = new Map(CARDS.map(c => [c.id, c]));
  const KEY = { game: 'theorem-timeline:game', setup: 'theorem-timeline:setup', theme: 'theorem-timeline:theme', client: 'theorem-timeline:client' };
  const hostKey = code => `theorem-timeline:host:${code}`, guestKey = code => `theorem-timeline:guest:${code}`;
  const app = document.getElementById('app');
  const rules = document.getElementById('rules');

  let mode = 'local';       // 'local' (one shared screen) | 'host' | 'guest'
  let net = null;           // online session details
  let game = null;          // current game state (see game.js)
  let history = [];         // earlier states, for Undo (shared screen only)
  let challenger = null;    // player currently choosing a gap to challenge
  let flash = '';           // one line about what just happened
  let guessDraft = '';      // the prover name being typed (online)
  let animateReveal = false;
  let peek = { key: '', front: false };   // after the reveal, flip the card back to reread the theorem
  let setup = Object.assign({ names: ['Player 1', 'Player 2'], target: 5, level: 'all', course: 'all', topic: 'all', verifiedOnly: false, onlineName: '', onlinePlayers: 2, playMode: 'local', startTokens: 2, nameNeedsPlacement: true }, load(KEY.setup) || {}, D.fromQuery(location.search, CARDS));
  let setupStep = 0, setupErrors = [], targetNotice = '';
  if (setup.topic !== 'all' && !D.topics(CARDS).includes(setup.topic)) setup.topic = 'all';
  const gameSettings = options => ({ target: options.target, startTokens: options.startTokens, nameNeedsPlacement: !!options.nameNeedsPlacement });

  // ---------- storage (browser storage can be unavailable; the game still works) ----------
  function load(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function store(key, value) { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ } }
  const knowsCards = g => !g || Object.keys(g.years || {}).every(id => byId.has(id));
  function savedGame() {
    const saved = load(KEY.game);
    return saved && saved.version === 1 && Array.isArray(saved.players) && saved.phase !== 'over' && knowsCards(saved) ? saved : null;
  }
  function clientId() {
    let id = load(KEY.client);
    if (!id) { id = Online.randomCode(12); store(KEY.client, id); }
    return id;
  }

  // ---------- small helpers ----------
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'style') node.style.cssText = value;
      else if (key === 'value') node.value = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  const color = i => `--pc: var(--p${i % 6})`;
  const nameOf = i => game.players[i].name;
  const me = () => mode === 'host' ? 0 : mode === 'guest' ? net.seat : null;
  const canAct = seat => mode === 'local' || me() === seat;
  function listJoin(items) {
    return items.length < 2 ? (items[0] || '') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }
  function initials(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
  }
  function tokens(count, max) {
    const marks = [];
    for (let k = 0; k < max; k++) marks.push(h('span', { class: 'token' + (k < count ? '' : ' spent'), 'aria-hidden': 'true' }));
    return h('span', { class: 'tokens', role: 'img', 'aria-label': `${count} of ${max} ∎ tokens`, title: `${count} ∎` }, marks);
  }
  function deckFor(options) {
    return D.filter(CARDS, options);
  }
  function gapLabel(slot, timeline) {
    const year = id => byId.get(id).shown;
    if (slot === 0) return `before ${year(timeline[0])}`;
    if (slot === timeline.length) return `after ${year(timeline[slot - 1])}`;
    return `between ${year(timeline[slot - 1])} and ${year(timeline[slot])}`;
  }
  const cleanName = name => String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  const guessRight = g => !!g.guess && G.nameMatches(g.guess, byId.get(g.card));
  function copyText(text, input) {
    const done = () => { flash = 'Link copied. Send it to the other players.'; render(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => { input && input.select(); });
    else if (input) { input.select(); try { document.execCommand('copy'); done(); } catch (e) { /* the link stays selected */ } }
  }

  // ---------- one set of moves for every mode ----------
  // seat: who is asking (null on a shared screen, where anyone may press anything).
  function runAction(g, seat, action, args) {
    const ownTurn = () => { if (seat !== null && seat !== g.active) throw new Error(`It’s ${g.players[g.active].name}’s turn.`); };
    switch (action) {
      case 'place': ownTurn(); return G.place(g, args.slot, args.guess);
      case 'challenge': return G.challenge(g, seat === null ? args.player : seat, args.slot);
      case 'reveal': ownTurn(); return G.reveal(g);
      case 'endTurn': ownTurn(); return G.endTurn(g, { namedProver: seat === null && !g.guess ? !!args.named : guessRight(g) });
      case 'buy': return G.buyCard(g, seat === null ? args.player : seat);
      default: throw new Error('Unknown move.');
    }
  }
  function describe(prev, next, action, args) {
    const who = i => next.players[i].name;
    if (action === 'challenge') {
      const c = next.challenges[next.challenges.length - 1];
      return `${who(c.player)} challenges ${gapLabel(c.slot, prev.players[prev.active].timeline)}.`;
    }
    if (action === 'buy') {
      const c = byId.get(next.event.card);
      return `${who(next.event.player)} traded ${next.settings.cardCost} ∎ for “${M.plain(c.name)}” (${c.shown}).`;
    }
    if (action === 'endTurn' && next.event) {
      const e = next.event, name = who(e.player), card = byId.get(e.card);
      if (prev.guess) {
        if (!e.namedProver) return `${name} guessed “${prev.guess}”; it was ${listJoin(card.provers)}.`;
        if (e.blocked === 'placement') return `${name} named ${listJoin(card.provers)}, but no ∎ since the card was misplaced.`;
        return `${name} named ${listJoin(card.provers)} and ${e.earned ? 'earned a ∎' : 'already had 5 ∎'}.`;
      }
      if (e.earned) return `${name} earned a ∎ for naming a credited mathematician.`;
    }
    return '';
  }
  function perform(action, args = {}) {
    if (action === 'reveal') animateReveal = true;
    if (mode === 'local') {
      let next;
      try { next = runAction(game, null, action, args); }
      catch (error) { flash = error.message; animateReveal = false; render(); return; }
      history.push(game); if (history.length > 100) history.shift();
      const prev = game; game = next;
      challenger = null; flash = describe(prev, next, action, args);
      if (action === 'place') guessDraft = '';
      store(KEY.game, game.phase === 'over' ? null : game);
      render();
    } else if (mode === 'host') hostPerform(0, action, args, null);
    else {
      if (action === 'place') guessDraft = '';
      if (!net.conn || !net.conn.send({ t: 'act', action, args })) { flash = 'Not connected to the host right now.'; animateReveal = false; render(); }
      challenger = null;
    }
  }

  // ---------- shared screen ----------
  function undo() {
    if (!history.length) return;
    game = history.pop(); challenger = null; flash = 'Undone.';
    store(KEY.game, game);
    render();
  }
  function startLocal(names) {
    const deck = deckFor(setup).map(c => ({ id: c.id, year: c.year }));
    try { game = G.newGame({ cards: deck, players: names, settings: gameSettings(setup), seed: seed() }); }
    catch (error) { flash = error.message; render(); return; }
    mode = 'local'; history = []; challenger = null; flash = '';
    store(KEY.game, game);
    render();
  }
  const seed = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  function leave() {
    if (mode === 'local') {
      if (game && game.phase !== 'over' && !confirm('End this game and go back to setup? The game will not be saved.')) return;
      store(KEY.game, null);
    } else if (mode === 'host') {
      if (!confirm('End the online game for everyone?')) return;
      hostBroadcastEnd();
      store(hostKey(net.code), null);
      if (net.conn) net.conn.close();
    } else {
      if (!confirm('Leave this online game? You can rejoin later with the same link.')) return;
      if (net.conn) net.conn.close();
    }
    mode = 'local'; net = null; game = null; history = []; flash = ''; challenger = null; setupStep = 0; setupErrors = []; targetNotice = '';
    try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    render();
  }

  // ---------- online: hosting ----------
  function inviteLink(code) { return `${location.origin}${location.pathname}${location.search}#join=${code}`; }
  function hostCreate() {
    const name = cleanName(setup.onlineName) || 'Host';
    const code = Online.randomCode();
    net = { role: 'host', code, seats: [{ clientId: 'host', name, peerId: null }], watchers: new Set(), started: false,
      settings: { target: setup.target, level: setup.level, course: setup.course, courseIds: [...(setup.courseIds || [])], topic: setup.topic, verifiedOnly: setup.verifiedOnly, startTokens: setup.startTokens, nameNeedsPlacement: !!setup.nameNeedsPlacement }, status: 'connecting', conn: null };
    mode = 'host'; game = null; flash = '';
    try { window.history.replaceState(null, '', `#host=${code}`); } catch (e) { /* ignore */ }
    hostSave(); hostConnect(); render();
  }
  function hostResume(code) {
    const saved = load(hostKey(code));
    if (!saved || !knowsCards(saved.game)) return false;
    net = { role: 'host', code, seats: saved.seats.map(s => ({ ...s, peerId: null })), watchers: new Set(), started: saved.started,
      settings: saved.settings, status: 'connecting', conn: null };
    mode = 'host'; game = saved.game; flash = saved.flash || '';
    hostConnect();
    return true;
  }
  function hostConnect() {
    Online.loadLibrary().then(() => {
      net.conn = Online.host(net.code, {
        onMessage: hostMessage,
        onLeave: peerId => { net.watchers.delete(peerId); const s = net.seats.find(x => x.peerId === peerId); if (s) s.peerId = null; hostBroadcast(); render(); },
        onStatus: (status, detail) => { net.status = status; net.error = detail || ''; render(); }
      });
    }).catch(error => { net.status = 'error'; net.error = error.message; render(); });
  }
  function hostSave() {
    store(hostKey(net.code), { seats: net.seats.map(({ clientId, name }) => ({ clientId, name })), started: net.started, settings: net.settings, game, flash });
  }
  const seatOnline = i => i === 0 || !!(net.seats[i].peerId && net.conn && net.conn.connected(net.seats[i].peerId));
  function lobbyInfo() {
    return { host: net.seats[0].name, started: net.started, settings: net.settings,
      players: net.seats.map((s, i) => ({ name: s.name, online: seatOnline(i) })) };
  }
  function syncFor(seat) {
    // Before the reveal, only the active player sees their own guess.
    let view = game;
    if (game && game.guess && game.phase !== 'reveal' && seat !== game.active) view = Object.assign({}, game, { guess: '' });
    return { t: 'sync', lobby: lobbyInfo(), game: view, seat, flash };
  }
  function hostBroadcast() {
    if (!net.conn) return;
    net.seats.forEach((s, i) => { if (i > 0 && s.peerId) net.conn.send(s.peerId, syncFor(i)); });
    for (const peerId of net.watchers) net.conn.send(peerId, syncFor(null));
  }
  function hostBroadcastEnd() {
    if (!net.conn) return;
    for (const s of net.seats) if (s.peerId) net.conn.send(s.peerId, { t: 'ended' });
    for (const peerId of net.watchers) net.conn.send(peerId, { t: 'ended' });
  }
  function uniqueName(name, skip) {
    const taken = n => net.seats.some((s, i) => i !== skip && s.name.toLowerCase() === n.toLowerCase());
    let result = name || 'Player', k = 2;
    while (taken(result)) result = `${name} ${k++}`;
    return result;
  }
  function hostMessage(peerId, message) {
    if (!message || typeof message !== 'object') return;
    const id = String(message.clientId || '').slice(0, 40);
    if (message.t === 'hello') {
      const seat = net.seats.findIndex(s => s.clientId === id && id);
      if (seat > 0) { net.seats[seat].peerId = peerId; net.watchers.delete(peerId); }
      else net.watchers.add(peerId);
      hostBroadcast(); render(); return;
    }
    if (message.t === 'join') {
      if (net.started) { net.conn.send(peerId, { t: 'reject', reason: 'This game has already started. You can watch it.' }); return; }
      let seat = net.seats.findIndex(s => s.clientId === id && id);
      if (seat < 0) {
        if (net.seats.length >= G.MAX_PLAYERS) { net.conn.send(peerId, { t: 'reject', reason: `This game already has ${G.MAX_PLAYERS} players.` }); return; }
        net.seats.push({ clientId: id, name: uniqueName(cleanName(message.name)), peerId });
      } else {
        net.seats[seat].peerId = peerId;
        net.seats[seat].name = uniqueName(cleanName(message.name) || net.seats[seat].name, seat);
      }
      net.watchers.delete(peerId);
      hostSave(); hostBroadcast(); render(); return;
    }
    if (message.t === 'act' && net.started && game) {
      const seat = net.seats.findIndex(s => s.peerId === peerId);
      if (seat > 0) hostPerform(seat, message.action, message.args || {}, peerId);
    }
  }
  function hostPerform(seat, action, args, peerId) {
    let next;
    try { next = runAction(game, seat, action, args); }
    catch (error) {
      if (peerId) net.conn.send(peerId, { t: 'error', message: error.message });
      else { flash = error.message; animateReveal = false; render(); }
      return;
    }
    const prev = game; game = next;
    flash = describe(prev, next, action, args);
    challenger = null;
    if (action === 'reveal') animateReveal = true;
    hostSave(); hostBroadcast(); render();
  }
  function hostBegin() {
    const deck = deckFor(net.settings).map(c => ({ id: c.id, year: c.year }));
    try { game = G.newGame({ cards: deck, players: net.seats.map(s => s.name), settings: gameSettings(Object.assign({ startTokens: 2, nameNeedsPlacement: true }, net.settings)), seed: seed() }); }
    catch (error) { flash = error.message; render(); return; }
    net.started = true; flash = '';
    hostSave(); hostBroadcast(); render();
  }

  // ---------- online: joining ----------
  function guestStart(code) {
    const saved = load(guestKey(code)) || {};
    net = { role: 'guest', code, clientId: clientId(), name: saved.name || setup.onlineName || '', seat: null, lobby: null, status: 'connecting', conn: null, error: '' };
    mode = 'guest'; game = null;
    Online.loadLibrary().then(() => {
      net.conn = Online.join(code, {
        onMessage: guestMessage,
        onStatus: (status, detail) => {
          net.status = status; if (detail) net.error = detail;
          if (status === 'connected') net.conn.send({ t: 'hello', clientId: net.clientId });
          render();
        }
      });
    }).catch(error => { net.status = 'error'; net.error = error.message; render(); });
  }
  function guestJoin() {
    const name = cleanName(net.name);
    if (!name) { net.error = 'Enter your name to join.'; render(); return; }
    net.error = '';
    store(guestKey(net.code), { name });
    net.conn.send({ t: 'join', clientId: net.clientId, name });
  }
  function guestMessage(message) {
    if (!message || typeof message !== 'object') return;
    if (message.t === 'sync') {
      if (!knowsCards(message.game)) { net.error = 'This game uses cards this page doesn’t have. Reload the page to get the latest version.'; render(); return; }
      const prev = game;
      net.lobby = message.lobby; net.seat = message.seat; net.error = '';
      game = message.game;
      flash = message.flash || '';
      if (prev && game && prev.turn === game.turn && prev.phase === 'challenge' && game.phase === 'reveal') animateReveal = true;
      if (!game || !prev || prev.turn !== game.turn) challenger = null;
      render();
    } else if (message.t === 'reject') { net.error = message.reason; render(); }
    else if (message.t === 'error') { flash = message.message; animateReveal = false; render(); }
    else if (message.t === 'ended') { net.error = `${net.lobby ? net.lobby.host : 'The host'} ended the game.`; game = null; net.lobby = null; if (net.conn) net.conn.close(); net.status = 'ended'; render(); }
  }

  // ---------- guided setup ----------
  const setupQuestions = [
    ["How are we playing?", 'Gather around one screen, or invite friends to join on their own devices.'],
    ["Who’s joining in?", 'Names help us keep track of whose turn it is.'],
    ["What shall we explore?", 'Revisit your courses, pick a favourite topic, or mix things up.'],
    ["A quick round or a longer game?", 'Choose how many cards a player needs in their timeline to win.'],
    ["Ready to make some history?", 'Here’s your game. You can go back and change any answer.']
  ];
  function setupChanged() {
    store(KEY.setup, setup);
    if (setupErrors.length) setupErrors = S.problems(setup, deckFor(setup).length, setupStep);
    updateSetupStatus();
  }
  function goToSetupStep(step) {
    setupStep = step; setupErrors = []; flash = ''; targetNotice = '';
    if (step === 3) {
      const count = deckFor(setup).length, suggested = S.suggestedTarget(setup, count);
      if (suggested && setup.target > suggested) {
        setup.target = suggested;
        targetNotice = `With ${count} cards and ${S.playerCount(setup)} players, I’ve set the goal to ${suggested}. ` +
          (suggested > 2 ? 'You can choose a shorter game below.' : 'That’s our shortest game. Include more material if you’d like a longer round.');
        store(KEY.setup, setup);
      }
    }
    render(); document.getElementById('setup-question')?.focus();
  }
  function advanceSetup() {
    setupErrors = S.problems(setup, deckFor(setup).length, setupStep);
    if (setupErrors.length) { updateSetupStatus(); document.getElementById('setup-status').focus(); return; }
    if (setupStep < 4) goToSetupStep(setupStep + 1);
    else if (setup.playMode === 'online') hostCreate();
    else startLocal(setup.names.map(S.clean));
  }
  function setupSelect(label, key, options) {
    return h('div', { class: 'field' }, h('label', { for: `opt-${key}` }, label),
      h('select', { id: `opt-${key}`, onchange: e => {
        setup[key] = ['target', 'startTokens', 'onlinePlayers'].includes(key) ? Number(e.target.value) : e.target.value;
        targetNotice = ''; setupChanged();
      } }, options.map(([value, text]) => h('option', { value, selected: String(setup[key]) === String(value) }, text))));
  }
  function renderSetup() {
    const resume = savedGame(), count = deckFor(setup).length;
    const question = h('div', { class: 'question-content' });
    if (setupStep === 0) {
      question.append(h('fieldset', { class: 'mode-answers' }, h('legend', { class: 'sr-only' }, 'How are we playing?'),
        [['local', 'One screen, all together', 'Pass the device or gather around it. Say your guesses out loud.', '01'],
         ['online', 'Everyone on their own device', 'You’ll get an invitation link to share. Keep your browser open while you play.', '02']].map(([value, title, text, number]) =>
          h('label', { class: 'answer-card' },
            h('input', { type: 'radio', name: 'play-mode', value, checked: setup.playMode === value,
              onchange: () => { setup.playMode = value; setupChanged(); } }),
            h('span', { class: 'answer-copy' }, h('strong', {}, title), h('span', {}, text)),
            h('span', { class: 'answer-number', 'aria-hidden': 'true' }, number)))));
    } else if (setupStep === 1) {
      if (setup.playMode === 'online') {
        question.append(h('div', { class: 'field' }, h('label', { for: 'online-name' }, 'First, what’s your name?'),
          h('input', { type: 'text', id: 'online-name', class: 'text', maxlength: '24', autocomplete: 'given-name', value: setup.onlineName, placeholder: 'Your name',
            oninput: e => { setup.onlineName = e.target.value; setupChanged(); } })),
          setupSelect('How many people are you expecting, including you?', 'onlinePlayers', [2,3,4,5,6].map(n => [n, `${n} players`])),
          h('p', { class: 'field-hint' }, 'This helps us choose a game length. Your friends will enter their own names when they join.'));
      } else {
        const players = h('div', { class: 'players' });
        setup.names.forEach((name, i) => players.append(h('div', { class: 'player-input', style: color(i) },
          h('label', { class: 'player-label', for: `player-${i}` }, h('span', { class: 'swatch', 'aria-hidden': 'true' }), `Player ${i + 1}`),
          h('input', { type: 'text', id: `player-${i}`, value: name, maxlength: '24', autocomplete: 'off',
            oninput: e => { setup.names[i] = e.target.value; setupChanged(); } }),
          setup.names.length > G.MIN_PLAYERS ? h('button', { type: 'button', class: 'btn quiet', 'aria-label': `Remove player ${i + 1}`,
            onclick: () => { setup.names.splice(i, 1); setupChanged(); render(); document.getElementById(`player-${Math.min(i, setup.names.length - 1)}`).focus(); } }, 'Remove') : null)));
        question.append(players);
        if (setup.names.length < G.MAX_PLAYERS) question.append(h('button', { type: 'button', class: 'btn quiet', onclick: () => {
          setup.names.push(`Player ${setup.names.length + 1}`); setupChanged(); render(); document.getElementById(`player-${setup.names.length - 1}`).select();
        } }, '+ Add another player'));
        question.append(h('p', { class: 'field-hint' }, 'Two to six players. Nicknames are welcome.'));
      }
    } else if (setupStep === 2) {
      question.append(D.picker(setup, CARDS, setupChanged, 'setup-deck', true),
        h('details', { class: 'extra-options' }, h('summary', {}, 'A couple more deck options'),
          setupSelect('Which kinds of results?', 'level', [['all', 'All results'], ['Undergraduate', 'Undergraduate courses'], ['Famous', 'Famous results']]),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: setup.verifiedOnly,
            onchange: e => { setup.verifiedOnly = e.target.checked; setupChanged(); } }), h('span', {}, 'Only cards marked verified in the spreadsheet'))),
        h('div', { class: 'deck-feedback' }, h('p', { id: 'deck-count', 'aria-live': 'polite' }),
          h('a', { id: 'browse-deck', href: `gallery.html?${D.query(setup)}`, target: '_blank', rel: 'noopener' }, 'Take a look at the cards ↗')));
    } else if (setupStep === 3) {
      question.append(setupSelect('How many cards to win?', 'target', S.targets.map(n => [n, `${n} cards${n === 3 ? ' · a little taster' : n === 5 ? ' · a short game' : n === 10 ? ' · settle in' : ''}`])),
        h('p', { class: 'field-hint', id: 'target-hint' }),
        h('details', { class: 'extra-options' }, h('summary', {}, 'House rules · optional'),
          setupSelect('How many ∎ tokens should everyone start with?', 'startTokens', [0,1,2,3,4,5].map(n => [n, `${n} tokens each${n === 2 ? ' · usual rules' : ''}`])),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!setup.nameNeedsPlacement,
            onchange: e => { setup.nameNeedsPlacement = e.target.checked; setupChanged(); } }),
            h('span', {}, 'The naming bonus also needs a correctly placed card')),
          h('p', { class: 'field-hint' }, 'Name a credited mathematician to earn a token. Tokens let you challenge a placement or buy a card.')));
    } else {
      const summaryRow = (label, value) => h('div', {}, h('dt', {}, label), h('dd', {}, value));
      question.append(h('dl', { class: 'game-summary' },
        summaryRow('Playing', setup.playMode === 'online' ? `Online · hosted by ${S.clean(setup.onlineName)} · expecting ${S.playerCount(setup)} players` : `Together · ${listJoin(setup.names.map(S.clean))}`),
        summaryRow('Exploring', D.description(setup)),
        summaryRow('Your deck', `${count} cards${setup.level !== 'all' ? ` · ${setup.level}` : ''}${setup.verifiedOnly ? ' · verified only' : ''}`),
        summaryRow('The goal', `First to ${setup.target} cards`),
        summaryRow('House rules', `${setup.startTokens} ∎ tokens each. ${setup.nameNeedsPlacement ? 'Correct name + correct placement earns a token.' : 'A correct name earns a token even if misplaced.'}`)),
        h('p', { class: 'field-hint' }, setup.playMode === 'online' ? 'Next, share your invitation link. You’ll start when everyone has arrived.' : 'Read a theorem, guess when it belongs, and reveal its story. Let’s play.'),
        h('a', { class: 'text-link', href: `index.html?${D.query(setup)}`, target: '_blank', rel: 'noopener' }, 'Open a reusable link to this deck ↗'));
    }
    app.replaceChildren(h('section', { class: 'setup guided-setup' },
      h('header', { class: 'setup-brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '∎'), h('span', {}, 'Theorem Timeline'), h('span', { class: 'brand-caption' }, 'A little history. A little guesswork.')),
      resume ? h('div', { class: 'resume-strip' }, h('div', {}, h('strong', {}, 'Your game is still here.'), h('span', {}, ` ${listJoin(resume.players.map(p => p.name))} · turn ${resume.turn}`)),
        h('button', { type: 'button', class: 'btn', onclick: () => { mode = 'local'; game = resume; history = []; flash = ''; render(); } }, 'Pick up where we left off'),
        h('button', { type: 'button', class: 'btn quiet', onclick: () => { store(KEY.game, null); render(); } }, 'Discard saved game')) : null,
      h('div', { class: 'setup-layout' },
        h('aside', { class: 'setup-welcome' }, h('p', { class: 'eyebrow' }, 'Good company. Great theorems.'),
          h('h1', {}, 'Let’s set up ', h('br'), 'your game.'),
          h('p', { class: 'welcome-copy' }, 'Just a few questions, then you’re off on a journey through mathematics.'),
          h('div', { class: 'math-postcards', 'aria-hidden': 'true' }, h('span', { class: 'postcard back-card' }, '∫'), h('span', { class: 'postcard front-card' }, h('small', {}, 'WHEN WAS IT?'), '?', h('span', { class: 'mini-timeline' }, '• — • — •'))),
          h('p', { class: 'welcome-footnote' }, 'No need to know every answer. That’s half the fun.')),
        h('form', { class: 'question-panel', novalidate: true, onsubmit: e => { e.preventDefault(); advanceSetup(); } },
          h('div', { class: 'step-meta' }, h('span', {}, `Question ${setupStep + 1} of 5`), h('ol', { class: 'step-dots', 'aria-label': 'Setup progress' },
            ['Play', 'Players', 'Cards', 'Length', 'Ready'].map((label, i) => h('li', { class: i <= setupStep ? 'filled' : '', 'aria-current': i === setupStep ? 'step' : null }, h('span', { class: 'sr-only' }, `${i + 1}. ${label}`))))),
          h('h2', { id: 'setup-question', tabindex: '-1' }, setupQuestions[setupStep][0]),
          h('p', { class: 'question-intro' }, setupQuestions[setupStep][1]), question,
          h('div', { id: 'setup-status', tabindex: '-1', 'aria-live': 'polite', 'aria-atomic': 'true' }),
          h('div', { class: 'wizard-nav' }, setupStep ? h('button', { type: 'button', class: 'btn quiet', onclick: () => goToSetupStep(setupStep - 1) }, '← Back') : h('span'),
            h('button', { type: 'submit', class: 'btn primary', id: 'setup-next' }, setupStep < 4 ? 'Continue →' : setup.playMode === 'online' ? 'Create invitation link →' : 'Let’s play →')))),
      h('footer', { class: 'setup-footer' }, h('button', { type: 'button', class: 'btn quiet', onclick: () => rules.showModal() }, 'How to play'),
        h('a', { href: 'gallery.html' }, 'Browse all cards'), themeButton())));
    updateSetupStatus();
  }
  function updateSetupStatus() {
    const count = deckFor(setup).length;
    const status = document.getElementById('setup-status');
    if (!status) return;
    status.replaceChildren(...[...setupErrors, ...(flash ? [flash] : [])].map(text => h('p', { class: 'warning' }, text)));
    const deckCount = document.getElementById('deck-count');
    if (deckCount) deckCount.textContent = count ? `${count} cards to explore together.` : 'No cards match these choices yet.';
    const browse = document.getElementById('browse-deck');
    if (browse) browse.href = `gallery.html?${D.query(setup)}`;
    const hint = document.getElementById('target-hint');
    if (hint) hint.textContent = targetNotice || `You have ${count} cards for ${S.playerCount(setup)} players. This deck supports a goal of up to ${Math.min(15, S.maximum(setup, count))} cards. If the deck runs out, the most cards wins, with tokens breaking ties.`;
  }

  function settingsText(options) {
    const tokens = options.startTokens === undefined ? 2 : options.startTokens;
    return `${D.description(options)}. First to ${options.target} cards. Everyone starts with ${tokens} ∎.` +
      (options.nameNeedsPlacement === false ? ' Naming a credited mathematician earns a ∎ even if the card is misplaced.' : ' Naming a credited mathematician earns a ∎ only with a correct placement.');
  }

  // ---------- online lobby screens ----------
  function statusLine() {
    const blocked = 'Still trying. If this doesn’t clear up within a minute, the network you’re on may be blocking online play (some university and office networks do). A home connection or a phone hotspot usually works.';
    const text = net.role === 'host'
      ? { connecting: 'Connecting…', ready: 'Ready for players.', retrying: 'Reconnecting…',
          slow: `Can’t reach the connection service yet. ${blocked}`, error: `Connection problem: ${net.error}` }[net.status]
      : { connecting: 'Connecting…', connected: 'Connected.', waiting: 'Waiting for the host’s game to be open…',
          'slow-service': `Can’t reach the connection service yet. ${blocked}`,
          'slow-direct': `Found the game, but the direct link between your browsers isn’t opening yet. ${blocked}`,
          error: `Connection problem: ${net.error}`, ended: '' }[net.status];
    const trouble = ['error', 'slow', 'slow-service', 'slow-direct'].includes(net.status);
    return text ? h('p', { class: 'net-status' + (trouble ? ' warning' : '') }, text) : null;
  }
  function playerList(players, mine) {
    return h('ul', { class: 'lobby-list' }, players.map((p, i) => h('li', { style: color(i) },
      h('span', { class: 'row-name' }, p.name), i === mine ? h('span', { class: 'tag' }, 'you') : null,
      i === 0 ? h('span', { class: 'tag' }, 'host') : null,
      p.online ? null : h('span', { class: 'tag off' }, 'not connected'),
      mode === 'host' && i > 0 && !p.online ? h('button', { type: 'button', class: 'btn quiet', onclick: () => { net.seats.splice(i, 1); hostSave(); hostBroadcast(); render(); } }, 'Remove') : null)));
  }
  function renderHostLobby() {
    const link = inviteLink(net.code);
    const input = h('input', { type: 'text', class: 'text link', readonly: true, value: link, 'aria-label': 'Invite link', onfocus: e => e.target.select() });
    const deck = deckFor(net.settings);
    const enough = deck.length >= G.cardsNeeded(net.seats.length, net.settings.target);
    app.replaceChildren(h('section', { class: 'setup' },
      h('h1', {}, 'Waiting for players'),
      h('p', { class: 'lede' }, 'Send this link to the other players. They open it in their own browser, type their name and join.'),
      h('div', { class: 'panel' },
        h('div', { class: 'link-row' }, input, h('button', { type: 'button', class: 'btn primary', onclick: () => copyText(link, input) }, 'Copy link')),
        flash ? h('p', { class: 'flash' }, flash) : null,
        statusLine()),
      h('div', { class: 'panel' }, h('h2', {}, `Players (${net.seats.length} of ${G.MAX_PLAYERS})`),
        playerList(lobbyInfo().players, 0),
        h('p', { class: 'panel-text' }, `${settingsText(net.settings)} ${deck.length} theorems in the deck.`),
        !enough ? h('p', { class: 'warning' }, 'There aren’t enough cards for this many players. Lower the cards to win in a new game.') : null),
      h('div', { class: 'start-row' },
        h('button', { type: 'button', class: 'btn primary', disabled: net.seats.length < 2 || !enough, onclick: hostBegin }, net.seats.length < 2 ? 'Waiting for a second player' : 'Start the game'),
        h('button', { type: 'button', class: 'btn', onclick: leave }, 'Cancel'))));
  }
  function renderGuestLobby() {
    const lobby = net.lobby;
    const body = [];
    if (net.error) body.push(h('p', { class: 'warning' }, net.error));
    if (!lobby) {
      body.push(h('h1', {}, net.status === 'ended' ? 'The game has ended' : 'Joining a game'), statusLine());
      if (net.status === 'waiting') body.push(h('p', { class: 'lede' }, 'The game is played from the host’s browser, so their game page needs to be open. This page keeps trying.'));
      if (net.status === 'ended') body.push(h('div', { class: 'start-row' }, h('button', { type: 'button', class: 'btn primary', onclick: () => { mode = 'local'; net = null; try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } render(); } }, 'Go to the start page')));
    } else if (net.seat === null) {
      body.push(h('h1', {}, `Join ${lobby.host}’s game`),
        h('div', { class: 'panel' },
          h('div', { class: 'field' }, h('label', { for: 'join-name' }, 'Your name'),
            h('input', { type: 'text', id: 'join-name', class: 'text', maxlength: '24', value: net.name, placeholder: 'Your name',
              oninput: e => { net.name = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') guestJoin(); } })),
          h('div', { class: 'start-row' }, h('button', { type: 'button', class: 'btn primary', onclick: guestJoin }, 'Join the game'))),
        h('div', { class: 'panel' }, h('h2', {}, 'Players so far'), playerList(lobby.players, null)), statusLine());
    } else {
      body.push(h('h1', {}, 'You’re in'),
        h('p', { class: 'lede' }, `Waiting for ${lobby.host} to start the game. ${settingsText(lobby.settings)}`),
        h('div', { class: 'panel' }, h('h2', {}, 'Players'), playerList(lobby.players, net.seat)), statusLine());
    }
    body.push(h('div', { class: 'start-row' }, h('button', { type: 'button', class: 'btn', onclick: () => rules.showModal() }, 'How to play')));
    app.replaceChildren(h('section', { class: 'setup' }, body));
  }

  // ---------- game screen ----------
  function themeButton() {
    const current = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    return h('button', { type: 'button', class: 'btn quiet', onclick: () => {
      document.documentElement.dataset.theme = nextTheme; store(KEY.theme, nextTheme); render();
    } }, nextTheme === 'dark' ? 'Blackboard' : 'Graph paper');
  }

  function renderGame() {
    const s = game, online = mode !== 'local', mine = me();
    const info = [h('span', {}, `Turn ${s.turn}`), h('span', {}, `${s.deck.length} cards left`), h('span', {}, `First to ${s.settings.target}`)];
    if (online) info.unshift(h('span', {}, mine === null ? 'Watching' : `You are ${nameOf(mine)}`));
    const actions = [];
    if (!online) actions.push(h('button', { type: 'button', class: 'btn quiet', disabled: !history.length, onclick: undo }, 'Undo'));
    if (mode === 'host') {
      const link = inviteLink(net.code);
      actions.push(h('button', { type: 'button', class: 'btn quiet', onclick: () => copyText(link, null) }, 'Copy invite link'));
    }
    actions.push(h('button', { type: 'button', class: 'btn quiet', onclick: () => rules.showModal() }, 'Rules'), themeButton(),
      h('button', { type: 'button', class: 'btn quiet', onclick: leave }, mode === 'local' ? 'New game' : mode === 'host' ? 'End game' : 'Leave'));
    const bar = h('header', { class: 'bar' }, h('p', { class: 'brand' }, 'Theorem Timeline'), h('div', { class: 'bar-info' }, info), h('div', { class: 'bar-actions' }, actions));
    const banner = mode === 'guest' && net.status !== 'connected'
      ? h('p', { class: 'flash warning-box' }, ['slow-service', 'slow-direct'].includes(net.status)
          ? 'Lost the connection to the host and can’t get it back yet. Still trying; if this lasts, try another network or a phone hotspot.'
          : 'Lost the connection to the host. Reconnecting…') : null;
    app.replaceChildren(...[bar, banner, s.phase === 'over' ? renderOver() : renderStage(), renderTimelines()].filter(Boolean));
  }

  function renderStage() {
    const s = game, c = byId.get(s.card), revealed = s.phase === 'reveal';
    const key = `${s.turn}:${s.phase}`;
    if (peek.key !== key) peek = { key, front: false };
    const showBack = revealed && !peek.front;
    const flip = h('div', { class: 'flip' + (showBack && !animateReveal ? ' revealed' : '') + (revealed ? ' turnable' : ''),
      onclick: revealed ? () => turnCard() : null },
      h('div', { class: 'flip-inner' },
        h('article', { class: 'face front index-card', 'data-card': c.id, 'aria-hidden': showBack ? 'true' : null },
          h('p', { class: 'card-area' }, c.area),
          h('p', { class: 'statement' }, M.render(c.statement))),
        h('article', { class: 'face back index-card', 'aria-hidden': showBack ? null : 'true' },
          h('p', { class: 'year' }, c.shown),
          c.yearKind ? h('p', { class: 'note' }, c.yearKind) : null,
          h('p', { class: 'theorem-name' }, M.render(c.name)),
          h('p', { class: 'prover' }, 'Credited to ', h('strong', {}, listJoin(c.provers))),
          c.note ? h('p', { class: 'note' }, c.twist ? h('span', { class: 'twist' }, 'Twist') : null, M.render(c.note)) : null)));
    if (showBack && animateReveal) {
      animateReveal = false;
      requestAnimationFrame(() => requestAnimationFrame(() => flip.classList.add('revealed')));
    }
    const turnButton = revealed ? h('button', { type: 'button', class: 'btn quiet turn-card', id: 'turn-card', onclick: () => turnCard() },
      peek.front ? 'Show the answer' : 'Show the theorem') : null;
    return h('section', { class: 'stage' }, h('div', { class: 'card-column' }, flip, turnButton),
      h('div', { class: 'prompt', 'aria-live': 'polite', style: color(s.active) }, prompt()));
  }
  // Flip the revealed card over and back, animating the card that is already on screen.
  function turnCard() {
    peek.front = !peek.front;
    const flip = app.querySelector('.flip'), button = document.getElementById('turn-card');
    if (flip) {
      flip.classList.toggle('revealed', !peek.front);
      flip.querySelector('.face.front').setAttribute('aria-hidden', peek.front ? 'false' : 'true');
      flip.querySelector('.face.back').setAttribute('aria-hidden', peek.front ? 'true' : 'false');
    }
    if (button) button.textContent = peek.front ? 'Show the answer' : 'Show the theorem';
  }

  function prompt() {
    const s = game, active = nameOf(s.active), mine = me(), online = mode !== 'local', myTurn = canAct(s.active);
    const note = flash ? h('p', { class: 'flash' }, flash) : null;
    if (s.phase === 'place') {
      if (!myTurn) return [note, h('h2', {}, h('span', { class: 'who' }, active), ' is placing this theorem.'),
        h('p', { class: 'hint' }, 'Once it’s placed, you can challenge if you have a ∎.')];
      if (!online) return [note, h('h2', {}, h('span', { class: 'who' }, active), ', where does this theorem go?'),
        h('p', {}, 'Tap a gap in your timeline.'), h('p', { class: 'hint' }, 'Name a mathematician credited for this result before the reveal.')];
      return [note, h('h2', {}, 'Your turn. Where does this theorem go?'),
        h('div', { class: 'field guess' }, h('label', { for: 'guess' }, 'Who is credited? Optional: a right name earns a ∎.'),
          h('input', { type: 'text', id: 'guess', class: 'text', maxlength: '80', value: guessDraft, autocomplete: 'off', placeholder: 'For example: Gauss',
            oninput: e => { guessDraft = e.target.value; } })),
        h('p', {}, 'Then tap a gap in your timeline. Small spelling mistakes are fine.')];
    }
    if (s.phase === 'challenge') {
      const able = s.players.map((p, i) => i).filter(i => G.canChallenge(s, i) && canAct(i));
      const pickers = able.length ? h('div', { class: 'challengers' }, able.map(i => h('button', {
        type: 'button', class: 'challenger', style: color(i), 'aria-pressed': String(challenger === i),
        onclick: () => { challenger = challenger === i ? null : i; flash = ''; render(); }
      }, online ? 'Challenge' : `${nameOf(i)} challenges`))) : null;
      const pickHint = challenger !== null ? h('p', { class: 'hint' }, `${online ? 'Now tap' : nameOf(challenger) + ': tap'} a gap in ${active}’s timeline.`) : null;
      const reveal = myTurn ? h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => perform('reveal') }, 'Reveal the card')) : null;
      if (!online) {
        const nobody = !able.length && !s.challenges.length ? h('p', { class: 'hint' }, 'Nobody else has a ∎ to challenge with.') : null;
        return [note, h('h2', {}, 'Anyone want to challenge?'),
          h('p', {}, `To challenge, spend one ∎ and pick a different gap in ${active}’s timeline. If ${active} is wrong and you are right, you take the card.`),
          pickers, pickHint || nobody, reveal];
      }
      if (myTurn) {
        const others = s.players.map((p, i) => i).filter(i => G.canChallenge(s, i));
        return [note, h('h2', {}, 'Waiting for challenges'),
          h('p', {}, others.length ? 'The other players can spend a ∎ to bet on a different gap. Reveal the card when they’re ready.' : 'Nobody else has a ∎ to challenge with, so you can reveal the card.'), reveal];
      }
      if (able.length) return [note, h('h2', {}, 'Do you want to challenge?'),
        h('p', {}, `Spend one ∎ and pick a different gap in ${active}’s timeline. If ${active} is wrong and you are right, you take the card.`),
        pickers, pickHint, h('p', { class: 'hint' }, `${active} will reveal the card soon.`)];
      const challenged = s.challenges.some(c => c.player === mine);
      return [note, h('h2', {}, challenged ? 'You’ve challenged.' : `Waiting for ${active} to reveal the card.`),
        challenged ? h('p', { class: 'hint' }, `Waiting for ${active} to reveal the card.`) : null];
    }
    // reveal
    const r = s.result, full = s.players[s.active].tokens >= s.settings.maxTokens;
    const outcome = r.activeCorrect ? h('h2', { class: 'result good' }, `Right! ${active} keeps the card.`)
      : r.winner !== null ? h('h2', { class: 'result neutral' }, `Not quite. ${nameOf(r.winner)}’s challenge was right, so ${nameOf(r.winner)} takes the card.`)
      : h('h2', { class: 'result bad' }, 'Not quite. The card is discarded.');
    const placementRule = s.settings.nameNeedsPlacement && !r.activeCorrect;
    if (!online) {
      const finish = named => perform('endTurn', { named });
      if (placementRule) return [note, outcome,
        h('p', { class: 'hint' }, 'No ∎ for naming a credited mathematician this turn, since the card wasn’t placed correctly.'),
        h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => finish(false) }, 'Next turn'))];
      return [note, outcome, h('p', {}, `Did ${active} name a credited mathematician before the reveal?`),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn primary', onclick: () => finish(true) }, full ? `Yes (${active} already has ${s.settings.maxTokens} ∎)` : 'Yes, earn a ∎'),
          h('button', { type: 'button', class: 'btn', onclick: () => finish(false) }, 'No'))];
    }
    const right = guessRight(s);
    const guessLine = s.guess
      ? h('p', { class: 'guess-result ' + (right && !placementRule ? 'good' : 'bad') }, `${active} guessed “${s.guess}”: `,
        !right ? 'not this time.' : placementRule ? 'right, but no ∎ since the card wasn’t placed correctly.' : full ? 'right, but already at 5 ∎.' : 'right! +1 ∎')
      : h('p', { class: 'hint' }, `${active} didn’t guess a credited mathematician.`);
    return [note, outcome, guessLine,
      myTurn ? h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', onclick: () => perform('endTurn') }, 'Next turn'))
        : h('p', { class: 'hint' }, `Waiting for ${active} to continue.`)];
  }

  function renderOver() {
    const s = game, names = s.winners.map(nameOf);
    const cards = s.players[s.winners[0]].timeline.length;
    let buttons;
    if (mode === 'local') buttons = [h('button', { type: 'button', class: 'btn primary', onclick: () => startLocal(s.players.map(p => p.name)) }, 'Play again'),
      h('button', { type: 'button', class: 'btn', onclick: leave }, 'Change players')];
    else if (mode === 'host') buttons = [h('button', { type: 'button', class: 'btn primary', onclick: hostBegin }, 'Play again'),
      h('button', { type: 'button', class: 'btn', onclick: leave }, 'End the session')];
    else buttons = [h('p', { class: 'hint' }, `${net.lobby.host} can start another game.`)];
    return h('section', { class: 'stage over' },
      h('div', {},
        h('h2', {}, names.length > 1 ? `${listJoin(names)} share the win!` : `${names[0]} wins!`),
        h('p', {}, s.deck.length ? `${names.length > 1 ? 'Each with' : 'With'} ${cards} cards in the timeline.` : `The deck ran out, and ${cards} cards was the most.`),
        h('div', { class: 'actions' }, buttons)));
  }

  function renderTimelines() {
    const s = game, online = mode !== 'local';
    const presence = i => mode === 'host' ? seatOnline(i) : mode === 'guest' && net.lobby ? (net.lobby.players[i] || {}).online : true;
    return h('section', { class: 'timelines', 'aria-label': 'Timelines' }, s.players.map((p, i) => {
      const isActive = i === s.active && s.phase !== 'over';
      const canBuy = s.phase === 'place' && p.tokens >= s.settings.cardCost && s.deck.length > 0 && canAct(i);
      return h('section', { class: 'row' + (isActive ? ' active' : ''), style: color(i), 'aria-label': `${p.name}’s timeline` },
        h('div', { class: 'row-head' },
          h('span', { class: 'row-name' }, p.name),
          online && i === me() ? h('span', { class: 'tag' }, 'you') : null,
          online && !presence(i) ? h('span', { class: 'tag off' }, 'not connected') : null,
          h('span', { class: 'row-score' }, `${p.timeline.length} of ${s.settings.target} cards`),
          tokens(p.tokens, s.settings.maxTokens),
          canBuy ? h('button', { type: 'button', class: 'btn quiet', onclick: () => perform('buy', { player: i }) }, `Trade ${s.settings.cardCost} ∎ for a card`) : null),
        h('div', { class: 'track' }, h('ol', { class: 'line' }, lineItems(i, isActive))));
    }));
  }

  function lineItems(i, isActive) {
    const s = game, timeline = s.players[i].timeline, items = [];
    let fresh = null;
    if (s.phase === 'reveal' && s.result.winner === i) fresh = s.result.card;
    if (s.event && s.event.type === 'bought' && s.event.player === i) fresh = s.event.card;
    // While the active player's placement is being judged, their timeline does not yet hold the card.
    const judging = isActive && (s.phase === 'challenge' || (s.phase === 'reveal' && !s.result.activeCorrect));
    for (let slot = 0; slot <= timeline.length; slot++) {
      items.push(isActive ? activeGap(slot, timeline, judging) : h('li', { class: 'gap', 'aria-hidden': 'true' }, h('span', { class: 'dot' })));
      if (slot < timeline.length) items.push(timelineCard(timeline[slot], timeline[slot] === fresh));
    }
    return items;
  }

  function activeGap(slot, timeline, judging) {
    const s = game;
    if (s.phase === 'place') {
      if (!canAct(s.active)) return h('li', { class: 'gap', 'aria-hidden': 'true' }, h('span', { class: 'dot' }));
      return h('li', { class: 'gap wide' }, h('button', { type: 'button', class: 'slot', 'aria-label': `Place it ${gapLabel(slot, timeline)}`,
        onclick: () => perform('place', { slot, guess: mode === 'local' ? '' : guessDraft }) }, '+'));
    }
    if (!judging) return h('li', { class: 'gap', 'aria-hidden': 'true' }, h('span', { class: 'dot' }));
    const revealed = s.phase === 'reveal';
    const correct = revealed && s.result.correctSlots.includes(slot);
    const cls = 'gap wide' + (correct ? ' correct' : '');
    if (slot === s.placement) {
      return h('li', { class: cls, style: color(s.active) }, h('span', { class: 'marker' },
        h('span', { class: 'ghost' + (revealed ? ' wrong' : ''), 'aria-label': `${nameOf(s.active)} placed it ${gapLabel(slot, timeline)}` }, '?')));
    }
    const bet = s.challenges.find(c => c.slot === slot);
    if (bet) {
      const state = revealed ? (s.result.winner === bet.player ? ' won' : ' lost') : '';
      return h('li', { class: cls, style: color(bet.player) }, h('span', { class: 'marker' },
        h('span', { class: 'chip' + state, 'aria-label': `${nameOf(bet.player)} challenged ${gapLabel(slot, timeline)}` }, initials(nameOf(bet.player)))));
    }
    if (!revealed && challenger !== null) {
      const who = challenger;
      return h('li', { class: 'gap wide', style: color(who) }, h('button', { type: 'button', class: 'slot',
        'aria-label': `${nameOf(who)} challenges ${gapLabel(slot, timeline)}`,
        onclick: () => perform('challenge', { player: who, slot }) }, '+'));
    }
    return h('li', { class: cls, 'aria-hidden': correct ? null : 'true', 'aria-label': correct ? `Correct place: ${gapLabel(slot, timeline)}` : null }, h('span', { class: 'dot' }));
  }

  function timelineCard(id, fresh) {
    const c = byId.get(id);
    return h('li', { class: 'tl-card' + (fresh ? ' new' : ''), title: M.plain(c.statement) },
      h('span', { class: 'tl-year' }, c.shown),
      h('span', { class: 'tl-name' }, M.render(c.name)),
      h('span', { class: 'tl-prover' }, listJoin(c.provers)));
  }

  // ---------- start ----------
  function render() {
    // Keep typing undisturbed when the screen refreshes because another player moved.
    const focused = document.activeElement, focusId = focused && focused.id;
    const selection = focusId && typeof focused.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
    if (mode === 'host' && !net.started) renderHostLobby();
    else if (mode === 'guest' && (!game || !net.lobby || !net.lobby.started)) renderGuestLobby();
    else if (game) renderGame();
    else renderSetup();
    if (focusId) {
      const again = document.getElementById(focusId);
      if (again && again !== document.activeElement) { again.focus(); if (selection && again.setSelectionRange) again.setSelectionRange(selection[0], selection[1]); }
    }
  }
  const theme = load(KEY.theme);
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
  rules.addEventListener('click', e => { if (e.target === rules || e.target.closest('[data-close]')) rules.close(); });
  const hash = location.hash.slice(1), [kind, code] = hash.split('=');
  if (kind === 'join' && /^[a-z0-9]{4,20}$/.test(code || '')) guestStart(code);
  else if (kind === 'host' && /^[a-z0-9]{4,20}$/.test(code || '') && hostResume(code)) { /* resumed */ }
  else if (hash) { try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
  render();
})();
