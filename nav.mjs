import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:800} });
p.on('pageerror', e=>console.log('PAGEERROR', e.message));
await p.goto('http://localhost:3988',{waitUntil:'domcontentloaded'});
// caret position = (line, chars-before-caret) from the DOM
const readCaret = () => p.evaluate(() => {
  for (const cls of ['tw-line1','tw-line2']) {
    const el = document.querySelector('.'+cls);
    const caret = el.querySelector('.tw-caret:not(.is-hidden)');
    if (caret) { const before = el.firstElementChild.textContent.length; return [cls==='tw-line1'?1:2, before]; }
  }
  return null;
});
let prev=null, singleSteps=0, jumps=0, samples=0, repl=0;
for (let i=0;i<600;i++){
  try{
    const c = await readCaret();
    const txt = (await p.locator('h1').innerText());
    if (txt.includes('�')) repl++;
    if (c && prev && c[0]===prev[0]) { const d=Math.abs(c[1]-prev[1]); if(d===1) singleSteps++; else if(d>=3) jumps++; }
    prev=c; samples++;
  }catch{break}
  await p.waitForTimeout(30);
}
await b.close();
console.log('samples',samples,'| single-cell steps',singleSteps,'| multi-jumps',jumps,'| repl-char',repl);
console.log(singleSteps>5 ? 'ARROW NAV observed ✓' : 'no arrow nav seen');
