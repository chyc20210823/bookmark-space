/* Deterministic, local-only rules. No page fetch, user data, or model call. */
(function(root){
'use strict';
const version='1.0.0';
const categories=['编程开发','AI与智能工具','内容与设计','效率与工具','学习与研究','运营与商业','金融与财经','生活与服务','旅行与出行','影音与娱乐','新闻与资讯','产品与项目','待分类'];
const builtinRules=[];
function add(id,name,category,subcategory,terms,domains=[],paths=[]){builtinRules.push({id,name,category,subcategory,terms,domains,paths,enabled:true});}
// Specific subjects rather than a mapping of every social/video/code-hosting site.
add('dev-android','Android 开发','编程开发','Android',['android','android studio','androidstudio','recyclerview','scrollview','nestedscrollview','jetpack compose','gradle','安卓开发'],['developer.android.com']);
add('dev-ios','iOS 开发','编程开发','iOS 与 Swift',['swiftui','uikit','ios开发','ios development','objective-c'],['developer.apple.com']);
add('dev-web','网页开发','编程开发','Web 前端',['javascript','typescript','react','vue.js','next.js','web components','前端开发'],['developer.mozilla.org']);
add('dev-css','CSS 与页面布局','编程开发','Web 前端',['css grid','flexbox','tailwind','css动画','css layout']);
add('dev-python','Python 开发','编程开发','Python',['python','django','fastapi','pandas','flask'],['docs.python.org']);
add('dev-java','Java 开发','编程开发','Java 与 JVM',['spring boot','java开发','java programming','jvm','mybatis','maven']);
add('dev-go','Go 开发','编程开发','Go',['golang','go语言','go programming','goroutine'],['go.dev']);
add('dev-rust','Rust 开发','编程开发','Rust',['rust语言','rust programming','rustlang','cargo.toml'],['doc.rust-lang.org','rust-lang.org']);
add('dev-cpp','C/C++ 开发','编程开发','C 与 C++',['c++','cppreference','cmake','c语言','c programming'],['cppreference.com']);
add('dev-db','数据库技术','编程开发','数据库',['postgresql','mysql','sqlite','mongodb','redis','sql优化','数据库索引']);
add('dev-devops','部署与运维','编程开发','部署与运维',['docker','kubernetes','nginx','terraform','ci/cd','devops','容器部署']);
add('dev-git','版本控制','编程开发','Git 与协作',['git rebase','git merge','git工作流','git tutorial','git cherry-pick']);
add('dev-test','软件测试','编程开发','测试与质量',['单元测试','自动化测试','unit testing','playwright','pytest','cypress','test driven development']);
add('dev-security','网络与软件安全','编程开发','安全与网络',['网络安全','渗透测试','sql注入','xss','cybersecurity','oauth','tls handshake']);
add('dev-api','接口与后端','编程开发','后端与接口',['rest api','graphql','grpc','api设计','后端开发','微服务']);
add('dev-algorithms','算法与数据结构','编程开发','算法与数据结构',['数据结构','算法题','二叉树','dynamic programming','leetcode','排序算法'],['leetcode.com','leetcode.cn']);
add('dev-linux','Linux 系统','编程开发','Linux 与系统',['linux内核','linux kernel','bash脚本','shell scripting','systemd','linux命令']);
add('dev-game','游戏开发','编程开发','游戏开发',['unity开发','unreal engine','godot','游戏开发','game development']);
add('ai-model','模型与机器学习','AI与智能工具','模型与机器学习',['大语言模型','large language model','llm','机器学习','machine learning','deep learning','深度学习','人工智能']);
add('ai-assistant','AI 助手','AI与智能工具','AI 助手',['chatgpt','claude','deepseek','gemini ai','ai助手','ai工具','ai tools'],['chatgpt.com','claude.ai','chat.deepseek.com','gemini.google.com']);
add('ai-image','AI 图像生成','AI与智能工具','图像与视频生成',['stable diffusion','midjourney','comfyui','ai绘画','ai视频','文生图','text-to-image'],['midjourney.com']);
add('ai-agent','智能体与工作流','AI与智能工具','智能体与工作流',['ai agent','ai智能体','langchain','langgraph','智能体工作流','rag检索','retrieval augmented generation']);
add('ai-prompt','提示词与应用','AI与智能工具','提示词与应用',['prompt engineering','提示词','ai提示','prompt template']);
add('ai-local','本地模型','AI与智能工具','本地模型与部署',['ollama','llama.cpp','本地大模型','local llm','模型量化'],['ollama.com']);
add('ai-datasets','模型与数据集社区','AI与智能工具','模型与数据集',['hugging face','机器学习数据集','训练数据集'],['huggingface.co']);
add('design-ui','界面与交互设计','内容与设计','界面与交互',['ui设计','ux设计','交互设计','figma','design system','design tokens','界面设计'],['figma.com','dribbble.com']);
add('design-graphics','平面与视觉设计','内容与设计','平面与视觉',['平面设计','graphic design','illustrator教程','photoshop教程','品牌视觉','海报设计'],['behance.net']);
add('design-font','字体与排版','内容与设计','字体与排版',['字体设计','字体下载','typography','font pairing','可商用字体'],['fonts.google.com']);
add('design-photo','摄影与修图','内容与设计','摄影与修图',['摄影技巧','摄影教程','photography tutorial','lightroom','人像布光']);
add('design-video','剪辑与动画制作','内容与设计','剪辑与动画',['视频剪辑','剪映教程','after effects','premiere pro','davinci resolve','motion graphics']);
add('design-3d','三维与建模','内容与设计','三维与建模',['blender','cinema 4d','3d建模','3d modeling','三维建模']);
add('design-writing','写作与内容创作','内容与设计','写作与内容',['写作技巧','文案写作','故事创作','creative writing','copywriting','剧本创作']);
add('design-assets','设计素材','内容与设计','设计素材',['设计素材','图标素材','免版权图片','stock photos','icon pack'],['unsplash.com','pexels.com','iconfinder.com']);
add('office-docs','文档与笔记','效率与工具','文档与笔记',['笔记工具','文档协作','obsidian','notion模板','note taking'],['notion.so','notion.site','docs.google.com','obsidian.md']);
add('office-sheets','表格与数据处理','效率与工具','表格与数据',['excel','power query','数据透视表','spreadsheet','电子表格']);
add('office-slides','演示与汇报','效率与工具','演示与汇报',['powerpoint','ppt模板','演示文稿','presentation template','汇报模板']);
add('office-pdf','PDF 与文件工具','效率与工具','文件与转换',['pdf转换','pdf合并','pdf编辑','pdf converter','文件格式转换','ocr识别']);
add('office-time','时间与任务管理','效率与工具','时间与任务',['番茄钟','时间管理','todoist','任务清单','time management','待办工具']);
add('office-meeting','会议与沟通','效率与工具','会议与沟通',['腾讯会议','视频会议','zoom meeting','会议纪要','video conferencing'],['meeting.tencent.com','zoom.us']);
add('office-automation','自动化工具','效率与工具','自动化工具',['自动化工作流','zapier','ifttt','n8n','快捷指令'],['zapier.com','ifttt.com']);
add('office-storage','文件存储与传输','效率与工具','存储与传输',['网盘','文件传输','云盘','file transfer','cloud storage'],['drive.google.com','dropbox.com']);
add('office-email','邮件与日历','效率与工具','邮件与日历',['邮件客户端','电子邮件','日历工具','email client','calendar app'],['mail.google.com','outlook.live.com','calendar.google.com']);
add('learn-courses','课程与学习平台','学习与研究','在线课程',['在线课程','公开课','online course','mooc'],['coursera.org','edx.org','khanacademy.org','icourse163.org']);
add('learn-language','语言学习','学习与研究','语言学习',['英语学习','雅思','托福','ielts','toefl','language learning','日语学习'],['duolingo.com']);
add('learn-papers','论文与学术','学习与研究','论文与学术',['学术论文','文献综述','论文检索','literature review','scientific paper'],['arxiv.org','scholar.google.com','pubmed.ncbi.nlm.nih.gov']);
add('learn-reference','百科与知识参考','学习与研究','百科与参考',['百科全书','encyclopedia'],['wikipedia.org','baike.baidu.com','britannica.com']);
add('learn-exams','考试与职业资格','学习与研究','考试与资格',['考研','考公','教师资格','资格考试','exam preparation','公务员考试']);
add('learn-science','数学与科学','学习与研究','数学与科学',['线性代数','概率论','微积分','量子力学','linear algebra','calculus','物理实验']);
add('learn-reading','阅读与书籍','学习与研究','阅读与书籍',['读书笔记','书单推荐','电子书','book review','reading list'],['gutenberg.org']);
add('business-marketing','营销与增长','运营与商业','营销与增长',['市场营销','增长策略','数字营销','digital marketing','seo','内容营销']);
add('business-social','社交媒体运营','运营与商业','内容运营',['公众号运营','小红书运营','社群运营','social media marketing','账号运营']);
add('business-ecommerce','电商与销售','运营与商业','电商与销售',['电商运营','跨境电商','shopify','销售漏斗','ecommerce','电商选品'],['shopify.com']);
add('business-startup','创业与商业模式','运营与商业','创业与商业模式',['商业模式','创业计划','商业计划书','business model','startup funding','创业融资']);
add('business-hr','招聘与人力资源','运营与商业','招聘与人力资源',['招聘','简历','面试技巧','招聘管理','resume template','job search'],['zhipin.com','indeed.com']);
add('business-management','企业经营','运营与商业','经营与管理',['企业管理','组织管理','供应链管理','business management','绩效管理']);
add('business-law','法律与合同','运营与商业','法律与合同',['劳动合同','合同范本','合同审查','法律咨询','contract template','intellectual property']);
add('finance-stock','股票与证券','金融与财经','股票与证券',['股票','证券市场','stock market','equity valuation','股票估值']);
add('finance-funds','基金与 ETF','金融与财经','基金与 ETF',['etf','公募基金','指数基金','mutual fund','基金定投']);
add('finance-accounting','财务与税务','金融与财经','财务与税务',['会计','税务','发票','报税','accounting','tax return','费用报销']);
add('finance-economy','经济与宏观','金融与财经','经济与宏观',['宏观经济','通货膨胀','货币政策','macroeconomics','inflation','经济指标']);
add('finance-personal','个人理财','金融与财经','个人理财',['家庭预算','个人理财','储蓄计划','personal finance','budget planner']);
add('finance-insurance','保险','金融与财经','保险',['保险条款','医疗保险','保险理赔','insurance policy','保险产品']);
add('life-food','美食与烹饪','生活与服务','美食与烹饪',['菜谱','烘焙','家常菜','recipe','recipes','cooking tutorial'],['xiachufang.com','allrecipes.com']);
add('life-health','健康与医疗信息','生活与服务','健康信息',['健康科普','疾病科普','体检指南','health information','症状介绍'],['nhs.uk','mayoclinic.org']);
add('life-fitness','运动与健身','生活与服务','运动与健身',['健身','力量训练','跑步训练','workout','strength training','瑜伽']);
add('life-home','家居与维修','生活与服务','家居与维修',['装修','家居收纳','家电维修','home improvement','interior renovation']);
add('life-family','亲子与家庭','生活与服务','亲子与家庭',['育儿','亲子活动','儿童教育','parenting','婴儿护理']);
add('life-pets','宠物','生活与服务','宠物',['养猫','养狗','宠物护理','pet care','犬粮','猫粮']);
add('life-services','政务与办事','生活与服务','政务与办事',['社保查询','公积金','居住证','政务服务','办事指南','户口办理']);
add('life-shopping','购物与消费','生活与服务','购物与消费',['商品比价','购物清单','家电选购','shopping list','消费测评'],['taobao.com','jd.com']);
add('travel-guide','旅行攻略','旅行与出行','旅行攻略',['旅游攻略','旅行攻略','自由行','travel guide','trip itinerary','旅行路线']);
add('travel-transport','交通与出行','旅行与出行','交通与出行',['高铁时刻','火车票','机票','flight booking','rail timetable','公交路线'],['12306.cn']);
add('travel-hotels','酒店与住宿','旅行与出行','酒店与住宿',['酒店预订','民宿预订','hotel booking','度假住宿'],['booking.com','airbnb.com']);
add('travel-visa','签证与证件','旅行与出行','签证与证件',['签证','护照办理','visa application','passport renewal']);
add('travel-outdoors','户外与露营','旅行与出行','户外与露营',['徒步路线','露营攻略','登山路线','hiking trail','camping guide']);
add('fun-movies','电影与剧集','影音与娱乐','电影与剧集',['电影推荐','影评','电视剧','movie review','film review','追剧']);
add('fun-music','音乐与音频','影音与娱乐','音乐与音频',['音乐推荐','乐谱','吉他谱','music playlist','专辑评论','歌曲'],['music.163.com','open.spotify.com']);
add('fun-games','游戏资讯与攻略','影音与娱乐','游戏与攻略',['游戏攻略','游戏评测','game walkthrough','game review','游戏资讯'],['store.steampowered.com']);
add('fun-animation','动漫与漫画','影音与娱乐','动漫与漫画',['动漫推荐','漫画推荐','动画番剧','anime review','manga review']);
add('fun-podcasts','播客','影音与娱乐','播客',['播客','podcast','podcasts'],['xiaoyuzhoufm.com']);
add('news-general','综合新闻','新闻与资讯','综合新闻',['新闻报道','今日新闻','时事新闻','breaking news','新闻资讯'],['reuters.com','apnews.com']);
add('news-tech','科技资讯','新闻与资讯','科技资讯',['科技新闻','科技资讯','tech news','technology news']);
add('news-local','地方资讯','新闻与资讯','地方资讯',['本地新闻','城市新闻','local news','社区公告']);
add('product-requirements','产品需求与原型','产品与项目','需求与原型',['产品需求','需求文档','产品原型','prd','product requirements','axure']);
add('product-research','用户研究','产品与项目','用户研究',['用户研究','用户访谈','用户画像','user research','usability testing']);
add('product-projects','项目管理','产品与项目','项目管理',['项目管理','敏捷开发','scrum','project management','项目计划','甘特图'],['trello.com','asana.com']);
add('product-metrics','产品分析','产品与项目','产品分析',['产品分析','留存分析','埋点方案','product analytics','a/b testing']);
// Paths only become evidence inside a known host. A generic /docs path is not enough.
add('path-github-actions','GitHub Actions 文档','编程开发','部署与运维',[],[],[{domain:'docs.github.com',prefix:'/actions'}]);
add('path-ms-excel','Microsoft Excel 支持','效率与工具','表格与数据',[],[],[{domain:'support.microsoft.com',prefix:'/excel'},{domain:'support.microsoft.com',prefix:'/zh-cn/excel'}]);
// Common nontechnical homonyms do not count as subject evidence from titles.
const titleExclusions={'dev-web':['react to'],'dev-python':['python snake care','python habitat','python reptile'],'ai-assistant':['claude monet','claude debussy'],'office-sheets':['excel at','excel in life']};
function normalize(value){return String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();}
function includesTerm(text,term){text=normalize(text);term=normalize(term);if(!term)return false;let at=text.indexOf(term);while(at!==-1){const left=at?text[at-1]:'',right=text[at+term.length]||'';const startASCII=/^[a-z0-9]/.test(term),endASCII=/[a-z0-9]$/.test(term);if((!startASCII||!/[a-z0-9_]/.test(left))&&(!endASCII||!/[a-z0-9_]/.test(right)))return true;at=text.indexOf(term,at+1);}return false;}
function domainMatch(host,domain){host=normalize(host).replace(/\.$/,'');domain=normalize(domain).replace(/\.$/,'');return host===domain||host.endsWith('.'+domain);}
function context(row){let host='',path='';try{const u=new URL(String(row.url||''));if(['http:','https:'].includes(u.protocol)){host=u.hostname.toLowerCase();try{path=decodeURIComponent(u.pathname);}catch{path=u.pathname;}}}catch{}return {title:normalize(row.title||row.shortTitle),domain:host,path:normalize(path),folder:normalize(Array.isArray(row.folder)?row.folder.join(' / '):row.folder)};}
function validateUserRule(input){const r=input&&typeof input==='object'?input:{},errors=[];const rule={id:String(r.id||'').trim(),name:String(r.name||'自定义规则').trim(),enabled:r.enabled!==false,field:r.field,operator:r.operator,value:String(r.value??'').trim(),category:String(r.category||'').trim(),subcategory:String(r.subcategory||'其他').trim(),tags:Array.isArray(r.tags)?[...new Set(r.tags.map(String).map(s=>s.trim()).filter(Boolean))]:[],priority:Number.isFinite(Number(r.priority))?Number(r.priority):0};
if(!rule.id||rule.id.length>100)errors.push('规则需要有效标识');if(!['title','domain','path','folder'].includes(rule.field))errors.push('请选择标题、域名、路径或原文件夹');if(!['contains','equals'].includes(rule.operator))errors.push('请选择包含或完全匹配');if(!rule.value||rule.value.length>160)errors.push('匹配内容须为1至160个字符');if(!rule.category||rule.category.length>80)errors.push('分类须为1至80个字符');if(rule.subcategory.length>120)errors.push('子分类过长');if(rule.tags.length>20||rule.tags.some(t=>t.length>60))errors.push('标签过多或过长');if(!Number.isInteger(rule.priority)||rule.priority<-100||rule.priority>100)errors.push('优先级须为-100至100的整数');
if(rule.field==='domain'&&(!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(rule.value)||!rule.value.includes('.')||rule.value.includes('..')))errors.push('域名请仅填写主机名，例如 example.com');
return {valid:!errors.length,errors,rule};}
function userMatch(rule,ctx){const target=ctx[rule.field],value=normalize(rule.value);if(rule.field==='domain')return rule.operator==='equals'?target===value:domainMatch(target,value);if(rule.operator==='equals')return target===value;return rule.field==='title'||rule.field==='folder'?includesTerm(target,value):target.includes(value);}
function builtinMatch(rule,ctx){const reasons=[];let score=0;const excluded=(titleExclusions[rule.id]||[]).some(t=>includesTerm(ctx.title,t)),title=!excluded&&rule.terms.find(t=>includesTerm(ctx.title,t)),folder=rule.terms.find(t=>includesTerm(ctx.folder,t)),domain=rule.domains.find(d=>domainMatch(ctx.domain,d)),path=rule.paths.find(p=>domainMatch(ctx.domain,p.domain)&&(ctx.path===p.prefix||ctx.path.startsWith(p.prefix+'/')));if(title){score+=8;reasons.push('标题命中“'+title+'”');}if(folder){score+=5;reasons.push('原文件夹命中“'+folder+'”');}if(domain){score+=8;reasons.push('域名属于 '+domain);}if(path){score+=10;reasons.push('匹配 '+path.domain+path.prefix+' 栏目');}return score?{rule,score,reasons}:null;}
function result(category,subcategory,tags,source,status,matches,reasons){return {category,subcategory,tags,classification:{source,status,ruleIds:matches.map(m=>m.rule.id),reasons:reasons||matches.flatMap(m=>m.reasons),version}};}
function pending(reason,status='unclassified',matches=[]){return result('待分类',status==='ambiguous'?'规则冲突':'信息不足',[], 'unclassified',status,matches,[reason,...matches.flatMap(m=>m.reasons)]);}
function classify(row={},settings={}){if(settings.enabled===false)return pending('自动分类已关闭');const ctx=context(row),custom=(Array.isArray(settings.userRules)?settings.userRules:[]).map(validateUserRule).filter(v=>v.valid&&v.rule.enabled&&userMatch(v.rule,ctx)).map(v=>({rule:v.rule,score:v.rule.priority,reasons:['命中自定义规则“'+v.rule.name+'”']})).sort((a,b)=>b.score-a.score||a.rule.id.localeCompare(b.rule.id));
if(custom.length){const top=custom.filter(m=>m.score===custom[0].score);const labels=new Set(top.map(m=>m.rule.category+'\0'+m.rule.subcategory));if(labels.size>1)return pending('同优先级的自定义规则给出不同分类，请调整规则优先级。','ambiguous',top);const r=top[0].rule;return result(r.category,r.subcategory,[...new Set(top.flatMap(m=>m.rule.tags))],'user-rule','classified',top);}
const disabled=new Set(Array.isArray(settings.disabledRuleIds)?settings.disabledRuleIds:[]);const hits=builtinRules.filter(r=>!disabled.has(r.id)).map(r=>builtinMatch(r,ctx)).filter(Boolean).sort((a,b)=>b.score-a.score||a.rule.id.localeCompare(b.rule.id));
if(!hits.length)return pending('标题、域名、路径和原文件夹均未命中明确规则。');const top=hits[0];const near=hits.filter(h=>top.score-h.score<=2);if(new Set(near.map(h=>h.rule.category)).size>1)return pending('多个领域的规则同时命中，暂不自动决定分类。','ambiguous',near);
const sameCategory=near.filter(h=>h.rule.category===top.rule.category),subcategories=new Set(sameCategory.map(h=>h.rule.subcategory));return result(top.rule.category,subcategories.size===1?top.rule.subcategory:'综合主题',[], 'builtin-rule','classified',sameCategory,subcategories.size>1?['多个同类主题同时命中，保留大类，子类待细分。',...sameCategory.flatMap(h=>h.reasons)]:undefined);}
const api={version,categories,builtinRules,classify,validateUserRule,domainMatch};root.BookmarkRules=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
