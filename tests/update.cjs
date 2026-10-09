const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'), RELEASE='20261009-r3', checks=[], errors=[];
const oldFiles=new Map();let phase='old',oldCommit='dee748d48875dcd51fb3f105188c6847f1bad652';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(!pathname.startsWith('/The-Governer/')){res.writeHead(404).end();return;}
 const file=pathname.slice('/The-Governer/'.length)||'index.html';
 if(file.includes('..')){res.writeHead(400).end();return;}
 try{
  let bytes;
  if(phase==='old'||phase==='broken'){
   const commit=phase==='broken'&&file==='index.html'?'9f11db86f707e7f4e0ddbefe4a6945a1efb9e060':oldCommit;
   const key=commit+':'+file;
   if(!oldFiles.has(key))oldFiles.set(key,execFileSync('git',['show',key],{cwd:ROOT,stdio:['ignore','pipe','ignore']}));
   bytes=oldFiles.get(key);
  }else bytes=fs.readFileSync(path.join(ROOT,file));
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'text/plain','cache-control':'no-cache'}).end(bytes);
 }catch{res.writeHead(404).end();}
});
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const BASE=`http://127.0.0.1:${server.address().port}/The-Governer/`,{initialState,put,validateState}=await import('../core.js');
 const fixture=initialState('upgrade-fixture');
 put(fixture,'captures','private-capture',{text:'Private saved site observation',date:'2026-10-09'},'upgrade-fixture');
 put(fixture,'notes','private-note',{title:'My private engineering notes',body:'Do not lose this record',category:'BAUER / APM',url:'',archived:false},'upgrade-fixture');
 fixture.tasks['starter-bauer'].title='My saved BAUER priority';fixture.tasks['starter-bauer'].minutes=35;
 validateState(fixture);
 const config={url:'https://upgrade-fixture.supabase.co',key:'sb_publishable_fixture_only'},session={access_token:'synthetic-fixture',refresh_token:'synthetic-fixture',expires_at:4000000000,user:{id:'upgrade-owner',email:'fixture@example.com'}};
 const browser=await chromium.launch({executablePath:process.env.GOVERNOR_CHROMIUM||'/usr/bin/chromium',headless:true});
 async function fixtureContext(){
  const c=await browser.newContext({viewport:{width:1536,height:1024}});
  await c.route('https://upgrade-fixture.supabase.co/**',r=>r.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({message:'Synthetic cloud is deliberately unavailable'})}));
  await c.addInitScript(({fixture,config,session})=>{if(!localStorage.getItem('governor.os.v1')){localStorage.setItem('governor.os.v1',JSON.stringify(fixture));localStorage.setItem('governor.cloud.config.v1',JSON.stringify(config));localStorage.setItem('governor.cloud.session.v1',JSON.stringify(session));}},{fixture,config,session});
  return c;
 }
 const c=await fixtureContext(),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await check('reproduces old cream cache mixed with new crown HTML on the real Pages subpath',async()=>{
  await p.goto(BASE);await p.locator('.hero').waitFor();await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()),'#f7f6f2');
  phase='broken';await p.reload();await p.locator('.hero').waitFor();assert.equal(await p.locator('.brand-mark svg').count(),1);
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()),'#f7f6f2');
  await p.screenshot({path:'test-results/update-before.png',fullPage:true});
 });
 const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')));
 const other=await c.newPage();await other.goto(BASE);await other.locator('.hero').waitFor();
 await check('safe updater replaces stale worker with another old tab open and preserves every saved record and login',async()=>{
  phase='current';await p.goto(BASE+'update.html');await p.waitForURL('**/?updated='+RELEASE);await p.locator('.hero').waitFor();
  assert.equal(await p.locator('meta[name=governor-release]').getAttribute('content'),RELEASE);
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()),'#080a0b');
  assert.ok(await p.locator('.brand-mark svg').evaluate(n=>n.getBoundingClientRect().width>30&&n.getBoundingClientRect().width<80));
  assert.ok(await p.locator('.hero').evaluate(n=>getComputedStyle(n).backgroundImage.includes('construction-hero.webp')));
  const saved=await p.evaluate(()=>({data:JSON.parse(localStorage.getItem('governor.os.v1')),config:JSON.parse(localStorage.getItem('governor.cloud.config.v1')),session:JSON.parse(localStorage.getItem('governor.cloud.session.v1'))}));
  assert.deepEqual(saved.data,before);assert.deepEqual(saved.config,config);assert.deepEqual(saved.session,session);
  await p.screenshot({path:'test-results/update-after-desktop.png',fullPage:true});
  await other.reload();await other.locator('.quick-grid').waitFor();assert.equal(await other.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()),'#080a0b');
 });
 await check('upgraded mobile app saves offline edits and reopens with its gold shell and hero',async()=>{
  await other.close();await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:'test-results/update-after-mobile.png',fullPage:true});
  await c.setOffline(true);await p.reload();await p.locator('.hero').waitFor();assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()),'#080a0b');
  await p.locator('#capture-text').fill('Saved offline after upgrade');await p.locator('#inline-capture button').click();await p.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('governor.os.v1')).captures).some(n=>n.text==='Saved offline after upgrade'));await p.reload();
  assert.ok(await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('governor.os.v1')).captures).some(n=>n.text==='Saved offline after upgrade')));
  assert.ok(await p.evaluate(async()=>(await fetch('./construction-hero.webp')).ok));await c.setOffline(false);
 });
 await c.close();
 await check('normal reopening also upgrades the previous Gold cache without needing the helper',async()=>{
  oldCommit='9f11db86f707e7f4e0ddbefe4a6945a1efb9e060';phase='old';const context=await fixtureContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE);await page.locator('.hero').waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  phase='current';await page.reload();await page.locator('.quick-grid').waitFor();
  assert.equal(await page.locator('meta[name=governor-release]').getAttribute('content'),RELEASE);
  await page.waitForFunction(async()=>{const channel=new MessageChannel();const answer=new Promise(resolve=>{channel.port1.onmessage=e=>{channel.port1.close();resolve(e.data?.release==='20261009-r3');};setTimeout(()=>{channel.port1.close();resolve(false);},400);});navigator.serviceWorker.controller?.postMessage({type:'GOVERNOR_VERSION'},[channel.port2]);return answer;});
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('governor.os.v1')).notes['private-note']));await context.close();
 });
 if(process.env.GOVERNOR_TEST_URL)await check('published update link opens the verified gold edition, then works offline',async()=>{
  const live=await browser.newContext({viewport:{width:390,height:844}}),page=await live.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('update.html',process.env.GOVERNOR_TEST_URL).href);await page.waitForURL('**/?updated='+RELEASE);await page.locator('.hero').waitFor();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()),'#080a0b');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await live.setOffline(true);await page.reload();await page.locator('.hero').waitFor();await live.close();
 });
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/update-results.json',JSON.stringify({testedAt:new Date().toISOString(),url:process.env.GOVERNOR_TEST_URL||BASE,checks,errors,upgradeFixtures:'Actual earlier cream and Gold Git files, synthetic private records/session; no real account credentials.'},null,2));
 await browser.close();server.close();console.log(`${checks.length} update workflows passed.`);
})().catch(e=>{console.error(e);server.close();process.exit(1)});
