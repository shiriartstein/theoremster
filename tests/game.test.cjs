// Run with: node tests/game.test.cjs
const assert = require('assert');
const G = require('../site/game.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { console.error(`FAIL: ${name}\n  ${error.message}`); process.exitCode = 1; }
}

// 60 cards, years 1000, 1010, ... so that every card has a distinct year.
const cards = Array.from({ length: 60 }, (_, i) => ({ id: `T${String(i + 1).padStart(3, '0')}`, year: 1000 + 10 * i }));
const players = ['Ada', 'Ben', 'Chen'];
const start = (extra = {}) => G.newGame({ cards, players, seed: 42, settings: { target: 5 }, ...extra });

// Build a state where the active player's timeline and the current card are chosen by the test.
function rig(state, { timeline, card, tokens }) {
  const next = JSON.parse(JSON.stringify(state));
  const used = new Set([...timeline, card]);
  next.players[next.active].timeline = timeline.slice();
  next.card = card;
  next.deck = next.deck.filter(id => !used.has(id));
  for (const p of next.players) if (p !== next.players[next.active]) p.timeline = p.timeline.filter(id => !used.has(id));
  if (tokens) next.players.forEach((p, i) => { if (tokens[i] !== undefined) p.tokens = tokens[i]; });
  return next;
}
const yearOf = id => cards.find(c => c.id === id).year;

test('a new game deals one card to each player and one current card', () => {
  const s = start();
  assert.strictEqual(s.players.length, 3);
  for (const p of s.players) { assert.strictEqual(p.timeline.length, 1); assert.strictEqual(p.tokens, 2); }
  assert.strictEqual(s.deck.length, 60 - 4);
  assert.strictEqual(s.phase, 'place');
  const all = [...s.deck, s.card, ...s.players.flatMap(p => p.timeline)];
  assert.strictEqual(new Set(all).size, 60);
});

test('the same seed deals the same game', () => {
  assert.deepStrictEqual(start(), start());
  assert.notDeepStrictEqual(start(), start({ seed: 7 }));
});

test('setup rejects bad player lists and small decks', () => {
  assert.throws(() => G.newGame({ cards, players: ['Solo'] }), /2 to 6 players/);
  assert.throws(() => G.newGame({ cards, players: ['Ada', 'ada'] }), /different name/);
  assert.throws(() => G.newGame({ cards: cards.slice(0, 10), players }), /at least/);
  assert.throws(() => G.newGame({ cards: [...cards, cards[0]], players }), /Duplicate/);
});

test('a six-card course deck can finish a two-player short game without repeats', () => {
  assert.equal(G.cardsNeeded(2,2),6);
  assert.throws(()=>G.newGame({cards:cards.slice(0,5),players:['A','B'],settings:{target:2}}),/at least 6/);
  let s=G.newGame({cards:cards.slice(0,6),players:['A','B'],settings:{target:2},seed:1});
  let turns=0;
  while(s.phase!=='over' && turns++<10) {
    const slot=G.correctSlots(s,s.players[s.active].timeline,s.card)[0];
    s=G.endTurn(G.reveal(G.place(s,slot)));
  }
  assert.equal(s.phase,'over');
  const all=[...s.deck,...s.discard,...s.players.flatMap(p=>p.timeline)];
  assert.equal(new Set(all).size,6);
});

test('actions never modify the state they are given', () => {
  const s = start(); const before = JSON.stringify(s);
  G.place(s, 0);
  assert.strictEqual(JSON.stringify(s), before);
});

test('a correct placement keeps the card, in year order', () => {
  let s = rig(start(), { timeline: ['T001', 'T010'], card: 'T005' });
  s = G.reveal(G.place(s, 1));
  assert.ok(s.result.activeCorrect);
  assert.deepStrictEqual(s.players[0].timeline, ['T001', 'T005', 'T010']);
  assert.deepStrictEqual(s.result.correctSlots, [1]);
});

test('a wrong placement with no challenge discards the card', () => {
  let s = rig(start(), { timeline: ['T001', 'T010'], card: 'T005' });
  s = G.reveal(G.place(s, 0));
  assert.ok(!s.result.activeCorrect);
  assert.strictEqual(s.result.winner, null);
  assert.deepStrictEqual(s.players[0].timeline, ['T001', 'T010']);
  assert.deepStrictEqual(s.discard, ['T005']);
});

test('equal years count as correct on either side', () => {
  const twins = cards.map(c => c.id === 'T006' ? { id: 'T006', year: yearOf('T005') } : c);
  let s = rig(G.newGame({ cards: twins, players, seed: 1 }), { timeline: ['T005'], card: 'T006' });
  assert.deepStrictEqual(G.correctSlots(s, s.players[0].timeline, 'T006'), [0, 1]);
  assert.ok(G.reveal(G.place(s, 0)).result.activeCorrect);
  assert.ok(G.reveal(G.place(s, 1)).result.activeCorrect);
});

