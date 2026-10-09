import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState, emptyState, mergeStates, validateState, put, records, dailyTasks, taskLimit, makeBackup, readBackup, dayDifference, addDays, rolloverCandidates, saveGoal, goalHistory, goalProgress, activeGoals, carryTask, executionDays, planWindow, planDayProgress, parkedTasks, focusParked} from '../core.js';
import {importFile, recoverOriginal} from '../migration.js';

test('defaults have exactly three concrete priorities and three outcomes',()=>{const s=initialState('2026-10-08');assert.equal(dailyTasks(s,'2026-10-08').length,3);assert.equal(records(s,'goals').length,3);assert.ok(records(s,'tasks').every(t=>t.action.length>20));assert.ok(records(s,'notes').some(n=>n.category==='Communication & logic'));});
test('backup round trip preserves all data and timestamps',()=>{const s=initialState();put(s,'captures','a',{text:'A personal thought',date:'2026-10-08',archived:false},'phone',1);assert.deepEqual(readBackup(JSON.stringify(makeBackup(s))),s);});
test('merges independent phone and laptop offline edits',()=>{const a=initialState(),b=initialState();put(a,'captures','phone',{text:'Site risk',date:'2026-10-08',archived:false},'phone',100);put(b,'captures','laptop',{text:'Data issue',date:'2026-10-08',archived:false},'laptop',101);const merged=mergeStates(a,b);assert.equal(records(merged,'captures').length,2);assert.deepEqual(mergeStates(a,b),mergeStates(b,a));assert.deepEqual(mergeStates(merged,merged),merged);});
test('same record conflicts resolve deterministically and retain the latest edit',()=>{const a=emptyState(),b=emptyState();put(a,'captures','id',{text:'old'},'a',100);put(b,'captures','id',{text:'new'},'b',200);assert.equal(mergeStates(a,b).captures.id.text,'new');put(a,'captures','id',{text:'tie'},'z',200);assert.equal(mergeStates(a,b).captures.id.text,'tie');});
test('tombstones do not resurrect deleted records on sync',()=>{const a=emptyState(),b=emptyState();put(a,'captures','id',{text:'private thought'},'a',10);b.captures=structuredClone(a.captures);put(b,'captures','id',{deleted:true},'b',20);assert.equal(records(mergeStates(a,b),'captures').length,0);});
test('logical clock moves forward even after local clock goes backward',()=>{const s=emptyState();put(s,'captures','a',{text:'a'},'phone',500);put(s,'captures','b',{text:'b'},'phone',5);assert.equal(s.captures.b.updatedAt,501);});
test('missed days stay parked without automatic rollover',()=>{const s=initialState('2026-09-01');assert.equal(dailyTasks(s,'2026-10-08').length,0);assert.equal(rolloverCandidates(s,'2026-10-08').length,3);assert.equal(s.tasks['starter-bauer'].date,'2026-09-01');});
test('low energy and maintenance reduce the limit without destroying tasks',()=>{const s=initialState();put(s,'settings','mode',{value:'low'},'phone');assert.equal(taskLimit(s),1);assert.equal(records(s,'tasks').length,3);put(s,'settings','mode',{value:'maintenance'},'phone');assert.equal(taskLimit(s),1);});
test('calendar date arithmetic handles month, year and daylight boundaries',()=>{assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(dayDifference('2026-11-01','2026-10-08'),24);assert.equal(addDays('2026-10-08',89),'2027-01-05');});
test('malformed backups, future schemas, invalid outcomes and unsafe ids fail',()=>{assert.throws(()=>readBackup('{}'));assert.throws(()=>validateState({...emptyState(),schemaVersion:2}));const s=initialState();s.goals.bauer.progress=101;assert.throws(()=>validateState(s));const bad=JSON.parse('{"schemaVersion":1,"tasks":{},"captures":{"__proto__":{"id":"__proto__","text":"x","updatedAt":0,"device":"x"}},"notes":{},"goals":{},"reviews":{},"checkins":{},"settings":{},"legacy":{}}');assert.throws(()=>validateState(bad));});
test('portable and candidate imports retain ALL legacy fields and unknown categories',()=>{
 const original={tasks:[{id:'x',title:'Real work',done:false,date:'2026-10-01',due:'2026-10-02',attachment:{url:'https://example.com'},doneDates:['2026-09-30']}],habits:[{id:'habit',title:'Sleep',doneDates:['2026-10-01']}],goals:[{id:'goal',title:'Original ambition',special:123}],finance:[{id:'budget',title:'Budget',amount:42}],custom:{nested:['kept']},settings:{why1:'Freedom',lowEnergy:true,militaryDate:'2027-02-01'}};
 const restored=importFile(JSON.stringify(original),'test');const source=Object.values(restored.legacy).find(x=>x.source).source;
 assert.deepEqual(recoverOriginal(restored,source),original);assert.equal(restored.settings.plan.why1,'Freedom');assert.equal(restored.settings.mode.value,'low');assert.equal(records(restored,'tasks')[0].date,'2026-10-01');assert.ok(records(restored,'legacy').some(x=>x.category==='habits'));assert.deepEqual(readBackup(JSON.stringify(makeBackup(restored))),restored);
});
test('reimport uses stable identities instead of multiplying legacy items',()=>{const raw=JSON.stringify({tasks:[{id:'1',title:'Deliverable',date:'2026-10-08'}],thoughts:[{id:'2',title:'Idea'}]});const a=importFile(raw,'a'),b=importFile(raw,'b');assert.equal(records(mergeStates(a,b),'tasks').length,1);assert.equal(records(mergeStates(a,b),'captures').length,1);});
test('bad legacy imports are rejected rather than silently losing a category',()=>{assert.throws(()=>importFile(JSON.stringify({tasks:[],habits:'broken'})));assert.throws(()=>importFile(JSON.stringify({tasks:[null]})));});
test('complete legacy source can be reconstructed across multiple chunks',()=>{const original={tasks:[],custom:'z'.repeat(200000)};const s=importFile(JSON.stringify(original));const source=Object.values(s.legacy).find(x=>x.source).source;assert.deepEqual(recoverOriginal(s,source),original);});

