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
  pending=(async()=>{try{const state=JSON.parse(Updater.state()),url=new URL('agri.json',state.url).href;const raw=await bridgeCall('fetch',[url],45000),feed=JSON.parse(raw).sharedMarket;apply(feed);return feed;}catch(e){writeStore('ai-error','Chưa tải được bản tin chung · giữ báo cáo đã lưu. '+e.message);if(cached())return cached();throw e;}finally{pending=null;}})();return pending;
 }
 return {sync,apply,report,cached,valid};
})();
