/*
 * Theorem Timeline: rules engine.
 * Pure logic with no DOM access. Every action takes a state and returns a new
 * state (the input is never modified), so the UI can keep an undo history and
 * save games as JSON. Works in the browser (window.TimelineGame) and in Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimelineGame = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = { target: 10, startTokens: 2, maxTokens: 5, cardCost: 3 };
  const MIN_PLAYERS = 2, MAX_PLAYERS = 6;

  function fail(message) { throw new Error(message); }
  function copy(state) { return JSON.parse(JSON.stringify(state)); }

  // Small seeded random generator, so a game can be replayed in tests.
  function random(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, rand) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Cards needed so that every player can reach the target with room to spare. */
  function cardsNeeded(playerCount, target) { return playerCount * (target + 2) + 4; }

  /**
   * Start a game.
   * cards: [{ id, year }, ...]   players: ['Ada', 'Ben', ...]
   */
  function newGame({ cards, players, settings = {}, seed = Date.now() }) {
    const options = Object.assign({}, DEFAULTS, settings);
    const names = (players || []).map(name => String(name).trim()).filter(Boolean);
    if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) fail(`A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players.`);
    if (new Set(names.map(n => n.toLowerCase())).size !== names.length) fail('Each player needs a different name.');
    if (!Number.isInteger(options.target) || options.target < 2) fail('Cards to win must be at least 2.');
    const years = {};
    for (const card of cards || []) {
      if (!card || typeof card.id !== 'string' || !Number.isFinite(card.year)) fail('Every card needs an id and a numeric year.');
      if (card.id in years) fail(`Duplicate card id ${card.id}.`);
      years[card.id] = card.year;
    }
    const needed = cardsNeeded(names.length, options.target);
    if (Object.keys(years).length < needed) fail(`This game needs at least ${needed} cards.`);

    const deck = shuffle(Object.keys(years), random(seed));
    const state = {
      version: 1,
      settings: options,
      years,
      players: names.map(name => ({ name, timeline: [deck.pop()], tokens: options.startTokens })),
      deck,
      discard: [],
      turn: 1,
      active: 0,
      phase: 'place',
      card: deck.pop(),
      placement: null,
      challenges: [],
      result: null,
      event: null,
      winners: []
    };
    return state;
  }

  /** True when card `id` fits in gap `slot` of `timeline` (equal years fit on either side). */
  function fits(state, timeline, slot, id) {
    const year = state.years[id];
    const before = timeline[slot - 1], after = timeline[slot];
    return (before === undefined || state.years[before] <= year) &&
           (after === undefined || year <= state.years[after]);
  }
  function correctSlots(state, timeline, id) {
    const slots = [];
    for (let slot = 0; slot <= timeline.length; slot++) if (fits(state, timeline, slot, id)) slots.push(slot);
    return slots;
  }
  function insertSorted(state, timeline, id) {
    const year = state.years[id];
    let index = timeline.findIndex(other => state.years[other] > year);
    if (index < 0) index = timeline.length;
    timeline.splice(index, 0, id);
    return index;
  }
  function checkSlot(state, slot) {
    const size = state.players[state.active].timeline.length;
    if (!Number.isInteger(slot) || slot < 0 || slot > size) fail('That is not a gap in the timeline.');
  }
  function reachedTarget(state) {
    return state.players.map((p, i) => i).filter(i => state.players[i].timeline.length >= state.settings.target);
  }

  /** The active player puts the current card in a gap of their own timeline. */
  function place(state, slot) {
    if (state.phase !== 'place') fail('Cards can only be placed at the start of a turn.');
    checkSlot(state, slot);
    const next = copy(state);
    next.placement = slot;
    next.phase = 'challenge';
    next.event = null;
    return next;
  }

  /** Another player spends a token to bet on a different gap in the active player's timeline. */
  function challenge(state, playerIndex, slot) {
    if (state.phase !== 'challenge') fail('Challenges happen after the card is placed and before it is revealed.');
    const player = state.players[playerIndex];
    if (!player) fail('Unknown player.');
    if (playerIndex === state.active) fail('Players cannot challenge their own placement.');
    if (player.tokens < 1) fail(`${player.name} has no tokens left to challenge with.`);
    if (state.challenges.some(c => c.player === playerIndex)) fail(`${player.name} has already challenged this card.`);
    checkSlot(state, slot);
    if (slot === state.placement) fail(`That is where ${state.players[state.active].name} put the card.`);
    if (state.challenges.some(c => c.slot === slot)) fail('Another player already chose that gap.');
    const next = copy(state);
    next.players[playerIndex].tokens -= 1;
    next.challenges.push({ player: playerIndex, slot });
    return next;
  }

  /** Flip the card: decide who (if anyone) gets it. */
  function reveal(state) {
    if (state.phase !== 'challenge') fail('Place the card before revealing it.');
    const next = copy(state);
    const id = next.card, active = next.players[next.active];
    const slots = correctSlots(next, active.timeline, id);
    const activeCorrect = slots.includes(next.placement);
    let winner = null;
    if (activeCorrect) winner = next.active;
    else {
      const right = next.challenges.find(c => slots.includes(c.slot));
      if (right) winner = right.player;
    }
    if (winner === null) next.discard.push(id);
    else insertSorted(next, next.players[winner].timeline, id);
    next.result = { card: id, placement: next.placement, correctSlots: slots, activeCorrect, winner, challenges: next.challenges };
    next.phase = 'reveal';
    return next;
  }

  function drawNext(next) {
    const winners = reachedTarget(next);
    if (winners.length) { next.phase = 'over'; next.winners = winners; next.card = null; return next; }
    if (!next.deck.length) {
      // Out of cards: most cards wins, then most tokens; ties share the win.
      const score = p => p.timeline.length * 100 + p.tokens;
      const best = Math.max(...next.players.map(score));
      next.winners = next.players.map((p, i) => i).filter(i => score(next.players[i]) === best);
      next.phase = 'over'; next.card = null; return next;
    }
    next.active = (next.active + 1) % next.players.length;
    next.turn += 1;
    next.card = next.deck.pop();
    next.placement = null; next.challenges = []; next.result = null;
    next.phase = 'place';
    return next;
  }

  /** Finish the turn. namedProver: did the active player name the prover before the reveal? */
  function endTurn(state, { namedProver = false } = {}) {
    if (state.phase !== 'reveal') fail('Reveal the card before ending the turn.');
    const next = copy(state);
    const active = next.players[next.active];
    const earned = namedProver && active.tokens < next.settings.maxTokens;
    if (earned) active.tokens += 1;
    next.event = { type: 'turn', player: next.active, card: next.result.card, namedProver: !!namedProver, earned };
    return drawNext(next);
  }

  /** Any player may trade tokens for a card from the deck, placed correctly, before a card is placed. */
  function buyCard(state, playerIndex) {
    if (state.phase !== 'place') fail('Cards can only be bought before the current card is placed.');
    const player = state.players[playerIndex];
    if (!player) fail('Unknown player.');
    if (player.tokens < state.settings.cardCost) fail(`${player.name} needs ${state.settings.cardCost} tokens to buy a card.`);
    if (!state.deck.length) fail('The deck is empty.');
    const next = copy(state);
    const buyer = next.players[playerIndex];
    buyer.tokens -= next.settings.cardCost;
    const id = next.deck.pop();
    insertSorted(next, buyer.timeline, id);
    next.event = { type: 'bought', player: playerIndex, card: id };
    const winners = reachedTarget(next);
    if (winners.length) {
      // The card waiting to be placed goes back on the deck unseen.
      next.deck.push(next.card);
      next.phase = 'over'; next.winners = winners; next.card = null;
    }
    return next;
  }

  /** Who could still challenge right now (has a token, is not the active player, has not challenged yet). */
  function canChallenge(state, playerIndex) {
    return state.phase === 'challenge' && playerIndex !== state.active &&
      state.players[playerIndex].tokens > 0 && !state.challenges.some(c => c.player === playerIndex);
  }

  return { DEFAULTS, MIN_PLAYERS, MAX_PLAYERS, cardsNeeded, newGame, place, challenge, reveal, endTurn, buyCard, canChallenge, correctSlots, fits };
});
