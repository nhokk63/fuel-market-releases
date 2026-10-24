const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=process.env.CLIENT_DIR||__dirname+'/../client/';
async function test(){
 const store=new Map(),events=new Map();let calls=0,failState=false;
 const now=new Date().toISOString(),expiry=new Date(Date.now()+3600000).toISOString();
 const feed={schema:1,history:[],groups:{pepper:{quotes:[],generatedAt:now,expiresAt:expiry,report:{direction:'unknown',reason:'Báo cáo tiêu có nguồn để kiểm tra khởi động.',risk:'Thiếu dữ liệu.',horizon:'1–2 tuần',sources:[]}}}};
 const document={readyState:'loading',getElementById:()=>null,addEventListener:(name,fn)=>events.set(name,fn)};
 const c=vm.createContext({console,URL,Intl,Date,document,setTimeout,clearTimeout,setInterval:()=>0,window:{},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},Updater:{state:()=>{if(failState)throw Error('native state unavailable');return JSON.stringify({url:'https://raw.githubusercontent.com/nhokk63/fuel-market-releases/main/manifest.json'});},fetch:(url,id)=>{calls++;queueMicrotask(()=>c.window.fmReply({id,data:JSON.stringify({sharedMarket:feed})}));}},validInsight:x=>!!x.reason});
 c.window.Updater=c.Updater;
 vm.runInContext(fs.readFileSync(root+'data.js','utf8'),c);
 // app.js starts loading before agri.js defines the real native bridge.
 const boot=vm.runInContext('SharedMarket.sync()',c);await Promise.resolve();
 assert.equal(calls,0);assert.equal(vm.runInContext('typeof bridgeCall',c),'undefined');
 vm.runInContext(fs.readFileSync(root+'agri.js','utf8'),c);
 assert.equal(vm.runInContext('typeof bridgeCall',c),'function');
 document.readyState='complete';events.get('DOMContentLoaded')();await boot;
 assert.equal(calls,1);assert.equal(vm.runInContext("SharedMarket.report('pepper').reason",c),feed.groups.pepper.report.reason);
 // A synchronous failure must not leave a rejected promise cached forever.
 store.delete('shared-market-v1');failState=true;
 await assert.rejects(vm.runInContext('SharedMarket.sync(true)',c),/native state unavailable/);
 failState=false;await vm.runInContext('SharedMarket.sync(true)',c);assert.equal(calls,2);
 // Missing native methods clean the callback registry immediately.
 await assert.rejects(vm.runInContext("bridgeCall('missingMethod')",c));
 assert.equal(vm.runInContext('agriCalls.size',c),0);
 console.log('PASS: real agri bridge, startup order, pepper report, sync failure recovery, callback cleanup');
}
test().catch(e=>{console.error(e);process.exit(1)});
