import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {campaignFor,emptySave,saveGame,saveKeyFor} from '../lib/player.ts';
import {initialStateForChoice,selectCell} from '../lib/game.ts';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve('dist/client'),out=process.env.QA_OUTPUT||'evidence/found-letter';
fs.mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const f=path.resolve(root,'.'+(name==='/'?'/index.html':decodeURIComponent(name)));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const b=fs.readFileSync(f);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml'})[path.extname(f)]??'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const choice=campaignFor('es')[0];let game=initialStateForChoice(choice);
const word=game.puzzle.words[0];for(const id of word.path)game=selectCell(game,id);
assert.equal(game.found.length,1);
const data=saveGame(emptySave(),choice.id,game),results=[];
try{
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch(engine==='chromium'&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
  try{for(const theme of ['light','dark']){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
   await page.addInitScript(({data,key,theme})=>{localStorage.setItem('sopa-language','es');localStorage.setItem('sopa-theme',theme);localStorage.setItem(key,JSON.stringify(data));},{data,key:saveKeyFor('es'),theme});
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.getByRole('button',{name:'Jugar',exact:true}).click();
   await page.getByRole('button',{name:/^Niveles/}).click();
   await page.getByRole('button',{name:/^Nivel 1 de /}).click();
   await page.locator('.cube-stage.canvas-ready').waitFor();
   if(await page.getByRole('button',{name:'Entendido',exact:true}).isVisible())await page.getByRole('button',{name:'Entendido',exact:true}).click();
   for(const id of word.path){
    const tile=page.locator(`[data-cell="${id}"]`);await tile.focus();await tile.press('Enter');
    assert.match(await tile.getAttribute('class'),/selected/);assert.match(await tile.getAttribute('class'),/found/);
    assert.equal(await tile.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    if(id===word.path[0])await page.screenshot({path:`${out}/${engine}-${theme}-reselected.png`});
    await tile.press('Enter');assert.doesNotMatch(await tile.getAttribute('class'),/selected/);
   }
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKeyFor('es'));
   assert.deepEqual(saved.progress[choice.id].paths,data.progress[choice.id].paths);
   results.push({engine,theme,foundCells:word.path.length,selectionAndUndoPassed:true,progressPreserved:true});
   await page.close();
  }}finally{await browser.close();}
 }
 fs.writeFileSync(`${out}/ui-regression.json`,JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify(results));
}finally{await new Promise(r=>server.close(r));}