test('a right challenge wins the card for the challenger', () => {
  let s = rig(start(), { timeline: ['T001', 'T010'], card: 'T005' });
  s = G.place(s, 2);
  s = G.challenge(s, 1, 1);
  assert.strictEqual(s.players[1].tokens, 1);
  const benBefore = s.players[1].timeline.slice();
  s = G.reveal(s);
  assert.strictEqual(s.result.winner, 1);
  const ben = s.players[1].timeline;
  assert.strictEqual(ben.length, benBefore.length + 1);
  assert.ok(ben.includes('T005'));
  assert.deepStrictEqual(ben.map(yearOf), ben.map(yearOf).slice().sort((a, b) => a - b));
  assert.deepStrictEqual(s.players[0].timeline, ['T001', 'T010']);
});

test('a wrong challenge costs the token and wins nothing', () => {
  let s = rig(start(), { timeline: ['T001', 'T010'], card: 'T005' });
  s = G.reveal(G.challenge(G.place(s, 2), 1, 0));
  assert.strictEqual(s.result.winner, null);
  assert.strictEqual(s.players[1].tokens, 1);
});

test('a correct placement beats any challenge', () => {
  let s = rig(start(), { timeline: ['T001', 'T010'], card: 'T005' });
  s = G.reveal(G.challenge(G.place(s, 1), 1, 0));
  assert.strictEqual(s.result.winner, 0);
  assert.strictEqual(s.players[1].tokens, 1);
});

test('challenge rules: tokens, own card, one per player, distinct gaps', () => {
  let s = G.place(rig(start(), { timeline: ['T001', 'T010'], card: 'T005', tokens: [2, 2, 0] }), 2);
  assert.throws(() => G.challenge(s, 0, 1), /own placement/);
  assert.throws(() => G.challenge(s, 2, 1), /no tokens/);
  assert.throws(() => G.challenge(s, 1, 2), /put the card/);
  assert.throws(() => G.challenge(s, 1, 9), /not a gap/);
  s = G.challenge(s, 1, 1);
  assert.throws(() => G.challenge(s, 1, 0), /already challenged/);
  assert.ok(!G.canChallenge(s, 1));
  assert.ok(!G.canChallenge(s, 2));
  assert.throws(() => G.challenge(rig(start(), { timeline: ['T001'], card: 'T005' }), 1, 0), /after the card is placed/);
});

test('naming the prover earns a token, capped at the maximum', () => {
  let s = rig(start(), { timeline: ['T001'], card: 'T005', tokens: [4, 2, 2] });
  s = G.endTurn(G.reveal(G.place(s, 1)), { namedProver: true });
  assert.strictEqual(s.players[0].tokens, 5);
  assert.ok(s.event.earned);
  s = rig(s, { timeline: s.players[s.active].timeline, card: s.card, tokens: [5, 5, 2] });
  s = G.endTurn(G.reveal(G.place(s, 0)), { namedProver: true });
  assert.strictEqual(s.players[1].tokens, 5);
  assert.ok(!s.event.earned);
});

test('turns pass in order and a new card is drawn', () => {
  let s = start(); const deckSize = s.deck.length;
  s = G.endTurn(G.reveal(G.place(s, 0)));
  assert.strictEqual(s.active, 1); assert.strictEqual(s.turn, 2);
  assert.strictEqual(s.phase, 'place'); assert.strictEqual(s.deck.length, deckSize - 1);
  s = G.endTurn(G.reveal(G.place(s, 0)));
  s = G.endTurn(G.reveal(G.place(s, 0)));
  assert.strictEqual(s.active, 0);
});

test('buying a card costs tokens and places it correctly', () => {
  let s = rig(start(), { timeline: ['T001', 'T030'], card: 'T005', tokens: [3, 2, 2] });
  assert.throws(() => G.buyCard(s, 1), /needs 3 tokens/);
  s = G.buyCard(s, 0);
  assert.strictEqual(s.players[0].tokens, 0);
  const t = s.players[0].timeline;
  assert.strictEqual(t.length, 3);
  assert.deepStrictEqual(t.map(yearOf), t.map(yearOf).slice().sort((a, b) => a - b));
  assert.strictEqual(s.event.type, 'bought');
  assert.throws(() => G.buyCard(G.place(s, 0), 0), /before the current card/);
});

