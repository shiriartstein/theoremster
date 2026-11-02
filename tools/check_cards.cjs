#!/usr/bin/env node
// Checks every formula on every card with KaTeX, so a LaTeX mistake in the
// spreadsheet stops the build with the row number instead of reaching the game.
// Run after tools/build_cards.py:  node tools/check_cards.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const katex = require('../site/vendor/katex/katex.min.js');
const { split } = require('../site/math.js');

const source = fs.readFileSync(path.join(__dirname, '../site/cards.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const cards = sandbox.window.THEOREM_CARDS || [];
const FIELDS = { statement: 'Card front (statement)', name: 'Theorem', note: 'Notes / twist' };

const problems = [];
let formulas = 0;
for (const card of cards) {
  for (const [field, column] of Object.entries(FIELDS)) {
    let parts;
    try { parts = split(card[field]); }
    catch (error) { problems.push(`Row ${card.row} (${card.id}), "${column}": ${error.message}`); continue; }
    for (const part of parts.filter(p => p.math)) {
      formulas++;
      try { katex.renderToString(part.tex, { displayMode: part.display, throwOnError: true, strict: 'ignore' }); }
      catch (error) {
        const message = String(error.message).replace(/^KaTeX parse error:\s*/, '');
        problems.push(`Row ${card.row} (${card.id}), "${column}": LaTeX error in $${part.tex}$: ${message}`);
      }
    }
  }
}
if (problems.length) {
  console.error('Fix these cells in data/theorems.xlsx:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`All ${formulas} formulas on ${cards.length} cards typeset correctly.`);
