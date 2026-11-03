const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const D = require('../site/decks.js');
const G = require('../site/game.js');
const sample = [
  {id:'a', courses:['calc1'], topics:['Limits'], area:'Analysis', level:'Undergraduate', verified:true},
  {id:'b', courses:['calc2','calc3'], area:'Analysis', level:'Undergraduate', verified:false},
  {id:'c', courses:['calc3'], area:'Geometry', level:'Undergraduate', verified:true},
  {id:'d', area:'Analysis', level:'Famous', verified:true}
];
const ids = opts => D.filter(sample, opts).map(c => c.id);
assert.deepEqual(ids({}), ['a','b','c','d']);
assert.deepEqual(ids({course:'calc1'}), ['a']);
assert.deepEqual(ids({course:'calc12'}), ['a','b']);
assert.deepEqual(ids({course:'calc123'}), ['a','b','c']);
assert.deepEqual(ids({course:'calc123',topic:'Analysis',verifiedOnly:true}), ['a']);
assert.deepEqual(ids({course:'calc1',topic:'Geometry'}), []);
assert.deepEqual(ids({course:'calc1',level:'Famous'}), []);
assert.deepEqual(ids({course:'typo'}), []);
assert.deepEqual(D.fromQuery('?course=typo&topic=missing&level=bogus',sample), {course:'custom',courseIds:[]});
assert.deepEqual(ids({course:'custom',courseIds:['calc2']}), ['b']);
assert.deepEqual(ids({course:'custom',courseIds:['calc1','calc3']}), ['a','b','c']);
assert.deepEqual(ids({course:'custom',courseIds:['calc2','calc3']}), ['b','c']);
assert.deepEqual(ids({course:'custom',courseIds:[]}), []);
assert.deepEqual(ids({course:'calc1',topic:'Limits'}), ['a']);
assert.deepEqual(D.fromQuery('?courses=lin2,ode,lin1,lin2&topic=all',sample), {course:'custom',courseIds:['ode','lin1','lin2'],topic:'all'});
assert.deepEqual(D.fromQuery('?courses=',sample), {course:'custom',courseIds:[]});
assert.deepEqual(D.fromQuery('?course=calc123',sample), {course:'calc123'});
const options={course:'custom',courseIds:['calc1','calc2'],topic:'Analysis',level:'Undergraduate',verifiedOnly:true};
assert.deepEqual(D.fromQuery('?'+D.query(options),sample),options);
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../site/cards.js'),'utf8'),ctx);
const cards=ctx.window.THEOREM_CARDS;
const sets=['calc1','calc12','calc123'].map(course=>D.filter(cards,{course}));
for(let i=1;i<sets.length;i++) {
  const included=new Set(sets[i].map(c=>c.id));
  assert(sets[i-1].every(c=>included.has(c.id)),'Course decks must be cumulative');
}
for (const deck of sets) {
  if (deck.length < G.cardsNeeded(2,3)) continue;
  const selected=new Set(deck.map(c=>c.id));
  const game=G.newGame({cards:deck.map(({id,year})=>({id,year})),players:['A','B'],settings:{target:3},seed:123});
  assert(Object.keys(game.years).every(id=>selected.has(id)),'Game contains only filtered cards');
}
console.log(`Deck tests passed: ${sets.map(s=>s.length).join(' / ')} course cards.`);
assert.equal(new Set(cards.map(c=>c.id)).size,cards.length,'IDs are unique');
assert(D.filter(cards,{course:'calc3',topic:'Multivariable integration'}).some(c=>c.id==='T149'),'Fubini is included in Calc 3');
for(const course of ['calc1','calc2','calc3','ode','lin1','lin2']) {
 const deck=D.filter(cards,{course:'custom',courseIds:[course]});
 assert(deck.length>=G.cardsNeeded(2,2),`${course} supports a short game`);
 const game=G.newGame({cards:deck,players:['A','B'],settings:{target:2},seed:1});
 assert.equal(Object.keys(game.years).length,deck.length);
}
