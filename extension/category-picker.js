/* Searchable category selection. Choices stay unchanged until explicitly selected. */
(function(root){
'use strict';
let active=null;
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const unique=values=>[...new Set(values.filter(Boolean).map(String))];
function taxonomy(){return [...(root.BookmarkRules?.builtinRules||[]),...(root.getBookmarks?.()||[])];}
function mountPair(parent,settings){
 const all=()=>[...taxonomy(),...(settings.extraRows?.()||[])];
 const category=picker(parent,settings.categoryId,settings.categoryLabel||'分类',settings.category||'',()=>unique([...(root.BookmarkRules?.categories||[]),...all().map(r=>r.category)]),'分类');
 const subcategory=picker(parent,settings.subcategoryId,settings.subcategoryLabel||'子分类',settings.subcategory||'',()=>unique(all().filter(r=>r.category===category.input.value).map(r=>r.subcategory)),'子分类');
 const note=make('p','picker-note');note.id=settings.subcategoryId+'Note';note.setAttribute('role','status');subcategory.wrap.append(note);
 category.onChange=()=>{if(subcategory.input.value&&!subcategory.options().includes(subcategory.input.value)){subcategory.set('');note.textContent='分类已更换，请重新选择子分类。';}subcategory.refresh();settings.onChange?.();};
 subcategory.onChange=()=>{note.textContent='';settings.onChange?.();};
 return {category:category.input,subcategory:subcategory.input,set(cat,sub){category.set(cat);subcategory.set(sub);note.textContent='';},close(){category.close();subcategory.close();}};
}
function picker(parent,id,label,value,options,kind){
 const wrap=make('div','manage-field category-picker'),caption=make('label','',label);caption.htmlFor=id+'Trigger';
 const input=make('input');input.type='hidden';input.id=id;input.name=id;input.value=value;
 const trigger=make('button','picker-trigger');trigger.type='button';trigger.id=id+'Trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id+'Popup');
 const selected=make('span'),chevron=document.createElementNS('http://www.w3.org/2000/svg','svg');chevron.setAttribute('viewBox','0 0 20 20');chevron.setAttribute('aria-hidden','true');const line=document.createElementNS(chevron.namespaceURI,'path');line.setAttribute('d','m5 8 5 5 5-5');chevron.append(line);trigger.append(selected,chevron);
 const popup=make('div','picker-popup');popup.id=id+'Popup';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-label','选择'+label);
 const search=make('input','picker-search');search.id=id+'Search';search.type='search';search.maxLength=80;search.autocomplete='off';search.placeholder='搜索或新建'+kind;search.setAttribute('aria-label','搜索'+label);search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-controls',id+'List');search.setAttribute('aria-expanded','false');
 const list=make('div','picker-options');list.id=id+'List';list.setAttribute('role','listbox');list.setAttribute('aria-label',label+'候选');
 const result=make('p','picker-result');result.setAttribute('role','status');
 const create=make('button','picker-create');create.type='button';create.hidden=true;
 popup.append(search,result,list,create);wrap.append(caption,input,trigger,popup);parent.append(wrap);
 let items=[],index=-1,opened=false,observer=null;
 const api={wrap,input,options,onChange:null,set(next){input.value=next||'';update();},refresh(){if(opened)render();},close};
 function update(){selected.textContent=input.value||'选择'+kind;trigger.classList.toggle('is-empty',!input.value);trigger.setAttribute('aria-label',label+'：'+(input.value||'未选择'));}
 function position(){if(!opened)return;const r=trigger.getBoundingClientRect(),h=innerHeight,w=innerWidth;const below=h-r.bottom-12,above=r.top-12,useAbove=below<240&&above>below;const room=Math.min(340,Math.max(100,useAbove?above:below));popup.style.width=Math.max(160,Math.min(r.width,w-24))+'px';popup.style.left=Math.min(Math.max(12,r.left),Math.max(12,w-r.width-12))+'px';popup.style.maxHeight=room+'px';popup.style.top=useAbove?'auto':r.bottom+6+'px';popup.style.bottom=useAbove?h-r.top+6+'px':'auto';}
 function mark(){items.forEach((el,i)=>el.classList.toggle('is-active',i===index));if(index>=0&&items[index]){if(items[index].getAttribute('role')==='option')search.setAttribute('aria-activedescendant',items[index].id);else search.removeAttribute('aria-activedescendant');items[index].scrollIntoView({block:'nearest'});}else search.removeAttribute('aria-activedescendant');}
 function choose(next){const previous=input.value;api.set(next);close();trigger.focus();if(previous!==input.value){input.dispatchEvent(new Event('change',{bubbles:true}));api.onChange?.();}}
 function render(){const q=search.value.trim(),values=options(),matching=values.filter(v=>v.toLocaleLowerCase().includes(q.toLocaleLowerCase()));list.replaceChildren();items=[];index=-1;
 for(const [i,v] of matching.entries()){const opt=make('button','picker-option',v);opt.type='button';opt.tabIndex=-1;opt.id=id+'Option'+i;opt.setAttribute('role','option');opt.setAttribute('aria-selected',String(v===input.value));opt.addEventListener('click',()=>choose(v));list.append(opt);items.push(opt);}
 result.textContent=matching.length?'找到 '+matching.length+' 个'+kind:(q?'没有匹配的'+kind+'，可以新建。':'暂无子分类，输入名称即可新建。');
 create.hidden=!q||values.some(v=>v.toLocaleLowerCase()===q.toLocaleLowerCase());create.textContent='新建'+kind+'「'+q+'」';create.id=id+'Create';create.onclick=()=>choose(q);if(!create.hidden)items.push(create);mark();position();}
 function open(){if(opened)return;active?.close();active=api;opened=true;popup.hidden=false;trigger.setAttribute('aria-expanded','true');search.setAttribute('aria-expanded','true');search.value='';render();search.focus();observer=new MutationObserver(()=>{if(!wrap.isConnected||!wrap.closest('dialog')?.open)close();});observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keys,true);document.addEventListener('scroll',position,true);window.addEventListener('resize',position);}
 function close(){if(!opened)return;opened=false;observer?.disconnect();observer=null;popup.hidden=true;trigger.setAttribute('aria-expanded','false');search.setAttribute('aria-expanded','false');search.removeAttribute('aria-activedescendant');document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keys,true);document.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);if(active===api)active=null;}
 function outside(e){if(!wrap.contains(e.target))close();}
 function keys(e){if(!opened||e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();trigger.focus();return;}if(e.key==='Tab'){close();trigger.focus();return;}if(!['ArrowDown','ArrowUp','Enter'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();if(e.key==='Enter'){if(index>=0)items[index]?.click();else if(search.value.trim()&&items.length===1)items[0].click();return;}if(items.length){index=index<0?(e.key==='ArrowDown'?0:items.length-1):(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;mark();}}
 trigger.addEventListener('click',()=>opened?close():open());trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();index=e.key==='ArrowUp'?items.length-1:0;mark();}});search.addEventListener('input',render);
 trigger.addEventListener('focus',()=>{const owner=wrap.closest('dialog');if(owner&&!owner.dataset.pickerCloseBound){owner.dataset.pickerCloseBound='true';owner.addEventListener('close',()=>active?.close());}});
 update();return api;
}
root.BookmarkCategoryPicker={mountPair,close:()=>active?.close()};
})(globalThis);
