/* Native bookmark reader. Writes are isolated in manage-store.js. No network. */
(function(root){
'use strict';
const OFFSET=11644473600000000n;
function chromeTime(ms){return Number.isFinite(ms)?String(BigInt(Math.trunc(ms))*1000n+OFFSET):'0';}
function privateURL(url){
 try{const u=new URL(url);return !['http:','https:'].includes(u.protocol)||/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname)||!u.hostname.includes('.')||/(^|\.)(feishu\.cn|notion\.so|yuque\.com|docs\.google\.com|shimo\.im)$/.test(u.hostname)||/(login|sign.?in|account|\/keys|weborder|console|dashboard|admin|token|auth|secret|password|utkn|crypt|bind_order_id)/i.test(u.pathname+u.search);}catch{return true;}
}
function flatten(tree){const rows=[];function walk(n,folders){if(n.url){rows.push({id:String(n.id),title:String(n.title??''),url:n.url,folder:folders.join(' / '),added:chromeTime(n.dateAdded),unmodifiable:n.unmodifiable||null});}else for(const c of n.children||[])walk(c,n.title?[...folders,n.title]:folders);}for(const n of tree)walk(n,[]);return rows;}
function reconcile(tree,seed){
 const byURL=new Map();for(const row of seed){if(!byURL.has(row.url))byURL.set(row.url,[]);byURL.get(row.url).push(row);}
 return flatten(tree).map(row=>{
  const sameURL=byURL.get(row.url)||[];
  const old=sameURL.find(s=>s.title===row.title)||sameURL[0];
  let host='';try{host=new URL(row.url).hostname;}catch{}
  // URL is the cross-profile identity for metadata only; never use native IDs across browsers.
  if(old&&old.title===row.title)return {...old,...row,host,classificationSeed:true,private:sameURL.some(s=>s.private)||privateURL(row.url)};
  return {...row,host,shortTitle:row.title,category:'待确认',subcategory:'待分析',description:'已同步浏览器中的最新信息，等待本机规则整理。',tags:[],confidence:'待确认',private:sameURL.some(s=>s.private)||privateURL(row.url),preview:'',icon:old?.icon||'',imageSource:old?.icon?'site-icon':'none'};
 });
}
function attach(api,seed,paint,report,doc,win){
 let revision=0,timer,stopped=false,lastSnapshot=null;
 async function refresh(){const stamp=++revision;try{const tree=await api.getTree();if(stopped||stamp!==revision)return;const base=reconcile(tree,seed),ruled=root.BookmarkClassifier?await root.BookmarkClassifier.decorate(base):base,rows=root.BookmarkActions?await root.BookmarkActions.decorate(ruled):ruled,snapshot=JSON.stringify(rows),status=(typeof navigator!=='undefined'&&navigator.userAgent.includes('Edg/')?'Edge':'Chrome')+' 收藏 · 已联动 · '+rows.length+' 条 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(stopped||stamp!==revision)return;if(snapshot!==lastSnapshot){lastSnapshot=snapshot;paint(rows,status);}else report(status);}catch{if(!stopped&&stamp===revision)report('读取失败 · 请重新打开收藏空间');}}
 function schedule(){// Invalidate an in-flight read immediately, before debounce.
  ++revision;clearTimeout(timer);timer=setTimeout(refresh,80);
 }
 const eventNames=['onCreated','onChanged','onRemoved','onMoved','onChildrenReordered','onImportEnded'];
 for(const name of eventNames)api[name]?.addListener(schedule);
 function visible(){if(!doc?.hidden)schedule();}
 doc?.addEventListener('visibilitychange',visible);win?.addEventListener('focus',schedule);
 const unsubscribe=root.BookmarkActions?.subscribe(schedule);const unclass=root.BookmarkDB?.subscribe(key=>{if(key.startsWith('class:'))schedule();});
 refresh();
 return {refresh,stop(){unclass?.();unsubscribe?.();stopped=true;++revision;clearTimeout(timer);for(const name of eventNames)api[name]?.removeListener(schedule);doc?.removeEventListener('visibilitychange',visible);win?.removeEventListener('focus',schedule);}};
}
const exported={chromeTime,flatten,reconcile,attach,privateURL};
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
root.BookmarkSync=exported;
if(root.chrome?.bookmarks&&typeof root.setBookmarks==='function'){
 const status=t=>{const n=document.getElementById('syncStatus');if(n)n.textContent=t;};
 root.setBookmarks([],'正在读取本浏览器收藏…');
 async function connect(){try{await root.BookmarkActions?.ready;const seedRows=reconcile(await root.chrome.bookmarks.getTree(),root.BOOKMARK_SEED||[]);if(await root.BookmarkClassifier?.seedExisting(seedRows)){await root.chrome.runtime.sendMessage({type:'classify'});}root.bookmarkConnection=attach(root.chrome.bookmarks,root.BOOKMARK_SEED||[],root.setBookmarks,status,document,root);}catch(e){status(e.message||"本机数据读取失败，请重新打开收藏空间");}}
 connect();root.addEventListener('pagehide',()=>root.bookmarkConnection?.stop());
 root.addEventListener('pageshow',e=>{if(e.persisted)connect();});
}
})(globalThis);
