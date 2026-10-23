"""Merge an updater result onto the latest branch without reverting other data."""
import json
import sys
from pathlib import Path


def merge(current, result):
    remote = current.setdefault('sharedMarket', {'schema': 1})
    incoming = result.get('sharedMarket', {})
    for field, stamp in [('groups', 'generatedAt'), ('prices', 'generatedAt'), ('errors', 'at')]:
        target = remote.setdefault(field, {})
        for family, value in incoming.get(field, {}).items():
            if value.get(stamp, '') >= target.get(family, {}).get(stamp, ''):
                target[family] = value
    for family, report in remote['groups'].items():
        if report.get('generatedAt', '') >= remote['errors'].get(family, {}).get('at', '~'):
            remote['errors'].pop(family, None)
    attempts = remote.setdefault('attemptedAt', {})
    for family, at in incoming.get('attemptedAt', {}).items():
        if at >= attempts.get(family, ''):
            attempts[family] = at
            version = incoming.get('attemptVersions', {}).get(family)
            if version:
                remote.setdefault('attemptVersions', {})[family] = version
    a, b = remote.get('budget', {}), incoming.get('budget', {})
    if b.get('day', '') > a.get('day', ''):
        remote['budget'] = b
    elif b.get('day') == a.get('day'):
        remote['budget'] = dict(a, requests=max(a.get('requests', 0), b.get('requests', 0)))
    rows = {}
    for row in remote.get('history', []) + incoming.get('history', []):
        key = tuple(row.get(k) for k in ['id', 'region', 'grade', 'author', 'day'])
        rows[key] = row
    remote['history'] = sorted(rows.values(), key=lambda x: x['day'])[-900:]
    remote['checkedAt'] = max(remote.get('checkedAt', ''), incoming.get('checkedAt', ''))
    return current


if __name__ == '__main__':
    path = Path(sys.argv[1])
    output = merge(json.loads(path.read_text()), json.loads(Path(sys.argv[2]).read_text()))
    path.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')))
