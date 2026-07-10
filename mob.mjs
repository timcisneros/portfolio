import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
for (const w of [390, 360, 768]) {
  const p = await b.newPage({ viewport:{width:w,height:800} });
  await p.goto('http://localhost:3988',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(500);
  const r = await p.evaluate(()=>({doc:document.documentElement.scrollWidth, win:window.innerWidth, tw:document.querySelector('.tw').getBoundingClientRect().width}));
  console.log(`vp ${w}: scrollWidth=${r.doc} innerW=${r.win} twW=${Math.round(r.tw)} ${r.doc<=r.win+1?'OK no-scroll':'H-SCROLL!'}`);
  await p.close();
}
await b.close();
