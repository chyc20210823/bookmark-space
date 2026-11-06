'use strict';
// Status integration test. Only synthetic bookmarks and a fake Key are used.
const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','ai-status-test');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-ai-status-')),ext=path.join(temp,'extension');fs.cpSync(path.join(root,'extension'),ext,{recursive:true});let ctx;
 try{
  ctx=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:true,args:['--disable-extensions-except='+ext,'--load-extension='+ext],ignoreDefaultArgs:['--disable-extensions'],viewport:{width:1440,height:1000}});
  await ctx.route(/^https?:/,route=>route.abort());const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  await worker.evaluate(()=>{
   globalThis.mockAllowed=false;globalThis.mockMode='hold';globalThis.mockCalls=[];globalThis.mockHeld=[];
   chrome.permissions.contains=async()=>mockAllowed;
   globalThis.mockResponse=text=>new Response(JSON.stringify({choices:[{message:{content:text},finish_reason:'stop'}]}),{status:200,headers:{'Content-Type':'application/json'}});
   globalThis.fetch=async(url,options)=>{
    mockCalls.push({url:String(url),body:String(options.body||'')});
    if(mockMode==='forbidden')return new Response(JSON.stringify({error:{message:'Synthetic access refusal'}}),{status:403,headers:{'Content-Type':'application/json'}});
    // Intentionally ignore abort, to verify that a late result cannot undo Stop.
    return new Promise(resolve=>mockHeld.push({resolve}));
   };
  });
  const p=await ctx.newPage(),errors=[],consoleMessages=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>consoleMessages.push(m.text()));
  await p.goto('chrome-extension://'+new URL(worker.url()).host+'/newtab.html');
  await p.waitForFunction(()=>window.BookmarkActions?.available&&window.bookmarkConnection?.refresh&&window.BookmarkAIView?.refresh);
  const send=(type,extra={})=>p.evaluate(async message=>{const reply=await chrome.runtime.sendMessage(message);if(!reply?.ok)throw new Error(reply?.error||'Message failed');return reply.value;},{type,...extra});
  const waitDB=async(predicate,arg)=>{const deadline=Date.now()+10000;while(Date.now()<deadline){if(await p.evaluate(predicate,arg))return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('Database condition did not settle');};
  const refresh=()=>p.evaluate(()=>BookmarkAIView.refresh());
  const globalState=async expected=>{try{await p.waitForFunction(state=>document.querySelector('#aiSummary')?.dataset.state===state,expected,{timeout:7000});}catch{throw new Error('Expected AI summary '+expected+', actual '+await p.locator('#aiSummary').getAttribute('data-state')+'; worker '+(await send('ai-overview')).state);}assert((await p.locator('#aiSummary').innerText()).trim());};
  const summaryRoute=async target=>{await p.locator('#aiSummary').click();await p.locator(target==='settings'?'#aiDialog':'#aiActivityDialog').waitFor({state:'visible'});assert.equal(await p.evaluate(()=>document.querySelectorAll('dialog[open]').length),1);await p.locator(target==='settings'?'#aiClose':'#aiActivityClose').click();};
  const itemState=async(id,expected)=>{await p.waitForFunction(({id,expected})=>[...document.querySelectorAll('.ai-item-status[data-ai-id]')].some(el=>el.dataset.aiId===id&&el.dataset.aiState===expected),{id,expected});};
  const waitHeld=async()=>{const deadline=Date.now()+10000;while(Date.now()<deadline){if(await worker.evaluate(()=>mockHeld.length>0))return;await new Promise(r=>setTimeout(r,25));}throw new Error('Mock request did not start');};
  const resolveNext=async text=>{await waitHeld();await worker.evaluate(text=>mockHeld.shift().resolve(mockResponse(text)),text);};
  const classification=(category='学习与研究',confidence=.94)=>JSON.stringify({category,subcategory:'资料',tags:['示例'],reason:'依据标题和网址整理',confidence});
  const save=async overrides=>send('ai-save',{start:false,value:{provider:'deepseek',model:'deepseek-flash',apiKey:'test-only-status-key',consent:true,enabled:false,mode:'pending',dailyLimit:30,...overrides}});
  const fixture=await p.evaluate(async()=>{
   const result={};for(const [key,title,url] of [
    ['a','状态样例甲','https://example.org/status-a'],['b','状态样例乙','https://example.net/status-b'],
    ['private','合成私人文件','https://docs.google.com/document/status-private'],
    ['manual','人工归类样例','https://example.com/status-manual'],
    ['rule','Python 官方文档','https://docs.python.org/3/tutorial/'],
    ['custom','自定义归类样例','https://custom.example.com/status']])result[key]=await chrome.bookmarks.create({title,url});
   const settings=await BookmarkClassifier.settings();await BookmarkClassifier.saveSettings({...settings,userRules:[...settings.userRules,{id:'status-custom-rule',name:'状态测试域名规则',field:'domain',operator:'equals',value:'custom.example.com',category:'学习与研究',subcategory:'自定义资料',tags:[],enabled:true,priority:100}]});
   await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();
   await BookmarkActions.save(getBookmarks().find(row=>row.id===result.manual.id),{category:'手动主题',subcategory:'人工保留'});await bookmarkConnection.refresh();return result;
  });
  await globalState('unconfigured');await summaryRoute('settings');await itemState(fixture.a.id,'unconfigured');await itemState(fixture.private.id,'skipped-private');
  await itemState(fixture.manual.id,'manual');await itemState(fixture.rule.id,'rule');await itemState(fixture.custom.id,'rule');
  await save({consent:false});await globalState('consent');await summaryRoute('settings');await itemState(fixture.a.id,'consent');
  await save({consent:true});await globalState('permission');await summaryRoute('settings');await itemState(fixture.a.id,'permission');
  await worker.evaluate(()=>{mockAllowed=true;});await refresh();await globalState('off');await summaryRoute('activity');await itemState(fixture.a.id,'off');
  assert.equal(await worker.evaluate(()=>mockCalls.length),0);
  // A connection check is real worker work, represented as testing without classifying anything.
  await p.evaluate(()=>{window.pendingConnectionTest=chrome.runtime.sendMessage({type:'ai-test'});});
  await waitHeld();await globalState('testing');await resolveNext('OK');
  const connection=await p.evaluate(()=>window.pendingConnectionTest);assert(connection.ok);await globalState('off');
  await save({enabled:true});await globalState('queued');await itemState(fixture.a.id,'queued');await itemState(fixture.b.id,'queued');
  await send('ai-run');await waitHeld();await globalState('running');await itemState(fixture.a.id,'running');await itemState(fixture.b.id,'queued');
  for(const [key,state]of [['private','skipped-private'],['manual','manual'],['rule','rule'],['custom','rule']])await itemState(fixture[key].id,state);
  await p.screenshot({path:path.join(out,'running.png')});
  await resolveNext(classification());await waitHeld();await itemState(fixture.a.id,'done');await itemState(fixture.b.id,'running');
  await resolveNext(classification('状态测试新主题'));
  await waitDB(async id=>(await BookmarkDB.get('ai:'+id))?.state==='review',fixture.b.id);await globalState('review');await summaryRoute('activity');await itemState(fixture.b.id,'review');
  const overview=await send('ai-overview');assert.equal(overview.reviewCount,1);assert(!JSON.stringify(overview).includes('test-only-status-key'));
  assert.equal(await worker.evaluate(()=>mockCalls.length),3); // One connection check and two eligible bookmarks.
  await send('ai-dismiss',{id:fixture.b.id});await itemState(fixture.b.id,'dismissed');await globalState('idle');
  // A terminal service error must appear globally and on the failed item.
  await save({enabled:false});
  const errorRow=await p.evaluate(async()=>{const row=await chrome.bookmarks.create({title:'状态失败样例',url:'https://example.org/status-error'});await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();return row;});
  await worker.evaluate(()=>{mockMode='forbidden';});await save({enabled:true});await send('ai-run');
  await waitDB(async id=>(await BookmarkDB.get('ai:'+id))?.state==='failed',errorRow.id);await globalState('error');await itemState(errorRow.id,'error');
  // The daily cap blocks new calls and reports quota, rather than pretending work continues.
  await save({enabled:false,dailyLimit:1});
  const quotaRow=await p.evaluate(async()=>{const row=await chrome.bookmarks.create({title:'状态额度样例',url:'https://example.net/status-quota'});await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();return row;});
  await worker.evaluate(async()=>{const u=(await BookmarkAI.state()).usage;await BookmarkDB.set('aiUsage',{day:u.day,count:1});mockMode='hold';});
  await save({enabled:true,dailyLimit:1});const callsBeforeQuota=await worker.evaluate(()=>mockCalls.length);await send('ai-run');await globalState('quota');await itemState(quotaRow.id,'quota');assert.equal(await worker.evaluate(()=>mockCalls.length),callsBeforeQuota);
  const checkTomorrowAlarm=async()=>{const alarm=await worker.evaluate(async()=>{const a=await chrome.alarms.get(BookmarkAI.ALARM),tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(0,1,0,0);return {scheduled:a?.scheduledTime,expected:tomorrow.getTime()};});assert(alarm.scheduled&&Math.abs(alarm.scheduled-alarm.expected)<2000,JSON.stringify(alarm));};
  await checkTomorrowAlarm();
  await p.evaluate(id=>chrome.bookmarks.update(id,{title:'状态额度样例更新'}),quotaRow.id);await p.waitForTimeout(500);await checkTomorrowAlarm();
  // A one-off batch never silently opts into tomorrow's automatic work.
  const onceSettings=await save({enabled:false,dailyLimit:1});await send('ai-run');await globalState('quota');
  const deadline=Date.now()+5000;let onceFinished=false;
  while(Date.now()<deadline){onceFinished=await worker.evaluate(async revision=>{const batch=await BookmarkDB.get('aiBatch'),status=await BookmarkDB.get('aiStatus'),alarm=await chrome.alarms.get(BookmarkAI.ALARM);return status?.state==='quota'&&status.revision===revision&&!batch?.active&&!alarm;},onceSettings.revision);if(onceFinished)break;await new Promise(resolve=>setTimeout(resolve,25));}
  assert(onceFinished,'One-off quota did not finish cleanup for its current settings revision');
  await worker.evaluate(async()=>{const u=(await BookmarkAI.state()).usage;await BookmarkDB.set('aiUsage',{day:u.day,count:0});});await globalState('off');
  // Stopping a request immediately removes running badges; a late answer cannot reclassify it.
  await send('ai-stop');
  await p.evaluate(async ids=>{for(const id of ids)await chrome.bookmarks.remove(id);await bookmarkConnection.refresh();},[fixture.a.id,fixture.b.id,errorRow.id,quotaRow.id]);
  await worker.evaluate(async()=>{const u=(await BookmarkAI.state()).usage;await BookmarkDB.set('aiUsage',{day:u.day,count:0});});
  const stopRow=await p.evaluate(async()=>{const row=await chrome.bookmarks.create({title:'停止后不应分类',url:'https://example.org/status-stop'});await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();return row;});
  await save({enabled:false});await send('ai-run');await waitHeld();await globalState('running');await itemState(stopRow.id,'running');
  await send('ai-stop');await globalState('off');await itemState(stopRow.id,'off');await resolveNext(classification());
  await waitDB(async id=>(await BookmarkDB.get('ai:'+id))?.state!=='processing',stopRow.id);await globalState('off');await itemState(stopRow.id,'off');
  assert.notEqual(await p.evaluate(id=>getBookmarks().find(r=>r.id===id)?.classification?.source,stopRow.id),'ai');
  // A stale processing record must not be displayed as a live request after a worker restart.
  await worker.evaluate(async id=>{const rows=BookmarkClassifier.flatten(await chrome.bookmarks.getTree()),row=rows.find(r=>r.id===id);await BookmarkDB.set('ai:'+id,{state:'processing',fingerprint:BookmarkClassifier.fingerprint(row),signature:'stale',title:row.title,provider:'deepseek',model:'deepseek-flash',updatedAt:0});},stopRow.id);
  await globalState('off');await itemState(stopRow.id,'off');
  // Status refresh is driven by events: no recurring overview requests while nothing changes.
  await p.evaluate(()=>{window.overviewRequests=0;const original=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=(...args)=>{if(args[0]?.type==='ai-overview')window.overviewRequests++;return original(...args);};});
  await refresh();await p.waitForTimeout(600);const requests=await p.evaluate(()=>overviewRequests);await p.waitForTimeout(1800);assert.equal(await p.evaluate(()=>overviewRequests),requests);
  for(const file of ['ai-ui.js','ai-status-ui.js'])assert(!/setInterval\s*\(/.test(fs.readFileSync(path.join(ext,file),'utf8')));
  assert(!(await p.locator('body').innerText()).includes('test-only-status-key'));assert(!consoleMessages.join('\n').includes('test-only-status-key'));
  // Enabling automatic work followed only by a connection test must resume the queue.
  await save({enabled:true});assert.equal(await worker.evaluate(async()=>!!await chrome.alarms.get(BookmarkAI.ALARM)),false);
  await p.evaluate(()=>{window.pendingConnectionTest=chrome.runtime.sendMessage({type:'ai-test'});});await waitHeld();await globalState('testing');await resolveNext('OK');
  assert((await p.evaluate(()=>window.pendingConnectionTest)).ok);
  const resumed=await worker.evaluate(async()=>({alarm:await chrome.alarms.get(BookmarkAI.ALARM),enabled:(await BookmarkAI.settings()).enabled}));
  assert(resumed.enabled&&resumed.alarm?.scheduledTime>Date.now(),'Automatic queue did not resume after the connection check');
  await globalState('queued');await send('ai-stop');await globalState('off');
  assert.deepEqual(errors,[]);
  await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);await p.screenshot({path:path.join(out,'narrow-summary.png')});
  const report={environment:'Disposable Chromium; synthetic bookmarks, fake Key and mocked worker fetch; real network blocked',summaryRoutesSetupToSettingsAndOthersToActivity:true,unconfiguredConsentPermissionOff:true,testingState:true,queuedRunningAndDone:true,reviewAndDismiss:true,privateManualAndRulesProtected:true,errorAndQuota:true,automaticQuotaResumesTomorrow:true,oneOffQuotaDoesNotAutoResume:true,oneOffRunsWhileAutomaticOff:true,automaticResumesAfterConnectionTest:true,stopDiscardsLateResponse:true,staleProcessingNotRunning:true,publicStateAndDOMContainNoKey:true,eventDrivenNoPeriodicOverviewRequests:true,narrowOverflow:false,errors};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(ctx)await ctx.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
