import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState, emptyState, mergeStates, validateState, put, records, dailyTasks, taskLimit, makeBackup, readBackup, dayDifference, addDays, rolloverCandidates, saveGoal, goalHistory, goalProgress, activeGoals, carryTask, executionDays} from '../core.js';
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
