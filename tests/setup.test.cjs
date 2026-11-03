const assert = require('node:assert/strict');
const S = require('../site/setup-flow.js');
const local = {names:['Ada','Emmy'],playMode:'local',target:5,course:'all'};
assert.deepEqual(S.problems(local,284,4), []);
assert.ok(S.problems({...local,names:['Ada',' ada ']},284,1).some(e=>e.includes('different name')));
assert.ok(S.problems({...local,names:['','Emmy']},284,1).some(e=>e.includes('Add a name')));
assert.equal(S.clean('  Ada   Lovelace  '),'Ada Lovelace');
const online = {...local,playMode:'online',onlineName:'Shiri',onlinePlayers:6};
assert.equal(S.playerCount(online),6);
assert.ok(S.problems({...online,onlineName:' '},284,1).length);
assert.ok(S.problems({...online,onlinePlayers:7},284,1).length);
assert.deepEqual(S.problems({...local,names:['',''],playMode:'online',onlineName:'Host'},284,4),[]);
assert.deepEqual(S.problems({...local,target:2},6,4),[]); // smallest playable course deck
assert.equal(S.suggestedTarget(local,6),2);
assert.equal(S.suggestedTarget(local,11),4);
assert.equal(S.suggestedTarget(online,11),null);
assert.ok(S.problems(online,11,2).some(e=>e.includes('too few')));
assert.ok(S.problems({...local,course:'custom',courseIds:[]},0,2).some(e=>e.includes('Choose a course')));
assert.ok(S.problems(local,0,2).some(e=>e.includes('No cards')));
assert.ok(S.problems(local,6,3).some(e=>e.includes('at most 2')));
assert.deepEqual(S.problems(local,6,2),[]); // target is fitted only on the next question
assert.ok(S.problems({...local,target:NaN},284,4).length);
assert.ok(S.problems({...local,target:7},284,4).length);
console.log('Guided setup: validation, online player counts, course minimums and target suggestions passed.');
