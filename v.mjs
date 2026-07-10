import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:800} });
p.on('pageerror', e=>console.log('PAGEERROR', e.message));
await p.goto('http://localhost:3988',{waitUntil:'domcontentloaded'});
const seen=new Set(); let bad=0;
for(let i=0;i<520;i++){ try{ const t=(await p.locator('h1').innerText()).replace(/\n/g,' '); if(t.includes('�'))bad++; seen.add(t);}catch{break} await p.waitForTimeout(150); }
const L=[...seen];
console.log('distinct',L.length,'repl-char',bad);
console.log('QUESTIONS:', L.filter(s=>s.startsWith('What')).slice(0,5).join(' || ')||'(none seen)');
console.log('EMOJI:', L.filter(s=>/[\u{1F000}-\u{1FAFF}☀-➿]/u.test(s)).slice(0,8).join(' || ')||'(none seen)');
console.log('DIRECT-OBJ:', L.filter(s=>/ (helps?|serves?|supports?|empowers?|guides?) /.test(' '+s+' ')&&!/ for /.test(s)).slice(0,4).join(' || ')||'(none)');
await b.close();
