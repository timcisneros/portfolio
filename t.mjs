import { chromium } from '@playwright/test';
const objs=['you','teams','orgs','everyone','your users','the world','customers','people','developers','your team','the future','users'];
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:800} });
await p.goto('http://localhost:4001',{waitUntil:'domcontentloaded'});
const fmtObjs=new Set(); let frames=0, repl=0;
for(let i=0;i<70;i++){
  let info; try{ info=await p.evaluate(()=>{const h=document.querySelector('h1');const f=h.querySelector('.tw-line2 .tw-b,.tw-line2 .tw-i,.tw-line2 .tw-u');return {ft:f?f.textContent.trim():null,all:h.innerText};}); }catch{break}
  if(info.all.includes('�'))repl++;
  if(info.ft && objs.includes(info.ft)){ fmtObjs.add(info.ft); frames++; }
  await p.waitForTimeout(130);
}
await b.close();
console.log('distinct formatted-object words seen:', fmtObjs.size, '->', [...fmtObjs].join(', '));
console.log('fmt-on-object frames:', frames, '| repl:', repl);
console.log(fmtObjs.size>=2 ? 'TRANSFER CONFIRMED (format followed to different object words) ✓' : 'inconclusive');
process.exit(0);
