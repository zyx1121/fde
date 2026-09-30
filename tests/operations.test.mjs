import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, realpath, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { operate } from '../scripts/lib/operations.mjs';
import { run } from '../scripts/lib/process.mjs';

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "fde test's-")));
  t.after(() => rm(root, {recursive:true, force:true}));
  const p = {mode:'demo', workspace:path.join(root,'local'), sshHost:'fde-test',
    remotePath:path.join(root,'remote'), service:'demo.service',
    backupPath:path.join(root,'backups'), uploadsPath:path.join(root,'uploads'),
    database:'demo', sync:{delete:true}};
  for (const dir of [p.workspace,p.remotePath,p.uploadsPath,path.join(root,'bin')]) await mkdir(dir);
  for (const dir of [p.workspace,p.remotePath]) await writeFile(path.join(dir,'package.json'), '{}');
  await writeFile(path.join(p.remotePath,'.env.local'), 'PRIVATE=remote-secret\n');
  await writeFile(path.join(p.uploadsPath,'sample.txt'), 'customer upload');
  const commands = {
    ssh:`#!/usr/bin/env python3
import os, sys
args=sys.argv[1:]
while args and args[0].startswith('-'):
    if args[0] == '-o': args=args[2:]
    else: args=args[1:]
assert args.pop(0) == 'fde-test'
os.execvp('sh', ['sh', '-c', ' '.join(args)])
`,
    systemctl:'#!/bin/sh\nprintf "active\\n"\n',
    pg_isready:'#!/bin/sh\nexit 0\n',
    sudo:'#!/bin/sh\nshift 3\nexec "$@"\n',
    pg_dump:`#!/usr/bin/env python3
import os, sys
if os.environ.get('FDE_TEST_PG_FAIL'):
    sys.stderr.write('simulated database failure')
    sys.exit(7)
print('CREATE TABLE preserved (id integer);')
`
  };
  for (const [name,content] of Object.entries(commands)) await writeFile(path.join(root,'bin',name),content,{mode:0o755});
  const file = path.join(root,'config.json');
  const save = () => writeFile(file, JSON.stringify({version:1,defaultProject:'demo',projects:{demo:p}}));
  await save();
  return {root,p,file,save,env:{...process.env,FDE_CONFIG_PATH:file,PATH:path.join(root,'bin')+path.delimiter+process.env.PATH}};
}

test('status reports remote and HTTP health without changing source or auth', async t => {
  const f = await fixture(t);
  const server = createServer((req,res) => {res.writeHead(200);res.end('healthy');}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  f.p.healthUrl = 'http://127.0.0.1:' + server.address().port + '/health';
  await f.save();
  const result = await operate('status',{},f.env);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.healthy,true);
  assert.equal(result.runtime.service,'active');
  assert.equal(result.runtime.databaseReady,true);
  assert.equal(result.endpoint.status,200);
  assert.equal(await readFile(path.join(f.p.remotePath,'.env.local'),'utf8'),'PRIVATE=remote-secret\n');
});

test('sync handles quoted paths, mirrors source, protects env/dependencies and uploads', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.p.workspace,'page.tsx'),'new source');
  await writeFile(path.join(f.p.workspace,'.env.local'),'PRIVATE=wrong\n');
  await writeFile(path.join(f.p.remotePath,'old.tsx'),'obsolete');
  await mkdir(path.join(f.p.remotePath,'node_modules'));
  await writeFile(path.join(f.p.remotePath,'node_modules','installed'),'keep');
  const result = await operate('sync',{},f.env);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(await readFile(path.join(f.p.remotePath,'page.tsx'),'utf8'),'new source');
  await assert.rejects(stat(path.join(f.p.remotePath,'old.tsx')), {code:'ENOENT'});
  assert.equal(await readFile(path.join(f.p.remotePath,'.env.local'),'utf8'),'PRIVATE=remote-secret\n');
  assert.equal(await readFile(path.join(f.p.remotePath,'node_modules','installed'),'utf8'),'keep');
  assert.equal(await readFile(path.join(f.p.uploadsPath,'sample.txt'),'utf8'),'customer upload');
});

