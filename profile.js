import {STORAGE_KEY, initialState, validateState} from './core.js';

// Browser profiles prevent accidental cross-account uploads. They are not encryption.
export const PROFILE_KEY = 'governor.profile.active.v1';
const prefix = 'governor.profile.data.v1:';
export function profileId(user, config) {
  return user?.id && config?.url ? `${config.url}|${user.id}` : 'local';
}
export function initializeProfile() {
  let session, config;
  try { session=JSON.parse(localStorage.getItem('governor.cloud.session.v1')); config=JSON.parse(localStorage.getItem('governor.cloud.config.v1')); } catch {}
  const wanted=profileId(session?.user,config), active=localStorage.getItem(PROFILE_KEY);
  if(!active) {
    // An existing signed-in installation owns its previous local records.
    const original=localStorage.getItem(STORAGE_KEY);
    if(original) localStorage.setItem(prefix+wanted,original);
    localStorage.setItem(PROFILE_KEY,wanted);
  } else if(active!==wanted) switchProfile(wanted);
  else {const raw=localStorage.getItem(prefix+wanted);if(raw){validateState(JSON.parse(raw));localStorage.setItem(STORAGE_KEY,raw);}}
  return wanted;
}
export function persistProfile(state, bound) {
  if(localStorage.getItem(PROFILE_KEY)!==bound) throw new Error('The account changed in another tab. Reopen Governor before editing.');
  const raw=JSON.stringify(validateState(state));
  // Write the recoverable profile before the compatibility copy.
  localStorage.setItem(prefix+bound,raw);
  localStorage.setItem(STORAGE_KEY,raw);
}
export function switchProfile(wanted) {
  const active=localStorage.getItem(PROFILE_KEY);
  if(active===wanted) return validateState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  // persistProfile already preserved the prior workspace. Never attribute the shared
  // compatibility copy to an account after a partially failed switch.
  const stored=localStorage.getItem(prefix+wanted);
  const next=stored?validateState(JSON.parse(stored)):initialState();
  localStorage.setItem(prefix+wanted,JSON.stringify(next));
  localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
  localStorage.setItem(PROFILE_KEY,wanted);
  localStorage.removeItem('governor.capture.draft');
  localStorage.removeItem('governor.timer');
  return next;
}

export function profileCopy(bound) { return localStorage.getItem(prefix+bound); }