test('goal lifecycle retains old and concurrent versions, targets and linked actions',()=>{
 const s=initialState('2026-10-09'), original=structuredClone(s.goals.bauer);
 saveGoal(s,'bauer',{title:'Site controls',tracking:'target',target:8,current:2,status:'paused'},'laptop',1000);
 assert.equal(goalProgress(s.goals.bauer),25);assert.equal(activeGoals(s).length,2);assert.equal(goalHistory(s,'bauer').length,2);
 const a=structuredClone(s),b=structuredClone(s);saveGoal(a,'bauer',{current:4,status:'active'},'phone',2000);saveGoal(b,'bauer',{outcome:'Revised outcome'},'laptop',2001);
 const merged=mergeStates(a,b);assert.equal(goalHistory(merged,'bauer').length,4);assert.ok(goalHistory(merged,'bauer').some(g=>g.current===4));assert.ok(goalHistory(merged,'bauer').some(g=>g.title===original.title));
 saveGoal(merged,'bauer',{deleted:true,status:'deleted'},'phone',3000);assert.equal(records(merged,'goals').length,2);assert.ok(merged.tasks['starter-bauer']);assert.equal(goalHistory(merged,'bauer').length,5);assert.deepEqual(readBackup(JSON.stringify(makeBackup(merged))),merged);
});
test('milestone progress uses checked nonempty milestones and validates target values',()=>{
 const s=initialState();saveGoal(s,'bauer',{tracking:'milestones',month1:'Register',month1Done:true,month2:'Report',month2Done:false,month3:'',month3Done:true},'phone');assert.equal(goalProgress(s.goals.bauer),50);
 s.goals.bauer.target=-1;assert.throws(()=>validateState(s));
});
test('carrying an action keeps its original date and prevents duplicate destinations',()=>{
 const s=initialState('2026-09-01'), carried=carryTask(s,'starter-bauer','2026-10-09','phone');assert.equal(s.tasks['starter-bauer'].date,'2026-09-01');assert.equal(s.tasks['starter-bauer'].paused,true);assert.equal(carried.date,'2026-10-09');assert.equal(carried.done,false);assert.throws(()=>carryTask(s,'starter-bauer','2026-10-09','laptop'));
 const b=initialState('2026-09-01');carryTask(b,'starter-bauer','2026-10-09','laptop');const merged=mergeStates(s,b);assert.equal(dailyTasks(merged,'2026-10-09').length,1);
});
test('execution charts count actual completion dates and reopen removes the count',()=>{
 const s=initialState('2026-09-01');put(s,'tasks','starter-bauer',{done:true,completedAt:'2026-10-09'},'phone');assert.equal(executionDays(s,'2026-10-05',7)[4].count,1);assert.equal(executionDays(s,'2026-09-01',1)[0].count,0);put(s,'tasks','starter-bauer',{done:false,completedAt:''},'phone');assert.equal(executionDays(s,'2026-10-05',7)[4].count,0);
});

