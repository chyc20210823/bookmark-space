/* Browser-owned IndexedDB; no server, account or network connection. */
(function(root){
'use strict';
const NAME='bookmark-space-v1',STORE='kv',VERSION=1;
const listeners=new Set();let connection=null,opening=null;
const channel=typeof root.BroadcastChannel==='function'?new root.BroadcastChannel('bookmark-space-db-v1'):null;
function failure(error){const kind=error?.name;if(kind==='QuotaExceededError')return new Error('本机保存空间不足，操作未完成。请释放空间后重试。');if(kind==='VersionError')return new Error('本机数据来自较新的插件版本，请更新插件后再打开。');return new Error('无法保存或读取本机收藏数据，操作已停止。请重新打开页面后重试。');}
function notify(key,broadcast=true){for(const fn of [...listeners]){try{fn(String(key));}catch{}}if(broadcast){try{channel?.postMessage({key:String(key)});}catch{}}}
if(channel)channel.onmessage=e=>{if(e.data&&typeof e.data.key==='string')notify(e.data.key,false);};
function open(){
 if(connection)return Promise.resolve(connection);if(opening)return opening;
 if(!root.indexedDB)return Promise.reject(new Error('当前浏览器不支持本机数据库，请使用新版 Chrome 或 Edge。'));
 opening=new Promise((resolve,reject)=>{
  const request=root.indexedDB.open(NAME,VERSION);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
  request.onerror=()=>{opening=null;reject(failure(request.error));};
  request.onblocked=()=>{opening=null;reject(new Error('数据库升级被旧页面占用，请关闭其他收藏空间页面后重试。'));};
  request.onsuccess=()=>{const opened=request.result;connection=opened;opened.onversionchange=()=>{opened.close();if(connection===opened){connection=null;opening=null;}};opened.onclose=()=>{if(connection===opened){connection=null;opening=null;}};opening=null;resolve(opened);};
 });return opening;
}
async function operation(mode,work,changedKey){
 const db=await open();return new Promise((resolve,reject)=>{
  let value,request,tx;try{tx=db.transaction(STORE,mode);request=work(tx.objectStore(STORE));}catch(error){reject(failure(error));return;}
  if(request){request.onsuccess=()=>{value=request.result;};request.onerror=()=>{};}
  tx.oncomplete=()=>{if(changedKey!==undefined)notify(changedKey);resolve(value);};
  tx.onerror=()=>reject(failure(tx.error||request?.error));tx.onabort=()=>reject(failure(tx.error||request?.error));
 });
}
async function get(key){return operation('readonly',s=>s.get(String(key)));}
async function set(key,value){await operation('readwrite',s=>s.put(value,String(key)),String(key));return value;}
async function remove(key){await operation('readwrite',s=>s.delete(String(key)),String(key));}
async function entries(prefix=''){
 const db=await open();return new Promise((resolve,reject)=>{let results=[];const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(String(cursor.key).startsWith(String(prefix)))results.push([String(cursor.key),cursor.value]);cursor.continue();};tx.oncomplete=()=>resolve(results);tx.onabort=tx.onerror=()=>reject(failure(tx.error||request.error));});
}
async function keys(prefix=''){
 const db=await open(),text=String(prefix);return new Promise((resolve,reject)=>{const results=[],tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).openKeyCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(String(cursor.key).startsWith(text))results.push(String(cursor.key));cursor.continue();};tx.oncomplete=()=>resolve(results);tx.onabort=tx.onerror=()=>reject(failure(tx.error||request.error));});
}
async function getMany(inputKeys){
 const requested=[...inputKeys].map(String),db=await open();return new Promise((resolve,reject)=>{const values=new Array(requested.length),tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);requested.forEach((key,i)=>{const req=store.get(key);req.onsuccess=()=>{values[i]=req.result;};});tx.oncomplete=()=>resolve(values);tx.onabort=tx.onerror=()=>reject(failure(tx.error));});
}
async function setMany(inputEntries){
 const pairs=[...inputEntries].map(([key,value])=>[String(key),value]),db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);try{pairs.forEach(([key,value])=>store.put(value,key));}catch(error){tx.abort();reject(failure(error));return;}tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(failure(tx.error));});if(pairs.length&&pairs.every(([key])=>key.startsWith('class:')))notify('class:*');else for(const key of new Set(pairs.map(([key])=>key)))notify(key);
}
async function deleteMany(inputKeys){
 const requested=[...new Set([...inputKeys].map(String))],db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);requested.forEach(key=>store.delete(key));tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(failure(tx.error));});if(requested.length&&requested.every(key=>key.startsWith('class:')))notify('class:*');else for(const key of requested)notify(key);
}
function subscribe(fn){if(typeof fn!=='function')return ()=>{};listeners.add(fn);return ()=>listeners.delete(fn);}
const ready=open();ready.catch(()=>{});
root.BookmarkDB={ready,get,set,remove,entries,keys,getMany,setMany,deleteMany,subscribe};
})(globalThis);
