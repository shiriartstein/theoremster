/* Theorem Timeline: every card, front and back, for checking the deck. */
(function () {
  'use strict';
  const M = window.TimelineMath;
  const D = window.TimelineDecks;
  const CARDS = window.THEOREM_CARDS || [];
  const list = document.getElementById('cards'), count = document.getElementById('count');
  const controls = ['search', 'level', 'status', 'kind'].map(id => document.getElementById(id));
  const preset = Object.assign({course:'all',topic:'all'},D.fromQuery(location.search, CARDS));
  document.getElementById('deck-picker').append(D.picker(preset,CARDS,filter,'gallery-deck'));
  if (preset.level) document.getElementById('level').value=preset.level;
  if (preset.verifiedOnly) document.getElementById('status').value = 'verified';
  const fold = text => M.plain(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const join = items => items.length < 2 ? (items[0] || '') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];

  function el(tag, cls, ...children) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
    return node;
  }
  function cardItem(c) {
    const front = el('article', 'index-card gallery-face front', el('p', 'card-area', c.area), el('p', 'statement', M.render(c.statement)));
    const back = el('article', 'index-card gallery-face back',
      el('p', 'year', c.shown), el('p', 'theorem-name', M.render(c.name)),
      c.yearKind ? el('p', 'note', c.yearKind) : null,
      el('p', 'prover', 'Credited to ', el('strong', '', join(c.provers))),
      c.note ? el('p', 'note', c.twist ? el('span', 'twist', 'Twist') : null, M.render(c.note)) : null);
    const meta = el('p', 'gallery-meta',
      el('span', 'tag', c.id), el('span', 'tag', `Row ${c.row}`),
      el('span', 'tag' + (c.verified ? ' ok' : ''), c.verified ? 'Verified' : 'Not verified yet'),
      el('span', 'tag', c.level),
      el('span', 'tag', (c.courses || []).map(D.courseLabel).join(' / ') || 'General collection'));
    const item = el('li', 'gallery-item', meta, el('div', 'gallery-pair', front, back));
    item.dataset.search = fold([c.id, c.name, c.statement, c.provers.join(' '), c.shown, String(c.year), ...D.topicTags(c), c.note].join(' '));
    item.dataset.level = c.level; item.dataset.verified = c.verified ? 'yes' : 'no';
    item.dataset.twist = c.twist ? 'yes' : 'no'; item.dataset.math = /\$/.test(c.statement + c.name) ? 'yes' : 'no';
    return item;
  }
  const items = CARDS.map(cardItem);
  list.append(...items);

  function filter() {
    const [search, level, status, kind] = controls.map(c => c.value);
    const words = fold(search).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const [i, item] of items.entries()) {
      const ok = words.every(w => item.dataset.search.includes(w)) &&
        D.matches(CARDS[i], {...preset,level,verifiedOnly:false}) &&
        (status === 'all' || (status === 'verified') === (item.dataset.verified === 'yes')) &&
        (kind === 'all' || item.dataset[kind] === 'yes');
      item.hidden = !ok;
      if (ok) shown++;
    }
    const verified = CARDS.filter(c => c.verified).length;
    count.textContent = `Showing ${shown} of ${CARDS.length} cards. ${D.description(preset)}. ${verified} verified so far.`;
    const query = D.query({...preset,level,verifiedOnly:status==='verified'});
    document.getElementById('play-deck').href = `index.html?${query}`;
  }
  controls.forEach(c => c.addEventListener('input', filter));
  filter();
})();
