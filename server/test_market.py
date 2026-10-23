import copy
import datetime as dt
import unittest
import json, os, tempfile
from pathlib import Path
from unittest.mock import patch
from market import check_quote, validate, extract_prices, Page, UTC, run

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.q = dict(id='coffee',region='Đắk Lắk',grade='Robusta nhân xô',author='Bảng khảo sát',day='2026-10-23',low=90800,high=90800,unit='VND/kg',source='https://example.org/price',evidence='Đắk Lắk Robusta nhân xô 90.800',dateEvidence='Ngày 23/10/2026')
        self.docs = [dict(url=self.q['source'],text='Ngày 23/10/2026 Đắk Lắk Robusta nhân xô 90.800')]
        self.today = dt.date(2026,10,23)
    def test_valid(self): self.assertTrue(check_quote(self.q,self.docs,'coffee',self.today))
    def test_reject_invented_number(self):
        q = dict(self.q,low=91000,high=91000)
        self.assertFalse(check_quote(q,self.docs,'coffee',self.today))
    def test_reject_wrong_day_unit_region_source_type(self):
        for change in [dict(day='2026-10-24'),dict(day='2026-10-22'),dict(unit='USD/kg'),dict(region='Gia Lai'),dict(source='https://invented.org/'),dict(low=True),dict(grade='Arabica')]:
            self.assertFalse(check_quote(dict(self.q,**change),self.docs,'coffee',self.today))
    def test_conflicting_quotes_excluded(self):
        other = dict(self.q,low=91000,high=91000,evidence='Đắk Lắk Robusta nhân xô 91.000')
        docs = copy.deepcopy(self.docs); docs[0]['text'] += ' '+other['evidence']
        raw = dict(quotes=[self.q,other],report=dict(direction='unknown',horizon='1–2 tuần',reason='Hai nguồn mâu thuẫn.',risk='Chưa xác minh.',sources=[dict(url=self.q['source'],title='Bảng giá')],evidence=[dict(source=self.q['source'],quote=self.q['evidence'])]))
        out = validate(raw,docs,'coffee',dt.datetime(2026,10,23,tzinfo=UTC))
        self.assertEqual(out['quotes'],[]); self.assertEqual(len(out['conflicts']),1)
    def test_css_numbers_and_scripts(self):
        p = Page('<style>.p:after{content:"90.800"}</style><script>91000</script><tr><td>Đắk Lắk</td><td><span class="p"></span></td></tr>')
        self.assertIn('90.800',p.text); self.assertNotIn('91000',p.text)
    def test_fuel_wrong_region_column(self):
        q = dict(self.q,id='e5',region='Vùng 2',grade='E5 RON92',unit='VND/lit',low=25060,high=25060,evidence='Xăng E5 RON 92 25,060 25,560')
        docs = [dict(url=q['source'],text='Ngày 23/10/2026 Giá vùng 1 (VNĐ) Giá vùng 2 (VNĐ) '+q['evidence'])]
        self.assertFalse(check_quote(q,docs,'fuel',self.today))
        self.assertTrue(check_quote(dict(q,low=25560,high=25560),docs,'fuel',self.today))
    def test_price_refresh_without_ai(self):
        docs=[dict(url='https://giacaphe.com/gia-ca-phe-noi-dia/',text='Giá cà phê hôm nay ngày 23/10/2026 Đắk Lắk 90,800 -600 Lâm Đồng 90,200 -600')]
        rows,_=extract_prices(docs,'coffee',self.today)
        self.assertEqual([(q['region'],q['low']) for q in rows],[('Đắk Lắk',90800),('Lâm Đồng',90200)])
    def test_fuel_table_timestamp(self):
        docs=[dict(url='https://baomoi.com/tien-ich-gia-xang-dau.epi',text='Giá xăng dầu Ngày 22-10-2026 15:30 Giá vùng 1 (VNĐ) Giá vùng 2 (VNĐ) Xăng E5 RON 92 25,060 25,560')]
        rows,at=extract_prices(docs,'fuel',self.today)
        self.assertEqual(rows[0]['low'],25560);self.assertEqual(at,'2026-10-22T15:30:00+07:00')
    def test_diesel_sulphur_is_not_a_price(self):
        docs=[dict(url='https://baomoi.com/tien-ich-gia-xang-dau.epi',text='Giá xăng dầu Ngày 22-10-2026 15:30 Giá vùng 1 (VNĐ) Giá vùng 2 (VNĐ) DO 0,001S Mức 5 30,650 31,260')]
        rows,_=extract_prices(docs,'fuel',self.today)
        self.assertEqual([(q['id'],q['low']) for q in rows],[('dov',31260)])
    def test_provider_failure_preserves_report_updates_prices(self):
        day=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
        docs=[dict(url='https://giacaphe.com/gia-ca-phe-noi-dia/',text=f'Giá cà phê hôm nay ngày {day:%d/%m/%Y} Đắk Lắk 90,800 -600')]
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'agri.json';old={'generatedAt':'2026-01-01T00:00:00+00:00','expiresAt':'2026-01-01T08:00:00+00:00','report':{'reason':'previous report'},'fingerprint':'old'}
            p.write_text(json.dumps({'schema':1,'cau':[{'keep':True}],'sharedMarket':{'schema':1,'groups':{'coffee':old},'history':[]}}))
            with patch.dict(os.environ,{'OPENROUTER_API_KEY':'test-only'}),patch('market.collect',return_value=docs),patch('market.get',side_effect=TimeoutError('test timeout')):run(p,['coffee'])
            out=json.loads(p.read_text());shared=out['sharedMarket']
            self.assertEqual(out['cau'],[{'keep':True}]);self.assertEqual(shared['groups']['coffee'],old)
            self.assertEqual(shared['prices']['coffee']['quotes'][0]['low'],90800)
            self.assertEqual(shared['budget']['requests'],1)

if __name__ == '__main__': unittest.main()
