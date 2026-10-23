import copy
import unittest
from bulletin import compile_report, evidence_pack


class BulletinTests(unittest.TestCase):
    def setUp(self):
        self.docs=[{'id':1,'url':'https://example.org/prices','text':'Ngày 24/10/2026 Đắk Lắk cà phê 90.800 đồng/kg.'}]
        outlook={k:'Nếu thiếu thông tin mới, chưa đủ cơ sở xác định xu hướng.' for k in ['base','up','down','invalidation']}
        self.raw={'direction':'unknown','facts':[{'text':'Cà phê Đắk Lắk 90.800 đồng/kg.','evidenceIds':['1.1']}],'drivers':[], 'shortTerm':outlook,'mediumTerm':outlook,'watch':['Diễn biến giá quốc tế.'],'limits':['Thiếu lịch sử cùng loại.'],'risk':'Giá thu mua khác theo chất lượng.'}
    def test_sources_and_evidence_generated_from_collector(self):
        r=compile_report(self.raw,self.docs,evidence_pack(self.docs))['report']
        self.assertEqual(r['sources'][0]['url'],self.docs[0]['url'])
        self.assertEqual(r['evidence'][0]['quote'],self.docs[0]['text'])
        self.assertIn('[1]',r['reason'])
    def test_invented_numeric_price_rejected(self):
        self.raw['facts'][0]['text']='Giá cà phê tăng lên 95.000 đồng/kg.'
        with self.assertRaises(ValueError):compile_report(self.raw,self.docs,evidence_pack(self.docs))
    def test_forecast_price_and_nonexistent_evidence_rejected(self):
        raw=copy.deepcopy(self.raw);raw['shortTerm']['base']='Nếu tăng lên 95.000 đồng/kg thì bán.'
        with self.assertRaises(ValueError):compile_report(raw,self.docs,evidence_pack(self.docs))
        self.raw['facts'][0]['evidenceIds']=['99.1']
        with self.assertRaises(ValueError):compile_report(self.raw,self.docs,evidence_pack(self.docs))
