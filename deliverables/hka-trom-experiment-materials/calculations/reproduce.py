import calendar
import datetime
import json
import operator
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def rounded(value, places=2):
    return float((Decimal(value.numerator) / Decimal(value.denominator)).quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP))


def calculate(case, data):
    c = case['definition']
    task = case['name'].split('-')[0]
    section = next(s for s in data['toll_sections'] if s['short_name'] == c['section_alias'])
    sid = section['id']
    base = {'section_id': sid, 'section_name': section['section_name']}
    period = {k: c[k] for k in ['start', 'end'] if k in c}

    def scoped(table, scope, field='date'):
        return [r for r in data[table] if r['section_id'] == sid and r.get(field) is not None and scope['start'] <= r[field] <= scope['end']]

    def durations(ids, booth=None):
        return [Fraction(str(r['transaction_duration'])) for r in data['monitoring_transaction_details'] if r['transaction_id'] in ids and r['transaction_duration'] is not None and (booth is None or (r['type'] == 'booth' and r['booth_number'] == booth))]

    if task == 'T1':
        values = durations({r['id'] for r in scoped('monitoring_transactions', period)})
        return {**base, 'period': period, 'average_transaction_duration': rounded(sum(values) / len(values)) if values else 0, 'unit': 'second'}

    if task in ['T2', 'T3']:
        classes = sorted([v for v in data['m_vehicle_class'] if v['active']], key=lambda r: r['id'])

        def traffic(scope):
            ids = {r['id'] for r in scoped('toll_volume_revenue', scope)}
            totals = Counter()
            for r in data['toll_traffic_volumes']:
                if r['transaction_id'] in ids:
                    totals[r['vehicle_class_id']] += r['total'] or 0
            days = (datetime.date.fromisoformat(scope['end']) - datetime.date.fromisoformat(scope['start'])).days + 1
            rows = [{'vehicle_class_id': v['id'], 'vehicle_class_name': v['name'], 'volume': totals[v['id']], 'lhr': int(rounded(Fraction(totals[v['id']], days), 0))} for v in classes]
            return rows, days

        if task == 'T2':
            rows, days = traffic(period)
            total = sum(r['volume'] for r in rows)
            return {**base, 'period': period, 'total_volume': total, 'lhr': int(rounded(Fraction(total, days), 0)), 'by_vehicle_class': [{k: v for k, v in r.items() if k != 'lhr'} for r in rows]}

        months = []
        date = datetime.date.fromisoformat(period['start']).replace(day=1)
        while str(date) <= period['end']:
            month = str(date)[:7]
            end = f'{month}-{calendar.monthrange(date.year, date.month)[1]}'
            rows, _ = traffic({'start': max(str(date), period['start']), 'end': min(end, period['end'])})
            months.append({'month': month, 'by_vehicle_class': rows})
            date = datetime.date(date.year + date.month // 12, date.month % 12 + 1, 1)
        return {**base, 'months': months}

    if task == 'T4':
        incidents = scoped('incidents', period, 'accident_date')
        unresolved = []
        for row in incidents:
            actions = [a for a in data['incident_actions'] if a['incident_id'] == row['id']]
            if not actions or any(a['stage'] != 100 for a in actions):
                unresolved.append({'incident_id': row['id'], 'incident_date': row['accident_date'], 'status': 'under_investigation'})
        unresolved.sort(key=lambda r: (r['incident_date'], r['incident_id']))
        return {**base, 'period': period, 'total_incidents': len(incidents), 'under_investigation_count': len(unresolved), 'closed_count': len(incidents) - len(unresolved), 'unresolved_incidents': unresolved}

    if task == 'T5':
        ids = {r['id'] for r in scoped('incidents', period, 'accident_date') if r['is_accident']}
        counts = Counter()
        for row in data['accident_reports']:
            if row['incident_id'] in ids:
                causes = row['accident_causes_ids']
                counts.update(json.loads(causes) if isinstance(causes, str) else causes or [])
        names = {r['id']: r['name'] for r in data['m_accident_attributes']}
        return {**base, 'period': period, 'total_cause_assignments': sum(counts.values()), 'causes': [{'cause_id': i, 'cause_name': names[i], 'assignment_count': n} for i, n in sorted(counts.items(), key=lambda x: (-x[1], x[0]))]}

    if task == 'T6':
        inspections = {r['id']: r for r in scoped('inspections', period)}
        elements = {r['id']: r for r in data['inspection_elements'] if r['inspection_id'] in inspections}
        assignments = {r['id']: r for r in data['inspection_schedule_assets']}
        assets = {r['id']: r['name'] for r in data['maintenance_asset_types']}
        items = [r for r in data['inspection_items'] if r['inspection_element_id'] in elements and r['is_damage']]
        counts = Counter()
        for row in items:
            inspection = inspections[elements[row['inspection_element_id']]['inspection_id']]
            counts[assignments[inspection['schedule_asset_id']]['asset_id']] += 1
        return {**base, 'period': period, 'damaged_item_count': len(items), 'by_damage_category': {k: sum(r['damage_category'] == k for r in items) for k in ['r1', 'r2', 'r3']}, 'by_repair_priority': {k: sum(r['repair_priority'] == k for r in items) for k in ['p1', 'p2']}, 'by_asset': [{'asset_id': i, 'asset_name': assets[i], 'damaged_item_count': n} for i, n in sorted(counts.items(), key=lambda x: (-x[1], x[0]))]}

    rules = sorted([r for r in data['view_section_spm_sla'] if r['section_id'] == sid and r['code'] in [f'kecepatan-transaksi-{i}' for i in range(1, 6)]], key=lambda r: r['code'])
    if len(rules) != 5:
        raise ValueError(f'{case["name"]}: expected five effective speed rules')

    def evaluate(reports):
        results = []
        ops = {'<': operator.lt, '<=': operator.le, '=': operator.eq, '==': operator.eq, '!=': operator.ne, '<>': operator.ne, '>': operator.gt, '>=': operator.ge}
        for report in reports:
            booths = sorted({d['booth_number'] for d in data['monitoring_transaction_details'] if d['transaction_id'] == report['id'] and d['type'] == 'booth' and d['transaction_duration'] is not None})
            for booth in booths:
                values = durations({report['id']}, booth)
                mean = sum(values) / len(values)
                for rule in rules:
                    compare = ops[rule['operator']]
                    applicable = rule['is_applicable']
                    results.append({'monitoring_transaction_id': report['id'], 'date': report['date'], 'gate_id': report['gate_id'], 'booth_number': booth, 'spm_code': rule['code'], 'average_transaction_duration': rounded(mean), 'spm_parameter': rule['spm_parameter'], 'spm_passed': compare(mean, Fraction(str(rule['spm_parameter']))), 'sla_applicable': applicable, 'sla_parameter': rule['sla_parameter'] if applicable else None, 'sla_passed': compare(mean, Fraction(str(rule['sla_parameter']))) if applicable else None})
        return results

    def summary(events):
        result = []
        for rule in rules:
            rows = [r for r in events if r['spm_code'] == rule['code']]
            if not rows:
                raise ValueError(f'{case["name"]}: no evaluations for {rule["code"]}')
            spm = sum(not r['spm_passed'] for r in rows)
            sla = sum(r['sla_passed'] is False for r in rows)
            applicable = rule['is_applicable']
            result.append({'spm_code': rule['code'], 'spm_evaluation_count': len(rows), 'spm_failed_count': spm, 'spm_period_status': 'fail' if spm else 'pass', 'sla_applicable': applicable, 'sla_evaluation_count': len(rows) if applicable else 0, 'sla_failed_count': sla, 'sla_period_status': ('fail' if sla else 'pass') if applicable else 'not_applicable'})
        return result

    if task == 'T7':
        gate = next(g['id'] for g in data['toll_gates'] if g['section_id'] == sid and g['gate_name'] == c['gate_name'])
        shift = c['shift']
        schedules = {r['id'] for r in data['shift_schedules'] if r['section_id'] == sid and r['date'] == c['date'] and r['shift'] == shift}
        reports = [r for r in data['monitoring_transactions'] if r['section_id'] == sid and r['date'] == c['date'] and r['gate_id'] == gate and r['schedule_id'] in schedules]
        if len(reports) != 1:
            raise ValueError(f'{case["name"]}: expected one report for section, gate, date, and shift')
        report = reports[0]
        name = next(g['gate_name'] for g in data['toll_gates'] if g['id'] == gate)
        return {'monitoring_transaction_id': report['id'], **base, 'gate_id': gate, 'gate_name': name, 'date': c['date'], 'shift': shift, 'evaluations': [{k: v for k, v in r.items() if k not in ['monitoring_transaction_id', 'date', 'gate_id']} for r in evaluate(reports)]}

    if task == 'T8':
        events = evaluate(scoped('monitoring_transactions', period))
        failures = [r for r in events if not r['spm_passed'] or r['sla_passed'] is False]
        failures.sort(key=lambda r: (r['date'], r['monitoring_transaction_id'], r['booth_number'], r['spm_code']))
        return {**base, 'period': period, 'failures': failures, 'indicators': summary(events)}

    states = [summary(evaluate(scoped('monitoring_transactions', c[p]))) for p in ['period_a', 'period_b']]
    indicators = []
    for a, b in zip(*states):
        def state(row):
            return {k.replace('_period_status', '_status'): v for k, v in row.items() if k not in ['spm_code', 'sla_applicable']}
        indicators.append({'spm_code': a['spm_code'], 'period_a': state(a), 'period_b': state(b), 'spm_transition': a['spm_period_status'] + '_to_' + b['spm_period_status'], 'sla_transition': a['sla_period_status'] + '_to_' + b['sla_period_status']})
    return {**base, 'period_a': c['period_a'], 'period_b': c['period_b'], 'indicators': indicators}


def main():
    bundle = json.loads((ROOT / 'calculation-inputs.json').read_text())
    cases = json.loads((ROOT / 'case-definitions.json').read_text())['cases']
    results = [{'caseId': case['caseId'], 'result': calculate(case, bundle['data'])} for case in cases]
    print(json.dumps({'sourceDatabase': bundle['sourceDatabase'], 'schema': bundle['schema'], 'inputSnapshot': bundle['capturedAt'], 'results': results}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
