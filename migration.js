import { initialState, put, today, validateState, readBackup } from './core.js?v=20261009-r3';
const CATEGORIES = ['goals','projects','tasks','habits','thoughts','logs','reviews','decisions','fitness','learning','finance','knowledge','books','milestones','events','notes','values'];
function stableId(text) { let hash = 2166136261; for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return (hash >>> 0).toString(16); }
const text = value => value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).valueOf());
export function importFile(contents, device = 'import') {
  const value = JSON.parse(contents);
  if (value?.format === 'governor-backup') return readBackup(contents);
  if (value?.schemaVersion === 1) return validateState(value);
  const old = value?.data && typeof value.data === 'object' ? value.data : value;
  if (!old || typeof old !== 'object' || !CATEGORIES.some(k => Array.isArray(old[k]))) throw new Error('This is not a recognized Governor backup. Export JSON from your old Governor first.');
  const state = initialState(); state.tasks = {}; const stamp = 1;
  // Keep the full source document, including unknown fields. It is never replaced by a normalized record.
  const full = JSON.stringify(old);
  if (full.length > 4000000) throw new Error('This legacy backup is too large. Keep the original and split it before importing.');
  // Chunk the source so exports and sync retain it without oversized individual records.
  const sourceId = stableId(full);
  for (let offset = 0; offset < full.length; offset += 90000) put(state, 'legacy', `source-${sourceId}-${offset}`, {title: 'Original import · complete source', category: 'Source archive', body: full.slice(offset, offset + 90000), source: sourceId, part: offset / 90000, archived: true}, device, stamp);
  for (const category of CATEGORIES) {
    const items = old[category] || [];
    if (!Array.isArray(items)) throw new Error(`Legacy ${category} must be a list. The original is untouched.`);
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Invalid legacy ${category} record.`);
      const id = `old-${category}-${stableId(text(item.id) || JSON.stringify(item))}-${index}`;
      const body = JSON.stringify(item); if (body.length > 100000) throw new Error('A legacy record is too large to import safely.');
      const title = text(item.title || item.name || item.text || `${category} ${index + 1}`);
      put(state, 'legacy', id, {title, category, body, archived: false}, device, stamp);
      const linked = old.goals?.find(g => String(g.id) === String(item.goalId));
      const goalId = linked ? `old-goals-${stableId(text(linked.id))}-${old.goals.indexOf(linked)}` : /kaitech/i.test(item.area || title) ? 'kaitech' : /train|fitness|health|physical|mental/i.test(item.area || title) ? 'capacity' : 'bauer';
      if (category === 'goals' || category === 'projects') put(state, 'goals', id, {
        title, subtitle: text(item.area || item.category || 'Imported goal'), outcome: text(item.why || item.description || item.outcome || title),
        milestone: text(item.milestone || ''), evidence: text(item.evidence || ''), progress: Math.max(0,Math.min(100,Number(item.progress)||0)),
        status: item.archived ? 'archived' : item.active === true ? 'active' : 'paused', active: item.active === true && !item.archived,
        tracking: 'manual', deadline: validDate(item.deadline) ? item.deadline : '', nextAction: text(item.nextAction || ''), horizon: text(item.horizon || '90 days')
      }, device, stamp);
      if (category === 'tasks') put(state, 'tasks', id, {title, action: text(item.next || item.notes || title), goal: goalId, date: validDate(item.date) ? item.date : validDate(item.due) ? item.due : today(), completedAt: validDate(item.completedAt) ? item.completedAt : '', legacyCompletion: !validDate(item.completedAt), done: !!item.done || item.status === 'Done', paused: !!item.archived, order: index}, device, stamp);
      if (category === 'thoughts') put(state, 'captures', id, {text: title + (item.action || item.notes ? `\n${text(item.action || item.notes)}` : ''), date: validDate(item.date || item.created) ? item.date || item.created : today(), archived: !!item.archived || item.status === 'Resolved', category: text(item.category || '')}, device, stamp);
      if (['notes','knowledge','learning','books','decisions','fitness','finance','habits','values'].includes(category)) {
        const topic = ({KAITECH:'KAITECH / BIM',BAUER:'BAUER / APM',English:'English & communication',Fitness:'Fitness & recovery',Career:'BAUER / APM',Learning:'Excel & automation'})[item.area] || item.area;
        put(state, 'notes', id, {title, body: text(item.body || item.notes || item.description || item.why || ''), category: topic || ({knowledge:'Saved insights',learning:'KAITECH / BIM',books:'Books, history & economy',decisions:'Decisions',fitness:'Fitness & recovery',finance:'Finance & purchases',habits:'Mind & capacity',values:'Decisions',notes:'Saved insights'})[category], url: text(item.url || ''), archived: !!item.archived,
          ...(category === 'books' ? {entryType:'book', author:text(item.author), readingStatus:text(item.status || 'To read'), readingProgress:Math.max(0,Math.min(100,Number(item.progress)||0)), pagesRead:0, pagesTotal:0} : {}),
          ...(category === 'habits' ? {entryType:'routine', routineTarget:Math.max(1,Math.min(7,Number(item.target)||3))} : {})
        }, device, stamp);
        if(category === 'habits') for(const [key, done] of Object.entries(old.checks || {})) {
          const date=key.slice(0,10);
          if(validDate(date) && key.slice(11) === String(item.id)) put(state,'checkins',`routine-${id}-${date}`,{date,note:title,energy:'routine',kind:'routine',routineId:id,done:!!done},device,stamp);
        }
      }
      if (category === 'reviews') {
        const date=validDate(item.date) ? item.date : today();
        if(item.kind === 'daily') put(state,'checkins',id,{date,note:text(item.wins || item.notes || ''),energy:text(item.energy || 'okay'),focus:Number(item.focus)||0,drift:Number(item.drift)||0,clarity:Number(item.clarity)||0,triggers:text(item.triggers),adjustment:text(item.adjustment)},device,stamp);
        else put(state, 'reviews', id, {date,wins:text(item.wins || item.notes || item.title),obstacles:text(item.triggers || item.obstacles),next:text(item.adjustment || item.next),period:item.kind === 'monthly' ? 'month' : 'week',archived:!!item.archived}, device, stamp);
      }
      if (category === 'logs') put(state, 'checkins', id, {date: validDate(item.date) ? item.date : today(), note: text(item.notes || item.title), energy: 'okay'}, device, stamp);
    });
  }
  if (old.settings && typeof old.settings === 'object') {
    const p = old.settings;
    put(state, 'settings', 'plan', {start: validDate(p.sprintStart || p.sprint) ? p.sprintStart || p.sprint : today(), horizon: '', military: validDate(p.militaryDate) ? p.militaryDate : '', why1: text(p.why1), why3: text(p.why3), why5: text(p.why5), values: Array.isArray(old.values) ? old.values.map(v=>`${text(v.title)}: ${text(v.why)}`).join('\n') : ''}, device, stamp);
    put(state, 'settings', 'mode', {value: p.maintenance ? 'maintenance' : p.lowEnergy ? 'low' : 'normal'}, device, stamp);
  }
  return validateState(state);
}
export function recoverOriginal(state, source) {
  const chunks = Object.values(state.legacy || {}).filter(x => x.source === source).sort((a,b) => a.part - b.part);
  return JSON.parse(chunks.map(x => x.body).join(''));
}
