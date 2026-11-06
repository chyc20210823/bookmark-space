/* Local-only bookmark editing. Native bookmarks stay the source of truth. */
(function(root){
'use strict';
const LEGACY_KEY='bookmark-space-management-v1',KEY='management',LOCK='bookmark-space-management-v1';
const api=root.chrome?.bookmarks,db=root.BookmarkDB,listeners=new Set();
const available=!!(api?.get&&api?.update&&api?.remove&&api?.create);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clone=o=>JSON.parse(JSON.stringify(o));
function failure(message){return new Error(message);}
function empty(){return {version:1,metadata:{},trash:[]};}
function validate(data){
 if(data?.version!==1||!data.metadata||typeof data.metadata!=='object'||Array.isArray(data.metadata)||!Array.isArray(data.trash))throw failure('本机管理记录格式不正确，已停止修改收藏。');
 return data;
}
async function migrate(){
 if(!db)throw failure('本机数据库尚未加载，请重新打开收藏空间。');
 await db.ready;
 // Only extension pages can inspect legacy localStorage. The worker must never
 // create an empty management document or mark an unseen legacy record migrated.
 if(typeof root.document==='undefined')return;
 if(!root.navigator?.locks?.request)throw failure('当前浏览器不能安全迁移多个页面的数据，请更新浏览器后重试。');
 await root.navigator.locks.request(LOCK,{mode:'exclusive'},async()=>{
  const marker=await db.get('managementMigration');
  if(marker?.legacyMigrated){validate(await db.get(KEY));return;}
  let raw;try{raw=root.localStorage.getItem(LEGACY_KEY);}catch{throw failure('无法读取旧版本的本机记录，已停止迁移。请允许本地存储后重试。');}
  let legacy;if(raw){try{legacy=validate(JSON.parse(raw));}catch{throw failure('旧版本分类或删除记录无法读取，已保留原数据并停止迁移。');}}
  const existing=await db.get(KEY);
  if(existing!==undefined)validate(existing);
  let data=existing||legacy||empty();
  if(legacy){
   const existingEmpty=!existing||!Object.keys(existing.metadata).length&&!existing.trash.length;
   if(existingEmpty)data=legacy;
   else if(JSON.stringify(existing)!==JSON.stringify(legacy))throw failure('发现两份不同的本机管理记录，已保留两份数据并停止迁移，请先核对。');
  }
  await db.set(KEY,data);
  const stored=await db.get(KEY);if(JSON.stringify(stored)!==JSON.stringify(data))throw failure('本机数据迁移核对失败，旧记录已保留，暂不允许修改收藏。');
  await db.set('managementMigration',{version:1,legacyMigrated:true,sourcePresent:!!raw,migratedAt:Date.now()});
 });
}
const ready=migrate();ready.catch(()=>{});
async function read(){await ready;const data=await db.get(KEY);if(data===undefined)return empty();return validate(data);}
async function write(data){await db.set(KEY,validate(data));}
function emit(){for(const listener of [...listeners]){try{listener();}catch{}}}
function subscribe(listener){if(typeof listener!=='function')return ()=>{};listeners.add(listener);return ()=>listeners.delete(listener);}
db?.subscribe(key=>{if(key===KEY)emit();});
async function exclusive(action){
 if(!available)throw failure('请在已安装的收藏空间扩展中操作；HTML 快照不能修改 Chrome 收藏。');
 await ready;
 if(!root.navigator?.locks?.request)throw failure('当前浏览器不能安全协调多个页面的修改，请更新浏览器后重试。');
 return root.navigator.locks.request(LOCK,{mode:'exclusive'},action);
}
async function get(id){try{const nodes=await api.get(String(id));return nodes?.[0]||null;}catch(error){if(/can't find bookmark for id|no bookmark found for id|bookmark not found/i.test(String(error?.message||error)))return null;throw failure('暂时无法读取 Chrome 收藏，已停止修改。请稍后重试。');}}
async function checked(snapshot){
 if(!snapshot||typeof snapshot.id==='undefined')throw failure('找不到收藏标识，请关闭详情后重新打开。');
 const current=await get(snapshot.id);
 if(!current)throw failure('这条收藏已被删除，请关闭详情查看最新列表。');
 if(!current.url)throw failure('此操作只适用于单条收藏，不能修改或删除文件夹。');
 if(current.unmodifiable)throw failure('这条收藏由浏览器或组织管理，不能在这里修改。');
 if(String(current.title||'')!==String(snapshot.title||'')||String(current.url)!==String(snapshot.url||''))throw failure('这条收藏已在其他地方修改。为避免覆盖，请关闭详情后重新打开，再进行操作。');
 return current;
}
function cleanText(value,label,limit,allowEmpty=false){const text=String(value??'').trim();if(!allowEmpty&&!text)throw failure('请填写'+label+'。');if(text.length>limit)throw failure(label+'过长，请缩短后保存。');return text;}
function fields(snapshot,changes,current){
 const title=own(changes,'title')?cleanText(changes.title,'标题',2000):String(current.title||'');
 let url=own(changes,'url')?String(changes.url??'').trim():String(current.url);
 if(title!==String(current.title)||url!==String(current.url)){
  cleanText(title,'标题',2000);
  // Existing internal URLs may remain untouched when only metadata is edited.
  if(url!==String(current.url)){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw 0;url=parsed.href;}catch{throw failure('请输入完整的 http:// 或 https:// 网址。');}}
 }
 const category=cleanText(own(changes,'category')?changes.category:snapshot.category||'待确认','分类',80);
 const subcategory=cleanText(own(changes,'subcategory')?changes.subcategory:snapshot.subcategory||'其他','子分类',120,true)||'其他';
 let tags=own(changes,'tags')?changes.tags:snapshot.tags||[];
 if(typeof tags==='string')tags=tags.split(/[,，\n]/);
 if(!Array.isArray(tags))throw failure('标签格式不正确，请用逗号分隔。');
 tags=[...new Set(tags.map(t=>cleanText(t,'标签',60,true)).filter(Boolean))];
 if(tags.length>30)throw failure('最多保存 30 个标签。');
 return {title,url,category,subcategory,tags};
}
function presentation(row){
 const data={};for(const k of ['description','preview','icon','imageSource','private','confidence'])if(own(row,k)&&row[k]!==undefined)data[k]=clone(row[k]);return data;
}
function metadataFor(row,values,current){
 const unchangedURL=values.url===String(current.url);
 return {url:values.url,nativeTitle:values.title,category:values.category,subcategory:values.subcategory,tags:values.tags,manual:true,revision:token(),updatedAt:Date.now(),presentation:unchangedURL?presentation(row):{description:'网址已修改，已保留手动分类；可在详情中调整。',preview:'',icon:'',imageSource:'none',confidence:'待分析',private:!!row.private}};
}
async function decorate(rows){
 const data=await read();
 return rows.map(row=>{
  const saved=data.metadata[String(row.id)];
  if(!saved||saved.url!==String(row.url))return {...row,_localRevision:0};
  if(saved.manual===false)return {...row,tags:[...(saved.tags||[])],_localRevision:saved.revision||saved.updatedAt||0};
  const view=saved.presentation||{},out={...row,...view,category:saved.category,subcategory:saved.subcategory,tags:[...(saved.tags||[])],shortTitle:String(row.title||row.shortTitle||'未命名收藏'),manualClassification:true,classification:{source:'manual',status:'classified',reasons:['已由你手动指定，自动整理不会覆盖。']},_localRevision:saved.revision||saved.updatedAt||0};
  // Never weaken a private marker obtained from live URL checks or earlier data.
  out.private=!!(row.private||view.private);
  if(saved.nativeTitle!==String(row.title||'')){out.description=row.description;out.confidence=row.confidence;}
  return out;
 });
}
function checkLocalVersion(snapshot,current,data){
 const saved=data.metadata[String(current.id)];
 const version=saved&&saved.url===String(current.url)?saved.revision||saved.updatedAt||0:0;
 if(String(snapshot._localRevision??0)!==String(version))throw failure('这条收藏的分类或标签已在其他页面修改。请关闭详情后重新打开，避免覆盖新的整理结果。');
}
async function save(snapshot,changes={}){return exclusive(async()=>{
 const current=await checked(snapshot),values=fields(snapshot,changes,current),data=await read(),before=clone(data);
 checkLocalVersion(snapshot,current,data);
 const saved=data.metadata[String(current.id)],sameSaved=saved?.url===String(current.url),classificationChanged=values.category!==(snapshot.category||'待确认')||values.subcategory!==(snapshot.subcategory||'其他');
 const tagsChanged=JSON.stringify(values.tags)!==JSON.stringify(snapshot.tags||[]);
 if(classificationChanged||(sameSaved&&saved.manual!==false))data.metadata[String(current.id)]=metadataFor(snapshot,values,current);
 else if(tagsChanged||sameSaved)data.metadata[String(current.id)]={url:values.url,tags:values.tags,manual:false,revision:token(),updatedAt:Date.now()};
 // Unchanged automatic metadata must not become a manual classification just because the title changed.
 await write(data); // Verify durable storage before modifying the native bookmark.
 let updated=current;
 try{const patch={};if(values.title!==String(current.title))patch.title=values.title;if(values.url!==String(current.url))patch.url=values.url;if(Object.keys(patch).length)updated=await api.update(String(current.id),patch);}
 catch{try{await write(before);}catch{emit();throw failure('Chrome 未完成修改，本机分类记录也未能回退。请重新打开详情核对后重试。');}emit();throw failure('Chrome 未能保存这条收藏。请确认它仍存在且可以编辑，然后重试。');}
 emit();return updated;
 });}
function token(){return root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function prune(data){const completed=data.trash.filter(t=>t.status==='restored').sort((a,b)=>(b.restoredAt||0)-(a.restoredAt||0));const keep=new Set(completed.slice(0,30).map(t=>t.token));data.trash=data.trash.filter(t=>t.status!=='restored'||keep.has(t.token));}
async function deleted(){const data=await read();return data.trash.filter(t=>t.status!=='restored').sort((a,b)=>b.deletedAt-a.deletedAt).map(t=>({token:t.token,title:t.node.title,url:t.node.url,deletedAt:t.deletedAt,status:t.status,private:!!(t.private||t.metadata?.presentation?.private),parentId:t.node.parentId,folder:t.folder||'',category:t.metadata?.category||'待确认',subcategory:t.metadata?.subcategory||'其他',tags:[...(t.metadata?.tags||[])]}));}
async function remove(snapshot){return exclusive(async()=>{
 const current=await checked(snapshot),data=await read();
 checkLocalVersion(snapshot,current,data);
 const values=fields(snapshot,{},current),saved=data.metadata[String(current.id)],entry={token:token(),status:'pending-delete',deletedAt:Date.now(),private:!!(snapshot.private||saved?.presentation?.private),folder:Array.isArray(snapshot.folder)?snapshot.folder.join(' / '):String(snapshot.folder||''),node:{id:String(current.id),parentId:String(current.parentId),index:current.index,title:String(current.title||''),url:String(current.url),dateAdded:current.dateAdded},metadata:saved&&saved.url===current.url?clone(saved):metadataFor(snapshot,values,current)};
 data.trash.push(entry);prune(data);await write(data);
 try{await api.remove(String(current.id));}catch{data.trash=data.trash.filter(t=>t.token!==entry.token);try{await write(data);}catch{emit();throw failure('Chrome 未完成删除，备份记录已保留。请核对原收藏后再操作。');}emit();throw failure('Chrome 未能删除这条收藏，原收藏未被本页移除。请刷新后重试。');}
 entry.status='deleted';delete data.metadata[String(current.id)];
 try{await write(data);}catch{emit();throw failure('收藏已从 Chrome 删除，恢复备份已保留在最近删除中。请使用恢复操作，不要再次删除。');}
 emit();return entry.token;
 });}
async function restore(id){return exclusive(async()=>{
 const data=await read(),entry=data.trash.find(t=>t.token===String(id));
 if(!entry)throw failure('找不到这条恢复记录，请刷新最近删除列表。');
 if(entry.status==='restored'){
  const existing=await get(entry.restoredId);if(existing)return existing;
  throw failure('这条记录已恢复过，之后又被移除。请查看最近删除中的新记录。');
 }
 if(entry.status==='restoring')throw failure('上次恢复的结果还未确认。请先在 Chrome 核对这条收藏，避免重复创建。');
 const original=await get(entry.node.id);
 if(original){
  if(original.url===entry.node.url&&String(original.title||'')===entry.node.title){entry.status='restored';entry.restoredId=String(original.id);entry.restoredAt=Date.now();data.metadata[String(original.id)]=clone(entry.metadata);prune(data);await write(data);emit();return original;}
  throw failure('原收藏标识现在对应其他内容，已停止恢复，请先核对 Chrome 收藏。');
 }
 const parent=await get(entry.node.parentId);
 if(!parent||parent.url)throw failure('原收藏文件夹已不存在，暂时无法原位恢复。请先恢复原文件夹。');
 if(parent.unmodifiable)throw failure('原收藏文件夹不可编辑，无法恢复到该位置。');
 let children;try{children=await api.getChildren(entry.node.parentId);}catch{throw failure('无法读取原收藏文件夹，请稍后重试。');}
 const index=Math.min(Math.max(0,Number.isInteger(entry.node.index)?entry.node.index:children.length),children.length);
 entry.status='restoring';entry.restoreStartedAt=Date.now();entry.storageReservation=' '.repeat(JSON.stringify(entry.metadata).length+512);await write(data);
 let created;
 try{created=await api.create({parentId:entry.node.parentId,index,title:entry.node.title,url:entry.node.url});}
 catch{entry.status='deleted';delete entry.storageReservation;try{await write(data);}catch{emit();throw failure('Chrome 未能恢复收藏，恢复记录未能解锁，请保留记录后排查。');}emit();throw failure('Chrome 未能恢复收藏，备份仍在，请稍后重试。');}
 delete entry.storageReservation;entry.status='restored';entry.restoredId=String(created.id);entry.restoredAt=Date.now();
 delete data.metadata[String(entry.node.id)];data.metadata[String(created.id)]={...clone(entry.metadata),url:String(created.url),nativeTitle:String(created.title||''),revision:token(),updatedAt:Date.now()};prune(data);
 try{await write(data);}catch{emit();throw failure('收藏已恢复到 Chrome，但本机恢复记录未能更新。请勿重复恢复，先在 Chrome 核对。');}
 emit();return created;
 });}
root.BookmarkActions={available,ready,decorate,save,remove,restore,deleted,subscribe};
})(globalThis);
