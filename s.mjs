import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:800} });
let perr=0; p.on('pageerror', ()=>perr++);
await p.goto('http://localhost:3989',{waitUntil:'domcontentloaded'});
let bad=0, samples=0; const seen=new Set();
for(let i=0;i<300;i++){ try{ const t=(await p.locator('h1').innerText()).replace(/\n/g,' '); if(t.includes('�'))bad++; seen.add(t); samples++; }catch{break} await p.waitForTimeout(35); }
await b.close();
console.log('samples',samples,'| repl-char',bad,'| pageerrors',perr,'| distinct',seen.size);
process.exit(0);
