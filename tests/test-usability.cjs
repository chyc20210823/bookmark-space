'use strict';
// Real extension UI regressions, using only synthetic bookmarks and a disposable profile.
const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','usability-test');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bookmark-usability-')),ext=path.join(temp,'extension');
 fs.cpSync(path.join(root,'extension'),ext,{recursive:true});let ctx;
 try{
  ctx=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:true,args:['--disable-extensions-except='+ext,'--load-extension='+ext],ignoreDefaultArgs:['--disable-extensions'],viewport:{width:1360,height:960}});
  await ctx.route(/^https?:/,route=>route.abort());
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),p=await ctx.newPage(),errors=[];
  p.on('pageerror',error=>errors.push(error.message));
  await p.goto('chrome-extension://'+new URL(worker.url()).host+'/newtab.html');
  await p.waitForFunction(()=>window.BookmarkActions?.available&&window.bookmarkConnection?.refresh);
  const ids=await p.evaluate(async()=>{
   await BookmarkClassifier.saveSettings({...await BookmarkClassifier.settings(),enabled:false});
   const a=await chrome.bookmarks.create({title:'交互测试收藏甲',url:'https://example.com/alpha'});
   const b=await chrome.bookmarks.create({title:'交互测试收藏乙',url:'https://example.org/beta'});
   await bookmarkConnection.refresh();
   for(const [id,category,subcategory] of [[a.id,'效率与工具','网络连接'],[b.id,'学习与研究','研究资料']]){
    await BookmarkActions.save(getBookmarks().find(row=>row.id===id),{category,subcategory});
   }
   await bookmarkConnection.refresh();return {a:a.id,b:b.id};
  });
  const value=id=>p.locator('#'+id).inputValue();
  const openEdit=async(id=ids.a)=>{
   await p.locator('#grid .card[data-id="'+id+'"]').getByRole('button',{name:'查看详情',exact:true}).click();
   await p.getByRole('button',{name:'编辑收藏',exact:true}).click();
  };
  const selectExisting=async(id,search,label)=>{
   await p.locator('#'+id+'Trigger').click();await p.locator('#'+id+'Search').fill(search);
   await p.locator('#'+id+'Popup').getByRole('option',{name:label,exact:true}).click();assert.equal(await value(id),label);
  };
  const createChoice=async(id,label,kind)=>{
   await p.locator('#'+id+'Trigger').click();await p.locator('#'+id+'Search').fill(label);
   await p.getByRole('button',{name:'新建'+kind+'「'+label+'」',exact:true}).click();assert.equal(await value(id),label);
  };
  const saveEdit=async()=>{
   await p.getByRole('button',{name:'保存修改',exact:true}).click();
   await p.waitForFunction(()=>!document.getElementById('cardDialog').open);
  };
  // Existing selection does not filter away the alternatives when opening the picker.
  await openEdit();assert.equal(await value('editCategory'),'效率与工具');
  await p.locator('#editCategoryTrigger').click();await p.locator('#editCategoryPopup').getByRole('option',{name:'学习与研究',exact:true}).waitFor();await p.screenshot({path:path.join(out,'desktop-picker.png')});
  assert.equal(await value('editCategory'),'效率与工具');assert.equal(await value('editCategorySearch'),'');
  await p.locator('#editCategorySearch').press('ArrowUp');
  const lastChoice=await p.locator('#editCategoryPopup').getByRole('option').last().getAttribute('id');
  assert.equal(await p.locator('#editCategorySearch').getAttribute('aria-activedescendant'),lastChoice);
  await p.locator('#editCategorySearch').press('Escape');assert.equal(await value('editCategory'),'效率与工具');
  await p.locator('#editCategoryTrigger').click();
  await p.locator('#editCategorySearch').fill('学习');
  assert.equal(await p.locator('#editCategoryPopup').getByRole('option',{name:'效率与工具',exact:true}).count(),0);
  // IME Enter must not commit a candidate while Chinese composition is still active.
  await p.locator('#editCategorySearch').evaluate(input=>{
   input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
   input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true,cancelable:true}));
  });
  assert.equal(await value('editCategory'),'效率与工具');assert(await p.locator('#editCategorySearch').isVisible());
  await p.locator('#editCategorySearch').evaluate(input=>input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'学习'})));
  await p.locator('#editCategorySearch').press('ArrowDown');await p.locator('#editCategorySearch').press('Enter');
  assert.equal(await value('editCategory'),'学习与研究');assert.equal(await value('editSubcategory'),'');
  await p.locator('#editSubcategoryTrigger').click();
  assert.equal(await p.locator('#editSubcategoryPopup').getByRole('option',{name:'网络连接',exact:true}).count(),0);
  await p.locator('#editSubcategorySearch').fill('研究资料');await p.locator('#editSubcategoryPopup').getByRole('option',{name:'研究资料',exact:true}).click();
  await saveEdit();await p.reload();
  await p.waitForFunction(id=>getBookmarks().some(r=>r.id===id&&r.category==='学习与研究'&&r.subcategory==='研究资料'),ids.a);
  assert.equal((await p.evaluate(id=>chrome.bookmarks.get(id),ids.a))[0].title,'交互测试收藏甲');
  // Uncommitted search is disposable; Escape closes only the picker, preserving the editor.
  await openEdit();await p.locator('#editCategoryTrigger').click();await p.locator('#editCategorySearch').fill('不存在的查询');
  assert.equal(await p.locator('#editCategoryPopup').getByRole('option').count(),0);await p.locator('#editCategorySearch').press('Escape');
  assert(await p.locator('#cardDialog').evaluate(dialog=>dialog.open));assert.equal(await value('editCategory'),'学习与研究');
  await createChoice('editCategory','交互验证新主题','分类');
  assert.equal(await value('editSubcategory'),'');await createChoice('editSubcategory','交互验证新用途','子分类');
  await saveEdit();await p.reload();
  await p.waitForFunction(id=>getBookmarks().some(r=>r.id===id&&r.category==='交互验证新主题'&&r.subcategory==='交互验证新用途'),ids.a);
  // Dirty edit must remain recoverable after Escape and after the explicit close button.
  await openEdit();await p.locator('#editTitle').fill('尚未保存的编辑标题');await p.keyboard.press('Escape');
  await p.getByRole('button',{name:'继续编辑',exact:true}).waitFor();assert(await p.locator('#cardDialog').evaluate(d=>d.open));
  await p.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await value('editTitle'),'尚未保存的编辑标题');
  await p.mouse.click(2,2);await p.getByRole('button',{name:'继续编辑',exact:true}).waitFor();
  await p.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await value('editTitle'),'尚未保存的编辑标题');
  await p.keyboard.press('Control+k');await p.getByRole('button',{name:'继续编辑',exact:true}).waitFor();
  assert.equal(await p.locator('#focusDialog').evaluate(d=>d.open),false);
  await p.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await value('editTitle'),'尚未保存的编辑标题');
  await p.getByRole('button',{name:'取消',exact:true}).click();await p.getByRole('button',{name:'继续编辑',exact:true}).click();
  await p.locator('#closeCard').click();await p.getByRole('button',{name:'放弃修改',exact:true}).click();
  await p.waitForFunction(()=>!document.getElementById('cardDialog').open);
  assert.equal((await p.evaluate(id=>chrome.bookmarks.get(id),ids.a))[0].title,'交互测试收藏甲');
  // A clean editor can close immediately; merely opening it must not trigger a warning.
  await openEdit();await p.locator('#closeCard').click();await p.waitForFunction(()=>!document.getElementById('cardDialog').open);
  // Editing an existing rule, closing and reopening must not turn Add into an overwrite.
  await p.locator('#rulesLaunch').click();await p.locator('#ruleName').fill('原规则样例');await p.locator('#ruleValue').fill('alpha');
  await selectExisting('ruleCategory','学习','学习与研究');await selectExisting('ruleSubcategory','研究资料','研究资料');
  await p.locator('#ruleSave').click();await p.waitForFunction(()=>document.querySelectorAll('#userRuleList .rule-item').length===1);
  const oldRule=await p.evaluate(async()=>(await BookmarkClassifier.settings()).userRules[0]);
  await p.locator('#userRuleList').getByRole('button',{name:'编辑',exact:true}).click();
  await p.locator('#rulesDialog').getByRole('button',{name:'关闭',exact:true}).click();
  await p.waitForFunction(()=>!document.getElementById('rulesDialog').open);await p.locator('#rulesLaunch').click();await p.waitForFunction(()=>document.getElementById('rulesDialog').open);
  assert.equal(await value('ruleName'),'');assert.equal(await p.locator('#ruleSave').innerText(),'添加规则');
  await p.locator('#ruleName').fill('第二条规则样例');await p.locator('#ruleValue').fill('beta');
  await selectExisting('ruleCategory','学习','学习与研究');await selectExisting('ruleSubcategory','研究资料','研究资料');
  await p.locator('#ruleSave').click();await p.waitForFunction(()=>document.querySelectorAll('#userRuleList .rule-item').length===2);
  const allRules=await p.evaluate(async()=>(await BookmarkClassifier.settings()).userRules);
  assert.equal(allRules.find(rule=>rule.id===oldRule.id).name,'原规则样例');assert(allRules.some(rule=>rule.name==='第二条规则样例'&&rule.id!==oldRule.id));
  // A disabled rule stays disabled after editing its name.
  const savedRule=p.locator('#userRuleList .rule-item').filter({hasText:'原规则样例'});
  await savedRule.getByRole('button',{name:'停用',exact:true}).click();
  await p.waitForFunction(async id=>(await BookmarkClassifier.settings()).userRules.find(r=>r.id===id)?.enabled===false,oldRule.id);
  await savedRule.getByRole('button',{name:'编辑',exact:true}).click();await p.locator('#ruleName').fill('原规则样例已改名');await p.locator('#ruleSave').click();
  await p.waitForFunction(async id=>(await BookmarkClassifier.settings()).userRules.find(r=>r.id===id)?.name==='原规则样例已改名',oldRule.id);
  assert.equal(await p.evaluate(async id=>(await BookmarkClassifier.settings()).userRules.find(r=>r.id===id).enabled,oldRule.id),false);
  await p.locator('#rulesDialog').getByRole('button',{name:'关闭',exact:true}).click();
  // Domain search works in both ordinary and focused search, even without a domain in the title.
  const auto=await p.evaluate(async()=>{const row=await chrome.bookmarks.create({title:'Python 官方教程',url:'https://docs.python.org/3/tutorial/'});await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();return row;});
  await p.waitForFunction(id=>getBookmarks().some(r=>r.id===id&&r.classification?.status==='classified'),auto.id);
  await p.locator('#search').fill('docs.python.org');
  await p.locator('#grid .card[data-id="'+auto.id+'"]').waitFor();assert.equal(await p.locator('#grid .card').count(),1);
  await p.locator('#clearSearch').click();await p.locator('#focusLaunch').click();await p.locator('#focusSearch').fill('docs.python.org');
  assert((await p.locator('#focusResults').innerText()).includes('Python 官方教程'));await p.locator('#closeFocus').click();
  // Title-only and tag-only edits must not accidentally lock an automatic category as manual.
  await openEdit(auto.id);await p.locator('#editTitle').fill('Python 官方教程改名');await saveEdit();
  await p.evaluate(async()=>{await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();});
  assert.notEqual(await p.evaluate(id=>getBookmarks().find(r=>r.id===id).classification?.source,auto.id),'manual');
  await openEdit(auto.id);await p.locator('#editTags').fill('独立标签');await saveEdit();
  await p.evaluate(async()=>{await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();});
  let automatic=await p.evaluate(id=>getBookmarks().find(r=>r.id===id),auto.id);assert.notEqual(automatic.classification?.source,'manual');assert.deepEqual(automatic.tags,['独立标签']);
  await p.reload();await p.waitForFunction(id=>getBookmarks().some(r=>r.id===id&&r.tags.includes('独立标签')),auto.id);
  automatic=await p.evaluate(id=>getBookmarks().find(r=>r.id===id),auto.id);assert.notEqual(automatic.classification?.source,'manual');
  assert.equal(await p.evaluate(id=>getBookmarks().find(r=>r.id===id).classification?.source,ids.a),'manual');
  // Tag-only metadata must retain private masking when its bookmark enters the trash.
  const privateTitle='合成私人文档隐私回归';
  const privateBookmark=await p.evaluate(async title=>{
   const row=await chrome.bookmarks.create({title,url:'https://docs.google.com/document/synthetic-private'});
   await chrome.runtime.sendMessage({type:'classify',force:true});await bookmarkConnection.refresh();return row;
  },privateTitle);
  await p.waitForFunction(id=>getBookmarks().some(row=>row.id===id&&row.private),privateBookmark.id);
  await openEdit(privateBookmark.id);await p.locator('#editTags').fill('仅标签修改');await saveEdit();
  assert.equal(await p.evaluate(async id=>(await BookmarkDB.get('management')).metadata[id].manual,privateBookmark.id),false);
  await p.locator('#privacyMode').check();await p.locator('#search').fill('docs.google.com');
  assert.equal(await p.locator('#grid .card').count(),0);assert(!(await p.locator('body').innerText()).includes(privateTitle));
  await p.locator('#clearSearch').click();await p.locator('#focusLaunch').click();await p.locator('#focusSearch').fill('docs.google.com');
  assert(!(await p.locator('#focusResults').innerText()).includes(privateTitle));assert.equal(await p.locator('#focusResults .focus-result').count(),0);
  await p.locator('#closeFocus').click();
  const privateToken=await p.evaluate(async id=>{
   const token=await BookmarkActions.remove(getBookmarks().find(row=>row.id===id));await bookmarkConnection.refresh();return token;
  },privateBookmark.id);
  assert.equal(await p.evaluate(async token=>(await BookmarkActions.deleted()).find(row=>row.token===token).private,privateToken),true);
  await p.locator('#trashLaunch').click();await p.locator('#trashContent').getByText('私人收藏 · 已隐藏',{exact:true}).waitFor();
  assert(!(await p.locator('#trashContent').innerText()).includes(privateTitle));assert(!(await p.locator('#trashContent').innerText()).includes('docs.google.com'));
  await p.screenshot({path:path.join(out,'private-trash.png')});
  await p.locator('#trashDialog').getByRole('button',{name:'关闭',exact:true}).click();await p.locator('#privacyMode').uncheck();
  // Picker stays inside a narrow viewport and remains operable above the keyboard field.
  await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await openEdit();await p.locator('#editSubcategoryTrigger').click();await p.locator('#editSubcategorySearch').waitFor({state:'visible'});
  const bounds=await p.locator('#editSubcategorySearch').evaluate(input=>{
   const dialog=input.closest('[role="dialog"]'),box=(dialog||input).getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:innerWidth,height:innerHeight};
  });
  assert(bounds.left>=0&&bounds.right<=bounds.width&&bounds.top>=0&&bounds.bottom<=bounds.height,JSON.stringify(bounds));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:path.join(out,'narrow-picker.png')});
  await p.locator('#editSubcategorySearch').press('Escape');await p.locator('#closeCard').click();
  assert.deepEqual(errors,[]);
  const report={environment:'Isolated Chromium, synthetic bookmarks, HTTP blocked, no personal browser or real AI calls',openAllWithoutClearing:true,searchAndKeyboard:true,firstArrowUpSelectsLast:true,IMEEnterPreserved:true,parentChildConsistency:true,existingAndNewValuesPersist:true,pickerEscapePreservesEditor:true,dirtyCloseProtection:true,cleanCloseImmediate:true,ruleReopenDoesNotOverwrite:true,disabledRuleRemainsDisabled:true,domainSearchBothViews:true,titleOnlyDoesNotLockClassification:true,tagsPersistWithoutLocking:true,dirtyBackdropAndShortcutProtected:true,privateTagOnlySearchMasked:true,privateTagOnlyTrashMasked:true,narrowPickerInViewport:true,errors};
  fs.writeFileSync(path.join(out,'regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(ctx)await ctx.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
