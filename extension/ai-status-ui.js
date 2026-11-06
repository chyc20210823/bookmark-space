/* Event-driven, sanitized AI progress. No credentials and no periodic polling. */
(function(root){
'use strict';
let summary, cache=null, timer=null, pending=null, dirty=false;
const n=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
function paintBadge(e){const item=cache?.items?.[e.dataset.aiId];e.dataset.aiState=item?.state||'loading';e.textContent=item?.label||'读取分类状态';e.title=e.textContent;}
function badge(row){const e=n('span','ai-item-status');e.dataset.aiId=String(row.id||'');paintBadge(e);return e;}
function paint(value){cache=value;if(summary){summary.dataset.state=value.state;summary.querySelector('.ai-summary-label').textContent=value.label;const counts=[];if(value.reviewCount)counts.push(value.reviewCount+' 条待确认');if(value.failedCount)counts.push(value.failedCount+' 条失败');if(value.usage&& !['off','unconfigured','consent','permission'].includes(value.state))counts.push('今日 '+value.usage.count+' / '+value.usage.limit+' 次');summary.querySelector('.ai-summary-note').textContent=[value.note,...counts].join(' · ');summary.querySelector('.ai-summary-action').textContent=['unconfigured','consent','permission','off'].includes(value.state)?'设置 AI →':'查看进度 →';}document.querySelectorAll('.ai-item-status[data-ai-id]').forEach(paintBadge);}
async function refresh(){
 if(pending){dirty=true;return pending;}clearTimeout(timer);timer=null;
 pending=(async()=>{try{const r=await chrome.runtime.sendMessage({type:'ai-overview'});if(!r?.ok)throw new Error('unavailable');paint(r.value);}catch{paint({state:'error',label:'AI 状态暂不可用',note:'请重新打开收藏空间；若刚更新插件，请先在扩展管理页重新加载。',items:{}});document.querySelectorAll('.ai-item-status').forEach(e=>{e.dataset.aiState='error';e.textContent='分类状态暂不可用';e.title=e.textContent;});}})().finally(()=>{pending=null;if(dirty){dirty=false;schedule();}});return pending;
}
function schedule(){dirty=true;if(document.hidden)return;clearTimeout(timer);timer=setTimeout(()=>{dirty=false;refresh();},80);}
function init(){if(!root.chrome?.bookmarks)return;summary=n('button','ai-summary');summary.id='aiSummary';summary.type='button';summary.dataset.state='loading';const copy=n('span','ai-summary-copy');copy.append(n('strong','ai-summary-label','读取 AI 状态'),n('span','ai-summary-note','收藏同步与 AI 分类分别显示。'));const action=n('span','ai-summary-action','设置 AI →');summary.append(copy,action);summary.onclick=()=>root.BookmarkAISettings?.open().catch(()=>{summary.querySelector('.ai-summary-note').textContent='暂时无法打开设置，请重新打开收藏空间。';});document.querySelector('.tools')?.after(summary);
 BookmarkDB.subscribe(key=>{if(['aiSettings','aiStatus','aiUsage','aiBlocked','aiBatch','management'].includes(key)||key.startsWith('ai:')||key.startsWith('class:'))schedule();});
 root.addEventListener('bookmark-rows-updated',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dirty)schedule();});chrome.permissions?.onAdded?.addListener(schedule);chrome.permissions?.onRemoved?.addListener(schedule);refresh();
}
root.BookmarkAIView={badge,refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