test('Second Brain migration makes goals, notes, books, habits, values and reviews editable without fabricating completions',async()=>{
 const {readFile}=await import('node:fs/promises');const raw=await readFile(new URL('./fixtures/second-brain.json',import.meta.url),'utf8');
 const source=JSON.parse(raw),s=importFile(raw,'fixture');
 const goals=records(s,'goals').filter(g=>g.id.startsWith('old-goals'));
 assert.equal(goals.length,5);assert.ok(goals.every(g=>g.status==='paused'));assert.equal(activeGoals(s).length,3);
 const task=records(s,'tasks').find(t=>t.title===source.tasks[0].title);assert.equal(task.done,true);assert.equal(s.goals[task.goal].title,source.goals[0].title);
 assert.equal(executionDays(s,'2026-10-08',1)[0].count,0,'unknown old completion timestamps must not become chart data');
 assert.ok(records(s,'notes').some(n=>n.entryType==='book'&&n.author==='Cal Newport'&&n.readingProgress===27));
 assert.equal(records(s,'notes').filter(n=>n.entryType==='routine').length,7);assert.ok(records(s,'checkins').some(c=>c.kind==='routine'&&c.done));
 assert.ok(records(s,'notes').some(n=>n.title==='How I learn'&&n.body.startsWith('Read')));
 assert.ok(records(s,'reviews').some(r=>r.wins==='Built a quantities sheet'&&r.next==='Use one real project'));
 assert.ok(records(s,'checkins').some(c=>c.note==='A useful report'&&c.energy==='4'));
 assert.ok(s.settings.plan.values.includes('Autonomy'));assert.equal(s.settings.plan.start,'2026-10-08');
 const sourceId=records(s,'legacy').find(l=>l.source).source;assert.deepEqual(recoverOriginal(s,sourceId),source);
 put(s,'tasks',task.id,{title:'My revised task'},'owner',Date.now());assert.equal(mergeStates(s,importFile(raw,'reimport')).tasks[task.id].title,'My revised task');
});