test('sync dry run is nonmutating and production sync is rejected', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.p.workspace,'page.tsx'),'new');
  const preview = await operate('sync',{dryRun:true},f.env);
  assert.equal(preview.ok,true,JSON.stringify(preview));
  assert.equal(preview.dryRun,true);
  await assert.rejects(stat(path.join(f.p.remotePath,'page.tsx')),{code:'ENOENT'});
  f.p.mode='production';
  await f.save();
  const blocked=await operate('sync',{},f.env);
  assert.equal(blocked.error.code,'PRODUCTION_SYNC_DISABLED');
});

test('snapshots include source/env, database and uploads with private permissions and verified hashes', async t => {
  const f = await fixture(t);
  const result = await operate('snapshot',{},f.env);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(result.artifacts.map(x=>x.file),['database.sql.gz','source.tgz','uploads.tgz']);
  assert.equal((await stat(result.path)).mode & 0o777,0o700);
  const manifest=JSON.parse(await readFile(path.join(result.path,'manifest.json'),'utf8'));
  const {createHash}=await import('node:crypto');
  for (const item of manifest.artifacts) {
    const full=path.join(result.path,item.file);
    assert.equal((await stat(full)).mode & 0o077,0);
    assert.equal(createHash('sha256').update(await readFile(full)).digest('hex'),item.sha256);
  }
  const source=await run('tar',['-tzf',path.join(result.path,'source.tgz')]);
  assert.match(source.stdout,/\.env\.local/);
  const {gunzipSync}=await import('node:zlib');
  assert.match(gunzipSync(await readFile(path.join(result.path,'database.sql.gz'))).toString(),/CREATE TABLE preserved/);
  const next=await operate('snapshot',{},f.env);
  assert.equal(next.ok,true);
  assert.notEqual(next.snapshotId,result.snapshotId);
});

test('failed pg_dump cannot produce a completed snapshot', async t => {
  const f=await fixture(t);
  const result=await operate('snapshot',{}, {...f.env,FDE_TEST_PG_FAIL:'1'});
  assert.equal(result.ok,false);
  assert.match(result.error.message,/simulated database failure/);
  const dirs=await readdir(f.p.backupPath);
  assert.equal(dirs.length,1);
  assert.ok(dirs[0].endsWith('.partial'));
  await assert.rejects(stat(path.join(f.p.backupPath,dirs[0],'manifest.json')),{code:'ENOENT'});
});

test('config errors and unknown arguments are actionable and reject unsafe targets',async t=>{
  const f=await fixture(t);
  assert.equal((await operate('status',{}, {...f.env,FDE_CONFIG_PATH:path.join(f.root,'absent')})).error.code,'CONFIG_NOT_FOUND');
  assert.equal((await operate('status',{project:'missing'},f.env)).error.code,'INVALID_CONFIG');
  assert.equal((await operate('status',{command:'echo x'},f.env)).error.code,'INVALID_ARGUMENTS');
  f.p.backupPath=path.join(f.p.remotePath,'backups');
  await f.save();
  assert.equal((await operate('snapshot',{},f.env)).error.code,'INVALID_CONFIG');
  f.p.backupPath=path.join(f.root,'backups');
  f.p.sshHost='-oProxyCommand=bad';
  await f.save();
  assert.equal((await operate('sync',{},f.env)).error.code,'INVALID_CONFIG');
});

test('default copy mode preserves remote-only source files',async t=>{
  const f=await fixture(t);
  delete f.p.sync;
  await f.save();
  await writeFile(path.join(f.p.remotePath,'remote-only.txt'),'keep');
  const result=await operate('sync',{},f.env);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.mirror,false);
  assert.equal(await readFile(path.join(f.p.remotePath,'remote-only.txt'),'utf8'),'keep');
});
