import {STORAGE_KEY, initialState, validateState, records, dailyTasks, today, taskLimit, rolloverCandidates, activeGoals, put, uid, makeBackup, mergeStates, dayDifference, addDays, goalStatus, goalProgress, saveGoal, goalHistory, executionDays, carryTask} from './core.js';
import {CloudSync, loadConfig, saveConfig} from './cloud.js';
import {importFile, recoverOriginal} from './migration.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeURL = value => { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const CATEGORIES = ['BAUER / APM','KAITECH / BIM','German','English & communication','Excel & automation','Fitness & recovery','Mind & capacity','Finance & purchases','Books, history & economy','Decisions','Saved insights','Ideas for later','Communication & logic'];
const friendlyDate = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'});
const taskHistoryDate = t => t.done && t.completedAt ? t.completedAt : t.date;
let device, state, startupMessage = '', storageError = false, recoveryLocked = false;
try {
  device = localStorage.getItem('governor.device') || uid(); localStorage.setItem('governor.device', device);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = validateState(JSON.parse(saved));
  else if (localStorage.getItem('governor-data')) { state = importFile(localStorage.getItem('governor-data'), device); startupMessage = 'Your earlier Governor records were preserved and imported. The original device copy is untouched.'; }
  else state = initialState();
  // New reference cards never replace edited or archived user records.
  const references=initialState().notes;
  for(const id of ['german-practice','finance-purchases','recovery-baseline']) if(!state.notes[id]) state.notes[id]=references[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
} catch (error) { state = initialState(); storageError = true; recoveryLocked = true; startupMessage = 'Device storage could not be read or saved. Export your existing device data from Settings before continuing; no original data was overwritten.'; }
let zone = ['tunnel','compass','vault'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'tunnel';
let query = '', category = 'All', showArchive = false, historyMonth = today().slice(0,7), lastToday = today(), undoAction;
let goalFilter='active', chartPeriod='week', chartMonth=today().slice(0,7), calendarMonth=today().slice(0,7), routineWeek=addDays(today(),-((new Date(`${today()}T12:00:00`).getDay()+6)%7));
let timer = {duration:25, remaining:1500, end:0};
try { timer = {...timer, ...JSON.parse(localStorage.getItem('governor.timer') || '{}')}; } catch {}
const saveTimer = () => { try { localStorage.setItem('governor.timer', JSON.stringify(timer)); } catch {} };

function write(next, {sync = true, redraw = true} = {}) {
  if(recoveryLocked) throw new Error('Original storage needs recovery. Export it from Settings, then import a valid backup. Your original data has not been overwritten.');
  const checked = validateState(next);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); }
  catch { storageError = true; throw new Error('Device storage is full or unavailable. Export a backup from Settings. This change was not saved.'); }
  state = checked; storageError = false;
  if (redraw) render();
  if (sync) cloud.schedule();
}
function edit(col, id, values, message = 'Saved', {undo = true, redraw = true} = {}) {
  const next = structuredClone(state), before = next[col][id] ? structuredClone(next[col][id]) : null;
  put(next, col, id, values, device); write(next, {redraw});
  if (undo) undoAction = () => {
    const restored = structuredClone(state);
    put(restored, col, id, before ? {...before,deleted:!!before.deleted} : {...values, deleted:true}, device); write(restored); toast('Change undone.');
  };
  if (message) toast(message, undo);
}
function changeGoal(id,values,message='Goal saved.') {
  const next=structuredClone(state), before=state.goals[id] ? structuredClone(state.goals[id]) : null;
  saveGoal(next,id,values,device);write(next);
  undoAction=()=>{const restored=structuredClone(state);saveGoal(restored,id,before?{...before,deleted:!!before.deleted,status:goalStatus(before)}:{deleted:true,status:'deleted',active:false},device);write(restored);toast('Goal change undone. History retained.');};
  toast(message,true);
}
function toast(message, undo = false) {
  const node = $('#toast'); node.innerHTML = `<span>${esc(message)}</span>${undo ? '<button type="button" data-action="undo">Undo</button>' : ''}`;
  node.classList.add('visible'); clearTimeout(toast.timeout); toast.timeout = setTimeout(() => node.classList.remove('visible'), undo ? 10000 : 5500);
}
const cloud = new CloudSync({getState:() => state, acceptState:incoming => {
  const merged = mergeStates(state, incoming);
  if (JSON.stringify(merged) !== JSON.stringify(state)) write(merged, {sync:false});
}, onStatus:(text, kind) => { $('#sync-status').textContent = text; $('#mobile-sync-status').textContent=text; $('#status-dot').className = `status-dot ${kind}`; $('#footer-status').textContent = text === 'Cloud up to date' ? 'Private cloud sync · up to date' : text; }});

