import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser' });
const p = await b.newPage({ viewport:{width:1280,height:800} });
let perr=0; p.on('pageerror', ()=>perr++);
await p.goto('http://localhost:3993',{waitUntil:'domcontentloaded'});
// Deterministic test: inject a format, then simulate the page continuing —
// instead, directly test the render logic by driving real animation and
// tracking a formatted word's persistence across sentence changes.
let maxRun=0, cur=0, repl=0, sawFmt=0, prevSentence=null, changesWhileFmt=0;
for(let i=0;i<220;i++){
  const info = await p.evaluate(()=>{
    const h=document.querySelector('h1');
    const fmtEl=h.querySelector('.tw-b,.tw-i,.tw-u');
    return { fmt: fmtEl?fmtEl.textContent:null, kind: fmtEl?[...fmtEl.classList].find(c=>/^tw-[biu]$/.test(c)):null, txt:h.innerText.replace(/\n/g,' ') };
  });
  if(info.txt.includes('�'))repl++;
  if(info.fmt){ sawFmt++; cur++; if(cur>maxRun)maxRun=cur; if(prevSentence!==null && prevSentence!==info.txt) changesWhileFmt++; } else { cur=0; }
  prevSentence=info.txt;
  await p.waitForTimeout(140);
}
await b.close();
console.log('format-frames',sawFmt,'| longest continuous run',maxRun,'| sentence-changes-while-formatted',changesWhileFmt,'| repl',repl,'| pageerr',perr);
process.exit(0);
