'use strict';
// Record the real extension with public synthetic data in a disposable profile.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/demo');fs.mkdirSync(output,{recursive:true});
const samples=[['Python 官方教程','https://docs.python.org/3/tutorial/'],['Python 标准库参考','https://docs.python.org/3/library/'],['FastAPI 开发文档','https://fastapi.tiangolo.com/'],['MDN · JavaScript 指南','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'],['React 交互开发教程','https://react.dev/learn'],['Android · RecyclerView 列表','https://developer.android.com/develop/ui/views/layout/recyclerview'],['Android · Jetpack Compose','https://developer.android.com/compose'],['Figma · 界面设计工具','https://www.figma.com/'],['Blender · 三维创作工具','https://www.blender.org/'],['Canva · 在线设计','https://www.canva.com/'],['arXiv · 研究论文','https://arxiv.org/'],['维基百科 · 自由百科全书','https://www.wikipedia.org/'],['Coursera · 在线课程','https://www.coursera.org/'],['Hugging Face · 开源模型','https://huggingface.co/'],['DeepSeek · AI 助手','https://www.deepseek.com/'],['Obsidian · 笔记工具','https://obsidian.md/'],['Notion · 协作文档','https://www.notion.so/'],['Product Hunt · 新产品发现','https://www.producthunt.com/'],['YouTube · 视频平台','https://www.youtube.com/'],['Spotify · 音乐平台','https://open.spotify.com/'],['GitHub Actions · 自动化文档','https://docs.github.com/actions'],['示例阅读资料','https://example.com/reading']];
(async()=>{const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-public-demo-'));let ctx;
try{
ctx=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:true,viewport:{width:1360,height:960},recordVideo:{dir:output,size:{width:1360,height:960}},args:['--disable-extensions-except='+path.join(root,'extension'),'--load-extension='+path.join(root,'extension')],ignoreDefaultArgs:['--disable-extensions']});
await ctx.route(/^https?:/,route=>route.abort());
const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('chrome-extension://'+new URL(worker.url()).host+'/newtab.html');await p.waitForFunction(()=>window.BookmarkActions?.available);
await p.evaluate(async rows=>{for(const [title,url] of rows)await chrome.bookmarks.create({title,url});await chrome.runtime.sendMessage({type:'classify'});},samples);
await p.waitForFunction(n=>getBookmarks().length===n,samples.length);await p.waitForFunction(()=>getBookmarks().every(r=>r.classification));
await p.evaluate(()=>{document.querySelector('#syncStatus').textContent='公开示例 · 演示环境';});
const began=Date.now(),marks=[];const hold=ms=>p.waitForTimeout(ms);const snap=async name=>p.screenshot({path:path.join(root,'docs',name)});
const click=async locator=>{await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await hold(250);await locator.click();};
await hold(1700);await snap('demo.png');marks.push({part:'home',at:(Date.now()-began)/1000});
await click(p.locator('#directoryView'));await hold(1600);await snap('graph-overview.png');marks.push({part:'graph',at:(Date.now()-began)/1000});
await click(p.locator('.bg-cluster').filter({has:p.locator('.bg-cluster-name',{hasText:'编程开发'})}));await hold(1300);
await click(p.locator('.bg-cluster').filter({has:p.locator('.bg-cluster-name',{hasText:'Python'})}));await hold(1600);await snap('graph-articles.png');
await click(p.locator('.bg-article-node').first());await hold(1900);assert(await p.locator('#cardDialog').evaluate(d=>d.open));await snap('article-detail.png');
await click(p.locator('#closeCard'));await hold(800);marks.push({part:'graphEnd',at:(Date.now()-began)/1000});
await click(p.locator('#rulesLaunch'));await hold(1200);
await p.locator('#ruleName').pressSequentially('示例站点归档',{delay:90});await p.locator('#ruleField').selectOption('domain');await p.locator('#ruleOperator').selectOption('equals');await p.locator('#ruleValue').pressSequentially('example.com',{delay:75});await click(p.locator('#ruleCategoryTrigger'));await p.locator('#ruleCategorySearch').fill('学习');await p.getByRole('option',{name:'学习与研究',exact:true}).click();await click(p.locator('#ruleSubcategoryTrigger'));await p.locator('#ruleSubcategorySearch').fill('待读资料');await p.getByRole('button',{name:'新建子分类「待读资料」',exact:true}).click();await hold(1000);await snap('rules-settings.png');
await click(p.locator('#ruleSave'));await p.waitForFunction(()=>getBookmarks().some(r=>r.url==='https://example.com/reading'&&r.classification?.source==='user-rule'));await hold(1300);await snap('rules-saved.png');
await click(p.locator('.rules-builtins summary'));await p.locator('.rules-builtins').scrollIntoViewIfNeeded();await hold(1400);await snap('rules-builtins.png');
await click(p.locator('#rulesDialog').getByRole('button',{name:'关闭',exact:true}));await click(p.locator('#cardsView'));await click(p.locator('.nav-button').filter({hasText:'全部收藏'}));await p.locator('#search').fill('示例阅读资料');await hold(1200);
await click(p.locator('#grid .card').getByRole('button',{name:'查看详情'}));await hold(2000);assert((await p.locator('.classification-explanation').innerText()).includes('自定义规则'));await snap('rule-result.png');
assert.deepEqual(errors,[]);const video=p.video();await p.close();const file=await video.path();fs.copyFileSync(file,path.join(output,'walkthrough.webm'));fs.writeFileSync(path.join(output,'recording.json'),JSON.stringify({samples:samples.length,marks,seconds:(Date.now()-began)/1000,errors,network:'HTTP requests blocked; no AI keys or personal profile'},null,2));console.log(JSON.stringify({recorded:true,samples:samples.length,marks,errors}));
}finally{if(ctx)await ctx.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
