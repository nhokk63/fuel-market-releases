const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store=new Map();let calls=0,offline=false;
const now=new Date(),stamp=now.toISOString().replace(/\.\d{3}Z$/,'Z'),day=stamp.slice(0,10),expiry=new Date(+now+8*3600000).toISOString();
const q={id:'coffee',day,region:'Đắk Lắk',grade:'Robusta nhân xô',author:'Nguồn khảo sát',low:90800,high:90800,unit:'VND/kg',source:'https://giacaphe.com/gia-ca-phe-noi-dia/',evidence:'Đắk Lắk 90.800'};
const feed={schema:1,history:[q],groups:{coffee:{quotes:[q],generatedAt:stamp,expiresAt:expiry,report:{direction:'unknown',reason:'Giá đã xác minh; chưa đủ lịch sử dự báo.',risk:'Thiếu lịch sử.',horizon:'1–2 tuần',sources:[{url:q.source,title:'Bảng giá'}]}}}};
const c=vm.createContext({console,Date,Intl,URL,window:{},document:{getElementById:()=>null},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},Updater:{state:()=>JSON.stringify({url:'https://raw.githubusercontent.com/nhokk63/fuel-market-releases/main/manifest.json'})},bridgeCall:async()=>{calls++;if(offline)throw Error('offline');return JSON.stringify({sharedMarket:feed});},vnDay:()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()),validInsight:r=>!!r.reason&&Array.isArray(r.sources),mergeQuotes:(old,rows)=>[...old,...rows],mergeAgri:(s,d)=>({...s,[d.kind]:[d]})});
vm.runInContext(fs.readFileSync(__dirname+'/../client/data.js','utf8'),c);
c.feed=feed;
(async()=>{
 await Promise.all([vm.runInContext('SharedMarket.sync()',c),vm.runInContext('SharedMarket.sync()',c)]);assert.equal(calls,1,'coalesced fetch');
 assert.equal(JSON.parse(store.get('agri')).coffee[0].regions['Đắk Lắk'],90800);
 assert.equal(vm.runInContext("SharedMarket.report('coffee').reason",c),feed.groups.coffee.report.reason);
 offline=true;await vm.runInContext('SharedMarket.sync(true)',c);assert.equal(calls,2);
 assert.equal(vm.runInContext("SharedMarket.report('coffee').generatedAt",c),stamp,'failure does not refresh age');
 assert(JSON.parse(store.get('ai-error')).includes('giữ báo cáo'));
 const previous=JSON.stringify(vm.runInContext('SharedMarket.cached()',c));c.bad={schema:1,groups:{}};
 assert.throws(()=>vm.runInContext('SharedMarket.apply(bad)',c));assert.equal(JSON.stringify(vm.runInContext('SharedMarket.cached()',c)),previous);
 c.old=JSON.parse(JSON.stringify(feed));c.old.groups.coffee.generatedAt=new Date(+now-86400000).toISOString();c.old.groups.coffee.report.reason='obsolete';vm.runInContext('SharedMarket.apply(old)',c);assert.notEqual(vm.runInContext("SharedMarket.report('coffee').reason",c),'obsolete');
 for(const file of ['insights.js','agri.js','gold.js']){const s=fs.readFileSync(__dirname+'/../client/'+file,'utf8');new vm.Script(s);}
 if(process.argv[2]){store.clear();const notices=[];c.MarketAPI={notifyEvent:(key,category)=>{notices.push({key,category});return true;}};c.window.MarketAPI=c.MarketAPI;vm.runInContext("writeStore('prefs',{price:true})",c);c.live=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).sharedMarket;vm.runInContext('SharedMarket.apply(live)',c);assert.equal(vm.runInContext("SharedMarket.report('coffee').generatedAt",c),c.live.groups.coffee.generatedAt);assert(vm.runInContext("SharedMarket.report('coffee').reason.includes('Triển vọng')",c));vm.runInContext('SharedMarket.apply(live)',c);assert.equal(notices.filter(n=>n.category==='fuel').length,1,'price change notified only once');console.log('Live shared bulletin accepted; fuel price notification deduplicated');}
 console.log('Shared client: coalescing, verified price, cached report, offline freshness, malformed feed, rollback protection passed');
})().catch(e=>{console.error(e);process.exit(1)});
