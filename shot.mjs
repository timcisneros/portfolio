import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:760} });
await p.goto('http://localhost:4080',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
// measure caret-driven jitter: sample the x-position of the last word's first letter
// while the caret moves through line 2, by reading getBoundingClientRect of a stable ref char
const kern = await p.evaluate(()=>getComputedStyle(document.querySelector('.tw')).fontKerning);
await p.locator('h1').screenshot({ path:'/tmp/kern.png' });
console.log('font-kerning =', kern);
await b.close();
