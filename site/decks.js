/* Shared selection rules and accessible course/topic picker. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimelineDecks = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const courses = [['calc1','Calc 1'],['calc2','Calc 2'],['calc3','Calc 3'],['ode','ODE'],['lin1','Linear Algebra 1'],['lin2','Linear Algebra 2']];
  const legacy = {calc1:['calc1'],calc2:['calc2'],calc3:['calc3'],ode:['ode'],lin1:['lin1'],lin2:['lin2'],calc12:['calc1','calc2'],calc123:['calc1','calc2','calc3']};
  const valid = ids => courses.map(([id])=>id).filter(id=>ids.includes(id));
  function selected(options = {}) {
    if (!options.course || options.course === 'all') return null;
    return options.course === 'custom' ? valid(options.courseIds || []) : (legacy[options.course] || []);
  }
  const topicTags = card => [...new Set([card.area, ...(card.topics || [])].filter(Boolean))];
  const topics = cards => [...new Set(cards.flatMap(topicTags))].sort((a,b)=>a.localeCompare(b));
  function matches(card, options = {}) {
    const ids = selected(options), {topic='all',level='all',verifiedOnly=false} = options;
    return (ids === null || ids.some(id=>(card.courses || []).includes(id))) &&
      (topic === 'all' || topicTags(card).includes(topic)) &&
      (level === 'all' || card.level === level) && (!verifiedOnly || card.verified);
  }
  const filter = (cards, options) => cards.filter(card=>matches(card,options));
  function fromQuery(search, cards) {
    const p = new URLSearchParams(search), out = {};
    if (p.has('courses')) {out.course='custom'; out.courseIds=valid(p.get('courses').split(','));}
    else if (p.get('course') === 'all' || legacy[p.get('course')]) out.course=p.get('course');
    else if (p.has('course')) {out.course='custom'; out.courseIds=[];}
    if (p.get('topic') === 'all' || topics(cards).includes(p.get('topic'))) out.topic=p.get('topic');
    if (['all','Undergraduate','Famous'].includes(p.get('level'))) out.level=p.get('level');
    if (['yes','no'].includes(p.get('verified'))) out.verifiedOnly=p.get('verified')==='yes';
    return out;
  }
  function query(options) {
    const ids=selected(options), p=new URLSearchParams({topic:options.topic||'all',level:options.level||'all',verified:options.verifiedOnly?'yes':'no'});
    if (ids===null) p.set('course','all'); else p.set('courses',ids.join(','));
    return p.toString();
  }
  const courseLabel = id => (courses.find(([key])=>key===id)||[id,id])[1];
  function description(options) {
    const ids=selected(options);
    return `${ids===null?'General collection':ids.length?ids.map(courseLabel).join(' + '):'No courses selected'}; ${!options.topic||options.topic==='all'?'all topics':options.topic}`;
  }
  function picker(options, cards, changed, prefix='deck') {
    const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    const box=el('details');box.className='deck-picker';
    const summary=el('summary','Choose topics and courses');summary.className='btn';box.append(summary);
    const fields=el('div');fields.className='deck-picker-fields';box.append(fields);
    const group=el('fieldset'), legend=el('legend','Courses');group.append(legend);fields.append(group);
    const help=el('p','Choose one or more courses. A card from any selected course is included once.');help.className='panel-text';group.append(help);
    const available=courses.filter(([id])=>id.startsWith('calc')||cards.some(c=>(c.courses||[]).includes(id)));
    const checks=[];
    for (const [id,label] of [['all','All cards / general collection'],...available]) {
      const wrap=el('label'), input=el('input');wrap.className='check';input.type='checkbox';input.id=`${prefix}-${id}`;
      input.addEventListener('change',()=>{
        if(id==='all') {options.course=input.checked?'all':'custom';options.courseIds=[];}
        else {const ids=selected(options)||[];options.course='custom';options.courseIds=input.checked?valid([...ids,id]):ids.filter(x=>x!==id);}
        sync();changed();
      });
      wrap.append(input,el('span',label));group.append(wrap);checks.push([id,input]);
    }
    function sync() {const ids=selected(options);for(const [id,input] of checks)input.checked=id==='all'?ids===null:!!ids&&ids.includes(id);}
    sync();
    const field=el('div');field.className='field';const label=el('label','Topic');label.htmlFor=`${prefix}-topic`;
    const select=el('select');select.id=`${prefix}-topic`;
    for(const t of ['all',...topics(cards)])select.add(new Option(t==='all'?'All topics':t,t));
    select.value=options.topic||'all';select.addEventListener('change',()=>{options.topic=select.value;changed();});
    field.append(label,select);fields.append(field);
    return box;
  }
  return {courses,selected,topicTags,topics,matches,filter,fromQuery,query,description,picker,courseLabel};
});
