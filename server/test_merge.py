import unittest
from merge_feed import merge


class MergeTests(unittest.TestCase):
    def test_newer_result_preserves_legacy_and_unrelated_group(self):
        current = {'cau': [1], 'sharedMarket': {'groups': {'gold': {'generatedAt': '2026-10-24T02:00:00+00:00'}}, 'budget': {'day': '2026-10-24', 'requests': 12}}}
        result = {'cau': [], 'sharedMarket': {'groups': {'coffee': {'generatedAt': '2026-10-24T01:00:00+00:00'}}, 'budget': {'day': '2026-10-24', 'requests': 6}}}
        out = merge(current, result)
        self.assertEqual(out['cau'], [1])
        self.assertEqual(set(out['sharedMarket']['groups']), {'gold', 'coffee'})
        self.assertEqual(out['sharedMarket']['budget']['requests'], 12)

    def test_stale_result_does_not_revert_report_or_restore_old_error(self):
        current = {'sharedMarket': {'groups': {'coffee': {'generatedAt': '2026-10-24T02:00:00+00:00'}}}}
        result = {'sharedMarket': {'groups': {'coffee': {'generatedAt': '2026-10-24T01:00:00+00:00'}}, 'errors': {'coffee': {'at': '2026-10-24T01:30:00+00:00'}}}}
        out = merge(current, result)['sharedMarket']
        self.assertEqual(out['groups']['coffee']['generatedAt'], '2026-10-24T02:00:00+00:00')
        self.assertNotIn('coffee', out['errors'])
