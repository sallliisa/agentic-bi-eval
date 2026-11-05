import json
import gzip
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent
CASES = ['T1-C1','T1-C2','T2-C1','T3-C1','T4-C1','T5-C1','T6-C1','T7-C1','T7-C2','T7-C3','T7-C4','T8-C1','T8-C2','T9-C1','T9-C2']

def query(host, database, sql):
    command = 'psql -X -qAt -v ON_ERROR_STOP=1 '
    command += '-h /home/deploy/.local/run/postgresql/hkatrom-bi -p 5433 ' if host == 'ciddeploy' else '-p 54432 '
    if host == 'gamingmachine':
        command = 'sudo -n -u postgres ' + command
    result = subprocess.run(['ssh','-o','BatchMode=yes',host,command+'-d '+database],input='BEGIN READ ONLY;\n'+sql+'\nCOMMIT;',text=True,capture_output=True,check=True)
    return json.loads(result.stdout)

snapshots = {}
for case in CASES:
    schema = 'snap_'+case.lower().replace('-','_')
    tables = query('ciddeploy','hkatrom_bi_experiment',f"SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='{schema}';")
    expressions = [f"SELECT '{table}' AS name,(SELECT coalesce(json_agg(to_jsonb(t)),'[]') FROM {schema}.{table} t) AS rows" for table in tables]
    snapshots[case] = query('ciddeploy','hkatrom_bi_experiment','SELECT json_object_agg(name,rows) FROM ('+' UNION ALL '.join(expressions)+') x;')
    print(case, {table:len(rows) for table,rows in snapshots[case].items() if rows}, flush=True)
with gzip.open(ROOT/'evidence/source-snapshots.json.gz','wt') as stream: json.dump(snapshots,stream)
catalog = query('gamingmachine','hkatrom_bi',"SELECT json_agg(to_jsonb(c)) FROM information_schema.columns c WHERE table_schema='public';")
with gzip.open(ROOT/'evidence/target-columns.json.gz','wt') as stream: json.dump(catalog,stream)