test('reaching the target ends the game', () => {
  let s = start({ settings: { target: 2 } });
  s = rig(s, { timeline: ['T001'], card: 'T005' });
  s = G.endTurn(G.reveal(G.place(s, 1)));
  assert.strictEqual(s.phase, 'over');
  assert.deepStrictEqual(s.winners, [0]);
  s = rig(start({ settings: { target: 2 } }), { timeline: ['T001'], card: 'T005', tokens: [2, 3, 2] });
  s = G.buyCard(s, 1);
  assert.strictEqual(s.phase, 'over');
  assert.deepStrictEqual(s.winners, [1]);
});

test('an empty deck ends the game; most cards wins, then most tokens', () => {
  let s = start();
  s.deck = []; s.players[0].timeline.push('T050'); s.players[0].tokens = 0;
  s.players[1].timeline.push('T051'); s.players[1].tokens = 3;
  s = G.endTurn(G.reveal(G.place(s, 0)));
  assert.strictEqual(s.phase, 'over');
  assert.deepStrictEqual(s.winners, [1]);
});

test('a whole random game always ends with consistent cards', () => {
  for (let seed = 1; seed <= 40; seed++) {
    let s = G.newGame({ cards, players: ['A', 'B', 'C', 'D'], seed, settings: { target: 6 } });
    const rand = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(seed);
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 500) {
      if (Math.random() < 0.1) { const buyer = s.players.findIndex(p => p.tokens >= 3); if (buyer >= 0 && s.deck.length) { s = G.buyCard(s, buyer); continue; } }
      s = G.place(s, Math.floor(rand() * (s.players[s.active].timeline.length + 1)));
      for (let i = 0; i < s.players.length; i++) {
        if (G.canChallenge(s, i) && rand() < 0.3) {
          const free = [...Array(s.players[s.active].timeline.length + 1).keys()]
            .filter(slot => slot !== s.placement && !s.challenges.some(c => c.slot === slot));
          if (free.length) s = G.challenge(s, i, free[Math.floor(rand() * free.length)]);
        }
      }
      s = G.endTurn(G.reveal(s), { namedProver: rand() < 0.4 });
    }
    assert.strictEqual(s.phase, 'over', `seed ${seed} did not finish`);
    const all = [...s.deck, ...s.discard, ...s.players.flatMap(p => p.timeline)];
    assert.strictEqual(all.length, 60, `seed ${seed} lost or duplicated cards`);
    assert.strictEqual(new Set(all).size, 60);
    for (const p of s.players) {
      const years = p.timeline.map(yearOf);
      assert.deepStrictEqual(years, years.slice().sort((a, b) => a - b), 'timelines stay in year order');
      assert.ok(p.tokens >= 0 && p.tokens <= 5);
    }
  }
});

test('the number of starting tokens can be chosen', () => {
  for (const n of [0, 1, 5]) {
    const s = start({ settings: { target: 5, startTokens: n } });
    assert.ok(s.players.every(p => p.tokens === n));
  }
  assert.throws(() => start({ settings: { target: 5, startTokens: 6 } }), /between 0 and 5/);
  assert.throws(() => start({ settings: { target: 5, startTokens: -1 } }), /between 0 and 5/);
});

test('with nameNeedsPlacement, a correct name earns a token only with a correct placement', () => {
  const ruled = { settings: { target: 5, nameNeedsPlacement: true } };
  let wrong = rig(start(ruled), { timeline: ['T001', 'T010'], card: 'T005', tokens: [2, 2, 2] });
  wrong = G.endTurn(G.reveal(G.place(wrong, 0)), { namedProver: true });
  assert.strictEqual(wrong.players[0].tokens, 2);
  assert.ok(!wrong.event.earned);
  assert.strictEqual(wrong.event.blocked, 'placement');
  let right = rig(start(ruled), { timeline: ['T001', 'T010'], card: 'T005', tokens: [2, 2, 2] });
  right = G.endTurn(G.reveal(G.place(right, 1)), { namedProver: true });
  assert.strictEqual(right.players[0].tokens, 3);
  assert.ok(right.event.earned);
  // Without the rule, a wrong placement still earns the token.
  let open = rig(start(), { timeline: ['T001', 'T010'], card: 'T005', tokens: [2, 2, 2] });
  open = G.endTurn(G.reveal(G.place(open, 0)), { namedProver: true });
  assert.strictEqual(open.players[0].tokens, 3);
  // At the maximum, the reason is the cap.
  let full = rig(start(ruled), { timeline: ['T001', 'T010'], card: 'T005', tokens: [5, 2, 2] });
  full = G.endTurn(G.reveal(G.place(full, 1)), { namedProver: true });
  assert.strictEqual(full.event.blocked, 'max');
});

if (!process.exitCode) console.log(`PASS: ${passed} game rule tests.`);
