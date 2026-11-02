/* Theorem Timeline: the shared-screen interface. All rules live in game.js. */
(function () {
  'use strict';
  const G = window.TimelineGame;
  const CARDS = window.THEOREM_CARDS || [];
  const byId = new Map(CARDS.map(c => [c.id, c]));
  const SAVE_KEY = 'theorem-timeline:game', SETUP_KEY = 'theorem-timeline:setup', THEME_KEY = 'theorem-timeline:theme';
  const app = document.getElementById('app');
  const rules = document.getElementById('rules');

  let game = null;          // current game state (see game.js)
  let history = [];         // earlier states, for Undo
  let challenger = null;    // player currently choosing a gap to challenge
  let flash = '';           // one line about what just happened
  let animateReveal = false;
  let setup = Object.assign({ names: ['Player 1', 'Player 2'], target: 10, level: 'all', verifiedOnly: false }, load(SETUP_KEY) || {});

  // ---------- storage (browser storage can be unavailable; the game still works) ----------
  function load(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function store(key, value) { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ } }
  function savedGame() {
    const saved = load(SAVE_KEY);
    const ok = saved && saved.version === 1 && Array.isArray(saved.players) && saved.phase !== 'over' &&
      Object.keys(saved.years || {}).every(id => byId.has(id));
    return ok ? saved : null;
  }

  // ---------- small helpers ----------
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'style') node.style.cssText = value;
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
    return CARDS.filter(c => (options.level === 'all' || c.level === options.level) && (!options.verifiedOnly || c.verified));
  }

  // ---------- actions ----------
  function act(change, describe) {
    let next;
    try { next = change(game); }
    catch (error) { flash = error.message; render(); return; }
    history.push(game);
    if (history.length > 100) history.shift();
    game = next;
    challenger = null;
    flash = describe ? describe(next) : '';
    store(SAVE_KEY, game.phase === 'over' ? null : game);
    render();
  }
  function undo() {
    if (!history.length) return;
    game = history.pop(); challenger = null; flash = 'Undone.';
    store(SAVE_KEY, game);
    render();
  }
  function startGame(names) {
    const deck = deckFor(setup).map(c => ({ id: c.id, year: c.year }));
    try {
      game = G.newGame({ cards: deck, players: names, settings: { target: setup.target }, seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0 });
    } catch (error) { flash = error.message; render(); return; }
    history = []; challenger = null; flash = '';
    store(SAVE_KEY, game);
    render();
  }
  function leaveGame() {
    if (game && game.phase !== 'over' && !confirm('End this game and go back to setup? The game will not be saved.')) return;
    game = null; history = []; flash = '';
    store(SAVE_KEY, null);
    render();
  }

  // ---------- setup screen ----------
  function renderSetup() {
    const resume = savedGame();
    const players = h('div', { class: 'players' });
    setup.names.forEach((name, i) => {
      players.append(h('div', { class: 'player-input', style: color(i) },
        h('span', { class: 'swatch', 'aria-hidden': 'true' }),
        h('input', { type: 'text', value: name, maxlength: '24', 'aria-label': `Player ${i + 1} name`,
          oninput: e => { setup.names[i] = e.target.value; store(SETUP_KEY, setup); updateStatus(); } }),
        setup.names.length > G.MIN_PLAYERS ? h('button', { type: 'button', class: 'btn quiet', 'aria-label': `Remove player ${i + 1}`,
          onclick: () => { setup.names.splice(i, 1); store(SETUP_KEY, setup); render(); } }, 'Remove') : null));
    });
    const addPlayer = setup.names.length < G.MAX_PLAYERS ? h('button', { type: 'button', class: 'btn quiet', onclick: () => {
      setup.names.push(`Player ${setup.names.length + 1}`); store(SETUP_KEY, setup); render();
      const inputs = app.querySelectorAll('.player-input input'); inputs[inputs.length - 1].select();
    } }, 'Add a player') : null;

    const select = (label, key, options) => h('div', { class: 'field' },
      h('label', { for: `opt-${key}` }, label),
      h('select', { id: `opt-${key}`, onchange: e => { setup[key] = key === 'target' ? Number(e.target.value) : e.target.value; store(SETUP_KEY, setup); updateStatus(); } },
        options.map(([value, text]) => h('option', { value, selected: String(setup[key]) === String(value) }, text))));

    const status = h('div', { id: 'setup-status' });
    const start = h('button', { type: 'button', class: 'btn primary', id: 'start', onclick: () => startGame(setup.names.map(n => n.trim())) }, 'Start the game');

    app.replaceChildren(h('section', { class: 'setup' },
      h('h1', {}, 'Theorem Timeline'),
      h('p', { class: 'lede' }, 'Place each theorem in your timeline by the year it was proved. Name the person who proved it to earn a ', h('span', { class: 'qed' }, '∎'), '.'),
      resume ? h('div', { class: 'panel' },
        h('h2', {}, 'A game is in progress'),
        h('p', { style: 'margin:0 0 14px' }, `${listJoin(resume.players.map(p => p.name))}, turn ${resume.turn}.`),
        h('div', { class: 'start-row' },
          h('button', { type: 'button', class: 'btn primary', onclick: () => { game = resume; history = []; flash = ''; render(); } }, 'Resume the game'),
          h('button', { type: 'button', class: 'btn', onclick: () => { store(SAVE_KEY, null); render(); } }, 'Discard it'))) : null,
      h('div', { class: 'panel' }, h('h2', {}, 'Players'), players, addPlayer),
      h('div', { class: 'panel' }, h('h2', {}, 'Game'),
        h('div', { class: 'options' },
          select('Cards to win', 'target', [5, 6, 8, 10, 12, 15].map(n => [n, `${n} cards`])),
          select('Theorems', 'level', [['all', 'All theorems'], ['Undergraduate', 'Undergraduate courses'], ['Famous', 'Famous results']]),
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Checked cards'),
            h('label', { class: 'check' },
              h('input', { type: 'checkbox', checked: setup.verifiedOnly, onchange: e => { setup.verifiedOnly = e.target.checked; store(SETUP_KEY, setup); updateStatus(); } }),
              h('span', {}, 'Only cards marked verified')))),
        status),
      h('div', { class: 'start-row' }, start,
        h('button', { type: 'button', class: 'btn', onclick: () => rules.showModal() }, 'How to play'),
        themeButton())));
    updateStatus();
  }
  function updateStatus() {
    const status = document.getElementById('setup-status'), start = document.getElementById('start');
    if (!status) return;
    const deck = deckFor(setup), names = setup.names.map(n => n.trim());
    const needed = G.cardsNeeded(names.length, setup.target);
    const problems = [];
    if (!CARDS.length) problems.push('No cards were found. Run tools/build_cards.py to create site/cards.js.');
    if (names.some(n => !n)) problems.push('Every player needs a name.');
    if (new Set(names.map(n => n.toLowerCase())).size !== names.length) problems.push('Each player needs a different name.');
    if (CARDS.length && deck.length < needed) problems.push(`This setup needs at least ${needed} cards, and the deck has ${deck.length}. Choose fewer cards to win, fewer players, or more theorems.`);
    status.replaceChildren(...[
      h('p', { class: 'deck-count' }, `${deck.length} theorems in the deck.`),
      ...problems.map(p => h('p', { class: 'warning' }, p)),
      flash ? h('p', { class: 'warning' }, flash) : null].filter(Boolean));
    start.disabled = problems.length > 0;
  }

  // ---------- game screen ----------
  function themeButton() {
    const current = document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    return h('button', { type: 'button', class: 'btn quiet', onclick: () => {
      document.documentElement.dataset.theme = nextTheme; store(THEME_KEY, nextTheme); render();
    } }, nextTheme === 'dark' ? 'Blackboard' : 'Graph paper');
  }

  function renderGame() {
    const s = game;
    const bar = h('header', { class: 'bar' },
      h('p', { class: 'brand' }, 'Theorem Timeline'),
      h('div', { class: 'bar-info' },
        h('span', {}, `Turn ${s.turn}`), h('span', {}, `${s.deck.length} cards left`), h('span', {}, `First to ${s.settings.target}`)),
      h('div', { class: 'bar-actions' },
        h('button', { type: 'button', class: 'btn quiet', disabled: !history.length, onclick: undo }, 'Undo'),
        h('button', { type: 'button', class: 'btn quiet', onclick: () => rules.showModal() }, 'Rules'),
        themeButton(),
        h('button', { type: 'button', class: 'btn quiet', onclick: leaveGame }, 'New game')));
    app.replaceChildren(bar, s.phase === 'over' ? renderOver() : renderStage(), renderTimelines());
  }

  function renderStage() {
    const s = game, c = byId.get(s.card), revealed = s.phase === 'reveal';
    const flip = h('div', { class: 'flip' + (revealed && !animateReveal ? ' revealed' : '') },
      h('div', { class: 'flip-inner' },
        h('article', { class: 'face front index-card', 'aria-hidden': revealed ? 'true' : null },
          h('p', { class: 'card-area' }, c.area),
          h('p', { class: 'statement' }, c.statement)),
        h('article', { class: 'face back index-card', 'aria-hidden': revealed ? null : 'true' },
          h('p', { class: 'year' }, c.shown),
          h('p', { class: 'theorem-name' }, c.name),
          h('p', { class: 'prover' }, 'Proved by ', h('strong', {}, listJoin(c.provers))),
          c.note ? h('p', { class: 'note' }, c.twist ? h('span', { class: 'twist' }, 'Twist') : null, c.note) : null)));
    if (revealed && animateReveal) {
      animateReveal = false;
      requestAnimationFrame(() => requestAnimationFrame(() => flip.classList.add('revealed')));
    }
    return h('section', { class: 'stage' }, flip, h('div', { class: 'prompt', 'aria-live': 'polite', style: color(s.active) }, prompt()));
  }

  function prompt() {
    const s = game, active = nameOf(s.active);
    const note = flash ? h('p', { class: 'flash' }, flash) : null;
    if (s.phase === 'place') {
      return [note,
        h('h2', {}, h('span', { class: 'who' }, active), ', where does this theorem go?'),
        h('p', {}, 'Tap a gap in your timeline.'),
        h('p', { class: 'hint' }, 'If you know who proved it, say the name out loud now.')];
    }
    if (s.phase === 'challenge') {
      const able = s.players.map((p, i) => i).filter(i => G.canChallenge(s, i));
      return [note,
        h('h2', {}, 'Anyone want to challenge?'),
        h('p', {}, `To challenge, spend one ∎ and pick a different gap in ${active}’s timeline. If ${active} is wrong and you are right, you take the card.`),
        able.length ? h('div', { class: 'challengers' }, able.map(i => h('button', {
          type: 'button', class: 'challenger', style: color(i), 'aria-pressed': String(challenger === i),
          onclick: () => { challenger = challenger === i ? null : i; flash = ''; render(); }
        }, `${nameOf(i)} challenges`))) : null,
        challenger !== null ? h('p', { class: 'hint' }, `${nameOf(challenger)}: tap a gap in ${active}’s timeline.`) :
          (!able.length && !s.challenges.length ? h('p', { class: 'hint' }, 'Nobody else has a ∎ to challenge with.') : null),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn primary', onclick: () => { animateReveal = true; act(G.reveal); } }, 'Reveal the card'))];
    }
    // reveal
    const r = s.result, full = s.players[s.active].tokens >= s.settings.maxTokens;
    const outcome = r.activeCorrect ? h('h2', { class: 'result good' }, `Right! ${active} keeps the card.`)
      : r.winner !== null ? h('h2', { class: 'result neutral' }, `Not quite. ${nameOf(r.winner)}’s challenge was right, so ${nameOf(r.winner)} takes the card.`)
      : h('h2', { class: 'result bad' }, 'Not quite. The card is discarded.');
    const finish = named => act(g => G.endTurn(g, { namedProver: named }),
      next => next.event && next.event.earned ? `${nameOf(next.event.player)} earned a ∎ for naming the prover.` : '');
    return [note, outcome,
      h('p', {}, `Did ${active} name the prover before the reveal?`),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => finish(true) }, full ? `Yes (${active} already has ${s.settings.maxTokens} ∎)` : 'Yes, earn a ∎'),
        h('button', { type: 'button', class: 'btn', onclick: () => finish(false) }, 'No'))];
  }

  function renderOver() {
    const s = game, names = s.winners.map(nameOf);
    const cards = s.players[s.winners[0]].timeline.length;
    const replay = () => startGame(s.players.map(p => p.name));
    return h('section', { class: 'stage over' },
      h('div', {},
        h('h2', {}, names.length > 1 ? `${listJoin(names)} share the win!` : `${names[0]} wins!`),
        h('p', {}, s.deck.length ? `${names.length > 1 ? 'Each with' : 'With'} ${cards} cards in the timeline.` : `The deck ran out, and ${cards} cards was the most.`),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn primary', onclick: replay }, 'Play again'),
          h('button', { type: 'button', class: 'btn', onclick: leaveGame }, 'Change players'))));
  }

  function renderTimelines() {
    const s = game;
    return h('section', { class: 'timelines', 'aria-label': 'Timelines' }, s.players.map((p, i) => {
      const isActive = i === s.active && s.phase !== 'over';
      const canBuy = s.phase === 'place' && p.tokens >= s.settings.cardCost && s.deck.length > 0;
      return h('section', { class: 'row' + (isActive ? ' active' : ''), style: color(i), 'aria-label': `${p.name}’s timeline` },
        h('div', { class: 'row-head' },
          h('span', { class: 'row-name' }, p.name),
          h('span', { class: 'row-score' }, `${p.timeline.length} of ${s.settings.target} cards`),
          tokens(p.tokens, s.settings.maxTokens),
          canBuy ? h('button', { type: 'button', class: 'btn quiet', onclick: () => act(g => G.buyCard(g, i), next => {
            const c = byId.get(next.event.card);
            return `${p.name} traded ${s.settings.cardCost} ∎ for “${c.name}” (${c.shown}).`;
          }) }, `Trade ${s.settings.cardCost} ∎ for a card`) : null),
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

  function gapLabel(slot, timeline) {
    const year = id => byId.get(id).shown;
    if (slot === 0) return `before ${year(timeline[0])}`;
    if (slot === timeline.length) return `after ${year(timeline[slot - 1])}`;
    return `between ${year(timeline[slot - 1])} and ${year(timeline[slot])}`;
  }

  function activeGap(slot, timeline, judging) {
    const s = game;
    if (s.phase === 'place') {
      return h('li', { class: 'gap wide' }, h('button', { type: 'button', class: 'slot', 'aria-label': `Place it ${gapLabel(slot, timeline)}`,
        onclick: () => act(g => G.place(g, slot)) }, '+'));
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
      return h('li', { class: 'gap wide', style: color(challenger) }, h('button', { type: 'button', class: 'slot',
        'aria-label': `${nameOf(challenger)} challenges ${gapLabel(slot, timeline)}`,
        onclick: () => {
          const who = challenger;
          act(g => G.challenge(g, who, slot), () => `${nameOf(who)} challenges ${gapLabel(slot, timeline)}.`);
        } }, '+'));
    }
    return h('li', { class: cls, 'aria-hidden': correct ? null : 'true', 'aria-label': correct ? `Correct place: ${gapLabel(slot, timeline)}` : null }, h('span', { class: 'dot' }));
  }

  function timelineCard(id, fresh) {
    const c = byId.get(id);
    return h('li', { class: 'tl-card' + (fresh ? ' new' : ''), title: c.statement },
      h('span', { class: 'tl-year' }, c.shown),
      h('span', { class: 'tl-name' }, c.name),
      h('span', { class: 'tl-prover' }, listJoin(c.provers)));
  }

  // ---------- start ----------
  function render() { if (game) renderGame(); else renderSetup(); }
  const theme = load(THEME_KEY);
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
  rules.addEventListener('click', e => { if (e.target === rules || e.target.closest('[data-close]')) rules.close(); });
  render();
})();