function top(eyebrow, title, subtitle, aside = '') { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${aside}</div>`; }
function goalName(id) { return state.goals[id]?.title || 'Personal priority'; }
function openToday() { return dailyTasks(state).filter(t => !t.done && !t.paused); }
function visibleTasks() { return openToday().slice(0, taskLimit(state)); }
function taskHTML(task, index, done = false) {
  return `<article class="priority ${done ? 'done' : ''}"><button class="complete" data-action="complete" data-id="${esc(task.id)}" aria-label="${done ? 'Reopen' : 'Complete'} ${esc(task.title)}" aria-pressed="${!!task.done}">${done ? '✓' : ''}</button><div class="task-content"><p class="task-name">${esc(task.title)}</p><p class="task-action">${esc(task.action)}</p><div class="task-meta"><span class="category-dot ${esc(task.goal)}"></span>${esc(goalName(task.goal))}</div></div><div class="task-tools">${!done && index === 0 ? '<span class="primary-flag">PRIMARY</span>' : ''}<button class="icon-button" data-action="edit-task" data-id="${esc(task.id)}" aria-label="Edit ${esc(task.title)}">⋯</button></div></article>`;
}
function tunnel() {
  const tasks=visibleTasks(), primary=tasks[0], done=dailyTasks(state).filter(t=>t.done), mode=state.settings.mode?.value||'normal';
  const checkin=records(state,'checkins').find(x=>x.date===today()&&x.kind!=='routine');
  return top('TODAY · THE TUNNEL','A clear path for today.','Your next action first. Everything else can wait.') +
    (mode!=='normal'?`<div class="banner">${mode==='low'?'A lighter day is allowed. One small action is enough.':'Maintenance week: keep the essentials going with one useful action a day.'} Your other priorities are safely parked.</div>`:'')+
    `<div class="today-layout"><div class="today-main"><section class="hero" aria-label="Primary mission"><div class="hero-content"><div class="eyebrow">MAIN FOCUS TODAY <span class="hero-tag">${primary?esc(goalName(primary.goal)):'ONE STEP AT A TIME'}</span></div><h2>${esc(primary?.action||(done.length?'You’ve moved things forward.':'Choose one concrete next action.'))}</h2><p>${primary?esc(primary.title):done.length?'You can stop here, or choose another useful action.':'Make it small enough to begin.'}</p><div class="hero-action"><button class="button" data-action="${primary?'complete':'add-task'}" ${primary?`data-id="${esc(primary.id)}"`:''}>${primary?'✓  Complete action':'＋  Choose my next action'}</button></div></div></section>
    <section class="card priorities-panel"><div class="section-head"><div><h2>Today’s priorities</h2><p>One concrete next action for each.</p></div><button class="button subtle" data-action="add-task">＋ Add a priority</button></div><div class="priority-list">${tasks.map((t,i)=>taskHTML(t,i)).join('')||'<div class="empty">Choose a useful action when you’re ready.</div>'}</div><div class="quiet-row"><span>${tasks.length} of ${taskLimit(state)} in focus</span><button class="button ghost" data-action="parked">Choose from parked actions →</button></div>${openToday().length>tasks.length?'<p class="mode-note">Other actions are safely parked at this pace.</p>':''}${done.length?`<details><summary>${done.length} ${done.length===1?'action':'actions'} completed today</summary><div class="priority-list">${done.map(t=>taskHTML(t,0,true)).join('')}</div></details>`:''}</section></div>
    <aside class="today-side"><section class="card day-card"><p class="eyebrow">YOUR PACE</p><h2>${new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</h2><label class="sr-only" for="energy-mode">Energy mode</label><select id="energy-mode"><option value="normal" ${mode==='normal'?'selected':''}>Steady day</option><option value="low" ${mode==='low'?'selected':''}>Low energy</option><option value="maintenance" ${mode==='maintenance'?'selected':''}>Maintenance week</option></select><p>${done.length} ${done.length===1?'action':'actions'} completed today. No streak to protect.</p></section>
    <section class="card capture-card"><p class="eyebrow">CAPTURE & RETURN</p><h2>A place for wandering thoughts</h2><p>Save a thought, task or idea. Decide what to do with it later.</p><form id="inline-capture" class="capture-inline"><label class="sr-only" for="capture-text">Capture a thought</label><input id="capture-text" name="text" placeholder="A thought, an idea, a reminder…" maxlength="4000" required autocomplete="off"><button class="button" aria-label="Save thought">＋</button></form><button class="tiny-link" data-action="inbox">Your captured thoughts →</button></section>
    <section class="card focus-card"><p class="eyebrow">OPTIONAL FOCUS</p><h2>One thing at a time</h2><div class="timer-row"><span class="timer-display" id="timer-display">${timerText()}</span><button class="button soft" data-action="timer-toggle" id="timer-toggle">${timer.end?'Pause':'Start focus'}</button><button class="icon-button" data-action="timer-reset" aria-label="Reset focus timer">↺</button></div><label class="sr-only" for="timer-duration">Focus length</label><select id="timer-duration" ${timer.end?'disabled':''}><option value="10" ${timer.duration===10?'selected':''}>10 min</option><option value="25" ${timer.duration===25?'selected':''}>25 min</option><option value="45" ${timer.duration===45?'selected':''}>45 min</option><option value="50" ${timer.duration===50?'selected':''}>50 min</option></select></section>
    <section class="card checkin-card"><h2>${checkin?'Your day, saved.':'Finish the day'}</h2><p>${checkin?esc(checkin.note.slice(0,100))||'Your check-in is saved.':'Optional. One sentence is enough.'}</p><button class="button subtle" data-action="checkin">${checkin?'Edit check-in':'2-minute check-in'} →</button></section></aside></div>`;
}
function goalCard(g) {
  const progress=goalProgress(g), status=goalStatus(g);
  return `<article class="card goal-card" data-goal-id="${esc(g.id)}"><div class="section-head"><span class="note-tag">${esc(g.subtitle||'PERSONAL GOAL')}</span><span class="badge">${esc(status)}</span></div><h2>${esc(g.title)}</h2><p class="goal-outcome">${esc(g.outcome)}</p>${g.deadline?`<p class="deadline">Target date · ${friendlyDate(g.deadline)}</p>`:''}<div class="progress-line" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(g.title)} milestone progress"><span style="width:${progress}%"></span></div><div class="progress-meta"><span>${progress}%</span><span>${g.tracking==='target'?`${esc(g.current||0)} / ${esc(g.target||0)} ${esc(g.unit||'units')}`:g.tracking==='milestones'?'Completed milestones':'Your entered estimate'}</span></div>${g.evidence?`<p class="evidence">${esc(g.evidence)}</p>`:''}${g.nextAction?`<div class="goal-next"><span class="eyebrow">NEXT ACTION</span><p>${esc(g.nextAction)}</p>${status==='active'?`<button class="button ghost" data-action="goal-focus" data-id="${esc(g.id)}">Focus this action today →</button>`:''}</div>`:''}<div class="goal-actions"><button class="button soft" data-action="goal" data-id="${esc(g.id)}">Edit / progress</button><button class="button ghost" data-action="goal-history" data-id="${esc(g.id)}">History</button></div></article>`;
}
function chartsHTML() {
  const date=new Date(`${today()}T12:00:00`), monday=addDays(today(),-((date.getDay()+6)%7));
  const start=chartPeriod==='month'?`${chartMonth}-01`:monday;
  const count=chartPeriod==='month'?new Date(Number(chartMonth.slice(0,4)),Number(chartMonth.slice(5,7)),0).getDate():7;
  const days=executionDays(state,start,count), max=Math.max(1,...days.map(d=>d.count));
  return `<div class="charts-grid"><section class="card chart-card" data-chart="execution"><div class="section-head"><div><p class="eyebrow">ACTUAL SAVED COMPLETIONS</p><h2>Execution · ${chartPeriod==='month'?'monthly':'weekly'}</h2></div><label class="sr-only" for="chart-period">Execution period</label><select id="chart-period"><option value="week" ${chartPeriod==='week'?'selected':''}>This week</option><option value="month" ${chartPeriod==='month'?'selected':''}>Monthly</option></select></div>${chartPeriod==='month'?`<label class="sr-only" for="chart-month">Chart month</label><input id="chart-month" type="month" value="${chartMonth}">`:''}<p class="chart-total">${days.reduce((sum,d)=>sum+d.count,0)} actions completed · ${friendlyDate(start)} – ${friendlyDate(addDays(start,count-1))}</p><div class="chart-scroll"><div class="execution-bars ${chartPeriod==='month'?'monthly':''}" role="img" aria-label="Completed actions per day"><div class="bar-grid" style="--columns:${count}">${days.map(d=>`<div class="bar-column" data-date="${d.date}" data-count="${d.count}" title="${friendlyDate(d.date)}: ${d.count} completed actions"><span class="bar-value">${d.count}</span><div class="bar-track"><span class="execution-bar" style="height:${100*d.count/max}%"></span></div><span class="bar-label">${chartPeriod==='month'?Number(d.date.slice(-2)):new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'})}</span></div>`).join('')}</div></div></div><details class="chart-table"><summary>Read the values</summary><table><caption>Completed actions by date</caption><tbody>${days.map(d=>`<tr><th scope="row">${friendlyDate(d.date)}</th><td>${d.count}</td></tr>`).join('')}</tbody></table></details></section>
  <section class="card chart-card" data-chart="goals"><p class="eyebrow">REAL TARGETS & ENTERED PROGRESS</p><h2>Active goal progress</h2><div class="goal-chart">${activeGoals(state).map(g=>`<div class="goal-chart-row" data-goal-id="${esc(g.id)}"><div><span>${esc(g.title)}</span><strong>${goalProgress(g)}%</strong></div><div class="progress-line" role="progressbar" aria-valuenow="${goalProgress(g)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(g.title)} progress"><span style="width:${goalProgress(g)}%"></span></div><small>${g.tracking==='target'?`${esc(g.current||0)} of ${esc(g.target||0)} ${esc(g.unit||'units')}`:g.tracking==='milestones'?'Based on checked monthly milestones':'Based on your entered estimate'}</small></div>`).join('')||'<p>No active goals. Activate a goal when you are ready.</p>'}</div></section></div>`;
}
function calendarHTML() {
  const first=`${calendarMonth}-01`, firstDate=new Date(`${first}T12:00:00`), offset=(firstDate.getDay()+6)%7;
  const length=new Date(Number(calendarMonth.slice(0,4)),Number(calendarMonth.slice(5,7)),0).getDate();
  const days=Array.from({length:Math.ceil((length+offset)/7)*7},(_,i)=>addDays(first,i-offset));
  return `<section class="card calendar-card" id="calendar-section"><div class="section-head"><div><p class="eyebrow">PLAN WITH THE TIME YOU HAVE</p><h2>Calendar</h2><p>Tap a day to view or schedule an action.</p></div><label class="sr-only" for="calendar-month">Calendar month</label><input id="calendar-month" type="month" value="${calendarMonth}"></div><div class="calendar-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${days.map(day=>{
    const tasks=dailyTasks(state,day).filter(t=>!t.carriedTo), goals=records(state,'goals').filter(g=>g.deadline===day), done=records(state,'tasks').filter(t=>t.done&&(t.completedAt||t.date)===day).length;
    const label=`${friendlyDate(day)}; ${tasks.length} scheduled actions; ${done} completed; ${goals.length} goal deadlines`;
    return `<button class="calendar-day ${day===today()?'today':''} ${day.slice(0,7)!==calendarMonth?'outside':''}" data-action="calendar-day" data-id="${day}" aria-label="${esc(label)}"><span>${Number(day.slice(-2))}</span><span class="calendar-dots">${tasks.length?'<i class="planned" aria-hidden="true"></i>':''}${done?'<i class="finished" aria-hidden="true"></i>':''}${goals.length?'<i class="target" aria-hidden="true"></i>':''}</span>${tasks[0]?`<small>${esc(tasks[0].title)}</small>`:goals[0]?`<small>${esc(goals[0].title)} · target</small>`:''}</button>`;
  }).join('')}</div><p class="calendar-key">● Scheduled action <span>● Completed</span> <em>● Goal target date</em></p></section>`;
}
function compass() {
  const plan=state.settings.plan, start=plan.start, end=plan.horizon||addDays(start,89), day=Math.max(1,dayDifference(today(),start)+1);
  const latest=records(state,'reviews').filter(r=>!r.archived).sort((a,b)=>b.date.localeCompare(a.date));
  const goals=records(state,'goals').filter(g=>goalFilter==='all'||goalStatus(g)===goalFilter);
  return top('PLANS · THE COMPASS','Direction, without the noise.','Three priorities by default. Other goals are optional.',`<button class="button subtle" data-action="plan">Edit horizon</button>`)+
    `<div class="banner"><div class="plan-meta"><strong>Your sprint · ${friendlyDate(start)} – ${friendlyDate(end)}</strong><span>${day>dayDifference(end,start)+1?'Review and set your next chapter when ready.':`Day ${day} of your current plan`}</span></div>${plan.military?`Military planning date: ${friendlyDate(plan.military)}. Adjust this whenever the timeline changes.`:'Military timing uncertain? Keep the date open and work with the horizon you know.'}</div>
    <div class="section-head"><div><h2>Your outcomes</h2><p>BAUER, KAITECH and capacity first. Supporting skills stay optional.</p></div><button class="button" data-action="add-goal">＋ Add goal</button></div><div class="goal-filters"><label class="sr-only" for="goal-filter">Goal status</label><select id="goal-filter">${['active','paused','completed','archived','all'].map(v=>`<option value="${v}" ${goalFilter===v?'selected':''}>${v==='all'?'All saved goals':v[0].toUpperCase()+v.slice(1)+' goals'}</option>`).join('')}</select><button class="button ghost" data-action="deleted-goals">Deleted goal history</button></div><div class="goal-grid">${goals.map(goalCard).join('')||'<div class="empty">No goals in this section. Your other goals and their history remain saved.</div>'}</div>
    ${chartsHTML()}${calendarHTML()}${routinesHTML()}
    <div class="section-stack"><section class="card"><div class="section-head"><div><p class="eyebrow">15 MINUTES · ONCE A WEEK</p><h2>Reflect. Adjust. Move on.</h2><p>${latest[0]?`Last review: ${friendlyDate(latest[0].date)}`:'Start with this week. No catch-up required.'}</p></div><button class="button" data-action="weekly">Start weekly review →</button><button class="button ghost" data-action="monthly">Monthly review</button></div><p>5 minutes: what moved? 5 minutes: what got in the way? 5 minutes: what will change?</p><details><summary>Past reviews</summary>${latest.map(r=>`<article class="review-entry"><div class="section-head"><h3>${r.period==='month'?'Monthly':'Weekly'} · ${friendlyDate(r.date)}</h3><button class="button ghost" data-action="weekly" data-id="${esc(r.id)}">Edit</button></div><p><strong>Progress:</strong> ${esc(r.wins)}<br><strong>Lessons:</strong> ${esc(r.obstacles)}<br><strong>Next adjustment:</strong> ${esc(r.next)}</p></article>`).join('')||'<p>Your first review will appear here.</p>'}</details></section>
    <section class="card"><details><summary>Your optional 1-, 3- and 5-year direction</summary><button class="button ghost" data-action="why">Edit your Why →</button><div class="why-grid">${plan.values?`<p class="values-note"><strong>Your values:</strong> ${esc(plan.values)}</p>`:''}${[1,3,5].map(n=>`<div><h3>${n} ${n===1?'year':'years'}</h3><p>${esc(plan[`why${n}`]||'What would make this chapter meaningful for you?')}</p></div>`).join('')}</div></details></section>
    <section class="card"><p class="eyebrow">YOUR RECORD ACROSS MONTHS</p><h2>Monthly history</h2><p>Actions and check-ins stay saved. Missed days simply stay blank.</p><div class="history-filters"><label class="sr-only" for="history-month">Choose month</label><input type="month" id="history-month" value="${historyMonth}"><button class="button subtle" data-action="history-export">Export this month</button></div><div id="month-history">${historyHTML()}</div></section></div>`;
}
function historyHTML() {
  const tasks = records(state,'tasks').filter(t=>taskHistoryDate(t).startsWith(historyMonth));
  const logs = records(state,'checkins').filter(c=>c.kind!=='routine'&&c.date.startsWith(historyMonth));
  const dates = [...new Set([...tasks.map(taskHistoryDate),...logs.map(x=>x.date)])].sort().reverse();
  return `<p class="history-count">${tasks.filter(t=>t.done).length} completed actions · ${logs.length} check-ins</p>${dates.map(date=>`<div class="history-day"><h3>${friendlyDate(date)}</h3>${tasks.filter(t=>taskHistoryDate(t)===date).map(t=>`<p><span class="${t.done?'done-label':'archived-label'}">${t.done?'✓ Completed':t.paused?'Parked':'Planned'}</span> · ${esc(t.title)}</p>`).join('')}${logs.filter(c=>c.date===date).map(c=>`<p>${esc(c.energy)} · ${esc(c.note)}</p>`).join('')}</div>`).join('') || '<p>No entries this month. Your saved months remain available in the selector.</p>'}`;
}
function noteHTML(note) {
  const url=safeURL(note.url), book=note.entryType==='book', routine=note.entryType==='routine';
  const percent=note.pagesTotal>0?Math.min(100,Math.round(100*(note.pagesRead||0)/note.pagesTotal)):null;
  return `<article class="card note-card"><div class="note-tag">${esc(note.category).toUpperCase()}${note.archived?' · ARCHIVED':''}</div><h2>${esc(note.title)}</h2>${book?`<p class="book-meta">${esc(note.author||'')} · ${esc(note.readingStatus||'To read')}</p>${percent===null?'<small>Pages not tracked yet.</small>':`<div class="progress-line"><span style="width:${percent}%"></span></div><p>${esc(note.pagesRead||0)} / ${esc(note.pagesTotal)} pages · ${percent}%</p>`}`:routine?`<p class="book-meta">Optional routine · ${esc(note.routineTarget||1)} times / week</p>`:''}<p>${esc(note.body)}</p><div class="note-actions">${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>`:'<span></span>'}<button class="button ghost" data-action="note" data-id="${esc(note.id)}">Edit →</button></div></article>`;
}
function vaultNotes() {return records(state,'notes').filter(n=>showArchive?n.archived:!n.archived).filter(n=>category==='All'||n.category===category).filter(n=>`${n.title} ${n.body} ${n.category} ${n.author||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.updatedAt-a.updatedAt);}
function groupedNotes() {
  const notes=vaultNotes(), groups=[...new Set(notes.map(n=>n.category))];
  return groups.map(c=>`<section class="library-group"><h2 class="library-heading">${esc(c)} <small>${notes.filter(n=>n.category===c).length}</small></h2><div class="note-grid">${notes.filter(n=>n.category===c).map(noteHTML).join('')}</div></section>`).join('')||'<div class="empty">No matching resources. Save one useful thing when you find it.</div>';
}
function vault() {
  return top('LIBRARY · THE VAULT','Keep the useful things close.','Your knowledge, books, decisions and ideas. No extra daily task list.')+
  `<div class="vault-toolbar"><label class="sr-only" for="vault-search">Search the Vault</label><input id="vault-search" type="search" placeholder="Search a topic, note, book or idea…" value="${esc(query)}"><label class="sr-only" for="vault-category">Filter by topic</label><select id="vault-category">${['All',...new Set([...CATEGORIES,...records(state,'notes').map(n=>n.category)])].map(c=>`<option ${category===c?'selected':''}>${esc(c)}</option>`).join('')}</select><button class="button" data-action="note">＋ Save a note</button></div><div class="library-actions"><button class="button soft" data-action="book">＋ Add book</button><button class="button soft" data-action="routine">＋ Optional routine</button><button class="button ghost" data-action="vault-archive">${showArchive?'Show active resources':'View archived resources'}</button></div><div id="note-grid">${groupedNotes()}</div>
  <section class="card"><div class="section-head"><div><h2>Your thought inbox</h2><p>Capture now. Decide later.</p></div><button class="button ghost" data-action="inbox">Open inbox →</button></div><p>${records(state,'captures').filter(c=>!c.archived).length} thoughts saved. They do not become tasks automatically.</p></section>
  ${records(state,'legacy').some(l=>l.kind!=='goal-history')?`<section class="card"><h2>Your preserved Governor records</h2><p>Original projects, goals, habits, books and other categories are still here, including their original fields in backups.</p><button class="button soft" data-action="legacy">Browse preserved records →</button></section>`:''}`;
}
function routinesHTML() {
  const routines=records(state,'notes').filter(n=>n.entryType==='routine'&&!n.archived), days=Array.from({length:7},(_,i)=>addDays(routineWeek,i));
  return `<section class="card routines-card"><details><summary>Optional routines · no streaks or penalties</summary><p>Only track routines that help you. Blank days are allowed. These do not become Today priorities.</p><div class="section-head"><label for="routine-week">Week starting</label><input type="date" id="routine-week" value="${routineWeek}"><button class="button soft" data-action="routine">＋ Add routine</button></div>${routines.map(n=>{const completed=days.filter(d=>state.checkins[`routine-${n.id}-${d}`]?.done).length;return `<article class="routine-row"><div class="section-head"><h3>${esc(n.title)}</h3><span>${completed} / ${n.routineTarget||1} this week</span><button class="button ghost" data-action="note" data-id="${esc(n.id)}">Edit</button></div><div class="routine-days">${days.map(d=>{const done=!!state.checkins[`routine-${n.id}-${d}`]?.done;return `<button data-action="routine-toggle" data-id="${esc(n.id)}" data-date="${d}" aria-pressed="${done}" aria-label="${esc(n.title)} · ${friendlyDate(d)}" ${d>today()?'disabled':''}>${new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'})}<strong>${done?'✓':Number(d.slice(-2))}</strong></button>`;}).join('')}</div></article>`;}).join('')||'<p>No routines added. You can leave this empty.</p>'}</details></section>`;
}
function searchModal(value='') {
  const q=value.trim().toLowerCase();
  const matches=q?['tasks','goals','notes','captures'].flatMap(col=>records(state,col).filter(r=>`${r.title||r.text||''} ${r.action||r.body||r.outcome||''}`.toLowerCase().includes(q)).map(r=>({col,r}))).slice(0,40):[];
  modal('Find anything in your Governor','Search saved actions, goals, notes and thoughts.',`<form id="search-form"><label class="sr-only" for="search-everything">Search everything</label><input id="search-everything" name="query" type="search" value="${esc(value)}" placeholder="A task, goal, book or idea…"><button class="button" type="submit">Search</button></form><ul class="search-results">${matches.map(({col,r})=>`<li><span>${esc(col)}${r.archived?' · archived':''}</span><button class="button ghost" data-action="${{tasks:'edit-task',goals:'goal',notes:'note',captures:'capture-note'}[col]}" data-id="${esc(r.id)}">${esc(r.title||r.text)}</button></li>`).join('')||`<li>${q?'No matching records.':'Enter a word to find your saved records.'}</li>`}</ul>`);
}
function render() {
  $('#header-date').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const scroll = window.scrollY;
  $('#main').innerHTML = (storageError ? `<div class="banner" role="alert">Device storage needs attention. Changes are not safe until storage works. <button class="button subtle" data-action="settings">Export / restore data</button></div>` : '') + ({tunnel,compass,vault})[zone]();
  document.querySelectorAll('[data-zone]').forEach(a=>{a.classList.toggle('active',a.dataset.zone===zone); if(a.dataset.zone===zone)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(zone==='tunnel') { try { $('#capture-text').value = localStorage.getItem('governor.capture.draft') || ''; } catch {} }
  window.scrollTo(0,scroll);
}
let focusReturn;
function modal(title, subtitle, body) {
  focusReturn = document.activeElement;
  $('#modal-content').innerHTML = `<div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="icon-button" data-action="close" aria-label="Close dialog">×</button></div>${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}${body}`;
  if (!$('#modal').open) $('#modal').showModal();
  const first = $('#modal-content input:not([type=hidden]), #modal-content textarea'); if(first) first.focus();
}
function closeModal() { $('#modal').close(); if(focusReturn?.isConnected) focusReturn.focus(); }
function actions(text='Save', extra='') { return `<p id="form-error" class="form-error" role="alert"></p><div class="modal-actions">${extra}<button type="button" class="button subtle" data-action="close">Cancel</button><button class="button" type="submit">${text}</button></div>`; }
function taskModal(id, date=today(), fromCapture='') {
  const task=id?state.tasks[id]:null, selected=task?.date||date, capture=state.captures[fromCapture];
  const limit=selected===today()?taskLimit(state):3;
  if(!task && dailyTasks(state,selected).filter(t=>!t.done&&!t.paused&&!t.carriedTo).length>=limit){toast(`Keep ${limit} in focus. Park or complete an action before adding another.`);return;}
  const options=activeGoals(state);if(task?.goal&&!options.some(g=>g.id===task.goal)&&state.goals[task.goal])options.push(state.goals[task.goal]);
  modal(task?'Edit your priority':'One priority. One next action.','Use a verb and a real output. Change the schedule date to carry an action forward without losing its earlier record.',`<form id="task-form"><input type="hidden" name="id" value="${esc(id||'')}"><input type="hidden" name="capture" value="${esc(fromCapture)}"><label for="task-title">Priority</label><input id="task-title" name="title" value="${esc(task?.title||capture?.text.slice(0,160)||'')}" placeholder="Finish the KAITECH data map" required maxlength="160"><label for="task-action">The next concrete action</label><textarea id="task-action" name="action" placeholder="Check the source IDs against the schema" maxlength="1000">${esc(task?.action||capture?.text.slice(0,1000)||'')}</textarea><div class="form-row"><div><label for="task-date">Schedule date</label><input id="task-date" name="date" type="date" required value="${selected}"></div><div><label for="task-goal">Supports</label><select id="task-goal" name="goal">${options.map(g=>`<option value="${esc(g.id)}" ${task?.goal===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}<option value="" ${task&&task.goal===''?'selected':''}>Personal / other</option></select></div></div>${actions('Save priority',task?`<button type="button" class="button ghost" data-action="park-task" data-id="${esc(id)}">Park for later</button><button type="button" class="button soft" data-action="primary" data-id="${esc(id)}">Make primary</button>`:'')}</form>`);
}
function captureModal() {
  modal('Park the thought.', 'You don’t need to solve it now. Your current work stays where you left it.', `<form id="capture-form"><label class="sr-only" for="modal-capture">Thought or idea</label><textarea id="modal-capture" name="text" placeholder="What’s on your mind?" required maxlength="4000">${esc(localStorage.getItem('governor.capture.draft')||'')}</textarea>${actions('Capture & return')}</form>`);
}
function inboxModal() {
  const inbox = records(state,'captures').filter(c=>!c.archived).sort((a,b)=>b.updatedAt-a.updatedAt);
  modal('Your thought inbox', 'Keep useful ideas. Park the rest without making another obligation.', `<ul class="capture-list">${inbox.map(c=>`<li><div style="flex:1;min-width:0"><p>${esc(c.text)}</p><time>${friendlyDate(c.date)}</time></div><button class="button soft" data-action="capture-task" data-id="${esc(c.id)}">Make priority</button><button class="button ghost" data-action="capture-note" data-id="${esc(c.id)}">Keep in Vault</button><button class="icon-button" data-action="archive-capture" data-id="${esc(c.id)}" aria-label="Archive thought">✓</button></li>`).join('')||'<li><p>Your inbox is clear.</p></li>'}</ul><details><summary>Archived thoughts</summary><ul class="capture-list">${records(state,'captures').filter(c=>c.archived).map(c=>`<li><p>${esc(c.text)}</p><button class="button ghost" data-action="restore-capture" data-id="${esc(c.id)}">Restore</button></li>`).join('')||'<p>Nothing archived.</p>'}</ul></details>`);
}
function parkedModal() {
  const items = records(state,'tasks').filter(t=>!t.done && !t.carriedTo && (t.paused || t.date!==today() || !visibleTasks().some(x=>x.id===t.id))).sort((a,b)=>b.updatedAt-a.updatedAt);
  modal('Pick up where it makes sense.', 'Nothing here is “overdue.” Bring back one useful action; leave the rest for later.', `<ul class="capture-list">${items.map(t=>`<li><div style="flex:1;min-width:0"><p><strong>${esc(t.title)}</strong><br>${esc(t.action)}</p></div><button class="button soft" data-action="bring-task" data-id="${esc(t.id)}">Focus today</button><button class="icon-button" data-action="edit-task" data-id="${esc(t.id)}" aria-label="Edit ${esc(t.title)}">⋯</button></li>`).join('')||'<li><p>No parked actions. Add a priority when you need one.</p></li>'}</ul>`);
}
function checkinModal() {
  const c = records(state,'checkins').find(x=>x.date===today()&&x.kind!=='routine');
  modal('Close the day gently.', 'One sentence is enough. You can skip this whenever it doesn’t help.', `<form id="checkin-form"><input type="hidden" name="id" value="${esc(c?.id||today())}"><label>How was your capacity today?</label><div class="checkin-choice">${['low','okay','good'].map(v=>`<label><input type="radio" name="energy" value="${v}" ${(c?.energy||'okay')===v?'checked':''}>${v}</label>`).join('')}</div><label for="checkin-note">One useful step or tomorrow’s adjustment</label><textarea id="checkin-note" name="note" maxlength="4000" placeholder="Finished the data checks. Tomorrow I’ll start with the report.">${esc(c?.note||'')}</textarea>${actions('Save check-in')}</form>`);
}
function weeklyModal(id, period='week') {
  const review = id ? state.reviews[id] : records(state,'reviews').find(r=>r.date===today()&&(r.period||'week')===period);
  period=review?.period||period;
  const done = records(state,'tasks').filter(t=>t.done && taskHistoryDate(t)>=(period==='month'?today().slice(0,7)+'-01':addDays(today(),-6)) && taskHistoryDate(t)<=today());
  const suggested = done.map(t=>`• ${t.title}`).join('\n');
  modal(period==='month'?'Your monthly review':'Your 15-minute weekly review', 'Adjust the system to real life. There is no missing-week backlog.', `<form id="weekly-form"><input type="hidden" name="period" value="${period}"><input type="hidden" name="id" value="${esc(review?.id||'')}"><div class="review-prompt"><h3>1. What actually moved? · 5 min</h3><p>Look at evidence for BAUER, KAITECH and your capacity. ${done.length} actions completed this ${period}.</p></div><label for="weekly-wins">Progress and evidence</label><textarea id="weekly-wins" name="wins" required maxlength="6000" placeholder="A report, a checked dataset, more sustainable sleep…">${esc(review?.wins||suggested)}</textarea><label for="weekly-obstacles">2. What got in the way? · 5 min</label><textarea id="weekly-obstacles" name="obstacles" maxlength="6000" placeholder="What made action harder? What could you simplify?">${esc(review?.obstacles||'')}</textarea><label for="weekly-next">3. What will you change next ${period}? · 5 min</label><textarea id="weekly-next" name="next" maxlength="6000" placeholder="One adjustment for each active outcome. Consider a maintenance week when needed.">${esc(review?.next||'')}</textarea>${actions('Save review')}</form>`);
}
function goalModal(id) {
  const g=id?state.goals[id]:null, status=g?goalStatus(g):'paused';
  modal(g?'Edit goal and progress':'Create a concrete goal','Start with a real outcome. New goals are saved for later unless you choose to activate them.',`<form id="goal-form"><input type="hidden" name="id" value="${esc(id||'')}"><label for="goal-title">Goal name</label><input id="goal-title" name="title" value="${esc(g?.title||'')}" maxlength="120" required><label for="goal-subtitle">Area / project</label><input id="goal-subtitle" name="subtitle" value="${esc(g?.subtitle||'')}" maxlength="160" placeholder="BAUER / BIM / Fitness / German"><label for="goal-outcome">Outcome / description</label><textarea id="goal-outcome" name="outcome" maxlength="2000" required placeholder="What concrete result will exist?">${esc(g?.outcome||'')}</textarea><div class="form-row"><div><label for="goal-status">Status</label><select id="goal-status" name="status">${['active','paused','completed','archived'].map(v=>`<option value="${v}" ${status===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></div><div><label for="goal-deadline">Target date · optional</label><input type="date" id="goal-deadline" name="deadline" value="${esc(g?.deadline||'')}"></div></div><label for="goal-next">Next concrete action · optional</label><textarea id="goal-next" name="nextAction" maxlength="1000" placeholder="Update the planned and actual quantities in the site report.">${esc(g?.nextAction||'')}</textarea>
  <details open><summary>Progress and measurable target</summary><label for="goal-tracking">Measure progress using</label><select id="goal-tracking" name="tracking"><option value="manual" ${(g?.tracking||'manual')==='manual'?'selected':''}>An explicitly entered percentage</option><option value="target" ${g?.tracking==='target'?'selected':''}>A measurable target</option><option value="milestones" ${g?.tracking==='milestones'?'selected':''}>Completed monthly milestones</option></select><div id="manual-fields" ${g?.tracking&&g.tracking!=='manual'?'hidden':''}><label for="goal-progress">Your progress estimate · 0–100%</label><input type="number" id="goal-progress" name="progress" min="0" max="100" required value="${g?.progress??0}"></div><div id="target-fields" ${g?.tracking!=='target'?'hidden':''}><div class="form-row"><div><label for="goal-current">Achieved so far</label><input type="number" id="goal-current" name="current" min="0" step="any" value="${g?.current??0}"></div><div><label for="goal-target">Target</label><input type="number" id="goal-target" name="target" min="0" step="any" value="${g?.target??0}"></div></div><label for="goal-unit">Unit</label><input id="goal-unit" name="unit" maxlength="80" placeholder="deliverables / sessions / EGP" value="${esc(g?.unit||'')}"></div><label for="goal-evidence">Evidence / latest update</label><textarea id="goal-evidence" name="evidence" maxlength="3000" placeholder="A finished report, checked dataset or observed change.">${esc(g?.evidence||'')}</textarea></details>
  <details><summary>Monthly milestones</summary>${[1,2,3].map(n=>`<label for="goal-month-${n}">Month ${n}</label><input id="goal-month-${n}" name="month${n}" maxlength="500" value="${esc(g?.[`month${n}`]||'')}" placeholder="One concrete output for this month"><label class="checkbox-label"><input type="checkbox" name="month${n}Done" ${g?.[`month${n}Done`]?'checked':''}> Completed this milestone</label>`).join('')}<label for="goal-milestone">Earlier milestone notes / additional context</label><textarea id="goal-milestone" name="milestone" maxlength="3000">${esc(g?.milestone||'')}</textarea></details>${actions(g?'Save milestone':'Create goal',g?`<button class="button danger" type="button" data-action="delete-goal" data-id="${esc(g.id)}">Delete goal</button>`:'')}</form>`);
}
function goalHistoryModal(id) {
  const goal=state.goals[id], revisions=goalHistory(state,id);
  modal(`${goal?.title||'Goal'} · history`,'Changing or deleting a goal keeps its earlier versions and completed action records.',`<div class="goal-history">${revisions.map(g=>`<details class="review-entry"><summary>${g.updatedAt?new Date(g.updatedAt).toLocaleDateString():'Original saved version'} · ${esc(g.title)} · ${esc(goalStatus(g))} · ${goalProgress(g)}%</summary><p>${esc(g.outcome)}</p><p>${esc(g.evidence||'No evidence note entered.')}</p><p>${esc(g.milestone||'')}</p>${[1,2,3].filter(n=>g[`month${n}`]).map(n=>`<p>Month ${n}: ${g[`month${n}Done`]?'✓ ':''}${esc(g[`month${n}`])}</p>`).join('')}</details>`).join('')||'<p>Earlier versions will appear after your first goal update. Your existing goal is unchanged.</p>'}</div><details><summary>Linked completed actions</summary>${records(state,'tasks').filter(t=>t.goal===id&&t.done).map(t=>`<p>✓ ${esc(t.title)} · ${friendlyDate(t.completedAt||t.date)}</p>`).join('')||'<p>No completed actions yet.</p>'}</details>`);
}
function deletedGoalsModal() {
  modal('Deleted goal history','Deletion hides a goal from your plans. Its historical versions, linked actions and backup records remain available.',Object.values(state.goals).filter(g=>g.deleted).map(g=>`<article class="review-entry"><h3>${esc(g.title)}</h3><button class="button soft" data-action="goal-history" data-id="${esc(g.id)}">View history</button></article>`).join('')||'<p>No deleted goals.</p>');
}
function calendarDayModal(date) {
  const tasks=dailyTasks(state,date).filter(t=>!t.carriedTo), goals=records(state,'goals').filter(g=>g.deadline===date);
  modal(friendlyDate(date),'Scheduled actions stay saved until you choose to change them.',`<div class="priority-list">${tasks.map((t,i)=>taskHTML(t,i,t.done)).join('')||'<p>No actions scheduled for this day.</p>'}</div>${goals.length?`<h3 style="margin-top:20px">Goal target dates</h3>${goals.map(g=>`<p>${esc(g.title)} <button class="button ghost" data-action="goal" data-id="${esc(g.id)}">Edit goal</button></p>`).join('')}`:''}<button class="button" style="margin-top:20px" data-action="calendar-add" data-id="${date}">＋ Schedule an action</button>`);
}
function guideModal() {
  modal('Your two-minute Governor guide','One place to add, track and own your progress.',`<ol class="manual-steps"><li><strong>Morning · Today:</strong> Read the gold primary action. Tap Complete when finished. Use the dots to edit, park or schedule an action. Keep three priorities; Low energy shows just one.</li><li><strong>Capture:</strong> Save a distraction in one line and return to work. In the inbox, keep it as a Library note or turn it into a priority when you have room.</li><li><strong>Goals · Plans:</strong> Add a goal, give it an outcome and next action, and choose active or paused. Edit progress using your estimate, a measurable target, or checked monthly milestones. Choose completed or archived when appropriate. Filter to find old goals and reactivate them. History retains earlier versions.</li><li><strong>Progress & calendar:</strong> The execution chart counts real completed actions. The goal chart uses your actual target or entered progress. Tap a calendar day to schedule an action; changing its date preserves the earlier record.</li><li><strong>Weekly:</strong> Spend about 15 minutes on what moved, what blocked you, and one or two corrections. Monthly reviews and your values/1-, 3-, 5-year direction are optional.</li><li><strong>Library:</strong> Search by category. Add notes, books or optional routines; archive them when finished. German, English, finance and reading create no daily obligation.</li><li><strong>Saving:</strong> Changes save immediately on this browser. Cloud up to date means synced; pending means the local copy is safe but not uploaded yet. Use the same login and app link on phone and laptop. Offline changes merge on reconnection.</li><li><strong>Backups & privacy:</strong> Settings → Export backup saves a JSON file. Import backup merges records and exports the current copy first. Keep backups before a long absence. Signing out does not hide the locally saved browser copy; use your own locked device.</li></ol>`);
}
function planModal(whyOnly=false) {
  const p = state.settings.plan;
  modal(whyOnly?'Your reasons. Your own pace.':'Plan with the time you know.',whyOnly?'These are your reasons, not someone else’s success criteria.':'A 90-day sprint is a guide. Change the horizon when military timing becomes clearer.', `<form id="plan-form">${whyOnly ? `<label for="core-values">Your core values · optional</label><textarea id="core-values" name="values" maxlength="4000" placeholder="Autonomy, competence, capacity, stability — in your own words">${esc(p.values||'')}</textarea>`+[1,3,5].map(n=>`<label for="why-${n}">${n}-year Why</label><textarea id="why-${n}" name="why${n}" maxlength="4000" placeholder="What do I want, and why does it matter to me?">${esc(p[`why${n}`])}</textarea>`).join('') : `<label for="plan-start">Sprint start</label><input id="plan-start" name="start" type="date" required value="${esc(p.start)}"><label for="plan-end">Planning horizon <small>optional; defaults to 90 days</small></label><input id="plan-end" name="horizon" type="date" value="${esc(p.horizon)}"><label for="plan-military">Expected military date <small>leave blank if uncertain</small></label><input id="plan-military" name="military" type="date" value="${esc(p.military)}">`}${actions('Save direction')}</form>`);
}
function noteModal(id,fromCapture,entryType='note') {
  const note=state.notes[id], captured=state.captures[fromCapture];entryType=note?.entryType||entryType;
  modal(note?'Edit your resource':entryType==='book'?'Add a book':entryType==='routine'?'Add an optional routine':'Save one useful thing.','Keep what you can use. It creates no new daily commitment.',`<form id="note-form"><input type="hidden" name="id" value="${esc(id||'')}"><input type="hidden" name="capture" value="${esc(fromCapture||'')}"><input type="hidden" name="entryType" value="${entryType}"><label for="note-title">Title</label><input id="note-title" name="title" required maxlength="200" value="${esc(note?.title||captured?.text.slice(0,100)||'')}"><label for="note-category">Topic</label><select id="note-category" name="category">${[...new Set([...CATEGORIES,...(note?.category?[note.category]:[])])].map(c=>`<option ${(note?.category||(entryType==='book'?'Books, history & economy':entryType==='routine'?'Fitness & recovery':'Saved insights'))===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
  ${entryType==='book'?`<label for="book-author">Author · optional</label><input id="book-author" name="author" maxlength="200" value="${esc(note?.author||'')}"><label for="book-status">Reading status</label><select id="book-status" name="readingStatus">${['To read','Reading','Finished'].map(v=>`<option ${note?.readingStatus===v?'selected':''}>${v}</option>`).join('')}</select><div class="form-row"><div><label for="book-pages">Pages read</label><input id="book-pages" name="pagesRead" type="number" min="0" value="${note?.pagesRead||0}"></div><div><label for="book-total">Total pages · optional</label><input id="book-total" name="pagesTotal" type="number" min="0" value="${note?.pagesTotal||0}"></div></div>`:entryType==='routine'?`<label for="routine-target">Flexible weekly target</label><input id="routine-target" name="routineTarget" type="number" min="1" max="7" required value="${note?.routineTarget||3}"><p>Check days in Plans → Optional routines. No broken-streak penalties.</p>`:''}
  <label for="note-url">Resource link · optional</label><input id="note-url" name="url" type="url" placeholder="https://…" value="${esc(note?.url||'')}"><label for="note-body">${entryType==='book'?'One insight and how you will use it':'Practical note'}</label><textarea id="note-body" name="body" maxlength="20000" rows="5">${esc(note?.body||captured?.text||'')}</textarea>${actions('Save to Vault',note?`<button type="button" class="button ghost" data-action="archive-note" data-id="${esc(id)}">${note.archived?'Restore resource':'Archive resource'}</button><button type="button" class="button danger" data-action="delete-note" data-id="${esc(id)}">Delete resource</button>`:'')}</form>`);
}
function legacyModal(filter='All') {
  const entries = records(state,'legacy').filter(l=>l.category!=='Source archive'&&l.kind!=='goal-history');
  const groups = [...new Set(entries.map(l=>l.category))];
  modal('Your preserved records', 'All original fields are retained. Bring useful records into the Vault when needed.', `<label for="legacy-filter">Original category</label><select id="legacy-filter">${['All',...groups].map(g=>`<option ${filter===g?'selected':''}>${esc(g)}</option>`).join('')}</select>${entries.filter(l=>filter==='All'||l.category===filter).map(l=>{
    let original;try{original=JSON.parse(l.body);}catch{original={note:l.body};}
    return `<details class="review-entry"><summary>${esc(l.title)} · ${esc(l.category)}</summary>${Object.entries(original).map(([k,v])=>`<p><strong>${esc(k)}:</strong> ${esc(typeof v==='object'?JSON.stringify(v):v)}</p>`).join('')}<button class="button soft" data-action="legacy-note" data-id="${esc(l.id)}">Copy into an editable Vault note</button></details>`;
  }).join('') || '<p>No records in this category.</p>'}`);
}
function download(value, name, type='application/json') {
  const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function exportBackup() {
  if(recoveryLocked){download({current:localStorage.getItem(STORAGE_KEY),legacy:localStorage.getItem('governor-data')},`governor-original-storage-${today()}.json`);toast('Original storage exported for recovery. It is not a normal restorable backup.');return;}
  download(makeBackup(state),`governor-backup-${today()}.json`); toast('Backup downloaded. Keep it in a safe place.');
}
function settingsModal() {
  const config=loadConfig(), signed=!!cloud.session?.user;
  modal('Your app. Your data.', 'Free to use. Saves on this device first. Private cloud sync is optional until you connect it.', `<section class="settings-section"><h3>Backups & migration</h3><p>Export before switching versions. Import merges records instead of replacing your current data. Both uploaded Governor formats are supported.</p><div class="backup-actions"><button class="button" data-action="export">Export backup</button><button class="button subtle" data-action="import">Import backup</button><input class="hidden" id="import-file" type="file" accept=".json,application/json">${storageError ? '<button class="button subtle" data-action="raw-export">Export original device storage</button>' : ''}</div><p>Backups contain personal notes. Keep them private. Sign-in credentials are excluded.</p>${records(state,'legacy').some(l=>l.source) ? '<button class="button ghost" data-action="source-export">Export untouched legacy source</button>' : ''}</section>
    <section class="settings-section"><h3>Private phone ↔ laptop sync</h3><p>${signed?`Signed in as ${esc(cloud.session.user.email)}. Edits merge automatically when online.`:'Connect your own free Supabase project, then sign in with the same email on both devices.'}</p><p id="cloud-message" class="form-error" role="status">${esc(cloud.lastError||'')}</p>${signed ? `<div class="backup-actions"><button class="button soft" data-action="sync-now">Sync now</button><button class="button subtle" data-action="sign-out">Sign out</button></div><p>Signing out leaves your saved local records on this device. Use your own phone or laptop.</p>` : ''}<details ${!config?'open':''}><summary>Cloud connection</summary><form id="cloud-config-form"><label for="cloud-url">Project URL</label><input id="cloud-url" type="url" name="url" value="${esc(config?.url||'')}" placeholder="https://your-project.supabase.co" required><label for="cloud-key">Public publishable / anon key</label><input id="cloud-key" name="key" value="${esc(config?.key||'')}" placeholder="sb_publishable_…" required autocomplete="off"><p>Use a public key only. Never enter a secret or service-role key.</p><button class="button soft" type="submit">Save connection</button></form></details>${config&&!signed ? `<form id="cloud-signin-form"><label for="cloud-email">Your email</label><input id="cloud-email" name="email" type="email" required autocomplete="email"><button class="button" type="submit" style="margin-top:14px">Email me a sign-in link</button><p>Open the link on this device. No password is stored in the app.</p></form>` : ''}<p><a class="helper-link" href="./docs/cloud-setup.html" target="_blank" rel="noopener">Simple cloud setup guide ↗</a></p></section>
    <section class="settings-section"><h3>Phone & offline use</h3><p>After one successful online visit, the app can reopen offline on supported browsers. Sync, sign-in and external links need internet. Keep regular backups; browsers can clear local storage.</p><p id="offline-state">${'serviceWorker' in navigator?'Checking offline installation…':'This browser does not support offline installation.'}</p><p>iPhone: Safari → Share → Add to Home Screen.<br>Android: Chrome menu → Install app / Add to Home screen.<br>Laptop: bookmark the same site, or install from your browser.</p><a class="helper-link" href="./docs/guide.html" target="_blank" rel="noopener">Short user guide ↗</a></section>`);
  if(config&&!signed) $('#cloud-signin-form').insertAdjacentHTML('afterend', `<details><summary>Use my existing email and password</summary><form id="cloud-password-form"><label for="password-email">Your email</label><input id="password-email" name="email" type="email" required autocomplete="username"><label for="cloud-password">Password</label><input id="cloud-password" name="password" type="password" required autocomplete="current-password"><button class="button soft" type="submit" style="margin-top:14px">Sign in</button><p>Your password is sent only to your own Supabase project over HTTPS. It is not saved or exported.</p></form></details>`);
  if(document.documentElement.hasAttribute('data-portable')) $('#offline-state').textContent='Portable copy: the app files are embedded in this HTML. Local daily work needs no network. Keep a separate exported data backup.';
  else if('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(reg=>{ const node=$('#offline-state'); if(node)node.textContent=reg?.active?'Offline app files are installed on this device.':'Offline files are not installed yet. Reopen on HTTPS after an online visit.'; });
}

async function runAction(action,id) {
  switch(action) {
    case 'close': closeModal();break;
    case 'undo': {const f=undoAction;undoAction=null;if(f)f();break;}
    case 'add-task': taskModal();break;
    case 'edit-task': taskModal(id);break;
    case 'complete': {const t=state.tasks[id]; if(!t)return;edit('tasks',id,{done:!t.done,completedAt:t.done?'':today()},t.done?'Action reopened.':'Action completed. A useful step forward.');break;}
    case 'primary': {const t=state.tasks[id];edit('tasks',id,{order:Math.min(0,...openToday().map(t=>t.order||0))-1},'Primary action updated.');closeModal();break;}
    case 'park-task': edit('tasks',id,{paused:true},'Parked for later. Nothing lost.');closeModal();break;
    case 'parked': parkedModal();break;
    case 'bring-task': {
      if(openToday().length>=taskLimit(state)){toast(`Keep at most ${taskLimit(state)} in focus. Park or complete one first.`);return;}
      const next=structuredClone(state);carryTask(next,id,today(),device,{order:openToday().length});write(next);closeModal();toast('Focused today. The earlier record is preserved.');break;
    }
    case 'inbox': inboxModal();break;
    case 'capture-note': noteModal(null,id);break;
    case 'archive-capture': edit('captures',id,{archived:true},'Thought archived.');inboxModal();break;
    case 'restore-capture': edit('captures',id,{archived:false},'Thought restored.');inboxModal();break;
    case 'checkin': checkinModal();break;
    case 'weekly': weeklyModal(id);break;
    case 'goal': goalModal(id);break;
    case 'add-goal': goalModal();break;
    case 'goal-history': goalHistoryModal(id);break;
    case 'deleted-goals': deletedGoalsModal();break;
    case 'delete-goal': modal('Delete this goal?', 'The goal leaves your plans. Earlier versions and linked actions remain saved.', `<p>${esc(state.goals[id].title)}</p><div class="modal-actions"><button class="button subtle" data-action="goal" data-id="${esc(id)}">Cancel</button><button class="button danger" data-action="confirm-delete-goal" data-id="${esc(id)}">Confirm deletion</button></div>`);break;
    case 'confirm-delete-goal': changeGoal(id,{deleted:true,status:'deleted',active:false},'Goal deleted. History and linked records retained.');closeModal();break;
    case 'goal-focus': {const g=state.goals[id];if(!g?.nextAction)return;const existing=dailyTasks(state).find(t=>t.goal===id&&t.action===g.nextAction&&!t.carriedTo);if(existing){if(existing.done){toast('This action is already completed today. Edit the goal’s next action when ready.');break;}if(existing.paused){if(openToday().length>=taskLimit(state))throw new Error('Park or complete one action before focusing another.');edit('tasks',existing.id,{paused:false},'Action focused today.');}zone='tunnel';location.hash='tunnel';render();break;}if(openToday().length>=taskLimit(state))throw new Error('Park or complete one action before focusing another.');edit('tasks',uid(),{title:g.title,action:g.nextAction,goal:id,date:today(),done:false,paused:false,order:openToday().length},'Next action focused today.');zone='tunnel';location.hash='tunnel';render();break;}
    case 'calendar': zone='compass';history.replaceState(null,'','#compass');render();$('#calendar-section').scrollIntoView({behavior:'instant',block:'start'});break;
    case 'calendar-day': calendarDayModal(id);break;
    case 'calendar-add': taskModal(null,id);break;
    case 'guide': guideModal();break;
    case 'search': searchModal();break;
    case 'area': category=id;query='';showArchive=false;zone='vault';location.hash='vault';render();window.scrollTo(0,0);break;
    case 'capture-task': taskModal(null,today(),id);break;
    case 'monthly': weeklyModal(id,'month');break;
    case 'book': noteModal(null,null,'book');break;
    case 'routine': noteModal(null,null,'routine');break;
    case 'routine-toggle': {const date=runAction.date,n=state.notes[id];if(!date||date>today()||n?.entryType!=='routine')break;const key=`routine-${id}-${date}`;edit('checkins',key,{date,note:n.title,energy:'routine',kind:'routine',routineId:id,done:!state.checkins[key]?.done},'Routine saved. Blank days are allowed.');break;}
    case 'delete-note': modal('Delete this resource?','Export a backup first if you want to keep a separate copy.',`<p>${esc(state.notes[id].title)}</p><div class="modal-actions"><button class="button subtle" data-action="note" data-id="${esc(id)}">Cancel</button><button class="button danger" data-action="confirm-delete-note" data-id="${esc(id)}">Confirm deletion</button></div>`);break;
    case 'confirm-delete-note': edit('notes',id,{deleted:true},'Resource deleted.');closeModal();break;
    case 'plan': planModal();break;
    case 'why': planModal(true);break;
    case 'note': noteModal(id);break;
    case 'archive-note': edit('notes',id,{archived:!state.notes[id].archived},state.notes[id].archived?'Resource restored.':'Resource archived.');closeModal();break;
    case 'vault-archive': showArchive=!showArchive;render();break;
    case 'legacy': legacyModal();break;
    case 'legacy-note': {const l=state.legacy[id];let obj;try{obj=JSON.parse(l.body);}catch{obj={note:l.body};}edit('notes',`copy-${id}`,{title:l.title,category:'Saved insights',body:Object.entries(obj).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n'),url:'',archived:false},'Copied into the Vault. Original preserved.');closeModal();break;}
    case 'timer-toggle': if(timer.end){timer.remaining=Math.max(0,Math.ceil((timer.end-Date.now())/1000));timer.end=0;}else{if(timer.remaining<=0)timer.remaining=timer.duration*60;timer.end=Date.now()+timer.remaining*1000;}saveTimer();updateTimer();break;
    case 'timer-reset': timer.end=0;timer.remaining=timer.duration*60;saveTimer();updateTimer();break;
    case 'settings': settingsModal();break;
    case 'export': exportBackup();break;
    case 'import': $('#import-file').click();break;
    case 'raw-export': download({current:localStorage.getItem(STORAGE_KEY),legacy:localStorage.getItem('governor-data')},`governor-original-storage-${today()}.json`);break;
    case 'source-export': {const sources=[...new Set(records(state,'legacy').map(l=>l.source).filter(Boolean))];for(const source of sources)download(recoverOriginal(state,source),`governor-legacy-original-${source}.json`);break;}
    case 'history-export': {const result={month:historyMonth,tasks:records(state,'tasks').filter(t=>taskHistoryDate(t).startsWith(historyMonth)),checkins:records(state,'checkins').filter(c=>c.date.startsWith(historyMonth)),reviews:records(state,'reviews').filter(r=>r.date.startsWith(historyMonth))};download(result,`governor-month-${historyMonth}.json`);toast('Month report downloaded. Use Export backup to make a restorable copy.');break;}
    case 'sync-now': await cloud.sync(); if($('#cloud-message'))$('#cloud-message').textContent=cloud.lastError||'Sync complete.';break;
    case 'sign-out': cloud.dispose();await cloud.signOut();location.reload();break;
  }
}
document.addEventListener('click', event=>{
  const target=event.target.closest('[data-action]');if(!target)return;
  event.preventDefault();runAction.date=target.dataset.date;Promise.resolve(runAction(target.dataset.action,target.dataset.id)).catch(error=>toast(error.message));
});
$('#settings-button').addEventListener('click',settingsModal);$('#capture-button').addEventListener('click',captureModal);
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const rect=$('#modal').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();}});
$('#modal').addEventListener('close',()=>{if(focusReturn?.isConnected)focusReturn.focus();});
window.addEventListener('hashchange',()=>{ const route=location.hash.slice(1);if(['tunnel','compass','vault'].includes(route)){zone=route;render();window.scrollTo(0,0);$('#main').focus({preventScroll:true});} });
document.addEventListener('input',event=>{
  if(['capture-text','modal-capture'].includes(event.target.id)){try{localStorage.setItem('governor.capture.draft',event.target.value);}catch{}}
  if(event.target.id==='vault-search'){query=event.target.value;$('#note-grid').innerHTML=groupedNotes();}
});
document.addEventListener('change',async event=>{
  try{
    if(event.target.id==='energy-mode')edit('settings','mode',{value:event.target.value},'Your pace is set.');
    if(event.target.id==='timer-duration'){timer.duration=Number(event.target.value);timer.remaining=timer.duration*60;timer.end=0;saveTimer();updateTimer();}
    if(event.target.id==='vault-category'){category=event.target.value;render();}
    if(event.target.id==='history-month'){historyMonth=event.target.value||today().slice(0,7);$('#month-history').innerHTML=historyHTML();}
    if(event.target.id==='goal-tracking'){const tracking=event.target.value;$('#manual-fields').hidden=tracking!=='manual';$('#target-fields').hidden=tracking!=='target';}
    if(event.target.id==='goal-filter'){goalFilter=event.target.value;render();}
    if(event.target.id==='chart-period'){chartPeriod=event.target.value;render();}
    if(event.target.id==='chart-month'){chartMonth=event.target.value||today().slice(0,7);render();}
    if(event.target.id==='calendar-month'){calendarMonth=event.target.value||today().slice(0,7);render();}
    if(event.target.id==='routine-week'){routineWeek=event.target.value||today();render();$('#main .routines-card details').open=true;}
    if(event.target.id==='legacy-filter')legacyModal(event.target.value);
    if(event.target.id==='import-file'){
      const file=event.target.files[0];if(!file)return;if(file.size>8000000)throw new Error('Choose a backup smaller than 8 MB.');
      const incoming=importFile(await file.text(),device);validateState(incoming);
      const existing=makeBackup(state);const merged=mergeStates(state,incoming);
      modal('Your import is ready.', 'Your current records will be kept. Matching records use the most recent edit. A backup of the current data will download before merging.', `<p class="modal-subtitle">${Object.keys(incoming.tasks).length} priorities · ${Object.keys(incoming.notes).length} notes · ${Object.keys(incoming.legacy).length} preserved legacy records</p><div class="modal-actions"><button class="button subtle" data-action="close">Cancel</button><button class="button" id="confirm-import">Back up & merge</button></div>`);
      $('#confirm-import').addEventListener('click',()=>{const wasLocked=recoveryLocked;try{if(wasLocked)download({current:localStorage.getItem(STORAGE_KEY),legacy:localStorage.getItem('governor-data')},`governor-original-storage-${today()}.json`);download(existing,`governor-before-import-${today()}.json`);recoveryLocked=false;write(mergeStates(state,merged));closeModal();toast('Import merged. Original and current records are preserved.');}catch(error){recoveryLocked=wasLocked;toast(error.message);}});
    }
  }catch(error){toast(error.message);}
});
document.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target;const formId=form.getAttribute('id');const f=Object.fromEntries(new FormData(form));const submit=form.querySelector('[type=submit]');
  if(submit)submit.disabled=true;
  try {
    if(['task-form','note-form','goal-form'].includes(formId)&&!f.title.trim())throw new Error('Give this a short, concrete name.');
    if(formId==='weekly-form'&&!f.wins.trim())throw new Error('Write one observation from this week. A difficult week is worth recording too.');
    switch(formId){
      case 'task-form': {const id=f.id||(f.capture?`capture-task-${f.capture}`:uid()), old=state.tasks[id], date=f.date||today();const count=dailyTasks(state,date).filter(t=>!t.done&&!t.paused&&!t.carriedTo&&t.id!==id).length;if((!old||old.date!==date)&&count>=(date===today()?taskLimit(state):3))throw new Error('This day already has enough priorities. Choose another day or park an action first.');if(f.capture&&old&&!old.deleted)throw new Error('This thought already has a priority. Edit that priority instead.');const values={title:f.title.trim(),action:f.action.trim()||f.title.trim(),goal:f.goal,date,done:old?.done||false,paused:old?.paused||false,order:old?.order??count};if(old&&old.date!==date){const next=structuredClone(state);carryTask(next,id,date,device,values);write(next);toast('Rescheduled. Earlier records retained.');}else edit('tasks',id,values,'Priority saved.');if(f.capture){const next=structuredClone(state);put(next,'captures',f.capture,{archived:true},device);write(next);}closeModal();break;}
      case 'search-form': case 'top-search': searchModal(f.query||'');break;
      case 'inline-capture': case 'capture-form': {const text=f.text.trim();if(!text)throw new Error('Write a thought first.');edit('captures',uid(),{text,date:today(),archived:false},'Thought saved. Back to your next action.',{redraw:false});localStorage.removeItem('governor.capture.draft');if($('#capture-text'))$('#capture-text').value='';if(formId==='capture-form')closeModal();else form.reset();break;}
      case 'checkin-form': edit('checkins',f.id,{date:today(),note:f.note.trim(),energy:f.energy},'Today’s check-in saved.');closeModal();break;
      case 'weekly-form': {const id=f.id||uid();edit('reviews',id,{date:state.reviews[id]?.date||today(),wins:f.wins.trim(),obstacles:f.obstacles.trim(),next:f.next.trim(),period:f.period||'week',archived:false},'Weekly review saved. One adjustment at a time.');closeModal();break;}
      case 'goal-form': {if(f.tracking==='target'&&!(Number(f.target)>0))throw new Error('Set a target greater than zero.');const values={title:f.title.trim(),subtitle:f.subtitle.trim(),outcome:f.outcome.trim(),milestone:f.milestone.trim(),evidence:f.evidence.trim(),status:f.status,tracking:f.tracking,progress:Number(f.progress),current:Number(f.current),target:Number(f.target),unit:f.unit.trim(),deadline:f.deadline,nextAction:f.nextAction.trim(),deleted:false};for(const n of [1,2,3]){values[`month${n}`]=f[`month${n}`].trim();values[`month${n}Done`]=f[`month${n}Done`]==='on';}changeGoal(f.id||uid(),values,'Goal and progress saved.');closeModal();break;}
      case 'plan-form': if(f.start&&f.horizon&&f.horizon<f.start)throw new Error('The planning horizon must be on or after the sprint start.');edit('settings','plan',f,'Your direction is saved.');closeModal();break;
      case 'note-form': {if(f.url&&!safeURL(f.url))throw new Error('Use a link beginning with https:// or http://.');const next=structuredClone(state), id=f.id||(f.capture?`capture-note-${f.capture}`:uid());const fields={title:f.title.trim(),category:f.category,body:f.body.trim(),url:f.url.trim(),entryType:f.entryType||'note',archived:state.notes[id]?.archived||false};if(f.entryType==='book'){fields.author=f.author.trim();fields.readingStatus=f.readingStatus;fields.pagesRead=Number(f.pagesRead);fields.pagesTotal=Number(f.pagesTotal);if(fields.pagesTotal>0&&fields.pagesRead>fields.pagesTotal)throw new Error('Pages read cannot exceed total pages.');}if(f.entryType==='routine')fields.routineTarget=Number(f.routineTarget);put(next,'notes',id,fields,device);if(f.capture)put(next,'captures',f.capture,{archived:true},device);write(next);closeModal();toast('Saved in the Vault.');break;}
      case 'cloud-config-form': if(cloud.session)throw new Error('Sign out before changing your cloud project.');saveConfig(f.url.trim(),f.key.trim());cloud.config=loadConfig();cloud.lastError='';settingsModal();toast('Connection saved. Sign in to enable cloud sync.');break;
      case 'cloud-signin-form': await cloud.sendLink(f.email.trim());$('#cloud-message').textContent='Check your email. Open the sign-in link on this device. If there is no email, check spam and the project’s email limits.';break;
      case 'cloud-password-form': await cloud.signInPassword(f.email.trim(),f.password);form.reset();await cloud.sync();settingsModal();toast(cloud.lastError||'Signed in. Your devices can now sync.');break;
    }
  }catch(error){const target=$('#form-error')||$('#cloud-message');if(target)target.textContent=error.message;else toast(error.message);}
  finally{if(submit?.isConnected)submit.disabled=false;}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY&&event.newValue){try{const merged=mergeStates(state,JSON.parse(event.newValue));if(JSON.stringify(merged)!==JSON.stringify(state))write(merged);else{state=merged;render();}}catch{toast('Another tab contains unreadable data. Your open copy is preserved.');}}});
window.addEventListener('online',()=>cloud.sync());window.addEventListener('offline',()=>cloud.sync());
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(today()!==lastToday){lastToday=today();render();}cloud.sync();updateTimer();}});
function timerText(){const seconds=timer.end?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function updateTimer(){if(timer.end&&timer.end<=Date.now()){timer.end=0;timer.remaining=0;saveTimer();toast('Focus time is complete. Take a breath and choose what’s next.');}if($('#timer-display'))$('#timer-display').textContent=timerText();if($('#timer-toggle'))$('#timer-toggle').textContent=timer.end?'Pause':'Start focus';if($('#timer-duration'))$('#timer-duration').disabled=!!timer.end;}
setInterval(updateTimer,1000);setInterval(()=>{if(!document.hidden)cloud.sync();},60000);
render();if(startupMessage)toast(startupMessage);
cloud.acceptLink().then(signed=>{if(signed)toast('Signed in. Your devices can now sync.');return cloud.sync();}).catch(error=>toast(error.message));
if(!document.documentElement.hasAttribute('data-portable') && 'serviceWorker' in navigator && (location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))){
  navigator.serviceWorker.register('./sw.js').then(reg=>{reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('An app update is ready. Close all Governor tabs and reopen to use it.');});});}).catch(()=>toast('Offline installation failed. Online use still works; try again after reconnecting.'));
}
