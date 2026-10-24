const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=process.env.CLIENT_DIR||__dirname+'/../client/';
(async()=>{
let count=0,finish,rows={};const gate=new Promise(r=>finish=r);
const c=vm.createContext({Promise,Date,document:{getElementById:()=>null},SharedMarket:{sync:()=>new Promise(()=>{})},legacySyncRice:async()=>{},CAU_SOURCE:'cau',AGRI_SOURCES:{coffee:'coffee',pepper:'pepper'},AGRI_LABELS:{coffee:'coffee',pepper:'pepper'},agri:{},bridgeCall:async(method,[kind])=>{count++;await gate;return kind},parseCau:()=>[],persistCauQuotes:()=>{},parseAgri:(html,kind)=>({kind}),readStore:(k,d)=>k==='agri'?rows:d,writeStore:(k,v)=>{if(k==='agri')rows=v},agriSeries:()=>[],mergeAgri:(old,next)=>({...old,[next.kind]:[next]}),recordPriceCheck:()=>{},agriNotice:()=>{}});
const s=fs.readFileSync(root+'agri.js','utf8');vm.runInContext(s.slice(s.indexOf('let priceAgriPending='),s.indexOf('async function legacySyncAgri()')),c);
const one=vm.runInContext('syncAgri()',c),two=vm.runInContext('syncAgri()',c);assert.strictEqual(one,two);await Promise.resolve();assert.equal(count,3);finish();await one;assert(rows.coffee&&rows.pepper);await vm.runInContext('syncAgri()',c);assert.equal(count,3);await vm.runInContext('syncAgri(true)',c);assert.equal(count,6);
console.log('PASS: prices complete while shared AI request hangs; concurrent calls coalesce; interval throttle and manual refresh');
})().catch(e=>{console.error(e);process.exit(1)});
