'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const extensionFiles=['app.js','rules-ui.js','graph.css','seed.js','manage.css','manage-ui.js','manifest.json','ai.css','ai-ui.js','ai-classifier.js','classifier.js','newtab.html','manage-store.js','rules.css','sync.js','worker.js','ai-providers.js','rule-engine.js','graph.js','database.js'];
const otherFiles=['README.md','PRIVACY.md','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','LICENSE','.gitignore','package.json','package-lock.json','docs/VALIDATION.md','docs/demo.png','tests/run.cjs','tests/rule-fixtures.json','tests/test-rules.cjs','tests/test-ai-providers.cjs','tests/test-ai-queue.cjs','tests/test-ai-extension.cjs','tests/test-writeback.cjs','tests/test-links.cjs','scripts/check-release.cjs','.github/workflows/test.yml'];
const allowed=new Set([...extensionFiles.map(n=>'extension/'+n),...otherFiles]);
const ignored=new Set(['.git','node_modules','test-results','playwright-report','artifacts','dist']);
const found=[];
function walk(dir,prefix=''){
 for(const name of fs.readdirSync(dir)){
  if(!prefix&&ignored.has(name))continue;
  const rel=prefix+name,full=path.join(dir,name),stat=fs.lstatSync(full);
  assert(!stat.isSymbolicLink(),'Symbolic link is not allowed: '+rel);
  if(stat.isDirectory()){walk(full,rel+'/');continue;}
  assert(allowed.has(rel),'Unexpected release file: '+rel);found.push(rel);
  if(rel==='docs/demo.png')continue; // Synthetic screenshot; visually inspect before release.
  const text=fs.readFileSync(full,'utf8');
  const checks=[['API credential',/\bsk-[a-zA-Z0-9_-]{20,}\b/],['Google credential',/\bAIza[0-9A-Za-z_-]{30,}\b/],['xAI credential',/\bxai-[0-9A-Za-z_-]{20,}\b/],['GitHub credential',/\b(?:gh[pousr]_[a-zA-Z0-9]{25,}|github_pat_[a-zA-Z0-9_]{30,})\b/],['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['personal home path',/\/(?:Users|home)\/[a-zA-Z0-9._-]+\//],['email address',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i]];
  for(const [label,pattern] of checks)assert(!pattern.test(['tests/test-ai-queue.cjs','scripts/check-release.cjs'].includes(rel)?text.replaceAll('https://u:p@example.org/a','SYNTHETIC_CREDENTIAL_URL'):text),label+' detected in '+rel);
 }
}
walk(root);
if(fs.existsSync(path.join(root,'.git'))){
 const tracked=spawnSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'});
 assert.equal(tracked.status,0,'Unable to inspect Git tracked files');
 for(const name of tracked.stdout.split('\0').filter(Boolean))assert(allowed.has(name),'Unexpected tracked file: '+name);
}
for(const name of allowed)assert(found.includes(name),'Missing release file: '+name);
const read=n=>fs.readFileSync(path.join(root,'extension',n),'utf8');
assert.equal(read('seed.js').trim(),'window.BOOKMARK_SEED=[];','Seed must be empty');
assert.equal(JSON.parse(read('newtab.html').match(/<script id="bookmarkData" type="application\/json">([\s\S]*?)<\/script>/)[1]).length,0);
const manifest=JSON.parse(read('manifest.json'));
assert.deepEqual(manifest.permissions.slice().sort(),['alarms','bookmarks']);
assert(!manifest.host_permissions&&!manifest.chrome_url_overrides&&!manifest.content_scripts);
const hosts=['https://api.deepseek.com/*','https://api.moonshot.cn/*','https://api.openai.com/*','https://api.anthropic.com/*','https://api.x.ai/*','https://generativelanguage.googleapis.com/*'];
assert.deepEqual(manifest.optional_host_permissions.slice().sort(),hosts.sort());
assert(!/<script\b[^>]*src=["']https?:/i.test(read('newtab.html')),'Remote script is not allowed');
for(const match of read('newtab.html').matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))assert(fs.existsSync(path.join(root,'extension',match[1])),'Missing resource: '+match[1]);
console.log(JSON.stringify(process.argv.includes('--list')?found.sort():{files:found.length,emptySeed:true,knownSecretPatternsClear:true,permissionsChecked:true,note:'Pattern checks do not replace manual review of data, fixtures and screenshots.'}));
