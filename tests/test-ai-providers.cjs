'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const api=require('../extension/ai-providers.js');
const originalFetch=global.fetch;let assertions=0,calls=[];
const sample='{"category":"学习与研究","subcategory":"资料","tags":["阅读"]}';
const fixtures={openai:{status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text:sample}]}]},claude:{stop_reason:'end_turn',content:[{type:'thinking',thinking:'not visible'},{type:'text',text:sample}]},gemini:{candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'not visible'},{text:sample}]}}]}};
const chat={choices:[{finish_reason:'stop',message:{content:sample,reasoning_content:'not visible'}}]};
function ok(condition,msg){assert(condition,msg);assertions++;}
function eq(a,b){assert.deepEqual(a,b);assertions++;}
function args(provider,extra={}){return {provider,apiKey:'unit-test-key-never-sent',prompt:'Return a classification for artificial public fixture.',...extra};}
async function rejects(fn,code,retryable){await assert.rejects(fn,e=>{ok(e.name==='BookmarkAIError');eq(e.code,code);if(retryable!==undefined)eq(e.retryable,retryable);ok(!e.message.includes('unit-test-key'));return true;});assertions++;}
(async()=>{try{
 eq(api.providers.length,6);ok(Object.isFrozen(api.providers));
 for(const p of api.providers){global.fetch=async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(fixtures[p.id]||chat),{status:200});};const controller=new AbortController();eq(await api.request(args(p.id,{signal:controller.signal})),sample);const {url,init}=calls.at(-1),body=JSON.parse(init.body);eq(new URL(url).origin,p.origin);eq(init.signal,controller.signal);eq(init.redirect,'error');eq(init.credentials,'omit');eq(init.referrerPolicy,'no-referrer');eq(init.cache,'no-store');ok(!url.includes('unit-test-key'));ok(!init.body.includes('unit-test-key'));
 if(p.id==='openai'){eq(new URL(url).pathname,'/v1/responses');eq(body.store,false);eq(body.max_output_tokens,2048);eq(body.reasoning.effort,'low');eq(body.input,args(p.id).prompt);}
 else if(p.id==='claude'){eq(new URL(url).pathname,'/v1/messages');eq(init.headers['x-api-key'],'unit-test-key-never-sent');eq(init.headers['anthropic-version'],'2023-06-01');eq(init.headers['anthropic-dangerous-direct-browser-access'],'true');eq(body.max_tokens,2048);}
 else if(p.id==='gemini'){ok(url.endsWith('/v1beta/models/'+p.defaultModel+':generateContent'));eq(init.headers['x-goog-api-key'],'unit-test-key-never-sent');eq(body.contents[0].parts[0].text,args(p.id).prompt);eq(body.generationConfig.maxOutputTokens,2048);eq(body.generationConfig.thinkingConfig.thinkingLevel,'LOW');}
 else{eq(body.max_tokens,2048);eq(body.stream,false);eq(body.messages[0].role,'user');if(p.id==='deepseek')eq(body.thinking,{type:'disabled'});if(p.id==='kimi'){eq(body.reasoning_effort,'low');eq(body.thinking,undefined);}}
 if(!['claude','gemini'].includes(p.id))eq(init.headers.Authorization,'Bearer unit-test-key-never-sent');
 }
 // Caller-supplied model IDs stay on the selected official host and do not inherit unsupported tuning.
 global.fetch=async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(fixtures.openai));};await api.request(args('openai',{model:'custom-model-2026'}));eq(JSON.parse(calls.at(-1).init.body).model,'custom-model-2026');eq(JSON.parse(calls.at(-1).init.body).reasoning,undefined);
 const count=calls.length;await rejects(()=>api.request(args('unknown')),'invalid_provider',false);for(const model of ['https://evil.test','../evil','models/gemini','x?key=leak'])await rejects(()=>api.request(args('gemini',{model})),'invalid_model',false);await rejects(()=>api.request(args('kimi',{apiKey:''})),'invalid_key',false);await rejects(()=>api.request(args('kimi',{apiKey:'a\nAuthorization: injected'})),'invalid_key',false);await rejects(()=>api.request(args('kimi',{prompt:'a'.repeat(50001)})),'invalid_prompt',false);eq(calls.length,count);
 for(const status of [400,401,402,403,404,408,429,500,503]){global.fetch=async()=>new Response('Server echoes unit-test-key-never-sent',{status});await rejects(()=>api.request(args('openai')),'http_error',status===408||status===429||status>=500);}
 global.fetch=async()=>{throw new Error('fetch failed with unit-test-key-never-sent');};await rejects(()=>api.request(args('deepseek')),'network_error',true);
 const aborted=new AbortController();aborted.abort();await rejects(()=>api.request(args('deepseek',{signal:aborted.signal})),'aborted',false);
 global.fetch=async()=>{throw new DOMException('unit-test-key-never-sent','AbortError');};await rejects(()=>api.request(args('deepseek')),'aborted',false);
 for(const data of ['not json',{output:{}},{}]){global.fetch=async()=>new Response(typeof data==='string'?data:JSON.stringify(data));await rejects(()=>api.request(args('openai')),data&&data.output?'invalid_response':typeof data==='string'?'invalid_response':'empty_response');}
 global.fetch=async()=>new Response('x'.repeat(262145));await rejects(()=>api.request(args('openai')),'oversized_response',false);
 for(const [provider,data] of [['openai',{status:'incomplete'}],['claude',{stop_reason:'max_tokens'}],['gemini',{candidates:[{finishReason:'MAX_TOKENS'}]}],['deepseek',{choices:[{finish_reason:'length'}]}]]){global.fetch=async()=>new Response(JSON.stringify(data));await rejects(()=>api.request(args(provider)),'truncated',false);}
 global.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]}));await rejects(()=>api.request(args('gemini')),'blocked',false);
 const sandbox={fetch:async()=>new Response(JSON.stringify(chat)),TextDecoder};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/ai-providers.js'),'utf8'),sandbox);eq(await sandbox.BookmarkAIProviders.request(args('deepseek')),sample);
 const report={providers:api.providers.map(p=>({id:p.id,models:p.models.map(m=>m.id)})),assertions,officialEndpointsOnly:true,credentialsNotLogged:true,browserWorkerCompatible:true,headersAndBodies:true,successfulResponses:true,invalidInputBlockedBeforeNetwork:true,httpErrorsSanitized:true,abort:true,responseSizeBound:true,truncatedResultsRejected:true,realPaidRequests:0,validation:'Mock fetch contract tests only; provider accounts, network reachability and actual model output are not verified.'};console.log(JSON.stringify(report,null,2));
 }finally{global.fetch=originalFetch;}})().catch(e=>{console.error(e);process.exitCode=1;});
