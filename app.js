import {STORAGE_KEY, initialState, validateState, records, dailyTasks, today, taskLimit, rolloverCandidates, activeGoals, put, uid, makeBackup, mergeStates, dayDifference, addDays} from './core.js';
import {CloudSync, loadConfig, saveConfig} from './cloud.js';
import {importFile, recoverOriginal} from './migration.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeURL = value => { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const CATEGORIES = ['BAUER / APM','KAITECH / BIM','Excel & automation','Communication & logic','Mind & capacity','Books, history & economy','Saved insights','Ideas for later'];
const friendlyDate = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'});
const taskHistoryDate = t => t.done && t.completedAt ? t.completedAt : t.date;
let device, state, startupMessage = '', storageError = false, recoveryLocked = false;
try {
  device = localStorage.getItem('governor.device') || uid(); localStorage.setItem('governor.device', device);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = validateState(JSON.parse(saved));
  else if (localStorage.getItem('governor-data')) { state = importFile(localStorage.getItem('governor-data'), device); startupMessage = 'Your earlier Governor records were preserved and imported. The original device copy is untouched.'; }
  else state = initialState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
} catch (error) { state = initialState(); storageError = true; recoveryLocked = true; startupMessage = 'Device storage could not be read or saved. Export your existing device data from Settings before continuing; no original data was overwritten.'; }
let zone = ['tunnel','compass','vault'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'tunnel';
let query = '', category = 'All', showArchive = false, historyMonth = today().slice(0,7), lastToday = today(), undoAction;
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
    put(restored, col, id, before || {...values, deleted:true}, device); write(restored); toast('Change undone.');
  };
  if (message) toast(message, undo);
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
  const tasks = visibleTasks(), primary = tasks[0], done = dailyTasks(state).filter(t => t.done), mode = state.settings.mode?.value || 'normal';
  const checkin = records(state,'checkins').find(x => x.date === today());
  return top(new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase(), 'A clear path for today.', 'Less to manage. More room for what matters.', `<div class="mode-control"><label class="sr-only" for="energy-mode">Energy mode</label><select id="energy-mode"><option value="normal" ${mode==='normal'?'selected':''}>Steady day</option><option value="low" ${mode==='low'?'selected':''}>Low energy</option><option value="maintenance" ${mode==='maintenance'?'selected':''}>Maintenance week</option></select></div>`) +
    (mode !== 'normal' ? `<div class="banner">${mode==='low'?'A lighter day is allowed. Choose one small action; the rest can wait.':'Keep the essentials going this week. One useful action a day is enough.'} Your other priorities are safely parked.</div>` : '') +
    `<section class="hero" aria-label="Primary mission"><div class="eyebrow"><span aria-hidden="true">✧</span> YOUR PRIMARY ACTION <span class="hero-tag">${primary ? esc(goalName(primary.goal)) : 'ONE STEP AT A TIME'}</span></div><h2>${esc(primary?.action || (done.length ? 'You’ve moved things forward.' : 'Choose one concrete next action.'))}</h2><p>${primary ? esc(primary.title) : done.length ? 'You can stop here, or choose another useful action. No score to chase.' : 'Start with something you can do, such as updating a progress sheet or checking one dataset.'}</p><div class="hero-action"><button class="button" data-action="${primary ? 'complete' : 'add-task'}" ${primary ? `data-id="${esc(primary.id)}"` : ''}>${primary ? '✓  Complete action' : '＋  Choose my next action'}</button><small>${primary ? 'One action. Then the next.' : 'Make it small enough to start.'}</small></div></section>
    <section><div class="section-head"><div><h2>Your daily priorities</h2><p>Each one has a next action. That’s all you need.</p></div><span class="badge">${tasks.length} of ${taskLimit(state)} in focus</span></div><div class="priority-list">${tasks.map((t,i)=>taskHTML(t,i)).join('') || '<div class="empty">Space to breathe. Choose a priority when you’re ready.</div>'}</div><div class="quiet-row"><button class="button ghost" data-action="add-task">＋ Add a priority</button><button class="button ghost" data-action="parked">Choose from parked actions →</button></div>${openToday().length > tasks.length ? '<p class="mode-note">Other actions are parked while you work at this pace.</p>' : ''}${done.length ? `<details><summary>${done.length} ${done.length===1?'action':'actions'} completed today</summary><div class="priority-list">${done.map(t=>taskHTML(t,0,true)).join('')}</div></details>` : ''}</section>
    <div class="lower-grid"><section class="card sage"><p class="eyebrow">PARK IT. KEEP GOING.</p><h2>A place for wandering thoughts</h2><p>Get it out of your head. You can come back later.</p><form id="inline-capture" class="capture-inline"><label class="sr-only" for="capture-text">Capture a thought</label><input id="capture-text" name="text" placeholder="A thought, an idea, a reminder…" maxlength="4000" required autocomplete="off"><button class="button" aria-label="Save thought">＋</button></form><button class="tiny-link" data-action="inbox">Your captured thoughts →</button></section><section class="card lavender"><p class="eyebrow">ONE THING AT A TIME</p><h2>A little space to focus</h2><p>Optional. Settle into the action in front of you.</p><div class="timer-row"><span class="timer-display" id="timer-display">${timerText()}</span><button class="button" data-action="timer-toggle" id="timer-toggle">${timer.end ? 'Pause' : 'Start focus'}</button><button class="icon-button" data-action="timer-reset" aria-label="Reset focus timer">↺</button><label class="sr-only" for="timer-duration">Focus length</label><select id="timer-duration" ${timer.end?'disabled':''}><option value="10" ${timer.duration===10?'selected':''}>10 min</option><option value="25" ${timer.duration===25?'selected':''}>25 min</option><option value="50" ${timer.duration===50?'selected':''}>50 min</option></select></div></section></div>
    <section class="end-day"><div><h2>${checkin ? 'Your day, saved.' : 'Close the day gently.'}</h2><p>${checkin ? esc(checkin.note.slice(0,100)) || 'A small moment of reflection.' : 'One useful step. One adjustment for tomorrow.'}</p></div><button class="button subtle" data-action="checkin">${checkin ? 'Edit check-in' : '2-minute check-in'} →</button></section>`;
}
function compass() {
  const plan = state.settings.plan, start = plan.start, end = plan.horizon || addDays(start,89), day = Math.max(1,dayDifference(today(),start)+1);
  const latest = records(state,'reviews').filter(r=>!r.archived).sort((a,b)=>b.date.localeCompare(a.date));
  return top('THE COMPASS · WEEKLY', 'Direction, without the noise.', 'Three outcomes. A weekly adjustment. A reason that is yours.', `<button class="button subtle" data-action="plan">Edit horizon</button>`) +
    `<div class="banner"><div class="plan-meta"><strong>Your sprint · ${friendlyDate(start)} – ${friendlyDate(end)}</strong><span>${day > dayDifference(end,start)+1 ? 'Your planning horizon has passed. Review and set the next chapter when ready.' : `Day ${day} of your current plan`}</span></div>${plan.military ? `<div>Military planning date: ${friendlyDate(plan.military)}. Adjust this whenever the timeline changes.</div>` : '<div>Military timing uncertain? Keep the date open and work with the horizon you know.</div>'}</div>
    <div class="section-head"><div><h2>Your three active outcomes</h2><p>Excel, speaking and automation support these projects.</p></div><span class="badge">90-day focus</span></div><div class="goal-grid">${activeGoals(state).map((g,i)=>`<article class="card goal-card"><div class="goal-number">0${i+1} / YOUR DIRECTION</div><h2>${esc(g.title)}</h2><span class="subtitle">${esc(g.subtitle)}</span><p class="goal-outcome">${esc(g.outcome)}</p><p class="milestone">${esc(g.milestone)}</p><div class="progress-line" role="progressbar" aria-valuenow="${g.progress}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(g.title)} milestone progress"><span style="width:${g.progress}%"></span></div><div class="progress-meta"><span>${g.progress}% of your milestone</span><span>Based on evidence</span></div>${g.evidence ? `<p class="evidence">${esc(g.evidence)}</p>` : ''}<button class="button soft" data-action="goal" data-id="${esc(g.id)}">Update milestone →</button></article>`).join('')}</div>
    <div class="section-stack"><section class="card"><div class="section-head"><div><p class="eyebrow">15 MINUTES · ONCE A WEEK</p><h2>Reflect. Adjust. Move on.</h2><p>${latest[0] ? `Last review: ${friendlyDate(latest[0].date)}` : 'No catch-up required. Start with this week.'}</p></div><button class="button" data-action="weekly">Start weekly review →</button></div><p>5 minutes: what actually moved? 5 minutes: what got in the way? 5 minutes: choose next week’s adjustments.</p><details><summary>Past weekly reviews</summary>${latest.map(r=>`<article class="review-entry"><div class="section-head"><h3>${friendlyDate(r.date)}</h3><button class="button ghost" data-action="weekly" data-id="${esc(r.id)}">Edit</button></div><p><strong>Progress:</strong> ${esc(r.wins)}<br><strong>Lessons:</strong> ${esc(r.obstacles)}<br><strong>Next week:</strong> ${esc(r.next)}</p></article>`).join('') || '<p>Your first review will appear here.</p>'}</details></section>
    <section class="card"><div class="section-head"><div><p class="eyebrow">YOUR WHY · YOUR OWN MEASURING STICK</p><h2>Where do you want this to lead?</h2></div><button class="button ghost" data-action="why">Edit your Why →</button></div><div class="why-grid">${[1,3,5].map(n=>`<div><h3>${n} ${n===1?'year':'years'}</h3><p>${esc(plan[`why${n}`] || ({1:'What would make the next year meaningful for you?',3:'What kind of engineer and person do you want to become?',5:'What freedom, contribution and way of life are you building toward?'})[n])}</p></div>`).join('')}</div></section>
    <section class="card"><p class="eyebrow">THE LONGER VIEW</p><h2>Your monthly record</h2><p>Actions and check-ins stay here across months. Missed days stay blank; there’s nothing to repair.</p><div class="history-filters"><label class="sr-only" for="history-month">Choose month</label><input type="month" id="history-month" value="${historyMonth}"><button class="button subtle" data-action="history-export">Export this month</button></div><div id="month-history">${historyHTML()}</div></section></div>`;
}
function historyHTML() {
  const tasks = records(state,'tasks').filter(t=>taskHistoryDate(t).startsWith(historyMonth));
  const logs = records(state,'checkins').filter(c=>c.date.startsWith(historyMonth));
  const dates = [...new Set([...tasks.map(taskHistoryDate),...logs.map(x=>x.date)])].sort().reverse();
  return `<p class="history-count">${tasks.filter(t=>t.done).length} completed actions · ${logs.length} check-ins</p>${dates.map(date=>`<div class="history-day"><h3>${friendlyDate(date)}</h3>${tasks.filter(t=>taskHistoryDate(t)===date).map(t=>`<p><span class="${t.done?'done-label':'archived-label'}">${t.done?'✓ Completed':t.paused?'Parked':'Planned'}</span> · ${esc(t.title)}</p>`).join('')}${logs.filter(c=>c.date===date).map(c=>`<p>${esc(c.energy)} · ${esc(c.note)}</p>`).join('')}</div>`).join('') || '<p>No entries this month. Your saved months remain available in the selector.</p>'}`;
}
function noteHTML(note) {
  const url = safeURL(note.url);
  return `<article class="card note-card"><div class="note-tag">${esc(note.category).toUpperCase()}${note.archived ? ' · ARCHIVED' : ''}</div><h2>${esc(note.title)}</h2><p>${esc(note.body)}</p><div class="note-actions">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : '<span></span>'}<button class="button ghost" data-action="note" data-id="${esc(note.id)}">Edit →</button></div></article>`;
}
function vaultNotes() { return records(state,'notes').filter(n=>showArchive ? n.archived : !n.archived).filter(n=>category==='All'||n.category===category).filter(n=>`${n.title} ${n.body} ${n.category}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.updatedAt-a.updatedAt); }
function vault() {
  return top('THE VAULT · REFERENCE, AT YOUR PACE', 'Keep the useful things close.', 'Practical notes for every part of your ambition. No extra task list.') +
    `<div class="vault-toolbar"><label class="sr-only" for="vault-search">Search the Vault</label><input id="vault-search" type="search" placeholder="Search a topic, note or idea…" value="${esc(query)}"><label class="sr-only" for="vault-category">Filter by topic</label><select id="vault-category">${['All',...new Set([...CATEGORIES,...records(state,'notes').map(n=>n.category)])].map(c=>`<option ${category===c?'selected':''}>${esc(c)}</option>`).join('')}</select><button class="button" data-action="note">＋ Save a note</button></div><div class="section-head"><span class="subtitle">${showArchive?'Archived resources':'Your reference shelf'} · available offline</span><button class="button ghost" data-action="vault-archive">${showArchive?'Show active resources':'View archived resources'}</button></div><div id="note-grid" class="note-grid">${vaultNotes().map(noteHTML).join('') || '<div class="empty">No matching notes. Save one useful insight when you find it.</div>'}</div>
    <section class="card" style="margin-top:24px"><div class="section-head"><div><h2>Your thought inbox</h2><p>Captured in the moment. Decide what to keep whenever it helps.</p></div><button class="button ghost" data-action="inbox">Open inbox →</button></div><p>${records(state,'captures').filter(c=>!c.archived).length} thoughts saved. They do not become tasks automatically.</p></section>
    ${records(state,'legacy').length ? `<section class="card"><h2>Your preserved Governor records</h2><p>Original projects, goals, habits, books and other categories are still here. Their complete original fields are also included in backups.</p><button class="button soft" data-action="legacy">Browse preserved records →</button></section>` : ''}`;
}
function render() {
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
  const first = $('#modal-content input:not([type=hidden]), #modal-content textarea'); if(first) setTimeout(()=>first.focus(),30);
}
function closeModal() { $('#modal').close(); if(focusReturn?.isConnected) focusReturn.focus(); }
function actions(text='Save', extra='') { return `<p id="form-error" class="form-error" role="alert"></p><div class="modal-actions">${extra}<button type="button" class="button subtle" data-action="close">Cancel</button><button class="button" type="submit">${text}</button></div>`; }
function taskModal(id) {
  const task = id ? state.tasks[id] : null;
  if(!task && openToday().length >= taskLimit(state)) { toast(`Keep ${taskLimit(state)} in focus. Park or complete an action before adding another.`); return; }
  modal(task?'Edit your priority':'One priority. One next action.', 'Use a verb and a real output. Example: “Update quantities in the BAUER progress sheet.”', `<form id="task-form"><input type="hidden" name="id" value="${esc(id||'')}"><label for="task-title">Priority</label><input id="task-title" name="title" value="${esc(task?.title||'')}" placeholder="Finish the KAITECH data map" required maxlength="160"><label for="task-action">The next concrete action <small>optional if the priority is already concrete</small></label><textarea id="task-action" name="action" placeholder="Check the source IDs against the schema" maxlength="1000">${esc(task?.action||'')}</textarea><label for="task-goal">Supports</label><select id="task-goal" name="goal">${activeGoals(state).map(g=>`<option value="${esc(g.id)}" ${task?.goal===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select>${actions('Save priority',task?`<button type="button" class="button ghost" data-action="park-task" data-id="${esc(id)}">Park for later</button><button type="button" class="button soft" data-action="primary" data-id="${esc(id)}">Make primary</button>`:'')}</form>`);
}
function captureModal() {
  modal('Park the thought.', 'You don’t need to solve it now. Your current work stays where you left it.', `<form id="capture-form"><label class="sr-only" for="modal-capture">Thought or idea</label><textarea id="modal-capture" name="text" placeholder="What’s on your mind?" required maxlength="4000">${esc(localStorage.getItem('governor.capture.draft')||'')}</textarea>${actions('Capture & return')}</form>`);
}
function inboxModal() {
  const inbox = records(state,'captures').filter(c=>!c.archived).sort((a,b)=>b.updatedAt-a.updatedAt);
  modal('Your thought inbox', 'Keep useful ideas. Park the rest without making another obligation.', `<ul class="capture-list">${inbox.map(c=>`<li><div style="flex:1;min-width:0"><p>${esc(c.text)}</p><time>${friendlyDate(c.date)}</time></div><button class="button ghost" data-action="capture-note" data-id="${esc(c.id)}">Keep in Vault</button><button class="icon-button" data-action="archive-capture" data-id="${esc(c.id)}" aria-label="Archive thought">✓</button></li>`).join('')||'<li><p>Your inbox is clear.</p></li>'}</ul><details><summary>Archived thoughts</summary><ul class="capture-list">${records(state,'captures').filter(c=>c.archived).map(c=>`<li><p>${esc(c.text)}</p><button class="button ghost" data-action="restore-capture" data-id="${esc(c.id)}">Restore</button></li>`).join('')||'<p>Nothing archived.</p>'}</ul></details>`);
}
function parkedModal() {
  const items = records(state,'tasks').filter(t=>!t.done && (t.paused || t.date!==today() || !visibleTasks().some(x=>x.id===t.id))).sort((a,b)=>b.updatedAt-a.updatedAt);
  modal('Pick up where it makes sense.', 'Nothing here is “overdue.” Bring back one useful action; leave the rest for later.', `<ul class="capture-list">${items.map(t=>`<li><div style="flex:1;min-width:0"><p><strong>${esc(t.title)}</strong><br>${esc(t.action)}</p></div><button class="button soft" data-action="bring-task" data-id="${esc(t.id)}">Focus today</button><button class="icon-button" data-action="edit-task" data-id="${esc(t.id)}" aria-label="Edit ${esc(t.title)}">⋯</button></li>`).join('')||'<li><p>No parked actions. Add a priority when you need one.</p></li>'}</ul>`);
}
function checkinModal() {
  const c = records(state,'checkins').find(x=>x.date===today());
  modal('Close the day gently.', 'One sentence is enough. You can skip this whenever it doesn’t help.', `<form id="checkin-form"><input type="hidden" name="id" value="${esc(c?.id||today())}"><label>How was your capacity today?</label><div class="checkin-choice">${['low','okay','good'].map(v=>`<label><input type="radio" name="energy" value="${v}" ${(c?.energy||'okay')===v?'checked':''}>${v}</label>`).join('')}</div><label for="checkin-note">One useful step or tomorrow’s adjustment</label><textarea id="checkin-note" name="note" maxlength="4000" placeholder="Finished the data checks. Tomorrow I’ll start with the report.">${esc(c?.note||'')}</textarea>${actions('Save check-in')}</form>`);
}
function weeklyModal(id) {
  const review = id ? state.reviews[id] : records(state,'reviews').find(r=>r.date===today());
  const done = records(state,'tasks').filter(t=>t.done && taskHistoryDate(t)>=addDays(today(),-6) && taskHistoryDate(t)<=today());
  const suggested = done.map(t=>`• ${t.title}`).join('\n');
  modal('Your 15-minute weekly review', 'Adjust the system to real life. There is no missing-week backlog.', `<form id="weekly-form"><input type="hidden" name="id" value="${esc(review?.id||'')}"><div class="review-prompt"><h3>1. What actually moved? · 5 min</h3><p>Look at evidence for BAUER, KAITECH and your capacity. ${done.length} actions completed this week.</p></div><label for="weekly-wins">Progress and evidence</label><textarea id="weekly-wins" name="wins" required maxlength="6000" placeholder="A report, a checked dataset, more sustainable sleep…">${esc(review?.wins||suggested)}</textarea><label for="weekly-obstacles">2. What got in the way? · 5 min</label><textarea id="weekly-obstacles" name="obstacles" maxlength="6000" placeholder="What made action harder? What could you simplify?">${esc(review?.obstacles||'')}</textarea><label for="weekly-next">3. What will you change next week? · 5 min</label><textarea id="weekly-next" name="next" maxlength="6000" placeholder="One adjustment for each active outcome. Consider a maintenance week when needed.">${esc(review?.next||'')}</textarea>${actions('Save review')}</form>`);
}
function goalModal(id) {
  const g = state.goals[id]; if(!g)return;
  modal('A milestone you can point to.', 'Use a finished deliverable or observed change. The percentage is your estimate, not a productivity score.', `<form id="goal-form"><input type="hidden" name="id" value="${esc(id)}"><label for="goal-title">Priority name</label><input id="goal-title" name="title" value="${esc(g.title)}" maxlength="120" required><label for="goal-outcome">The outcome</label><textarea id="goal-outcome" name="outcome" maxlength="2000" required>${esc(g.outcome)}</textarea><label for="goal-milestone">Monthly milestones</label><textarea id="goal-milestone" name="milestone" maxlength="2000">${esc(g.milestone)}</textarea><label for="goal-progress">Milestone progress · 0–100%</label><input type="number" id="goal-progress" name="progress" min="0" max="100" required value="${g.progress}"><label for="goal-evidence">Evidence of progress</label><textarea id="goal-evidence" name="evidence" maxlength="3000" placeholder="What exists now that didn’t exist last week?">${esc(g.evidence)}</textarea>${actions('Save milestone')}</form>`);
}
function planModal(whyOnly=false) {
  const p = state.settings.plan;
  modal(whyOnly?'Your reasons. Your own pace.':'Plan with the time you know.',whyOnly?'These are your reasons, not someone else’s success criteria.':'A 90-day sprint is a guide. Change the horizon when military timing becomes clearer.', `<form id="plan-form">${whyOnly ? [1,3,5].map(n=>`<label for="why-${n}">${n}-year Why</label><textarea id="why-${n}" name="why${n}" maxlength="4000" placeholder="What do I want, and why does it matter to me?">${esc(p[`why${n}`])}</textarea>`).join('') : `<label for="plan-start">Sprint start</label><input id="plan-start" name="start" type="date" required value="${esc(p.start)}"><label for="plan-end">Planning horizon <small>optional; defaults to 90 days</small></label><input id="plan-end" name="horizon" type="date" value="${esc(p.horizon)}"><label for="plan-military">Expected military date <small>leave blank if uncertain</small></label><input id="plan-military" name="military" type="date" value="${esc(p.military)}">`}${actions('Save direction')}</form>`);
}
function noteModal(id, fromCapture) {
  const note = state.notes[id], captured = fromCapture ? state.captures[fromCapture] : null;
  modal(note?'Edit your resource':'Save one useful thing.', 'A link, a practical lesson or an idea for later. It creates no new commitment.', `<form id="note-form"><input type="hidden" name="id" value="${esc(id||'')}"><input type="hidden" name="capture" value="${esc(fromCapture||'')}"><label for="note-title">Title</label><input id="note-title" name="title" required maxlength="200" value="${esc(note?.title||captured?.text.slice(0,100)||'')}"><label for="note-category">Topic</label><select id="note-category" name="category">${[...new Set([...CATEGORIES,...(note?.category?[note.category]:[])])].map(c=>`<option ${(note?.category||'Saved insights')===c?'selected':''}>${esc(c)}</option>`).join('')}</select><label for="note-url">Resource link <small>optional</small></label><input id="note-url" name="url" type="url" placeholder="https://…" value="${esc(note?.url||'')}"><label for="note-body">Practical note</label><textarea id="note-body" name="body" maxlength="20000" rows="6">${esc(note?.body||captured?.text||'')}</textarea>${actions('Save to Vault',note?`<button type="button" class="button ghost" data-action="archive-note" data-id="${esc(id)}">${note.archived?'Restore resource':'Archive resource'}</button>`:'')}</form>`);
}
function legacyModal(filter='All') {
  const entries = records(state,'legacy').filter(l=>l.category!=='Source archive');
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
      if(openToday().filter(t=>!t.paused).length>=taskLimit(state)) {toast(`Keep at most ${taskLimit(state)} in focus. Park or complete one first.`);return;}
      // Create a new daily instance to retain the original month’s planned record.
      const t=state.tasks[id], next=structuredClone(state), fresh=uid();
      put(next,'tasks',id,{paused:true},device);put(next,'tasks',fresh,{...t,id:fresh,date:today(),paused:false,done:false,completedAt:'',order:openToday().length},device);write(next);closeModal();toast('Brought into today. The earlier record is preserved.');break;
    }
    case 'inbox': inboxModal();break;
    case 'capture-note': noteModal(null,id);break;
    case 'archive-capture': edit('captures',id,{archived:true},'Thought archived.');inboxModal();break;
    case 'restore-capture': edit('captures',id,{archived:false},'Thought restored.');inboxModal();break;
    case 'checkin': checkinModal();break;
    case 'weekly': weeklyModal(id);break;
    case 'goal': goalModal(id);break;
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
  event.preventDefault();Promise.resolve(runAction(target.dataset.action,target.dataset.id)).catch(error=>toast(error.message));
});
$('#settings-button').addEventListener('click',settingsModal);$('#capture-button').addEventListener('click',captureModal);
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const rect=$('#modal').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();}});
$('#modal').addEventListener('close',()=>{if(focusReturn?.isConnected)focusReturn.focus();});
window.addEventListener('hashchange',()=>{ const route=location.hash.slice(1);if(['tunnel','compass','vault'].includes(route)){zone=route;render();window.scrollTo(0,0);$('#main').focus({preventScroll:true});} });
document.addEventListener('input',event=>{
  if(['capture-text','modal-capture'].includes(event.target.id)){try{localStorage.setItem('governor.capture.draft',event.target.value);}catch{}}
  if(event.target.id==='vault-search'){query=event.target.value;$('#note-grid').innerHTML=vaultNotes().map(noteHTML).join('')||'<div class="empty">No matching resources.</div>';}
});
document.addEventListener('change',async event=>{
  try{
    if(event.target.id==='energy-mode')edit('settings','mode',{value:event.target.value},'Your pace is set.');
    if(event.target.id==='timer-duration'){timer.duration=Number(event.target.value);timer.remaining=timer.duration*60;timer.end=0;saveTimer();updateTimer();}
    if(event.target.id==='vault-category'){category=event.target.value;render();}
    if(event.target.id==='history-month'){historyMonth=event.target.value||today().slice(0,7);$('#month-history').innerHTML=historyHTML();}
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
      case 'task-form': {const id=f.id||uid();if(!f.id&&openToday().length>=taskLimit(state))throw new Error('Complete or park an action before adding another.');edit('tasks',id,{title:f.title.trim(),action:f.action.trim()||f.title.trim(),goal:f.goal,date:state.tasks[id]?.date||today(),done:state.tasks[id]?.done||false,paused:state.tasks[id]?.paused||false,order:state.tasks[id]?.order??openToday().length},'Priority saved.');closeModal();break;}
      case 'inline-capture': case 'capture-form': {const text=f.text.trim();if(!text)throw new Error('Write a thought first.');edit('captures',uid(),{text,date:today(),archived:false},'Thought saved. Back to your next action.',{redraw:false});localStorage.removeItem('governor.capture.draft');if($('#capture-text'))$('#capture-text').value='';if(formId==='capture-form')closeModal();else form.reset();break;}
      case 'checkin-form': edit('checkins',f.id,{date:today(),note:f.note.trim(),energy:f.energy},'Today’s check-in saved.');closeModal();break;
      case 'weekly-form': {const id=f.id||uid();edit('reviews',id,{date:state.reviews[id]?.date||today(),wins:f.wins.trim(),obstacles:f.obstacles.trim(),next:f.next.trim(),archived:false},'Weekly review saved. One adjustment at a time.');closeModal();break;}
      case 'goal-form': edit('goals',f.id,{title:f.title.trim(),outcome:f.outcome.trim(),milestone:f.milestone.trim(),progress:Number(f.progress),evidence:f.evidence.trim()},'Milestone saved.');closeModal();break;
      case 'plan-form': if(f.start&&f.horizon&&f.horizon<f.start)throw new Error('The planning horizon must be on or after the sprint start.');edit('settings','plan',f,'Your direction is saved.');closeModal();break;
      case 'note-form': {if(f.url&&!safeURL(f.url))throw new Error('Use a link beginning with https:// or http://.');const next=structuredClone(state);put(next,'notes',f.id||uid(),{title:f.title.trim(),category:f.category,body:f.body.trim(),url:f.url.trim(),archived:false},device);if(f.capture)put(next,'captures',f.capture,{archived:true},device);write(next);closeModal();toast('Saved in the Vault.');break;}
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
