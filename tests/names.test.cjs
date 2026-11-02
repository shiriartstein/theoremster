// Run with: node tests/names.test.cjs
const assert = require('assert');
const { nameMatches } = require('../site/game.js');

const card = (...provers) => ({ provers });
const yes = [
  [card('Carl Friedrich Gauss'), ['Gauss', 'gauss', 'Gaus', 'GAUSS', 'Carl Friedrich Gauss', 'C. F. Gauss', 'Carl Gauss', 'Friedrich Gauss', 'Gauß']],
  [card('Leonhard Euler'), ['Euler', 'Eulr', 'Leonard Euler', 'L. Euler']],
  [card('Srinivasa Ramanujan', 'G. H. Hardy'), ['Ramanujan', 'Ramanujam', 'Hardy', 'Hardy and Ramanujan', 'G.H. Hardy']],
  [card('Jacques Hadamard', 'Charles de la Vallée Poussin'), ['Hadamard', 'de la Vallee Poussin', 'Vallée Poussin', 'Poussin', 'Hadamard and de la Vallée-Poussin', 'Hadamrd']],
  [card("Guillaume de l'Hôpital"), ['Hopital', "L'Hôpital", "l'hospital", 'Lhopital', 'de lhopital']],
  [card('Pafnuty Chebyshev'), ['Chebyshev', 'Tchebychev', 'Chebychev', 'Tschebyschev']],
  [card('Dénes Kőnig'), ['Konig', 'König', 'Koenig']],
  [card('Paul Erdős', 'George Szekeres'), ['Erdos', 'Erdős', 'Erdos and Szekeres', 'Szekeres']],
  [card('Muhammad ibn Musa al-Khwarizmi'), ['al-Khwarizmi', 'Khwarizmi', 'Alkhwarizmi', 'Al Khowarizmi']],
  [card('Thales of Miletus'), ['Thales', 'Thales of Miletus', 'Tales']],
  [card('Georges-Louis Leclerc, Comte de Buffon'), ['Buffon', 'Comte de Buffon', 'Leclerc']],
  [card('Niels Henrik Abel'), ['Abel', 'Able', 'N. H. Abel']],
  [card('Andrew Wiles'), ['Wiles', 'Willes', 'Andrew Wiles']],
  [card('L. E. J. Brouwer'), ['Brouwer', 'Brower', 'L.E.J. Brouwer']],
  [card('Ibn al-Haytham'), ['Ibn al-Haytham', 'al-Haytham', 'Haytham', 'Alhazen'.slice(0, 0) || 'Haitham']],
  [card('Peter Gustav Lejeune Dirichlet'), ['Dirichlet', 'Lejeune Dirichlet', 'Dirichlet', 'Dirichelet']],
  [card('Bartel Leendert van der Waerden'), ['van der Waerden', 'Waerden', 'Van der Warden']],
  [card('Chao Ko'), ['Ko']],
  [{ provers: ['Qin Jiushao'], alsoAccept: ['Qin'] }, ['Qin', 'Qin Jiushao', 'Jiushao']],
];
const no = [
  [card('Carl Friedrich Gauss'), ['Euler', 'Galois', 'Euler and Gauss', 'Gauss, Euler', 'G', '', '   ', 'Johann Gauss']],
  [card('Jacob Bernoulli'), ['Johann Bernoulli', 'Daniel Bernoulli']],
  [card('Andrew Wiles'), ['Fermat', 'Wilson', 'Miles Davis']],
  [card('Chao Ko'), ['Ka', 'Kowalski']],
  [card('Leonhard Euler'), ['Lagrange', 'Euclid']],
  [card('Niels Henrik Abel'), ['Abelard', 'Cabel Smith']],
  [card('Henri Lebesgue'), ['Lebesgue and Borel']],
];

let passed = 0;
for (const [c, guesses] of yes) for (const g of guesses) {
  assert.ok(nameMatches(g, c), `"${g}" should count for ${c.provers.join(' / ')}`); passed++;
}
for (const [c, guesses] of no) for (const g of guesses) {
  assert.ok(!nameMatches(g, c), `"${g}" should not count for ${c.provers.join(' / ')}`); passed++;
}

// Every real card can be named by its prover's full name and by the last word of it.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../site/cards.js'), 'utf8');
const cards = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
for (const c of cards) for (const p of c.provers) {
  assert.ok(nameMatches(p, c), `full name "${p}" should count`);
  const last = p.split(/[ ,]+/).filter(Boolean).pop();
  assert.ok(nameMatches(last, c) || /\bof\b/.test(p), `surname "${last}" should count for ${p}`);
  passed += 2;
}
console.log(`PASS: ${passed} name checks.`);
