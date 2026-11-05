import argparse
import copy
import datetime
import hashlib
import json
import gzip
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent
OLD = pathlib.Path('/Users/gamer/Documents/school/thesis/experiments')
TABLES = ['employees','shift_schedules','shift_schedule_personel','monitoring_transactions','monitoring_transaction_details','toll_volume_revenue','toll_traffic_volumes','incidents','incident_actions','accident_reports','inspection_schedules','inspection_schedule_assets','inspections','inspection_elements','inspection_items']
MOVED = {'T2-C1','T5-C1','T7-C2','T1-C2'}

def sql(text):
    result = subprocess.run(['ssh','-o','BatchMode=yes','gamingmachine','sudo -n -u postgres psql -X -qAt -v ON_ERROR_STOP=1 -p 54432 -d hkatrom_bi'],input=text,text=True,capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout

def query(text):
    return json.loads(sql('BEGIN READ ONLY;'+text+';COMMIT;'))

def save(name, value):
    content=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
    if name in ['target-catalog.json','target-before.json','target-after.json']:
        with gzip.open(ROOT/'evidence'/(name+'.gz'),'wb') as stream: stream.write(content)
    else: (ROOT/name).write_bytes(content)

def literal(value):
    return "'"+str(value).replace("'","''")+"'"

def rename(value, mapping, moved):
    if isinstance(value, dict):
        return {k: rename(v,mapping,moved) for k,v in value.items()}
    if isinstance(value, list):
        return [rename(v,mapping,moved) for v in value]
    if type(value) is int:
        return mapping.get(value,value)
    if isinstance(value,str) and moved:
        return value.replace('2026','2030')
    return value

def catalog():
    return query("SELECT json_build_object('columns',(SELECT json_agg(to_jsonb(c)) FROM information_schema.columns c WHERE table_schema='public'),'foreign_keys',(SELECT json_agg(json_build_object('table',c.conrelid::regclass::text,'column',a.attname,'target',c.confrelid::regclass::text)) FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.connamespace='public'::regnamespace))")

def read_data():
    masters=['toll_sections','toll_gates','m_section_shifts','m_vehicle_class','m_accident_attributes','maintenance_asset_types','view_section_spm_sla']
    parts=[]
    for t in TABLES+masters:
        condition=''
        if t in TABLES:
            if t=='employees': condition=' WHERE id BETWEEN 1600000000 AND 1616000000'
            elif t in ['monitoring_transactions','toll_volume_revenue','incidents','inspections','shift_schedules','inspection_schedules']:
                field={'incidents':'accident_date','inspection_schedules':'start_date'}.get(t,'date')
                condition=f" WHERE {field} BETWEEN '2026-01-01' AND '2030-12-31'"
            else:
                condition=' WHERE id BETWEEN 1600000000 AND 1616000000'
                parents={'monitoring_transaction_details':('transaction_id','monitoring_transactions','date'),'toll_traffic_volumes':('transaction_id','toll_volume_revenue','date'),'incident_actions':('incident_id','incidents','accident_date'),'accident_reports':('incident_id','incidents','accident_date'),'inspection_schedule_assets':('schedule_id','inspection_schedules','start_date'),'inspection_elements':('inspection_id','inspections','date'),'shift_schedule_personel':('schedule_id','shift_schedules','date')}
                if t in parents:
                    column,parent,date=parents[t]
                    condition+=f" OR {column} IN (SELECT id FROM public.{parent} WHERE {date} BETWEEN '2026-01-01' AND '2030-12-31')"
                if t=='inspection_items':
                    condition+=" OR inspection_element_id IN (SELECT e.id FROM public.inspection_elements e JOIN public.inspections i ON i.id=e.inspection_id WHERE i.date BETWEEN '2026-01-01' AND '2030-12-31')"
        parts.append(f"SELECT '{t}' name,coalesce(json_agg(to_jsonb(t)),'[]') rows FROM public.{t} t{condition}")
    return query('SELECT json_object_agg(name,rows) FROM ('+' UNION ALL '.join(parts)+') x')

def prepare():
    source=json.loads(gzip.decompress((ROOT/'evidence/source-snapshots.json.gz').read_bytes()))
    cat=catalog();save('target-catalog.json',cat)
    columns={}
    for col in cat['columns']: columns.setdefault(col['table_name'],{})[col['column_name']]=col
    fks={(f['table'],f['column']):f['target'] for f in cat['foreign_keys']}
    fks.update({('inspections','schedule_id'):'inspection_schedules',('shift_schedules','shift_id'):'m_section_shifts'})
    combined={t:[] for t in TABLES};cases=[];remaps={}
    historical={}
    for path in sorted((OLD/'runs').glob('*/request.json')):
        req=json.loads(path.read_text()); c=req['case_id']
        expected=json.loads((path.parent/'expected_result.json').read_text())
        if c in historical:
            assert historical[c][1]==expected, f'Historical expected answers disagree: {c}'
        historical[c]=(req,expected)
    supplementary=json.loads((OLD/'supplementary/pass1/fixtures/expected-production.json').read_text())
    for index,(case,rows) in enumerate(source.items(),1):
        mappings={t:{r['id']:1600000000+index*100000+i for i,r in enumerate(rows.get(t,[]),1)} for t in TABLES}
        mappings['employees']={900000001:1600000001}
        flat={}
        for m in mappings.values():
            for old,new in m.items():
                if old in flat: assert flat[old]==new
                flat[old]=new
        remaps[case]=mappings
        for table in TABLES:
            for original in rows.get(table,[]):
                row=copy.deepcopy(original)
                for field,value in list(row.items()):
                    if field not in columns[table]:
                        assert value is None, (table,field,value)
                        del row[field];continue
                    if field=='id': row[field]=mappings[table][value]
                    elif (table,field) in fks and value is not None:
                        target=fks[(table,field)]
                        row[field]=mappings.get(target,{}).get(value,value)
                    if case in MOVED and isinstance(row.get(field),str) and re.match(r'^2026-\d\d-\d\d',row[field]): row[field]=row[field].replace('2026','2030',1)
                if table=='employees' and combined[table]:
                    assert row==combined[table][0];continue
                combined[table].append(row)
        if case in historical:
            req,expected=historical[case]
            definition=json.loads((OLD/'fixtures/manifests'/f'{case}.json').read_text())['case']
            prompt=req['submitted_message']
        else:
            d=json.loads((OLD/'supplementary/pass1/fixtures/cases'/f'{case}.json').read_text())
            definition={**d['definition'],'section_alias':d['definition']['section']}
            expected=supplementary[case]
            schema=json.loads((OLD.parent/d['schema_path']).read_text())
            prompt=d['prompt']+'\n\nKirim tepat satu objek JSON, tanpa Markdown. Ikuti skema berikut:\n'+json.dumps(schema,ensure_ascii=False)
        definition=rename(definition,flat,case in MOVED)
        prompt=rename(prompt,flat,case in MOVED)
        prompt+='\n\nGunakan tabel aktual: m_vehicle_class (golongan kendaraan), m_accident_attributes (atribut kecelakaan), maintenance_asset_types (master aset inspeksi), dan view_section_spm_sla (konfigurasi efektif; filter code kecepatan-transaksi-1 sampai kecepatan-transaksi-5). accident_causes_ids adalah array JSON; hitung setiap kemunculan termasuk duplikat. Gunakan konfigurasi yang tersedia saat ini. Bandingkan durasi sebelum pembulatan; bulatkan hasil durasi dua desimal dengan nilai tengah menjauh dari nol. Untuk T1 gunakan seluruh tipe detail tidak null; evaluasi SPM/SLA menggunakan detail type=booth per gardu. LHR dibulatkan ke integer terdekat dengan nilai tengah menjauh dari nol. Urutkan array: golongan berdasarkan ID; bulan kronologis; insiden berdasarkan tanggal lalu ID; penyebab/aset berdasarkan jumlah menurun lalu ID; evaluasi berdasarkan nomor gardu lalu kode; kegagalan berdasarkan tanggal, ID monitoring, nomor gardu, kode; indikator berdasarkan kode.'
        cases.append({'name':case,'definition':definition,'prompt':prompt,'historicalExpected':rename(expected,flat,case in MOVED)})
    save('rows.json',combined);save('cases-prepared.json',cases);save('id-map.json',remaps)
    print('Prepared',len(cases),'cases,',sum(map(len,combined.values())),'rows')


def check_references(rows, cat):
    source=json.loads(gzip.decompress((ROOT/'evidence/source-snapshots.json.gz').read_bytes()))
    checks=[]
    for fk in cat['foreign_keys']:
        t,col,target=fk['table'],fk['column'],fk['target']
        if t not in rows: continue
        values={r[col] for r in rows[t] if r.get(col) is not None}
        own={r['id'] for r in rows.get(target,[])}
        values-=own
        if not values: continue
        checks.append(f"SELECT '{t}.{col}' name,count(*)=0 ok FROM (VALUES "+','.join(f'({v})' for v in sorted(values))+f') requested(id) LEFT JOIN public.{target} actual USING(id) WHERE actual.id IS NULL')
    result=query('SELECT json_agg(x) FROM ('+' UNION ALL '.join(checks)+') x')
    assert all(r['ok'] for r in result),result
    save('reference-checks.json',result)


def load(commit=False):
    from calculate import calculate
    rows=json.loads((ROOT/'rows.json').read_text());cat=catalog();check_references(rows,cat)
    target=read_data();save('target-before.json',target)
    cases=json.loads((ROOT/'cases-prepared.json').read_text())
    proposed={**target,**{t:target[t]+[r for r in rows[t] if r['id'] not in {x['id'] for x in target[t]}] for t in TABLES}}
    changes=[]
    for case in cases:
        expected=calculate(case,proposed)
        if expected!=case['historicalExpected']: changes.append(case['name'])
        case['expectedResult']=json.dumps(expected,ensure_ascii=False,separators=(',',':'))
    save('cases.json',cases);save('expected-changed.json',changes)
    statements=['BEGIN;','SET LOCAL lock_timeout=\'10s\';','LOCK TABLE '+','.join('public.'+t for t in TABLES)+' IN SHARE ROW EXCLUSIVE MODE;']
    baseline=[]
    for t in TABLES:
        ids=','.join(str(r['id']) for r in rows[t]) or 'NULL'
        baseline.append(f"SELECT '{t}' name,count(*) count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) digest FROM public.{t} t WHERE id NOT IN ({ids})")
    snapshot='SELECT jsonb_object_agg(name,to_jsonb(x)-\'name\') FROM ('+' UNION ALL '.join(baseline)+') x'
    statements.append('CREATE TEMP TABLE existing_baseline AS '+snapshot.replace('SELECT jsonb_object_agg','SELECT jsonb_object_agg',1)+';')
    for t in TABLES:
        if not rows[t]: continue
        existing={r['id']:r for r in target[t]}
        for r in rows[t]:
            if r['id'] in existing:
                assert all(existing[r['id']].get(k)==v for k,v in r.items()),f'Existing ID mismatch: {t} {r["id"]}'
        columns=','.join('"'+c+'"' for c in rows[t][0])
        payload=literal(json.dumps(rows[t],ensure_ascii=False))
        statements.append(f'INSERT INTO public.{t} ({columns}) SELECT {columns} FROM json_populate_recordset(NULL::public.{t},{payload}::json) ON CONFLICT (id) DO NOTHING;')
    statements.append("DO $check$ BEGIN IF ("+snapshot+") IS DISTINCT FROM (SELECT * FROM existing_baseline) THEN RAISE EXCEPTION 'Existing rows changed'; END IF; END $check$;")
    parts=[]
    for t in TABLES:
        ids=','.join(str(r['id']) for r in rows[t]) or 'NULL'
        parts.append(f"SELECT '{t}' name,coalesce(json_agg(to_jsonb(t) ORDER BY id),'[]') rows FROM public.{t} t WHERE id IN ({ids})")
    statements.append('SELECT json_object_agg(name,rows) FROM ('+' UNION ALL '.join(parts)+') x;')
    statements.append('COMMIT;' if commit else 'ROLLBACK;')
    (ROOT/('load.sql' if commit else 'dry-run.sql')).write_text('\n'.join(statements)+'\n')
    loaded=json.loads(sql('\n'.join(statements)))
    for t in TABLES:
        actual={r['id']:r for r in loaded[t]}
        assert len(actual)==len(rows[t]),t
        for row in rows[t]: assert all(actual[row['id']].get(k)==v for k,v in row.items()),(t,row['id'])
    actual_data={**target,**{t:[r for r in target[t] if r['id'] not in {x['id'] for x in loaded[t]}]+loaded[t] for t in TABLES}}
    for case in cases: assert calculate(case,actual_data)==json.loads(case['expectedResult']),case['name']
    save('verification.json',{'committed':commit,'cases_verified':[c['name'] for c in cases],'inserted_rows':{t:len(r) for t,r in loaded.items()},'historical_answer_changes':changes,'existing_rows_unchanged':True,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
    if commit: save('target-after.json',read_data())
    print('COMMITTED' if commit else 'ROLLED BACK',len(cases),'case answers verified; existing rows unchanged; changed historical answers:',changes)

def verify():
    from calculate import calculate
    data=read_data()
    rows=json.loads((ROOT/'rows.json').read_text())
    cases=json.loads((ROOT/'cases.json').read_text())
    for table,expected in rows.items():
        actual={r['id']:r for r in data[table]}
        for row in expected:
            assert row['id'] in actual,(table,row['id'])
            assert all(actual[row['id']].get(k)==v for k,v in row.items()),(table,row['id'])
    for case in cases:
        assert calculate(case,data)==json.loads(case['expectedResult']),case['name']
    save('live-verification.json',{'cases_verified':[c['name'] for c in cases],'fixture_rows_verified':sum(len(r) for r in rows.values()),'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
    print('Live verification passed: 237 fixture rows and all 15 expected answers.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['prepare','check','load','verify']);args=parser.parse_args()
    if args.command=='prepare': prepare()
    elif args.command=='verify': verify()
    else: load(args.command=='load')
