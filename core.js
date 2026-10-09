export const STORAGE_KEY = 'governor.os.v1';
export const COLLECTIONS = ['tasks', 'captures', 'notes', 'goals', 'reviews', 'checkins', 'settings', 'legacy'];
export const today = () => localDate(new Date());
export function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(date, days) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return localDate(d); }
export function dayDifference(a, b) { return Math.round((new Date(`${a}T12:00:00Z`) - new Date(`${b}T12:00:00Z`)) / 86400000); }
export function uid() { return crypto.randomUUID(); }
export function emptyState() { return {schemaVersion: 1, ...Object.fromEntries(COLLECTIONS.map(k => [k, {}]))}; }
export function initialState(date = today()) {
  const s = emptyState();
  const record = (id, data) => ({id, ...data, updatedAt: 0, device: 'seed'});
  s.goals.bauer = record('bauer', {title: 'BAUER', subtitle: 'Construction & project control', outcome: 'Build a practical project-control pack: progress, cost, risks and a clear weekly report.', milestone: 'Month 1: understand the project → Month 2: build a control pack → Month 3: present it', progress: 0, evidence: '', active: true});
  s.goals.kaitech = record('kaitech', {title: 'KAITECH', subtitle: 'Data Management & graduation project', outcome: 'Finish the Data Management module and submit a usable, documented graduation-project deliverable.', milestone: 'Month 1: map requirements → Month 2: build & validate → Month 3: submit & explain', progress: 0, evidence: '', active: true});
  s.goals.capacity = record('capacity', {title: 'Personal capacity', subtitle: 'Strength, sleep & attention', outcome: 'Find a sustainable training, sleep and focus routine that holds up during demanding weeks.', milestone: 'Month 1: find a baseline → Month 2: make it consistent → Month 3: prepare a maintenance routine', progress: 0, evidence: '', active: true});
  Object.assign(s.goals.bauer,{status:'active',tracking:'milestones',target:0,current:0,unit:'deliverables',deadline:'',nextAction:'Write three lines: progress this week, one risk, and the next site action.',month1:'Understand the site workflow and agree the report format.',month2:'Build a quantities, progress, cost and risk control pack.',month3:'Present a clear project update with supporting evidence.'});
  Object.assign(s.goals.kaitech,{status:'active',tracking:'milestones',target:0,current:0,unit:'deliverables',deadline:'',nextAction:'List the remaining Data Management deliverables. Start the smallest unfinished part.',month1:'Map requirements, source data and the graduation-project scope.',month2:'Build and validate the Data Management and BIM deliverables.',month3:'Submit documented outputs and explain the validation results.'});
  Object.assign(s.goals.capacity,{status:'active',tracking:'milestones',target:0,current:0,unit:'sessions',deadline:'',nextAction:'Take a 20-minute walk or do your planned training. Choose a bedtime for tonight.',month1:'Find a sustainable strength, sleep and recovery baseline.',month2:'Maintain a realistic training and attention routine.',month3:'Prepare a minimum routine for military service or busy weeks.'});
  s.settings.plan = record('plan', {start: date, horizon: '', military: '', why1: '', why3: '', why5: ''});
  s.settings.mode = record('mode', {value: 'normal'});
  s.tasks['starter-bauer'] = record('starter-bauer', {title: 'Prepare a BAUER project update', action: 'Write three lines: progress this week, one risk, and the next site action.', minutes:30, goal: 'bauer', date, done: false, order: 0, paused: false});
  s.tasks['starter-kaitech'] = record('starter-kaitech', {title: 'Move the KAITECH deliverable forward', action: 'List the remaining Data Management deliverables. Start the smallest unfinished part.', minutes:45, goal: 'kaitech', date, done: false, order: 1, paused: false});
  s.tasks['starter-capacity'] = record('starter-capacity', {title: 'Protect your capacity', action: 'Take a 20-minute walk or do your planned training. Choose a bedtime for tonight.', minutes:20, goal: 'capacity', date, done: false, order: 2, paused: false});
  const resources = [
    ['bauer-update','BAUER / APM','A useful weekly project update','Keep it to one page: planned vs actual progress, cost or quantity changes, top three risks, and actions with an owner and date. Practice explaining it aloud in two minutes. This integrates Excel, APM thinking and communication.'],
    ['bauer-controls','BAUER / APM','Build your construction-control pack','Use a real project when available. Start with a simple quantity/progress register in Excel. Add a look-ahead plan, risk log and one weekly report. Learn one relevant formula while using it.'],
    ['kaitech-data','KAITECH / BIM','Data Management: the next deliverable','Write the required output, input data, schema, validation rules, and evidence of completion. Work on one unfinished output. Keep graduation-project files in their existing storage; link them here.'],
    ['bim-quality','KAITECH / BIM','A practical BIM quality check','For a model or dataset, check naming, IDs, units, missing fields and ownership. Save one issue and how you resolved it. Avoid collecting tools before a real need exists.'],
    ['excel-practice','Excel & automation','Learn Excel through your project','Use the BAUER progress sheet or KAITECH dataset. Practice filters and tables, then SUMIFS, XLOOKUP and PivotTables as needed. Produce a useful report, rather than adding a separate study track.'],
    ['automation','Excel & automation','Automate one repeated step','Pick a step you repeat weekly. Write its input, output and exception rules. Start with free Excel features or a local script; verify results against the manual version. No paid AI service is required.'],
    ['communication','Communication & logic','Speak clearly: two minutes, one point','Record yourself explaining a real project update in English: situation → evidence → recommendation. Listen once. Improve one sentence and record again. This also practices public speaking and presenting value.'],
    ['arguments','Communication & logic','A stronger argument in four lines','Write: claim, evidence, strongest objection, response. Separate facts from assumptions. For a client conversation, first ask about their problem; connect your recommendation to their outcome.'],
    ['comparison-reset','Mind & capacity','When comparison hijacks your attention','Park the thought in Quick capture. Take three slow breaths. Name the feeling without arguing with it. Ask: what is one controllable action I can do for five minutes? Resume that action; the thought can wait.'],
    ['fitness-plan','Mind & capacity','Train sustainably','Use a routine suited to your current level: two or three short strength sessions each week, easy walking and recovery. Track evidence that matters to you, such as exercise quality or sleep, in the weekly review. Adjust for injuries and your own needs.'],
    ['reading','Books, history & economy','Read to change one decision','Keep one active book or topic. After a short reading session, write one idea and one way to use it. For history or economics, ask what caused the event, who faced which incentives, and what evidence supports the explanation.'],
    ['mentors','Ideas for later','Use inspiration without adding more tracks','Mo Moshrif: connect 1-, 3- and 5-year goals to a personal why. Mohamed Radwan, Eslam Daghash and Simon Squibb: save a specific lesson and test one useful action. Eileen Gu / Bassem Youssef: study one clear explanation. Ian Barseagle: use inspiration while training at your own level.'],
    ['military','Mind & capacity','Before and during military service','Set a planning horizon in the Compass when you know more. Before departure, export a backup and prepare one maintenance action for learning, one for movement and one for staying in touch. Use maintenance mode during constrained weeks; revise the plan when reality changes.'],
    ['german-practice','German','Learn German through one useful situation','Pick a practical situation, such as introducing your work or asking a site question. Save five useful phrases, listen to their pronunciation, and practise a short exchange. Keep this optional; add a learning goal only when your main priorities have room.'],
    ['finance-purchases','Finance & purchases','Make a purchase decision before spending','Write the item, price, purpose, alternatives and earliest sensible purchase date. Compare it with your available budget and near-term commitments. Keep financial notes private. This is a reference for decisions, not another daily habit.'],
    ['recovery-baseline','Fitness & recovery','Build capacity that lasts','Choose two or three sustainable strength sessions per week, easy walking, and a consistent sleep opportunity. Record a real baseline such as comfortable pull-ups, pain-free exercise, or average bedtime. Use your weekly review to adjust; lower commitments during heavy coursework or military preparation.']
  ];
  for (const [id, category, title, body] of resources) s.notes[id] = record(id, {title, category, body, url: '', archived: false});
  return s;
}
export function validateState(value) {
  if (!value || value.schemaVersion !== 1) throw new Error('This backup uses an unsupported format. Your current data has not been changed.');
  const allowed = new Set(COLLECTIONS);
  for (const key of Object.keys(value)) if (key !== 'schemaVersion' && !allowed.has(key)) throw new Error('Unknown backup section.');
  let count = 0;
  for (const col of COLLECTIONS) {
    if (col === 'legacy' && value[col] === undefined) value = {...value, legacy: {}};
    const collection = value[col];
    if (!collection || typeof collection !== 'object' || Array.isArray(collection)) throw new Error(`Invalid ${col} section.`);
    for (const [id, item] of Object.entries(collection)) {
      count++;
      if (!item || typeof item !== 'object' || item.id !== id || ['__proto__', 'prototype', 'constructor'].includes(id) || !Number.isSafeInteger(item.updatedAt) || item.updatedAt < 0 || typeof item.device !== 'string') throw new Error(`Invalid record in ${col}.`);
      if (item.deleted !== undefined && typeof item.deleted !== 'boolean') throw new Error('Invalid archived record.');
      for (const v of Object.values(item)) if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean' && v !== null) throw new Error('Invalid record field.');
      if (Object.values(item).some(v => typeof v === 'string' && v.length > 100000)) throw new Error('A record is too large.');
      if (col === 'tasks' && (typeof item.title !== 'string' || typeof item.action !== 'string' || typeof item.goal !== 'string' || typeof item.date !== 'string')) throw new Error('Invalid priority.');
      if (col === 'captures' && typeof item.text !== 'string') throw new Error('Invalid thought.');
      if (col === 'notes' && (typeof item.title !== 'string' || typeof item.body !== 'string' || typeof item.category !== 'string' || typeof item.url !== 'string')) throw new Error('Invalid library entry.');
      if (col === 'goals' && (typeof item.title !== 'string' || typeof item.subtitle !== 'string' || typeof item.outcome !== 'string' || typeof item.milestone !== 'string' || typeof item.evidence !== 'string' || !Number.isFinite(item.progress) || item.progress < 0 || item.progress > 100)) throw new Error('Invalid outcome.');
      if (col === 'goals' && item.status !== undefined && !['active','paused','archived','completed','deleted'].includes(item.status)) throw new Error('Invalid goal status.');
      if (col === 'goals' && item.tracking !== undefined && !['manual','target','milestones'].includes(item.tracking)) throw new Error('Invalid goal measurement.');
      if (col === 'goals' && ['target','current'].some(k=>item[k]!==undefined && (!Number.isFinite(item[k]) || item[k]<0))) throw new Error('Invalid measurable target.');
      if (col === 'reviews' && (typeof item.date !== 'string' || typeof item.wins !== 'string' || typeof item.obstacles !== 'string' || typeof item.next !== 'string')) throw new Error('Invalid review.');
      if (col === 'checkins' && (typeof item.date !== 'string' || typeof item.note !== 'string' || typeof item.energy !== 'string')) throw new Error('Invalid check-in.');
      if (col === 'legacy' && (typeof item.title !== 'string' || typeof item.category !== 'string' || typeof item.body !== 'string')) throw new Error('Invalid preserved record.');
      if (col === 'settings' && id === 'plan' && ['start','horizon','military','why1','why3','why5'].some(k => typeof item[k] !== 'string')) throw new Error('Invalid sprint plan.');
      if (col === 'settings' && id === 'mode' && !['normal','low','maintenance'].includes(item.value)) throw new Error('Invalid energy mode.');
    }
  }
  if (count > 25000) throw new Error('This backup exceeds the supported size.');
  return structuredClone(value);
}
export function mergeStates(a, b) {
  a = validateState(a); b = validateState(b);
  const result = emptyState();
  for (const col of COLLECTIONS) {
    for (const id of new Set([...Object.keys(a[col]), ...Object.keys(b[col])])) {
      const x = a[col][id], y = b[col][id];
      const winner = !x ? y : !y ? x : x.updatedAt > y.updatedAt || (x.updatedAt === y.updatedAt && x.device >= y.device) ? x : y;
      result[col][id] = structuredClone(winner);
    }
  }
  return result;
}
export function records(state, col) { return Object.values(state[col]).filter(x => !x.deleted); }
export function dailyTasks(state, date = today()) { return records(state, 'tasks').filter(t => t.date === date).sort((a, b) => (a.order || 0) - (b.order || 0) || a.updatedAt - b.updatedAt); }
export function taskLimit(state) { return state.settings.mode?.value === 'normal' ? 3 : 1; }
export function rolloverCandidates(state, date = today()) { return records(state, 'tasks').filter(t => t.date < date && !t.done && !t.paused).sort((a, b) => b.date.localeCompare(a.date)); }
export function goalStatus(goal) { return goal.deleted ? 'deleted' : goal.status || (goal.archived ? 'archived' : goal.active ? 'active' : 'paused'); }
export function activeGoals(state) { return records(state, 'goals').filter(g => goalStatus(g) === 'active'); }
export function goalProgress(goal) {
  if (goal.tracking === 'target' && goal.target > 0) return Math.min(100, Math.max(0, Math.round(100 * (goal.current || 0) / goal.target)));
  if (goal.tracking === 'milestones') {
    const months = [1,2,3].filter(n => goal[`month${n}`]?.trim());
    return months.length ? Math.round(100 * months.filter(n => goal[`month${n}Done`]).length / months.length) : 0;
  }
  return Math.min(100, Math.max(0, Number(goal.progress) || 0));
}
function snapshotGoal(state, goal, device) {
  const group = `goal-history-${encodeURIComponent(goal.id)}-${goal.updatedAt}-${encodeURIComponent(goal.device)}`;
  const body = JSON.stringify(goal), parts = Math.ceil(body.length / 80000) || 1;
  for (let part = 0; part < parts; part++) {
    const id = `${group}-${part}`;
    if (state.legacy[id]) continue;
    put(state, 'legacy', id, {title:goal.title, category:'Goal history', kind:'goal-history', goalId:goal.id, historyId:group, part, parts, date:today(), body:body.slice(part*80000,(part+1)*80000)}, device);
  }
}
export function saveGoal(state, id, values, device, now = Date.now()) {
  if (state.goals[id]) snapshotGoal(state, state.goals[id], device);
  const next = {...state.goals[id], ...values};
  next.status = values.status || goalStatus(next);
  next.active = next.status === 'active' && !next.deleted;
  next.progress = goalProgress(next);
  const goal = put(state,'goals',id,next,device,now);
  snapshotGoal(state,goal,device);
  return goal;
}
export function goalHistory(state, id) {
  const groups = new Map();
  for (const item of records(state,'legacy').filter(x=>x.kind==='goal-history' && x.goalId===id)) {
    if (!groups.has(item.historyId)) groups.set(item.historyId,[]);
    groups.get(item.historyId).push(item);
  }
  return [...groups.values()].flatMap(parts=>{
    parts.sort((a,b)=>a.part-b.part);
    if(parts.length!==parts[0].parts) return [];
    try { return [JSON.parse(parts.map(x=>x.body).join(''))]; } catch { return []; }
  }).sort((a,b)=>b.updatedAt-a.updatedAt || b.device.localeCompare(a.device));
}
export function executionDays(state, start, count) {
  const days=Array.from({length:count},(_,i)=>({date:addDays(start,i),count:0}));
  const byDate=new Map(days.map(day=>[day.date,day]));
  for(const task of records(state,'tasks')) {
    if(!task.done || (task.legacyCompletion && !task.completedAt)) continue;
    const date=task.completedAt || task.date;
    if(byDate.has(date)) byDate.get(date).count++;
  }
  return days;
}
export function carryTask(state, id, date, device, values={}) {
  const task=state.tasks[id];
  if(!task || task.deleted) throw new Error('This priority is no longer available.');
  if(task.date===date) return put(state,'tasks',id,{...values,paused:false},device);
  const root=task.rolledFrom || id, destination=`carry-${root}-${date}`;
  if(state.tasks[destination] && !state.tasks[destination].deleted) throw new Error('This action already has an entry for that day. Edit that entry instead.');
  put(state,'tasks',id,{paused:!task.done,carriedTo:destination},device);
  return put(state,'tasks',destination,{...task,...values,date,rolledFrom:root,carriedTo:'',done:false,completedAt:'',paused:false},device);
}
export function put(state, col, id, values, device, now = Date.now()) {
  // A monotonic logical timestamp prevents clock changes from resurrecting old edits.
  const maxTime = Math.max(0, ...COLLECTIONS.flatMap(k => Object.values(state[k]).map(x => x.updatedAt)));
  state[col][id] = {...state[col][id], ...values, id, updatedAt: Math.max(now, maxTime + 1), device};
  return state[col][id];
}
export function makeBackup(state) { return {format: 'governor-backup', version: 1, exportedAt: new Date().toISOString(), data: validateState(state)}; }
export function readBackup(text) { const value = JSON.parse(text); if (value.format !== 'governor-backup' || value.version !== 1) throw new Error('Choose a Governor JSON backup.'); return validateState(value.data); }
