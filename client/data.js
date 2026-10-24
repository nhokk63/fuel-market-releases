'use strict';
const SOURCE='https://baomoi.com/tien-ich-gia-xang-dau.epi';
const PRODUCTS=[{id:'e10',label:'E10',name:'RON 95-III'},{id:'e5',label:'E5',name:'RON 92-II'},{id:'do',label:'Diesel II',name:'DO 0,05S-II'},{id:'e10v',label:'E10 V',name:'RON 95-V'},{id:'dov',label:'Diesel V',name:'DO 0,001S-V'},{id:'kerosene',label:'Dầu hỏa',name:'2-K'}];
const OFFICIAL=day=>'https://www.petrolimex.com.vn/ndi/thong-cao-bao-chi/petrolimex-dieu-chinh-gia-xang-dau-tu-15-gio-00-phut-ngay-'+day+'-10-2026.html';
const SEED={version:3,checkedAt:null,source:SOURCE,sourceTime:'2026-10-08T15:29:00+07:00',history:[{time:'2026-10-01T15:00:00+07:00',prices:{e10:27720,e5:27090,do:30300,e10v:28740,dov:31730,kerosene:30360},kind:'effective',source:OFFICIAL('01')},{time:'2026-10-08T15:00:00+07:00',prices:{e10:28810,e5:28250,do:29700,e10v:29630,dov:31130,kerosene:31240},kind:'effective',source:OFFICIAL('08'),continuous:true}],forecast:null};
function validTime(value,now=Date.now(),future=false){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return false;const ms=Date.parse(value),m=value.match(/^(\d{4})-(\d{2})-(\d{2})/);const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return Number.isFinite(ms)&&d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]&&(future||ms<=now+300000);}
function validHistoryPrices(prices){return prices&&['e10','e5','do'].every(id=>Number.isInteger(prices[id])&&prices[id]>=1000&&prices[id]<=200000)&&PRODUCTS.every(p=>prices[p.id]===undefined||(Number.isInteger(prices[p.id])&&prices[p.id]>=1000&&prices[p.id]<=200000));}
function validPrices(prices){return prices&&PRODUCTS.every(p=>Number.isInteger(prices[p.id])&&prices[p.id]>=1000&&prices[p.id]<=200000);}
function samePrices(a,b){return PRODUCTS.every(p=>a[p.id]===b[p.id]);}
function validForecast(f,now=Date.now()){try{return !!f&&typeof f.title==='string'&&f.title.length<600&&validTime(f.target,now,true)&&validTime(f.seenAt,now)&&Date.parse(f.target)>now&&Date.parse(f.target)-now<=8*86400000&&new URL(f.url).origin==='https://baomoi.com';}catch{return false;}}
function normalizeData(raw,now=Date.now()){
 if(!raw||!Array.isArray(raw.history)||!validTime(raw.sourceTime,now)||!raw.history.length)throw Error('Bản lưu không hợp lệ');
 const map=new Map();for(const row of raw.history){if(!row||!validTime(row.time,now)||!validHistoryPrices(row.prices)||Date.parse(row.time)>Date.parse(raw.sourceTime))throw Error('Mốc lịch sử không hợp lệ');let r={time:row.time,prices:{...row.prices},kind:'observed',source:typeof row.source==='string'&&/^https:\/\//.test(row.source)?row.source:SOURCE};
 // Only these two official snapshots have a verified effective time and provenance.
 const known=SEED.history.find(k=>(Date.parse(k.time)===Date.parse(r.time)||(raw.version<3&&k.time===SEED.history[1].time&&r.time==='2026-10-08T15:29:00+07:00'))&&PRODUCTS.every(p=>r.prices[p.id]===undefined||k.prices[p.id]===r.prices[p.id]));if(known)r={...known,prices:{...known.prices}};
 const key=Date.parse(r.time),old=map.get(key);if(old&&!samePrices(old.prices,r.prices))throw Error('Trùng thời điểm nhưng khác giá');map.set(key,r);}
 const history=[...map.values()].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)).slice(-120);
 // Never bridge an unknown observation as a confirmed adjustment interval.
 history.forEach((r,i)=>{r.continuous=!!(i&&r.time===SEED.history[1].time&&history[i-1].time===SEED.history[0].time&&samePrices(history[i-1].prices,SEED.history[0].prices));});
 return {version:3,source:SOURCE,sourceTime:raw.sourceTime,history,checkedAt:validTime(raw.checkedAt,now)&&Date.parse(raw.checkedAt)>=Date.parse(raw.sourceTime)?raw.checkedAt:null,forecast:validForecast(raw.forecast,now)?raw.forecast:null};
}
function readStore(key,fallback){try{let raw=window.Native?Native.read(key):localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function writeStore(key,value){const text=JSON.stringify(value);if(window.Native)Native.write(key,text);else localStorage.setItem(key,text);}
function loadData(){const raw=readStore('data',null);if(!raw)return JSON.parse(JSON.stringify(SEED));try{const clean=normalizeData(raw);if(raw.version<3){writeStore('data-before-v3',raw);writeStore('data',clean);}return clean;}catch(e){try{writeStore('data-quarantine',raw);writeStore('diagnostic',{at:new Date().toISOString(),reason:e.message});writeStore('data',SEED);}catch(_){}return JSON.parse(JSON.stringify(SEED));}}
function getPrefs(){const p=readStore('prefs',{});return {price:false,forecast:false,animation:true,coffee:!!p.price,pepper:!!p.price,cau:!!p.price,rice:!!p.price,aiFuel:false,aiAgri:false,...p};}
function parseSource(html,now=Date.now()){
 const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style').forEach(n=>n.remove());const full=text(doc.body);let date=full.match(/Giá\s+Xăng\s+dầu\s+Ngày\s+(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{2})/i);if(!date)throw Error('Nguồn chưa có thời điểm giá hợp lệ');const stamp=`${date[3]}-${date[2].padStart(2,'0')}-${date[1].padStart(2,'0')}T${date[4].padStart(2,'0')}:${date[5]}:00+07:00`;if(!validTime(stamp,now))throw Error('Ngày nguồn không hợp lệ');
 function text(node){if(!node)return '';if(node.nodeType===3)return node.nodeValue;return [...node.childNodes].map(text).join(' ').replace(/\s+/g,' ').trim();}
 function norm(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();}
 function product(value){const n=norm(value).replace(/\s/g,'');if(/e10ron95(?:-?v|muc5)(?![iv0-9])/.test(n))return 'e10v';if(/(?:do|diesel|diezen)0[,.]001s(?:-?v|muc5)(?![iv0-9])/.test(n))return 'dov';if(/dauhoa2-?k/.test(n))return 'kerosene';if(/e10ron95(?:-?iii|muc3)(?![iv0-9])/.test(n))return 'e10';if(/^(?:xang)?e5ron92(?:-?ii|muc2)?$/.test(n))return 'e5';if(/(?:do|diesel|diezen)0[,.]05s(?:-?ii|muc2)(?![iv0-9])/.test(n))return 'do';return null;}
 function money(value){const t=value.replace(/\u00a0/g,' ').trim().replace(/\s*(?:VNĐ|VND|đ|đồng)(?:\s*\/\s*lít)?$/i,'').trim();if(!/^(?:[1-9]\d{3,5}|[1-9]\d{0,2}[., ]\d{3})$/.test(t))return null;return Number(t.replace(/[^0-9]/g,''));}
 const prices={},candidates={},seen=new Set();function add(id,value){if(!id||!Number.isInteger(value)||value<1000||value>200000)return;(candidates[id]||(candidates[id]=new Set())).add(value);}
 for(const table of doc.querySelectorAll('table,[role="table"]')){
  const rows=[...table.querySelectorAll('tr,[role="row"]')];let v2=-1,v1=-1;
  for(const row of rows){const cells=[...row.children].filter(c=>/^(TD|TH)$/.test(c.tagName)||c.getAttribute('role')==='cell'||c.getAttribute('role')==='columnheader');const ctext=cells.map(c=>norm(text(c)));let idx=ctext.findIndex(x=>/vung\s*2/.test(x));if(idx>=0){v2=idx;v1=ctext.findIndex(x=>/vung\s*1/.test(x));continue;}if(v2<0||v1<0||cells.length<=Math.max(v1,v2))continue;let id=cells.map(c=>product(text(c))).find(Boolean);if(id){seen.add(id);add(id,money(text(cells[v2])));}
  }
 }
 // Read adjacent cell labels with DOM boundaries retained. Limit fallback to the timestamped table section.
 const spaced=text(doc.body);const normFull=norm(spaced);const marker=normFull.indexOf('gia xang dau ngay');const section=normFull.slice(Math.max(0,marker)).split(/nguon\s*:/)[0].split(/tin tuc gia xang/)[0];
 if(PRODUCTS.some(p=>!candidates[p.id])){const h1=section.search(/gia\s*vung\s*1/),h2=section.search(/gia\s*vung\s*2/);if(h1>=0&&h2>h1){const pattern=/(?:xang\s*)?(e10\s*ron\s*95\s*(?:-?\s*iii|v|muc\s*[35])|e5\s*ron\s*92(?:\s*(?:-?\s*ii|muc\s*2))?|(?:do|diesel|diezen)\s*0[,.](?:05s\s*(?:-?\s*ii|muc\s*2)|001s\s*(?:-?\s*v|muc\s*5))|dau\s*hoa\s*2\s*-?\s*k)(?=\s|[0-9]|$)\s*([1-9]\d{0,2}[., ]\d{3}|[1-9]\d{3,5})\s*(?:d|vnd|đ)?\s*([1-9]\d{0,2}[., ]\d{3}|[1-9]\d{3,5})/gi;for(const m of section.matchAll(pattern)){const id=product(m[1]);if(id&&!seen.has(id))add(id,money(m[3]));}}}
 for(const p of PRODUCTS){const set=candidates[p.id];if(set&&set.size===1)prices[p.id]=[...set][0];}
 if(PRODUCTS.some(p=>!prices[p.id])){const diag={at:new Date(now).toISOString(),reason:'Khong doc du gia vung 2',tables:doc.querySelectorAll('table').length,found:Object.keys(prices),rows:[...doc.querySelectorAll('tr,[role="row"]')].map(r=>text(r)).filter(t=>/E10|E5|0[,.]05|vùng/i.test(t)).slice(0,20),excerpt:section.slice(0,5000)};try{writeStore('diagnostic',diag);}catch(e){}throw Error('Không đọc rõ giá '+PRODUCTS.filter(p=>!prices[p.id]).map(p=>p.label).join(', ')+'. Giữ giá cũ; có thể sao chép lỗi trong Thông báo.');}
 let forecast=null;for(const a of doc.querySelectorAll('a[href]')){const title=a.textContent.trim().replace(/\s+/g,' ');if(!/dự báo/i.test(title)||!/xăng|diesel/i.test(title))continue;const m=title.match(/(?:ngày|kỳ|chiều)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?/i);if(!m)continue;const target=`${m[3]||date[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T15:00:00+07:00`,t=Date.parse(target);if(!validTime(target,now,true)||!(t>now&&t-Date.parse(stamp)<8*86400000))continue;let url;try{url=new URL(a.getAttribute('href'),SOURCE);}catch{continue;}if(url.origin!=='https://baomoi.com')continue;forecast={title,url:url.href,target,seenAt:new Date(now).toISOString()};break;}
 return {prices,sourceTime:stamp,forecast};
}
function mergeData(old,incoming,now=Date.now()){
 old=normalizeData(old,now);if(!incoming||!validTime(incoming.sourceTime,now)||!validPrices(incoming.prices))throw Error('Dữ liệu nguồn không hợp lệ');
 if(Date.parse(incoming.sourceTime)<Date.parse(old.sourceTime))throw Error('Nguồn trả dữ liệu cũ hơn bản đã lưu');const last=old.history.at(-1),changed=PRODUCTS.some(p=>last.prices[p.id]!==undefined&&last.prices[p.id]!==incoming.prices[p.id]);let history=old.history.slice();
 if(changed&&Date.parse(incoming.sourceTime)===Date.parse(old.sourceTime))throw Error('Giá khác nhưng cùng thời điểm; chờ nguồn xác nhận');
 // A newer source snapshot is useful even when prices are unchanged; repeated downloads are not new observations.
 if(Date.parse(incoming.sourceTime)===Date.parse(old.sourceTime)&&!changed)history[history.length-1]={...last,prices:{...incoming.prices}};if(Date.parse(incoming.sourceTime)>Date.parse(old.sourceTime))history.push({time:incoming.sourceTime,prices:incoming.prices,kind:'observed',source:SOURCE});
 return {data:normalizeData({version:3,checkedAt:new Date(now).toISOString(),source:SOURCE,sourceTime:incoming.sourceTime,history:history.slice(-120),forecast:incoming.forecast},now),changed};
}
function sendNotice(key,category,title,text){let inbox=readStore('inbox',[]);if(!inbox.some(x=>x.key===key)){inbox.unshift({key,category,title,text,at:new Date().toISOString()});writeStore('inbox',inbox.slice(0,100));}if(window.MarketAPI)return MarketAPI.notifyEvent(key,category,title,text);if(window.Native)return Native.notify(title,text);return false;}
function notify(title,text){const d=readStore('data',{});return sendNotice('fuel:'+d.sourceTime+':'+title,'fuel',title,text);}
async function syncUnlocked(){if(!window.Native)throw Error('Bản HTML chỉ xem dữ liệu lưu sẵn; cài APK để cập nhật');let html=await new Promise((resolve,reject)=>{const requestId=String(Date.now())+'-'+Math.random();const timer=setTimeout(()=>{window.onNativePage=null;reject(Error('Nguồn phản hồi quá lâu. Thử lại sau.'));},40000);window.onNativePage=(id,text)=>{if(id!==requestId)return;clearTimeout(timer);window.onNativePage=null;resolve(text);};Native.fetchPage(requestId);});if(!html||html.startsWith('ERROR:'))throw Error('Không tải được nguồn. Kiểm tra mạng và thử lại.');let old=loadData(),parsed=parseSource(html),result=mergeData(old,parsed),prefs=getPrefs();writeStore('data',result.data);if(result.changed&&prefs.price){let before=old.history.at(-1).prices,after=parsed.prices;notify('Giá xăng dầu vùng 2 thay đổi',PRODUCTS.filter(p=>before[p.id]!==undefined&&before[p.id]!==after[p.id]).map(p=>p.label+' '+p.name+': '+after[p.id].toLocaleString('vi-VN')+' đ ('+(after[p.id]-before[p.id]>0?'+':'')+(after[p.id]-before[p.id]).toLocaleString('vi-VN')+')').join(' · '));}let f=result.data.forecast;if(prefs.forecast&&f&&Date.parse(f.target)-Date.now()<=86400000){let last=readStore('lastForecast','');if(last!==f.url&&notify('Dự báo trước kỳ điều chỉnh',f.title))writeStore('lastForecast',f.url);}return result.data;}

async function syncData(){SharedMarket.sync().catch(()=>{});return legacySyncData();}
async function legacySyncData(){if(!window.Native)return syncUnlocked();if(!Native.acquire())throw Error("Đang kiểm tra nền. Thử lại sau ít giây.");try{const result=await syncUnlocked();writeStore('lastSync',{ok:true,at:new Date().toISOString()});writeStore('diagnostic',{at:new Date().toISOString(),reason:'Cập nhật thành công',sourceTime:result.sourceTime});return result;}catch(e){writeStore('lastSync',{ok:false,at:new Date().toISOString(),error:e.message});throw e;}finally{Native.release();}}

// Embedded into data.js by prepare_client.py (OTA's fixed nine-file format).
const SharedMarket=(()=>{
 let pending=null,lastAttempt=0;
 const cached=()=>readStore('shared-market-v1',null);
 const family=id=>['e10','e5','do','e10v','dov','kerosene'].includes(id)?'fuel':id;
 function report(id){const g=cached()?.groups?.[family(id)];if(!g)return null;const r={...g.report,id};return validInsight(r)?{...r,mode:'market-news',generatedAt:g.generatedAt,expiresAt:g.expiresAt}:null;}
 function valid(feed){return feed?.schema===1&&feed.groups&&(Object.keys(feed.groups).length>0||Object.keys(feed.prices||{}).length>0)&&Object.entries(feed.groups).every(([id,g])=>['coffee','pepper','cau','rice','fuel','gold'].includes(id)&&validTime(g.generatedAt)&&validTime(g.expiresAt,Date.now(),true)&&Date.parse(g.expiresAt)>Date.parse(g.generatedAt)&&Array.isArray(g.quotes)&&g.quotes.length<200&&validInsight({...g.report,id:id==='fuel'?'e5':id}));}
 function quote(q){try{return q&&/^\d{4}-\d{2}-\d{2}$/.test(q.day)&&q.day<=vnDay()&&new Date(q.day).toISOString().slice(0,10)===q.day&&Number.isInteger(q.low)&&Number.isInteger(q.high)&&q.low>=1000&&q.high>=q.low&&q.high<=1000000&&/^https:\/\//.test(q.source)&&typeof q.region==='string'&&typeof q.grade==='string'&&typeof q.author==='string';}catch{return false;}}
 function apply(feed){
  if(!valid(feed))throw Error('Bản tin chung chưa hợp lệ');
  const before=cached(),groups={...before?.groups};
  const priorAgri={};if(typeof agriSeries==='function')for(const k of ['coffee','pepper','cau','rice'])try{priorAgri[k]=agriSeries(k,'daklak').at(-1);}catch{}
  const priorFuel=loadData().history.at(-1)?.prices;
  for(const [id,g]of Object.entries(feed.groups))if(!groups[id]||Date.parse(g.generatedAt)>=Date.parse(groups[id].generatedAt))groups[id]=g;
  feed={...feed,groups};
  const rows=(feed.history||Object.values(groups).flatMap(g=>g.quotes)).filter(quote);
  for(const kind of ['coffee','pepper']){
   const byDay=new Map();for(const q of rows.filter(q=>q.id===kind&&q.unit==='VND/kg'&&q.low===q.high)){
    if(!byDay.has(q.day))byDay.set(q.day,{kind,day:q.day,regions:{},sources:{},source:q.source,checkedAt:groups[kind]?.generatedAt});
    const d=byDay.get(q.day);if(d.regions[q.region]!==undefined&&d.regions[q.region]!==q.low){d.regions[q.region]=null;}else d.regions[q.region]=q.low;d.sources[q.region]=q.source;
   }
   let store=readStore('agri',{});for(const d of [...byDay.values()].sort((a,b)=>a.day.localeCompare(b.day))){d.regions=Object.fromEntries(Object.entries(d.regions).filter(([,p])=>p!==null));if(!Object.keys(d.regions).length)continue;try{store=mergeAgri(store,d);}catch{}}
   writeStore('agri',store);
  }
  const cq=rows.filter(q=>q.id==='cau'&&q.unit==='VND/kg').map(q=>({...q,verification:'ai-extracted'}));
  if(cq.length){const store=readStore('agri',{});store.cau=mergeQuotes(store.cau||[],cq);writeStore('agri',store);}
  const rq=rows.filter(q=>q.id==='rice'&&q.unit==='VND/kg').map(q=>({...q,verification:'ai-extracted'}));
  if(rq.length)writeStore('rice-quotes',mergeQuotes(readStore('rice-quotes',[]),rq));
  const fuel=feed.prices?.fuel||groups.fuel;
  if(fuel){const day=fuel.quotes.map(q=>q.day).sort().at(-1),same=fuel.quotes.filter(q=>quote(q)&&q.day===day&&q.region==='Vùng 2'&&q.unit==='VND/lit'&&q.low===q.high),prices=Object.fromEntries(same.map(q=>[q.id,q.low]));
   if(validPrices(prices)){const stamp=fuel.sourceTime||day+'T00:00:00+07:00';try{const result=mergeData(loadData(),{prices,sourceTime:stamp,forecast:null});for(const row of result.data.history)if(row.time===stamp)row.source=same[0].source;writeStore('data',result.data);}catch{}}
  }
  const gold=feed.prices?.gold||groups.gold;
  if(typeof Gold!=='undefined'&&gold?.gold)Gold.applyShared(gold.gold,gold.generatedAt);
  writeStore('shared-market-v1',feed);writeStore('ai-error','');
  if(typeof getPrefs==='function'&&typeof sendNotice==='function'){
   const prefs=getPrefs();
   for(const [id,g]of Object.entries(groups)){
    if(before?.groups?.[id]?.generatedAt===g.generatedAt||g.report.direction==='unknown'||Date.parse(g.expiresAt)<=Date.now())continue;
    if(!(id==='gold'?readStore('gold-notify',false):id==='fuel'?prefs.aiFuel:prefs.aiAgri))continue;
    const label=id==='fuel'?'Xăng dầu':typeof AI_LABELS!=='undefined'?(AI_LABELS[id]||id):id;
    sendNotice('shared-ai:'+id+':'+g.generatedAt,'ai','Xu hướng · '+label,g.report.reason.slice(0,240)+' · Tham khảo');
   }
  }
  if(typeof agri!=='undefined')agri=readStore('agri',agri);
  if(typeof agriNotice==='function')for(const k of ['coffee','pepper','cau','rice'])try{agriNotice(k,priorAgri[k],agriSeries(k,'daklak').at(-1));}catch{}
  try{const current=loadData();if(getPrefs().price&&priorFuel&&!samePrices(priorFuel,current.history.at(-1).prices))sendNotice('shared-fuel:'+current.sourceTime,'fuel','Giá xăng dầu vùng 2 thay đổi',PRODUCTS.filter(p=>priorFuel[p.id]!==current.history.at(-1).prices[p.id]).map(p=>p.label+' '+p.name+': '+current.history.at(-1).prices[p.id].toLocaleString('vi-VN')+' đ/lít').join(' · '));}catch{}

  if(document.getElementById('agrilist'))renderAgri();
  if(document.getElementById('aistatus'))repaintAnalysis();
 }
 async function sync(force=false){
  if(pending)return pending;
  if(!force&&Date.now()-lastAttempt<60000){if(cached())return cached();throw Error('Đang chờ thử tải lại bản tin chung');}
  lastAttempt=Date.now();
  pending=Promise.resolve().then(async()=>{try{if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));const state=JSON.parse(Updater.state()),url=new URL('agri.json',state.url).href;const raw=await bridgeCall('fetch',[url],45000),feed=JSON.parse(raw).sharedMarket;apply(feed);return feed;}catch(e){writeStore('ai-error','Chưa tải được bản tin chung · giữ báo cáo đã lưu. '+e.message);if(cached())return cached();throw e;}}).finally(()=>{pending=null;});return pending;
 }
 return {sync,apply,report,cached,valid};
})();
