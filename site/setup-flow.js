/* Pure validation for the guided setup, shared by the UI and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimelineSetup = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const targets = [2, 3, 4, 5, 6, 8, 10, 12, 15];
  const clean = name => String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  const playerCount = o => o.playMode === 'online' ? Number(o.onlinePlayers || 2) : o.names.length;
  const maximum = (o, count) => Math.floor((count - 2) / playerCount(o));
  const suggestedTarget = (o, count) => targets.filter(n => n <= maximum(o, count)).pop() || null;
  function problems(o, count, step) {
    const errors = [], names = (o.names || []).map(clean), players = playerCount(o);
    if (step === 1 || step === 4) {
      if (o.playMode === 'online') {
        if (!clean(o.onlineName)) errors.push('What should we call you? Add your name to continue.');
      } else {
        if (names.some(n => !n)) errors.push('Add a name for each player.');
        if (new Set(names.map(n => n.toLocaleLowerCase())).size !== names.length) errors.push('Use a different name for each player so we can tell you apart.');
      }
      if (!Number.isInteger(players) || players < 2 || players > 6) errors.push('Choose between 2 and 6 players.');
    }
    if (step >= 2) {
      if (o.course === 'custom' && !(o.courseIds || []).length) errors.push('Choose a course, or include the whole collection.');
      else if (!count) errors.push('No cards match these choices yet. Try another topic or clear the extra filters.');
      else if (count < players * 2 + 2) errors.push(`These ${count} cards are too few for ${players} players. Include more material or go back and choose fewer players.`);
    }
    if (step >= 3 && count >= players * 2 + 2) {
      if (!targets.includes(o.target)) errors.push('Choose a goal from the list.');
      else if (o.target > maximum(o, count)) errors.push(`For this deck, choose a goal of at most ${maximum(o, count)} cards, or go back and include more material.`);
    }
    return errors;
  }
  return { targets, clean, playerCount, maximum, suggestedTarget, problems };
});