test('plan day progress counts distinct completion days per horizon and leaves outcome targets intact',()=>{
 const s=initialState('2026-10-01'), g=s.goals.bauer;
 Object.assign(g,{horizon:'30 days',startDate:'2026-10-01',progress:37,tracking:'target',target:20,current:4});
 for(const [id,date,goal] of [['a','2026-10-02','bauer'],['b','2026-10-02','bauer'],['c','2026-10-03','bauer'],['other','2026-10-04',''],['outside','2026-11-01','bauer'],['future','2026-10-30','bauer']])put(s,'tasks',id,{title:id,action:id,goal,date,completedAt:date,done:true},'test');
 assert.equal(planDayProgress(s,g,'2026-10-09').completed,2);assert.equal(planDayProgress(s,g,'2026-10-09').percent,6.7);assert.equal(goalProgress(g),20);assert.equal(g.progress,37);
 g.horizon='90 days';assert.equal(planDayProgress(s,g,'2026-10-09').percent,2.2);
 g.horizon='1 year';assert.equal(planDayProgress(s,g,'2026-10-09').days,365);assert.equal(planDayProgress(s,g,'2026-10-09').percent,0.5);
 put(s,'tasks','c',{done:false,completedAt:''},'test');assert.equal(planDayProgress(s,g,'2026-10-09').completed,1);
 put(s,'tasks','a',{deleted:true},'test');assert.equal(planDayProgress(s,g,'2026-10-09').completed,1);
 put(s,'tasks','b',{goal:'kaitech'},'test');assert.equal(planDayProgress(s,g,'2026-10-09').completed,0);
});
test('calendar-year horizons handle leap years and stable start/end dates',()=>{
 const s=initialState('2023-10-01');assert.equal(planWindow(s,{horizon:'1 year'}).days,366);
 assert.deepEqual(planWindow(s,{horizon:'30 days',startDate:'2026-12-15'}),{start:'2026-12-15',end:'2027-01-13',days:30,horizon:'30 days'});
 assert.equal(planWindow(s,{horizon:'1 year',startDate:'2024-02-29'}).end,'2025-02-27');
 assert.equal(planWindow(s,{horizon:'3 years',startDate:'2024-01-01'}).days,1096);
 assert.equal(planWindow(s,{horizon:'5+ years',startDate:'2024-01-01'}).days,1827);
 s.goals.bauer.startDate='2026-02-30';assert.throws(()=>validateState(s));
});
test('carried actions, undated imports, offline merges and backups do not fabricate plan days',()=>{
 const s=initialState('2026-10-01'),g=s.goals.bauer;g.horizon='30 days';
 carryTask(s,'starter-bauer','2026-10-02','a');put(s,'tasks','carry-starter-bauer-2026-10-02',{done:true,completedAt:'2026-10-02'},'a');
 put(s,'tasks','unknown',{title:'Old completion',action:'Kept',goal:'bauer',date:'2026-10-03',done:true,legacyCompletion:true},'a');
 const b=structuredClone(s);put(b,'tasks','phone',{title:'Phone work',action:'Kept',goal:'bauer',date:'2026-10-02',completedAt:'2026-10-02',done:true},'b');
 const merged=readBackup(JSON.stringify(makeBackup(mergeStates(s,b))));assert.equal(planDayProgress(merged,g,'2026-10-09').completed,1);
 put(b,'tasks','carry-starter-bauer-2026-10-02',{deleted:true},'b');put(b,'tasks','phone',{deleted:true},'b');assert.equal(planDayProgress(mergeStates(merged,b),g,'2026-10-09').completed,0);
});

test('parked tasks stay outside daily progress and a group unlocks only after focused work is finished',()=>{
 const s=initialState('2026-10-09');for(let n=0;n<6;n++)put(s,'tasks','park-'+n,{title:'Extra '+n,action:'Output',date:'2026-10-09',goal:'bauer',paused:true,done:false},'a');
 assert.equal(parkedTasks(s,'2026-10-09').length,6);assert.throws(()=>focusParked(s,['park-0'],'a','2026-10-09'));
 for(const id of ['starter-bauer','starter-kaitech','starter-capacity'])put(s,'tasks',id,{done:true,completedAt:'2026-10-09'},'a');
 assert.throws(()=>focusParked(s,['park-0','park-1','park-2','park-3'],'a','2026-10-09'));assert.throws(()=>focusParked(s,['park-0','park-0'],'a','2026-10-09'));
 focusParked(s,['park-0','park-1','park-2'],'a','2026-10-09');assert.equal(parkedTasks(s,'2026-10-09').length,3);assert.equal(records(s,'tasks').length,9);assert.equal(s.tasks['park-0'].done,false);assert.equal(planDayProgress(s,s.goals.bauer,'2026-10-09').completed,1);
});
