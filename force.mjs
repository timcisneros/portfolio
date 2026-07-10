import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:760} });
await p.goto('http://localhost:3987', { waitUntil:'networkidle' });

// Force garnishes for a while, collect states
await p.evaluate(() => { globalThis.__TW_FORCE = 'g'; });
const gStates = new Set(); let bad=0;
let t0=Date.now();
while(Date.now()-t0<28000){ const t=await p.locator('h1').evaluate(e=>e.innerText.replace(/\n/g,' ')); if(t.includes('�'))bad++; if(t)gStates.add(t); await p.waitForTimeout(30); }

// Force question mode switches
await p.evaluate(() => { globalThis.__TW_FORCE = 'q'; });
const qStates = new Set();
t0=Date.now();
while(Date.now()-t0<28000){ const t=await p.locator('h1').evaluate(e=>e.innerText.replace(/\n/g,' ')); if(t.includes('�'))bad++; if(t)qStates.add(t); await p.waitForTimeout(30); }
await b.close();

const g=[...gStates], q=[...qStates];
const emoji=g.filter(s=>/[\u{1F000}-\u{1FAFF}☀-➿]/u.test(s));
const punct=g.filter(s=>/(works|for|you|teams)[.!]/.test(s)||s.includes('...'));
const questions=q.filter(s=>s.startsWith('What'));
console.log('replacement-char total:',bad);
console.log('\nEMOJI garnish states ('+emoji.length+'):\n'+emoji.slice(0,10).join('\n'));
console.log('\nPUNCT garnish states ('+punct.length+'):\n'+punct.slice(0,5).join('\n'));
console.log('\nQUESTION states ('+questions.length+'):\n'+questions.slice(0,8).join('\n'));
