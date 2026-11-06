importScripts('database.js','rule-engine.js','classifier.js','ai-providers.js','ai-classifier.js');
let pendingTimer;
const classify=()=>{clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>BookmarkClassifier.run().then(()=>BookmarkAI.run()).catch(()=>{}),200);};
async function openManager(){const url=chrome.runtime.getURL('newtab.html');const contexts=chrome.runtime.getContexts?await chrome.runtime.getContexts({contextTypes:['TAB'],documentUrls:[url]}):[];const current=contexts.find(c=>c.tabId>=0);if(current){try{await chrome.tabs.update(current.tabId,{active:true});if(current.windowId>=0)await chrome.windows.update(current.windowId,{focused:true});return;}catch{}}await chrome.tabs.create({url});}
let openingPage=null;
chrome.action.onClicked.addListener(()=>{if(!openingPage)openingPage=openManager().catch(()=>{}).finally(()=>{openingPage=null;});});
for(const event of ['onCreated','onChanged','onMoved','onRemoved','onImportEnded'])chrome.bookmarks[event]?.addListener(classify);
chrome.runtime.onInstalled.addListener(classify);
chrome.runtime.onStartup.addListener(classify);
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===BookmarkAI.ALARM)BookmarkAI.run();});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id)return;
 const handlers={'ai-state':()=>BookmarkAI.state(),'ai-save':async()=>{const saved=await BookmarkAI.save(message.value);if(saved.enabled&&message.start!==false)BookmarkAI.run();return saved;},'ai-test':()=>BookmarkAI.test(),'ai-run':()=>BookmarkAI.batch(),'ai-stop':()=>BookmarkAI.stop(),'ai-retry':()=>BookmarkAI.retry(),'ai-approve':()=>BookmarkAI.approve(message.id),'ai-dismiss':()=>BookmarkAI.dismiss(message.id)};
 if(handlers[message?.type]){Promise.resolve().then(handlers[message.type]).then(value=>reply({ok:true,value}),e=>reply({ok:false,error:e.message}));return true;}
 if(message?.type==='classify'){BookmarkClassifier.run(!!message.force).then(()=>reply({ok:true}),e=>reply({ok:false,error:e.message}));return true;}
});
