'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-links-'));
 const ext=path.resolve(__dirname,'../extension');let ctx;
 try{
  ctx=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:true,args:['--disable-extensions-except='+ext,'--load-extension='+ext],ignoreDefaultArgs:['--disable-extensions'],viewport:{width:1440,height:1050}});
  // No public page is fetched. New tabs receive a local mock document.
  await ctx.route(/^https?:/,route=>route.fulfill({body:'Public sample destination',contentType:'text/plain'}));
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('chrome-extension://'+new URL(worker.url()).host+'/newtab.html');
  await p.waitForFunction(()=>window.BookmarkActions?.available);
  assert.equal(await p.evaluate(()=>getBookmarks().length),0,'Public package must start empty');
  assert.equal(await p.locator('#grid .card').count(),0);
  const fixture=await p.evaluate(async()=>{
   const samples=[['Python 官方教程','https://docs.python.org/3/tutorial/'],['Figma · 界面设计工具','https://www.figma.com/'],['MDN · JavaScript 文档','https://developer.mozilla.org/en-US/docs/Web/JavaScript'],['arXiv · 研究论文','https://arxiv.org/'],['维基百科 · 自由百科全书','https://www.wikipedia.org/'],['GitHub · 开源项目','https://github.com/'],['Blender · 三维创作工具','https://www.blender.org/'],['待整理的示例网页','https://example.com/']];
   const rows=[];for(const [title,url]of samples)rows.push(await chrome.bookmarks.create({title,url}));
   await chrome.runtime.sendMessage({type:'classify'});return rows;
  });
  await p.waitForFunction(()=>getBookmarks().length===8);
  await p.waitForFunction(()=>getBookmarks().some(r=>r.category==='编程开发'));
  const row=p.locator('#grid .card[data-id="'+fixture[0].id+'"]'),title=row.locator('.card-title a');
  let opened=p.waitForEvent('popup');await title.click();let popup=await opened;await popup.waitForLoadState();assert.equal(popup.url(),fixture[0].url);assert.equal(await p.locator('#cardDialog').evaluate(e=>e.open),false);await popup.close();
  await row.getByRole('button',{name:'查看详情'}).click();assert.equal(await p.locator('#cardDialog').evaluate(e=>e.open),true);await p.locator('#closeCard').click();
  await title.focus();opened=p.waitForEvent('popup');await p.keyboard.press('Enter');popup=await opened;await popup.waitForLoadState();assert.equal(popup.url(),fixture[0].url);assert.equal(await p.locator('#cardDialog').evaluate(e=>e.open),false);await popup.close();
  await p.locator('#directoryView').click();await p.locator('.bg-cluster').first().waitFor();await p.locator('#cardsView').click();
  await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.UPDATE_DEMO==='1'){
   await p.setViewportSize({width:1440,height:1050});await p.emulateMedia({reducedMotion:'reduce'});
   await p.evaluate(()=>{scrollTo(0,0);document.querySelector('#syncStatus').textContent='演示数据 · 8 条公开示例';});
   await p.screenshot({path:path.resolve(__dirname,'../docs/demo.png')});
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({emptyStart:true,syntheticBookmarks:8,titleOpensWeb:true,keyboardOpensWeb:true,detailsSeparate:true,graph:true,narrowOverflow:false,errors}));
 }finally{if(ctx)await ctx.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
