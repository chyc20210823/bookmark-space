'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const name of ['test-rules.cjs','test-ai-providers.cjs','test-ai-queue.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
