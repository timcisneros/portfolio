import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
for (const w of [1280, 500]) {
  const p = await b.newPage({ viewport:{width:w,height:820} });
  await p.goto('http://localhost:3988', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const box = document.querySelector('.tw-line2').clientWidth;
    const m = document.querySelector('.tw-measure');
    const wide = s => { m.textContent = s; return m.offsetWidth<=box; };
    const t=['works for you 🚀','Software 💻 that','What could software','What should automation'];
    return { box, r: t.map(s=>[wide(s)?'✓':'✗',s]) };
  });
  console.log(`vp ${w}: box=${r.box}px`, r.r.map(x=>x[0]+' '+x[1]).join(' | '));
  // screenshot hero area
  await p.screenshot({ path:`/tmp/wide-${w}.png`, clip:{x:0,y:60,width:Math.min(w,1280),height:420} });
  await p.close();
}
await b.close();
