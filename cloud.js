import { mergeStates, validateState } from './core.js?v=20261009-r3';
import { importFile } from './migration.js?v=20261009-r3';

export const CONFIG_KEY = 'governor.cloud.config.v1';
const SESSION_KEY = 'governor.cloud.session.v1';
export function loadConfig() { try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || null; } catch { return null; } }
export function saveConfig(url, key) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) throw new Error('Use your Supabase project URL, such as https://your-project.supabase.co.');
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error();
    } catch { throw new Error('Use the public publishable or anon key. Never use a secret or service-role key.'); }
  }
  const config = {url: parsed.origin, key};
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  localStorage.removeItem(SESSION_KEY);
  return config;
}
export class CloudSync {
  constructor({getState, acceptState, onStatus, onSessionChange = () => {}}) {
    this.onSessionChange = onSessionChange; this.getState = getState; this.acceptState = acceptState; this.onStatus = onStatus;
    this.config = loadConfig(); this.busy = false; this.again = false; this.disposed = false;
    try { this.session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { this.session = null; }
  }
  setSession(session) {
    this.onSessionChange(session?.user || null, this.config);
    this.session=session; this.remoteData=null; this.seenRevision=null; this.legacyChecked=false;
    if(session) localStorage.setItem(SESSION_KEY,JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY);
  }
  status(text, kind = 'local') { if (!this.disposed) this.onStatus(text, kind); }
  async request(path, {method = 'GET', body, auth = true, prefer} = {}) {
    if (!this.config) throw new Error('Cloud sync is not connected.');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${this.config.url}${path}`, {method, signal: controller.signal, headers: {apikey: this.config.key, ...(auth && this.session ? {Authorization: `Bearer ${this.session.access_token}`} : {}), 'Content-Type': 'application/json', ...(prefer ? {Prefer: prefer} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
      const raw = await response.text(); let data; try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error('Cloud returned an unexpected response. Local data is safe.'); }
      if (!response.ok) {
        const error = new Error(response.status === 401 ? 'Sign in again to resume sync.' : response.status === 403 ? 'Cloud access was denied. Check the account permissions and database setup.' : response.status === 404 ? 'The cloud table is missing. Follow the setup guide.' : 'Cloud request failed. Check your project setup; local data is safe.');
        error.code = response.status; throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  async sendLink(email) {
    if (!navigator.onLine) throw new Error('Connect to the internet to sign in.');
    if (!['http:','https:'].includes(location.protocol)) throw new Error('Open the hosted app to use emailed sign-in links. The portable copy works locally without sign-in.');
    const redirect = `${location.origin}${location.pathname}`;
    await this.request(`/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {method: 'POST', auth: false, body: {email, create_user: true}});
  }
  async signInPassword(email, password) {
    const result = await this.request('/auth/v1/token?grant_type=password', {method:'POST',auth:false,body:{email,password}});
    if (!result?.user?.id || !result?.access_token || !result?.refresh_token) throw new Error('Could not verify this sign-in.');
    this.setSession({...result, expires_at: result.expires_at || Date.now()/1000 + result.expires_in});
  }
  async acceptLink() {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (!hash.has('access_token')) return false;
    const access = hash.get('access_token'), refresh = hash.get('refresh_token');
    history.replaceState(null, '', location.pathname + location.search + '#tunnel');
    if (!this.config || !refresh) throw new Error('Set up cloud on this device first, then request a new sign-in link.');
    this.session = {access_token: access, refresh_token: refresh, expires_at: Date.now() / 1000 + Number(hash.get('expires_in') || 3600)};
    try {
      const user = await this.request('/auth/v1/user');
      if (!user?.id || !user?.email) throw new Error('Could not verify this sign-in.');
      this.setSession({...this.session,user:{id:user.id,email:user.email}});
      return true;
    } catch (error) { this.session = null; localStorage.removeItem(SESSION_KEY); throw error; }
  }
  async refresh() {
    if (!this.session?.user?.id) throw new Error('Sign in to connect your devices.');
    if (this.session.expires_at > Date.now() / 1000 + 90) return;
    const next = await this.request('/auth/v1/token?grant_type=refresh_token', {method: 'POST', auth: false, body: {refresh_token: this.session.refresh_token}});
    if (this.disposed) return;
    if(next?.user?.id !== this.session.user.id) throw new Error('The account changed. Sign in again.');
    this.session = {...next, expires_at: next.expires_at || Date.now() / 1000 + next.expires_in};
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }
  schedule() {
    if (this.session && !this.busy) this.status(navigator.onLine ? 'Saved locally · sync pending' : 'Offline · sync when connected','pending');
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 800);
  }
  async sync() {
    if (this.disposed) return;
    if (!this.config || !this.session) { this.status(navigator.onLine ? 'Saved on this device' : 'Offline · saved on this device'); return; }
    if (!navigator.onLine) { this.status('Offline · sync when connected', 'pending'); return; }
    if (this.busy) { this.again = true; return; }
    this.busy = true; this.status('Syncing…', 'pending');
    this.lastError = '';
    try {
      await this.refresh();
      if (this.disposed) return;
      const userId = this.session.user.id;
      // Compare-and-swap retries avoid replacing edits uploaded by another device.
      for (let attempt = 0; attempt < 4; attempt++) {
        const rows = await this.request(`/rest/v1/governor_data?user_id=eq.${encodeURIComponent(userId)}&select=revision`);
        if (this.disposed) return;
        if (!Array.isArray(rows)) throw new Error('Unexpected cloud data.');
        let current = rows[0];
        if (current) {
          if (current.revision === this.seenRevision && this.remoteData) current = {...current,data:this.remoteData};
          else {
            const full = await this.request(`/rest/v1/governor_data?user_id=eq.${encodeURIComponent(userId)}&select=data,revision`);
            current = full?.[0];
            if (!current) throw new Error('The cloud copy changed during sync. Try again; local data is safe.');
            this.remoteData = validateState(current.data); this.seenRevision = current.revision;
          }
        }
        if (this.disposed) return;
        const local = validateState(this.getState());
        if (!current && !this.legacyChecked) {
          // Read-only bridge for the supplied V2 candidate. Never change its cloud copy.
          try {
            const old = await this.request(`/rest/v1/governor_state?user_id=eq.${encodeURIComponent(userId)}&select=payload`);
            if (old?.[0]?.payload) this.acceptState(mergeStates(local, importFile(JSON.stringify(old[0].payload), 'legacy-cloud')));
          } catch (error) { if (![400,403,404].includes(error.code)) throw error; }
          this.legacyChecked = true;
        }
        const merged = current ? mergeStates(local, validateState(current.data)) : validateState(this.getState());
        if (current) this.acceptState(merged);
        if (current && canonical(merged) === canonical(current.data)) { this.status('Cloud up to date', 'synced'); break; }
        let written;
        if (current) {
          written = await this.request(`/rest/v1/governor_data?user_id=eq.${encodeURIComponent(userId)}&revision=eq.${current.revision}`, {method: 'PATCH', body: {data: merged, revision: current.revision + 1}, prefer: 'return=representation'});
        } else {
          written = await this.request('/rest/v1/governor_data?on_conflict=user_id', {method: 'POST', body: {user_id: userId, data: merged, revision: 1}, prefer: 'resolution=ignore-duplicates,return=representation'});
        }
        if (this.disposed) return;
        if (written?.length) { this.remoteData=merged; this.seenRevision=current ? current.revision+1 : 1; this.acceptState(mergeStates(this.getState(), merged)); this.status('Cloud up to date', 'synced'); break; }
        if (attempt === 3) throw new Error('Another device is syncing. Try again shortly; local data is safe.');
      }
    } catch (error) { this.status(error.code === 401 ? 'Sign in again · saved locally' : 'Sync unavailable · saved locally', 'error'); this.lastError = error.message; }
    finally { this.busy = false; if (this.again && !this.disposed) { this.again = false; this.schedule(); } }
  }
  async signOut() {
    try { if (this.session && navigator.onLine) await this.request('/auth/v1/logout?scope=local', {method: 'POST'}); } catch { /* Clear local access even if the server is unavailable. */ }
    this.setSession(null); this.status('Saved on this device');
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
function canonical(state) { return JSON.stringify({schemaVersion: state.schemaVersion, ...Object.fromEntries(Object.keys(state).filter(k => k !== 'schemaVersion').sort().map(k => [k, Object.fromEntries(Object.entries(state[k]).sort(([a],[b]) => a.localeCompare(b)).map(([id, value]) => [id, Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)))]))]))}); }
