import { initialState, put, today, validateState, readBackup } from './core.js';
const CATEGORIES = ['goals','projects','tasks','habits','thoughts','logs','reviews','decisions','fitness','learning','finance','knowledge','books','milestones','events'];
function stableId(text) { let hash = 2166136261; for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return (hash >>> 0).toString(16); }
const text = value => value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).valueOf());
export function importFile(contents, device = 'import') {
  const value = JSON.parse(contents);
  if (value?.format === 'governor-backup') return readBackup(contents);
  if (value?.schemaVersion === 1) return validateState(value);
  const old = value?.data && typeof value.data === 'object' ? value.data : value;
  if (!old || typeof old !== 'object' || !CATEGORIES.some(k => Array.isArray(old[k]))) throw new Error('This is not a recognized Governor backup. Export JSON from your old Governor first.');
  const state = initialState(); state.tasks = {}; const stamp = Date.now();
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
      if (category === 'tasks') put(state, 'tasks', id, {title, action: text(item.next || item.notes || title), goal: /kaitech/i.test(title) ? 'kaitech' : /train|fitness|health/i.test(title) ? 'capacity' : 'bauer', date: validDate(item.date) ? item.date : validDate(item.due) ? item.due : today(), completedAt: validDate(item.completedAt) ? item.completedAt : '', done: !!item.done, paused: !!item.archived, order: index}, device, stamp);
      if (category === 'thoughts') put(state, 'captures', id, {text: title + (item.notes ? `\n${text(item.notes)}` : ''), date: validDate(item.date) ? item.date : today(), archived: !!item.archived}, device, stamp);
      if (['knowledge','learning','books','decisions','fitness','finance'].includes(category)) put(state, 'notes', id, {title, body: text(item.notes || item.description || '') || body, category: ({knowledge:'Saved insights', learning:'KAITECH / BIM', books:'Books, history & economy', decisions:'Saved insights', fitness:'Mind & capacity', finance:'Saved insights'})[category], url: '', archived: !!item.archived}, device, stamp);
      if (category === 'reviews') put(state, 'reviews', id, {date: validDate(item.date) ? item.date : today(), wins: text(item.notes || item.title), obstacles: '', next: '', archived: false}, device, stamp);
      if (category === 'logs') put(state, 'checkins', id, {date: validDate(item.date) ? item.date : today(), note: text(item.notes || item.title), energy: 'okay'}, device, stamp);
    });
  }
  if (old.settings && typeof old.settings === 'object') {
    const p = old.settings;
    put(state, 'settings', 'plan', {start: validDate(p.sprintStart) ? p.sprintStart : today(), horizon: '', military: validDate(p.militaryDate) ? p.militaryDate : '', why1: text(p.why1), why3: text(p.why3), why5: text(p.why5)}, device, stamp);
    put(state, 'settings', 'mode', {value: p.maintenance ? 'maintenance' : p.lowEnergy ? 'low' : 'normal'}, device, stamp);
  }
  return validateState(state);
}
export function recoverOriginal(state, source) {
  const chunks = Object.values(state.legacy || {}).filter(x => x.source === source).sort((a,b) => a.part - b.part);
  return JSON.parse(chunks.map(x => x.body).join(''));
}
