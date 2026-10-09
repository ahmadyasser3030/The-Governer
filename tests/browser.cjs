const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = process.env.GOVERNOR_TEST_URL || 'http://127.0.0.1:4173';
const results = [], errors = [];
async function check(name, fn) { await fn(); results.push(name); console.log(`PASS ${name}`); }
async function visible(page, selector) { await page.locator(selector).waitFor({state:'visible'}); }
async function status(page, text) { await page.waitForFunction(text=>document.querySelector('#sync-status').textContent===text,text); }
async function close(page) { await page.getByRole('button',{name:'Close dialog',exact:true}).click(); }
async function configure(page) {
  await page.locator('#settings-button:visible, #mobile-settings:visible').click();
  await page.locator('#cloud-url').fill('https://governor-test.supabase.co');
  await page.locator('#cloud-key').fill('sb_publishable_test_public_only');
  await page.getByRole('button',{name:'Save connection',exact:true}).click();
  await page.locator('summary').filter({hasText:'Use my existing email and password'}).click();
  await page.locator('#password-email').fill('owner@example.com');
  await page.locator('#cloud-password').fill('test-password-not-a-real-secret');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#modal-content')?.textContent.includes('Signed in as owner@example.com'));
  await close(page);await status(page,'Cloud up to date');
}
(async()=>{
 const browser = await chromium.launch({executablePath:process.env.GOVERNOR_CHROMIUM || '/usr/bin/chromium',headless:true});
 const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page = await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('test-results',{recursive:true});
 await check('default home shows a concrete primary action and at most three priorities',async()=>{
  await page.goto(BASE);await visible(page,'.hero');
  assert.ok((await page.locator('.hero .hero-next').innerText()).includes('Write three lines'));
  assert.equal(await page.locator('.priority-list').first().locator('.priority').count(),3);
  await page.screenshot({path:'test-results/tunnel-desktop.png',fullPage:true});
 });
 await check('one-click completion, undo, and reload persistence',async()=>{
  await page.locator('.hero [data-action=complete]').click();assert.ok((await page.locator('.hero .hero-next').innerText()).includes('remaining Data Management'));
  await page.locator('#toast [data-action=undo]').click();assert.ok((await page.locator('.hero .hero-next').innerText()).includes('Write three lines'));
  await page.locator('.hero [data-action=complete]').click();await page.reload();assert.ok((await page.locator('.hero .hero-next').innerText()).includes('remaining Data Management'));
 });
 await check('capture saves without abandoning the current view or focus timer',async()=>{
  await page.locator('[data-action=timer-toggle]').click();
  await page.locator('#capture-text').fill('Ask about the BAUER reporting cadence');await page.locator('#inline-capture button').click();
  assert.equal(await page.locator('h1').innerText(),'A clear path for today.');assert.equal(await page.locator('#timer-toggle').innerText(),'Pause');
  await page.locator('[data-action=capture]').click();await page.locator('#modal-capture').fill('Think about the graduation project input schema');await page.getByRole('button',{name:'Capture & return'}).click();assert.equal(await page.locator('dialog[open]').count(),0);
  await page.reload();assert.equal(await page.locator('#timer-toggle').innerText(),'Pause');
 });
 await check('low energy preserves other tasks and restricts focus to one',async()=>{
  await page.locator('#energy-mode').selectOption('low');assert.equal(await page.locator('.priority-list').first().locator('.priority').count(),1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')));assert.equal(Object.values(stored.tasks).length,3);
  await page.locator('#energy-mode').selectOption('normal');
 });
 await check('priority editing and concrete additions work',async()=>{
  await page.locator('.priority-list').first().locator('[data-action=edit-task]').first().click();
  await page.locator('#task-action').fill('Validate the first 20 source IDs against the KAITECH schema');await page.getByRole('button',{name:'Save priority'}).click();
  assert.ok((await page.locator('.hero .hero-next').innerText()).includes('first 20 source IDs'));
  await page.getByRole('button',{name:'＋ Add a priority',exact:true}).click();await page.locator('#task-title').fill('Prepare the BAUER report');await page.locator('#task-goal').selectOption('bauer');await page.locator('#task-action').fill('Update planned and actual quantities in the progress sheet');await page.getByRole('button',{name:'Save priority'}).click();
  assert.equal(await page.locator('.priority-list').first().locator('.priority').count(),3);
 });
 await check('daily check-in, weekly review, milestones and horizon persist',async()=>{
  await page.locator('[data-action=checkin]').click();await page.locator('#checkin-note').fill('Checked IDs. Tomorrow, report the validation results.');await page.getByRole('button',{name:'Save check-in'}).click();
  await page.locator('[data-zone=compass]').click();await page.locator('[data-action=weekly]').first().click();await page.locator('#weekly-wins').fill('Validated a real dataset and learned the report format.');await page.locator('#weekly-obstacles').fill('Too many open tabs.');await page.locator('#weekly-next').fill('One output at a time.');await page.getByRole('button',{name:'Save review'}).click();
  await page.locator('[data-action=goal]').first().click();await page.locator('#goal-tracking').selectOption('manual');await page.locator('#goal-progress').fill('25');await page.locator('#goal-evidence').fill('First project control register is ready.');await page.getByRole('button',{name:'Save milestone'}).click();
  await page.locator('[data-action=plan]').click();await page.locator('#plan-military').fill('2027-02-01');await page.getByRole('button',{name:'Save direction'}).click();
  await page.reload();assert.ok((await page.locator('main').innerText()).includes('First project control register'));assert.ok((await page.locator('main').innerText()).includes('Feb 1, 2027'));assert.ok((await page.locator('#month-history').innerText()).includes('Checked IDs'));
 });
 await check('Vault search, editing, archive and thought-to-note work',async()=>{
  await page.locator('[data-zone=vault]').click();await page.locator('#vault-search').fill('argument');assert.equal(await page.locator('#note-grid .note-card').count(),1);await page.locator('#vault-search').fill('');
  await page.locator('[data-action=inbox]').click();await page.locator('[data-action=capture-note]').first().click();await page.getByRole('button',{name:'Save to Vault'}).click();assert.ok((await page.locator('#note-grid').innerText()).includes('graduation project input schema'));
  await page.locator('[data-action=note]').first().click();await page.locator('#note-title').fill('Personal reference');await page.locator('#note-body').fill('Use this on the next project.');await page.getByRole('button',{name:'Save to Vault'}).click();
  await page.locator('#vault-search').fill('Personal reference');await page.locator('#note-grid [data-action=note]').click();await page.locator('[data-action=archive-note]').click();assert.equal(await page.locator('#note-grid .note-card').count(),0);await page.locator('[data-action=vault-archive]').click();assert.equal(await page.locator('#note-grid .note-card').count(),1);
  await page.locator('[data-action=vault-archive]').click();await page.locator('#vault-search').fill('');
 });
 await check('export + import round trip keeps current and restored records',async()=>{
  await page.locator('#settings-button:visible, #mobile-settings:visible').click();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const file=await downloading;await file.saveAs('test-results/backup.json');
  const backup=JSON.parse(fs.readFileSync('test-results/backup.json','utf8'));assert.equal(backup.format,'governor-backup');assert.ok(!JSON.stringify(backup).includes('access_token'));
  await page.locator('#import-file').setInputFiles('test-results/backup.json');await page.locator('#confirm-import').click();await page.locator('#settings-button:visible, #mobile-settings:visible').click();await page.locator('#import-file').setInputFiles({name:'old-governor.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({tasks:[{id:'legacy-task',title:'Legacy site action',date:'2026-10-01',done:false}],habits:[{id:'h',title:'Sleep',doneDates:['2026-10-01']}],finance:[{title:'Budget',notes:'Original private detail'}],custom:{untouched:true}}))});await page.locator('#confirm-import').click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')));assert.ok(stored.tasks['starter-kaitech']);assert.ok(Object.values(stored.legacy).some(x=>x.category==='habits'));assert.ok(Object.values(stored.notes).some(x=>x.title==='Budget'));
  await page.locator('[data-action=legacy]').click();assert.ok((await page.locator('#modal-content').innerText()).includes('Sleep'));await close(page);
 });
 await check('mobile layout stays within 360px and all zones are operable',async()=>{
  await page.setViewportSize({width:360,height:800});
  for(const zone of ['tunnel','compass','vault']){await page.locator(`[data-zone=${zone}]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${zone} has horizontal overflow`);}
  await page.locator('[data-zone=tunnel]').click();await page.screenshot({path:'test-results/tunnel-phone.png',fullPage:true});
 });
 await check('missed days do not make an overdue pileup and rollover retains earlier month',async()=>{
  await page.evaluate(async()=>{const k='governor.os.v1',s=JSON.parse(localStorage.getItem(k));for(const t of Object.values(s.tasks)){t.date='2026-09-01';t.done=false;}const {persistProfile,PROFILE_KEY}=await import('./profile.js');persistProfile(s,localStorage.getItem(PROFILE_KEY));});await page.reload();assert.equal(await page.locator('.priority-list').first().locator('.priority').count(),0);assert.ok(!(await page.locator('main').innerText()).includes('overdue'));
  await page.locator('[data-action=parked]').first().click();await page.locator('#parked-focus-form [name=tasks]').first().check();await page.getByRole('button',{name:'Focus selected priorities',exact:true}).click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')));assert.ok(Object.values(s.tasks).some(t=>t.date==='2026-09-01'&&t.paused));assert.equal(await page.locator('.priority-list').first().locator('.priority').count(),1);
 });
 await check('offline reload, completion, capture and backup work without a network',async()=>{
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await visible(page,'.hero');await page.locator('.hero [data-action=complete]').click();
  await page.locator('#capture-text').fill('Saved while offline');await page.locator('#inline-capture button').click();await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')));assert.ok(Object.values(saved.captures).some(c=>c.text==='Saved while offline'));assert.ok(Object.values(saved.tasks).some(t=>t.done));
  await page.locator('#settings-button:visible, #mobile-settings:visible').click();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const file=await downloading;assert.ok(file.suggestedFilename().endsWith('.json'));await close(page);await context.setOffline(false);
 });
 await check('legacy governor-data migrates automatically without changing its source',async()=>{
  const c=await browser.newContext();const p=await c.newPage();const old=JSON.stringify({tasks:[{id:'source',title:'Keep my original work',date:'2026-10-08',done:false}],habits:[{title:'Routine',doneDates:['2026-10-01']}],settings:{why1:'My family'}});
  await p.addInitScript(raw=>localStorage.setItem('governor-data',raw),old);await p.goto(BASE);const original=await p.evaluate(()=>localStorage.getItem('governor-data'));assert.equal(original,old);assert.ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')).settings.plan.why1==='My family'));await c.close();
 });
 let row=null, conflictOnce=false;
 async function mockCloud(route){
  const req=route.request(),url=new URL(req.url()),method=req.method();let body;
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'apikey,authorization,content-type,prefer','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'}});
  try{body=req.postDataJSON();}catch{}
  const send=(data,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/auth/v1/token')return send({access_token:'test-access',refresh_token:'test-refresh',expires_at:Date.now()/1000+3600,user:{id:'12345678-1234-1234-1234-123456789012',email:'owner@example.com'}});
  if(url.pathname==='/rest/v1/governor_state')return send({message:'missing'},404);
  if(url.pathname==='/rest/v1/governor_data'){
   if(method==='GET')return send(row?[structuredClone(row)]:[]);
   if(method==='POST'){if(row)return send([]);row={...body};return send([row],201);}
   if(method==='PATCH'){
    if(conflictOnce){conflictOnce=false;row.data.captures['racing-device']={id:'racing-device',text:'Concurrent remote edit',date:'2026-10-08',archived:false,updatedAt:Date.now()+5000,device:'remote'};row.revision++;return send([]);}
    if(url.searchParams.get('revision')!==`eq.${row.revision}`)return send([]);row={...row,...body};return send([row]);
   }
  }
  return send({message:'not mocked'},404);
 }
 const a=await browser.newContext(),b=await browser.newContext();await a.route('https://governor-test.supabase.co/**',mockCloud);await b.route('https://governor-test.supabase.co/**',mockCloud);
 const pa=await a.newPage(),pb=await b.newPage();pa.on('pageerror',e=>errors.push(e.message));pb.on('pageerror',e=>errors.push(e.message));
 await check('simulated private cloud sync carries laptop changes to a second device',async()=>{
  await pa.goto(BASE);await configure(pa);await pa.locator('#capture-text').fill('From the laptop');await pa.locator('#inline-capture button').click();await status(pa,'Cloud up to date');await pa.waitForFunction(()=>document.querySelector('#sync-status').textContent==='Cloud up to date');
  await pb.goto(BASE);await configure(pb);await pb.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('governor.os.v1')).captures).some(x=>x.text==='From the laptop'));
 });
 await check('simulated sync merges offline edits and retries a concurrent revision conflict',async()=>{
  await a.setOffline(true);await b.setOffline(true);
  await pa.locator('#capture-text').fill('Offline laptop');await pa.locator('#inline-capture button').click();await pb.locator('#capture-text').fill('Offline phone');await pb.locator('#inline-capture button').click();
  await a.setOffline(false);await pa.locator('#settings-button:visible, #mobile-settings:visible').click();await pa.locator('[data-action=sync-now]').click();await close(pa);
  conflictOnce=true;await b.setOffline(false);await pb.locator('#settings-button:visible, #mobile-settings:visible').click();await pb.locator('[data-action=sync-now]').click();await status(pb,'Cloud up to date');await close(pb);
  await pa.locator('#settings-button:visible, #mobile-settings:visible').click();await pa.locator('[data-action=sync-now]').click();await status(pa,'Cloud up to date');await close(pa);
  const texts=await pa.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('governor.os.v1')).captures).map(c=>c.text));assert.ok(texts.includes('Offline laptop'));assert.ok(texts.includes('Offline phone'));assert.ok(texts.includes('Concurrent remote edit'));
 });
 assert.deepEqual(errors,[],'No uncaught browser errors');
 fs.writeFileSync('test-results/browser-results.json',JSON.stringify({testedAt:new Date().toISOString(),browser:'Chromium',checks:results,errors,cloud:'SIMULATED API; live account and SQL access remain unverified'},null,2));
 await a.close();await b.close();await context.close();await browser.close();console.log(`${results.length} browser checks passed. Live Supabase not connected.`);
})().catch(error=>{console.error(error);process.exit(1)});
