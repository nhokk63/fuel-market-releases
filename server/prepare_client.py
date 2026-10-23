"""Patch a copied 1.9.4 UI, leaving the live release untouched."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
client=root/'client'
def edit(name,old,new):
    p=client/name;s=p.read_text()
    if old not in s: raise RuntimeError('Missing patch anchor '+name)
    p.write_text(s.replace(old,new))
edit('data.js',"async function syncData(){", "async function syncData(){await SharedMarket.sync();return loadData();}\nasync function legacySyncData(){")
edit('data.js',"source:SOURCE};\n // Only", "source:typeof row.source==='string'&&/^https:\\/\\//.test(row.source)?row.source:SOURCE};\n // Only")
with (client/'data.js').open('a') as f:f.write('\n'+(root/'server/client-shared.js').read_text())
edit('insights.js','async function syncAi(){','async function syncAi(){try{await SharedMarket.sync();}catch{}repaintAnalysis();}\nasync function legacySyncAi(){')
edit('insights.js',"x=r?.items?.find(x=>x.id===$('aipicker').value&&x.scope===analysisScope(analysisAsset($('aipicker').value)))", "x=SharedMarket.report($('aipicker').value)||r?.items?.find(x=>x.id===$('aipicker').value&&x.scope===analysisScope(analysisAsset($('aipicker').value)))")
edit('insights.js','Mỗi lần mở app, OpenRouter tự phân tích giá và xu hướng. Báo cáo từng mã hiện ngay khi hoàn thành. App tự đọc nguồn công khai. Khi thiếu tin mới, báo cáo ghi rõ giới hạn và chỉ dựa trên giá đã có.','Mở app để nhận bản tin giá và xu hướng dùng chung. Báo cáo được làm mới định kỳ từ nhiều nguồn; từng bài ghi rõ ngày dữ liệu, căn cứ và điều kiện dự báo. Chưa có kết quả thì app giữ báo cáo cũ kèm thời điểm.')
edit('agri.js','async function syncAgri(){',"async function syncAgri(){try{await SharedMarket.sync();}catch{}agri=readStore('agri',agri);if(document.getElementById('agrilist'))renderAgri();}\nasync function legacySyncAgri(){")
edit('agri.js','async function syncRice(){','async function syncRice(){try{await SharedMarket.sync();}catch{}}\nasync function legacySyncRice(){')
edit('agri.js','async function syncArchive(manual=false){','async function syncArchive(manual=false){if(!manual)return;')
edit('agri.js','&&q.source===RICE_SOURCE;',"&&(q.source===RICE_SOURCE||q.verification==='ai-extracted');")
edit('gold.js','async function sync(force=false){','async function sync(force=false){try{await SharedMarket.sync(force);}catch(e){state.status=e.message;render();}}\n async function legacySync(force=false){')
edit('gold.js',"x=a?r.items?.find(x=>x.id==='gold'&&x.scope===analysisScope(a)):null", "x=SharedMarket.report('gold')||(a?r.items?.find(x=>x.id==='gold'&&x.scope===analysisScope(a)):null)")
edit('gold.js','return {sync,parseDomestic,',"function applyShared(raw,at){for(const [key,parser]of [['domestic',parseDomestic],['world',r=>[parseWorld(r)]]]){if(raw[key])try{state.quotes=merge(state.quotes,parser(raw[key]));}catch{}}if(raw.fx)try{state.fx=parseFX(raw.fx);}catch{}state.checked=Date.parse(at);state.status='Bản tin chung · '+time(at);save();}return {sync,applyShared,parseDomestic,")
edit('updates.js','const FM_UI_BUILD=1090401;','const FM_UI_BUILD=1090403;')
edit('index.html','Tự phân tích mỗi lần mở app · Bổ sung lịch 07:00 / 19:00.<br>Tham khảo · Android có thể trì hoãn khi tiết kiệm pin.','Nhận bản tin khi mở app · Làm mới chung khoảng 4 giờ/lần.<br>Dự báo có điều kiện · Xem ngày dữ liệu và nguồn trong bài.')
edit('gold.js','Chưa có phân tích AI cho mã này. App tự phân tích mỗi lần mở khi đã kết nối AI. Giá và biểu đồ không cần key AI.','Chưa có bản tin vàng dùng chung. Mở app để kiểm tra kết quả mới; báo cáo ghi rõ thị trường, loại vàng và ngày giá.')
print('Prepared nine-file OTA client')
