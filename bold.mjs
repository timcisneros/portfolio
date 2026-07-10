import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:800} });
await p.goto('http://localhost:3992',{waitUntil:'domcontentloaded'});
// force a stable render: stop the animation by overwriting line1 words with a bold sample
await p.evaluate(()=>{
  const l1=document.querySelector('.tw-line1');
  l1.innerHTML = '<span class="tw-word">Software </span><span class="tw-word tw-b">that</span>';
  const l2=document.querySelector('.tw-line2');
  l2.innerHTML = '<span class="tw-word">works for </span><span class="tw-word tw-b">you</span>';
});
await p.waitForTimeout(300);
await p.locator('h1').screenshot({path:'/tmp/bold-check.png'});
await b.close(); console.log('captured');
