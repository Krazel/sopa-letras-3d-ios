import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output=process.env.QA_OUTPUT || 'evidence/found-letter';
fs.mkdirSync(output,{recursive:true});
const css=['globals','ui','reference-ui','home-art','ads'].map(name=>fs.readFileSync(`app/${name}.css`,'utf8').replace(/^@import[^;]+;/gm,'')).join('\n');
const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch(engine==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
 try{
  const page=await browser.newPage({viewport:{width:390,height:600}});
  await page.setContent('<html><body><div class="paper-game"><div class="cube-stage canvas-ready" style="width:300px;height:300px"><div class="cube-volume"><canvas class="motion-canvas" width="300" height="300"></canvas><button class="letter" aria-label="S, encontrada" style="left:150px;top:150px;width:48px;height:48px;opacity:1"></button></div></div></div></body></html>');
  await page.addStyleTag({content:css});
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   for(const state of ['', 'selected','found','found selected']){
    const button=page.locator('button.letter');
    await button.evaluate((b,state)=>b.className='letter '+state,state);
    for(const interaction of ['rest','hover','focus']){
     if(interaction==='rest'){await page.mouse.move(0,0);await button.evaluate(b=>b.blur());}
     if(interaction==='hover')await button.hover();
     if(interaction==='focus')await button.focus();
     const style=await button.evaluate(b=>{const s=getComputedStyle(b);return {background:s.backgroundColor,color:s.color,border:s.borderTopColor,shadow:s.boxShadow};});
     results.push({engine,theme,state:state||'normal',interaction,...style});
    }
   }
   // Before canvas initialization, the existing fallback state must retain its fill.
   await page.locator('.cube-stage').evaluate(e=>e.classList.remove('canvas-ready'));
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('button')).backgroundColor!=='rgba(0, 0, 0, 0)');
   const fallback=await page.locator('button').evaluate(e=>getComputedStyle(e).backgroundColor);
   assert.notEqual(fallback,'rgba(0, 0, 0, 0)');
   await page.locator('.cube-stage').evaluate(e=>e.classList.add('canvas-ready'));
  }
 }finally{await browser.close();}
}
const failures=results.filter(r=>r.background!=='rgba(0, 0, 0, 0)'||r.color!=='rgba(0, 0, 0, 0)'||r.border!=='rgba(0, 0, 0, 0)'||r.shadow!=='none');
fs.writeFileSync(`${output}/css-regression.json`,JSON.stringify({passed:!failures.length,cases:results.length,failures,results},null,2));
assert.equal(failures.length,0,`Canvas hit targets must not cover letters: ${JSON.stringify(failures)}`);
console.log(`${results.length} found/selected style cases passed in Chromium and WebKit, plus fallback checks.`);
