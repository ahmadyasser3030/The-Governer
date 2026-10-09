import {loadConfig, saveConfig} from './cloud.js?v=20261009-r3';

// Supabase publishable keys are public browser configuration, never admin credentials.
const project = {url:'https://hppccgyxrppawcaspytm.supabase.co', key:'sb_publishable_-QzwJwSgSauu28GX6TILfA_72MB9mTU'};
const suppliedEmail = new URLSearchParams(location.hash.slice(1)).get('email');
if (suppliedEmail && !/[\r\n]/.test(suppliedEmail)) {
  document.querySelector('#owner-email').value = suppliedEmail;
  history.replaceState(null, '', location.pathname + location.search);
}
const form = document.querySelector('#setup-form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#setup-message');
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const email = document.querySelector('#owner-email').value.trim();
    if (!email || /[\r\n]/.test(email) || !form.reportValidity()) return;
    const response = await fetch('./setup.sql');
    if (!response.ok) throw new Error('Setup instructions could not load. Reconnect and try again.');
    const source = await response.text();
    if (!source.includes('create table if not exists public.governor_data')) throw new Error('Setup instructions could not be verified.');
    const sql = source.replaceAll('YOUR_EMAIL@example.com', email.replaceAll("'", "''"));
    document.querySelector('#setup-preview').textContent = sql;
    try {
      await navigator.clipboard.writeText(sql);
      status.textContent = 'Copied. Open your storage setup, paste, and press Run.';
    } catch {
      document.querySelector('details').open = true;
      status.textContent = 'Copy the text shown below, then open your storage setup, paste, and press Run.';
    }
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
document.querySelector('#connect-device').addEventListener('click', () => {
  const status = document.querySelector('#connect-message');
  try {
    const existing = loadConfig();
    if (existing?.url !== project.url || existing?.key !== project.key) {
      if (localStorage.getItem('governor.cloud.session.v1')) throw new Error('This browser is signed in to a different connection. Open Governor and sign out in Settings before switching. Your local records will remain.');
      saveConfig(project.url, project.key);
    }
    location.assign('./');
  } catch (error) { status.textContent = error.message; }
});
