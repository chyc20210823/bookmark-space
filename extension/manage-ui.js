/* Editor and recoverable deletion UI. Native writes are owned by BookmarkActions. */
(function(root){
'use strict';
const $=id=>document.getElementById(id),actions=()=>root.BookmarkActions;
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const button=(label,cls,fn)=>{const b=node('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;};
let current=null,editing=false,busy=false,trashDialog,toast,trashLauncher,leaveEditor=null;
const browserName=()=>navigator.userAgent.includes('Edg/')?'Edge':'Chrome';
function errorText(error){return error?.message||'操作未完成，请稍后再试。';}
function closeCard(){$('cardDialog').close();}
function notice(message,token){toast.replaceChildren(node('span','',message));if(token)toast.append(button('撤销删除','manage-undo',async e=>{const b=e.currentTarget;b.disabled=true;try{await actions().restore(token);await root.bookmarkConnection?.refresh();notice('已恢复到原收藏文件夹。');}catch(err){notice(errorText(err),token);}}));toast.append(button('关闭提示','manage-toast-close',()=>{toast.hidden=true;}));toast.hidden=false;}
async function updateCount(){if(!trashLauncher)return;try{const count=(await actions()?.deleted())?.length||0;trashLauncher.textContent='最近删除'+(count?' · '+count:'');}catch{trashLauncher.textContent='最近删除';}}
function metadataNote(){return '分类和标签仅保存在当前浏览器的插件中，不移动原收藏文件夹。';}
function mountDetails(d,copy){current={...d,tags:[...(d.tags||[])]};editing=false;busy=false;leaveEditor=null;
 const toolbar=node('div','manage-actions');
 if(!actions()?.available){toolbar.append(node('p','manage-note','这是快照预览。请点击浏览器扩展中的收藏空间，再编辑或删除。'));copy.append(toolbar);return;}
 if(d.unmodifiable){toolbar.append(node('p','manage-note','此收藏由管理员管理，不能编辑或删除。'));copy.append(toolbar);return;}
 toolbar.append(button('编辑收藏','manage-primary',()=>edit(current)),button('删除收藏','manage-danger',()=>confirmDelete(current,toolbar)));copy.append(toolbar);
}
function field(form,label,id,value,list){const wrap=node('label','manage-field');wrap.append(node('span','',label));const input=node('input');input.id=id;input.name=id;input.value=String(value||'');input.autocomplete='off';if(list)input.setAttribute('list',list);wrap.append(input);form.append(wrap);return input;}
function edit(d){editing=true;const form=node('form','manage-form');form.append(node('h3','','编辑收藏'),node('p','manage-note','标题和网址保存后，会同时修改 '+browserName()+' 中的原收藏。'));
 const title=field(form,'完整标题','editTitle',d.title);title.required=true;title.maxLength=2000;
 const url=field(form,'网址','editURL',d.url);url.required=true;url.type='text';url.inputMode='url';
 const group=node('div','manage-field-grid');form.append(group);const pair=BookmarkCategoryPicker.mountPair(group,{categoryId:'editCategory',subcategoryId:'editSubcategory',category:d.category,subcategory:d.subcategory});const category=pair.category,subcategory=pair.subcategory;
 const tags=field(form,'标签（用逗号分隔）','editTags',(d.tags||[]).join('，'));tags.maxLength=1000;form.append(node('p','manage-note',metadataNote()));
 const status=node('p','manage-status');status.id='editStatus';status.setAttribute('role','alert');form.append(status);
 const controls=node('div','manage-form-actions'),cancel=button('取消','manage-secondary',()=>requestLeave(()=>{editing=false;const latest=root.getBookmarks?.().find(r=>r.id===d.id);if(latest)root.openCard(latest);else closeCard();})),save=node('button','manage-primary','保存修改');save.type='submit';controls.append(cancel,save);form.append(controls);
 const initial=()=>JSON.stringify([title.value,url.value,category.value,subcategory.value,tags.value]);const original=initial();
 function requestLeave(action){if(busy)return;if(initial()===original){pair.close();leaveEditor=null;action();return;}pair.close();form.querySelector('.manage-unsaved')?.remove();const warning=node('div','manage-unsaved');warning.setAttribute('role','alert');warning.append(node('p','','尚未保存修改，要放弃这次编辑吗？'));const buttons=node('div','manage-form-actions');const stay=button('继续编辑','manage-secondary',()=>{warning.remove();title.focus();});const discard=button('放弃修改','manage-danger',()=>{leaveEditor=null;editing=false;action();});buttons.append(stay,discard);warning.append(buttons);form.append(warning);stay.focus();warning.scrollIntoView({block:'nearest'});}
 leaveEditor=requestLeave;
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;save.disabled=cancel.disabled=true;save.textContent='正在保存…';status.textContent='';try{await actions().save(d,{title:title.value.trim(),url:url.value.trim(),category:category.value.trim()||'待分类',subcategory:subcategory.value.trim()||'其他',tags:tags.value.split(/[,，]/).map(x=>x.trim()).filter(Boolean)});editing=false;leaveEditor=null;pair.close();closeCard();await root.bookmarkConnection?.refresh();notice('已保存，'+browserName()+' 收藏和本页已更新。');}catch(err){status.textContent=errorText(err);}finally{busy=false;save.disabled=cancel.disabled=false;save.textContent='保存修改';}});
 $('cardDetail').replaceChildren(form);title.focus();
}
function confirmDelete(d,toolbar){if(busy)return;editing=true;const panel=node('div','manage-confirm');panel.append(node('strong','','从 '+browserName()+' 收藏夹删除？'),node('p','manage-delete-title',d.title),node('p','manage-note','会同时删除浏览器中的这条收藏。删除后可撤销，也可在“最近删除”中恢复。'));
 const status=node('p','manage-status');status.setAttribute('role','alert');const controls=node('div','manage-form-actions');const cancel=button('取消','manage-secondary',()=>{editing=false;root.openCard(d);});const del=button('从 '+browserName()+' 删除','manage-danger',async()=>{if(busy)return;busy=true;del.disabled=cancel.disabled=true;del.textContent='正在删除…';try{const token=await actions().remove(d);editing=false;closeCard();await root.bookmarkConnection?.refresh();notice('已从 '+browserName()+' 删除，可撤销。',token);updateCount();}catch(err){status.textContent=errorText(err);}finally{busy=false;del.disabled=cancel.disabled=false;del.textContent='从 '+browserName()+' 删除';}});del.id='confirmDelete';controls.append(cancel,del);panel.append(status,controls);toolbar.replaceChildren(panel);cancel.focus();}
async function renderTrash(){const content=$('trashContent');content.replaceChildren(node('p','manage-note','恢复会放回原文件夹，并保留插件中的分类和标签。Chrome 会将恢复项记为新收藏，原收藏时间无法还原。'));
 let items;try{items=await actions().deleted();}catch(err){content.append(node('p','manage-status',errorText(err)));return;}
 if(!items.length){content.append(node('p','manage-empty','暂无可恢复的删除记录。'));return;}
 for(const record of items){const item=node('article','manage-trash-item'),copy=node('div');const d=record.node||record.bookmark||record.snapshot||record;const hidden=$('privacyMode')?.checked&&(record.private||d.private||record.metadata?.private||record.row?.private);
 copy.append(node('strong','',hidden?'私人收藏 · 已隐藏':d.title||record.title||'已删除的收藏'));copy.append(node('small','',new Date(record.deletedAt||record.time||Date.now()).toLocaleString('zh-CN')));if(record.status==='pending-delete')copy.append(node('small','','删除结果待核对，恢复前会检查原收藏。'));if(record.status==='restoring')copy.append(node('small','','上次恢复结果待核对，请先检查 Chrome 收藏。'));item.append(copy);const restore=button('恢复','manage-secondary',async()=>{restore.disabled=true;status.textContent='正在恢复…';try{await actions().restore(record.token);await root.bookmarkConnection?.refresh();renderTrash();updateCount();notice('已恢复到原收藏文件夹。');}catch(err){status.textContent=errorText(err);restore.disabled=false;}});const status=node('p','manage-status');status.setAttribute('role','alert');item.append(restore,status);content.append(item);}
}
async function init(){
 try{await actions()?.ready;}catch{}toast=node('div','manage-toast');toast.id='manageToast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast);
 trashDialog=node('dialog','space-dialog manage-trash-dialog');trashDialog.id='trashDialog';trashDialog.setAttribute('aria-labelledby','trashTitle');const header=node('header'),h=node('h2','','最近删除');h.id='trashTitle';header.append(h,button('关闭','space-close',()=>trashDialog.close()));const content=node('div','manage-trash-content');content.id='trashContent';trashDialog.append(header,content);document.body.append(trashDialog);
 trashLauncher=button('最近删除','manage-trash-launch',()=>{renderTrash();trashDialog.showModal();});trashLauncher.id='trashLaunch';trashLauncher.hidden=!actions()?.available;document.querySelector('.nav-bottom')?.prepend(trashLauncher);
 actions()?.subscribe(()=>{updateCount();if(trashDialog.open)renderTrash();});updateCount();
 $('cardDialog').addEventListener('close',()=>{BookmarkCategoryPicker.close();current=null;editing=false;leaveEditor=null;});
 function guardClose(e){if(busy||leaveEditor){e.preventDefault();e.stopImmediatePropagation();if(!busy)leaveEditor(closeCard);}}
 $('cardDialog').addEventListener('cancel',guardClose);$('closeCard').addEventListener('click',guardClose,true);
 $('cardDialog').addEventListener('click',e=>{if(e.target!==$('cardDialog'))return;const r=$('cardDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)guardClose(e);},true);
 $('privacyMode')?.addEventListener('change',()=>{if(trashDialog.open)renderTrash();});
}
function onRows(rows){if(!current||busy||!$('cardDialog').open)return;const latest=rows.find(r=>String(r.id)===String(current.id));if(editing){const status=$('editStatus');if(status&&(!latest||latest.title!==current.title||latest.url!==current.url||latest._localRevision!==current._localRevision))status.textContent='这条收藏已在其他页面被修改或删除。请取消编辑后查看最新内容。';return;}if(!latest){closeCard();notice('这条收藏已在浏览器中删除。');return;}if(JSON.stringify(latest)!==JSON.stringify(current))root.openCard(latest);}
root.BookmarkManager={mountDetails,onRows,requestClose(action){if(busy)return;if(leaveEditor)leaveEditor(action);else action();}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
