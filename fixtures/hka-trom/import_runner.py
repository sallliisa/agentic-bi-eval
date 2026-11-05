import json
import os
import pathlib
import subprocess
import urllib.parse
import uuid

ROOT=pathlib.Path(__file__).resolve().parent
ENV=ROOT.parents[1]/'apps/api/.env'
config={}
for line in ENV.read_text().splitlines():
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        key,value=line.split('=',1);config[key.strip()]=value.strip().strip('\"\'')
u=urllib.parse.urlsplit(config['DATABASE_URL'])
env={**os.environ,'PGHOST':u.hostname,'PGPORT':str(u.port or 5432),'PGDATABASE':u.path.lstrip('/'),'PGUSER':urllib.parse.unquote(u.username or ''),'PGPASSWORD':urllib.parse.unquote(u.password or ''),'PGCONNECT_TIMEOUT':'10'}

def run(sql):
    result=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],env=env,input=sql,text=True,capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr)
    return result.stdout

def quote(value):return "'"+value.replace("'","''")+"'"

cases=json.loads((ROOT/'cases.json').read_text())
set_id=str(uuid.uuid5(uuid.NAMESPACE_URL,'hka-trom/combined-fixture/v1'))
statements=['BEGIN;',"SET LOCAL lock_timeout='10s';",'LOCK TABLE test_sets,test_cases IN SHARE ROW EXCLUSIVE MODE;']
statements.append(f"INSERT INTO test_sets(id,name,description) VALUES ({quote(set_id)},'HKA TROM — combined fixture v1','15 synthetic cases on gamingmachine/hkatrom_bi. Current app rules; four date moves; unique synthetic IDs.') ON CONFLICT(id) DO NOTHING;")
for i,case in enumerate(cases):
    case_id=str(uuid.uuid5(uuid.UUID(set_id),case['name']));case['runnerCaseId']=case_id
    statements.append('INSERT INTO test_cases(id,set_id,name,prompt,expected_result,position) VALUES ('+','.join([quote(case_id),quote(set_id),quote(case['name']),quote(case['prompt']),quote(case['expectedResult']),str(i)])+') ON CONFLICT(id) DO NOTHING;')
statements.append(f"SELECT json_agg(to_jsonb(c) ORDER BY position) FROM test_cases c WHERE set_id={quote(set_id)};")
preview=json.loads(run('\n'.join(statements+['ROLLBACK;'])))
assert len(preview)==15
for actual,expected in zip(preview,cases):
    assert actual['name']==expected['name'] and actual['prompt']==expected['prompt'] and actual['expected_result']==expected['expectedResult'],expected['name']
loaded=json.loads(run('\n'.join(statements+['COMMIT;'])))
assert [{k:r[k] for k in ['id','set_id','name','prompt','expected_result','position']} for r in loaded]==[{k:r[k] for k in ['id','set_id','name','prompt','expected_result','position']} for r in preview]
(ROOT/'runner-import.json').write_text(json.dumps({'setId':set_id,'name':'HKA TROM — combined fixture v1','caseCount':len(loaded),'caseIds':{r['name']:r['id'] for r in loaded}},indent=2)+'\n')
print('Imported',len(loaded),'cases. Test set:',set_id)
