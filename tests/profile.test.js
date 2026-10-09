import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,STORAGE_KEY} from '../core.js';
import {initializeProfile,profileId,switchProfile,persistProfile,PROFILE_KEY} from '../profile.js';
function store(){const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};return data;}
const config={url:'https://profiles.supabase.co'}, a={id:'a'},b={id:'b'};
test('existing signed-in owner inherits the local copy; sign-out and different accounts stay separate',()=>{
 store();const original=initialState();original.notes['bauer-update'].body='Private owner note';localStorage.setItem(STORAGE_KEY,JSON.stringify(original));localStorage.setItem('governor.cloud.config.v1',JSON.stringify(config));localStorage.setItem('governor.cloud.session.v1',JSON.stringify({user:a}));
 const owner=initializeProfile();assert.equal(owner,profileId(a,config));const guest=switchProfile('local');assert.notEqual(guest.notes['bauer-update'].body,'Private owner note');
 const otherId=profileId(b,config),other=switchProfile(otherId);assert.notEqual(other.notes['bauer-update'].body,'Private owner note');other.notes['bauer-update'].body='Account B only';persistProfile(other,otherId);
 const restored=switchProfile(owner);assert.equal(restored.notes['bauer-update'].body,'Private owner note');assert.equal(switchProfile(otherId).notes['bauer-update'].body,'Account B only');
});
test('stale tab writes cannot cross profiles and new sign-in never silently imports guest records',()=>{
 store();localStorage.setItem(STORAGE_KEY,JSON.stringify(initialState()));const guest=initializeProfile();const note=initialState();note.notes['bauer-update'].body='Guest confidential';persistProfile(note,guest);
 const id=profileId(a,config),user=switchProfile(id);assert.notEqual(user.notes['bauer-update'].body,'Guest confidential');assert.throws(()=>persistProfile(note,guest),/account changed/);assert.equal(localStorage.getItem(PROFILE_KEY),id);assert.equal(switchProfile('local').notes['bauer-update'].body,'Guest confidential');
});
test('corrupt saved profile is refused without overwriting the current workspace',()=>{
 store();localStorage.setItem(STORAGE_KEY,JSON.stringify(initialState()));initializeProfile();const original=localStorage.getItem(STORAGE_KEY);localStorage.setItem('governor.profile.data.v1:corrupt','{bad');assert.throws(()=>switchProfile('corrupt'));assert.equal(localStorage.getItem(STORAGE_KEY),original);assert.equal(localStorage.getItem(PROFILE_KEY),'local');
});
test('a failed switch recovers the right account without attributing the shared copy to another account',()=>{
 const data=store();const initial=initialState();initial.notes['bauer-update'].body='Local private';localStorage.setItem(STORAGE_KEY,JSON.stringify(initial));initializeProfile();persistProfile(initial,'local');const id=profileId(a,config);
 const baseSet=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k===PROFILE_KEY)throw new Error('quota fixture');baseSet(k,v);};assert.throws(()=>switchProfile(id),/quota/);localStorage.setItem=baseSet;
 assert.equal(initializeProfile(),'local');assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).notes['bauer-update'].body,'Local private');assert.notEqual(switchProfile(id).notes['bauer-update'].body,'Local private');assert.ok(data.has('governor.profile.data.v1:local'));
});
