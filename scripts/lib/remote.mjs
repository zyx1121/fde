// Executed by the remote machine's Python 3; project data is passed as an argv JSON value.
export const REMOTE_SCRIPT = String.raw`
import datetime, gzip, hashlib, json, os, pathlib, secrets, shutil, subprocess, sys

def run(argv):
    return subprocess.run(argv, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def directory(raw, must_exist=True):
    p = pathlib.Path(raw)
    resolved = p.resolve()
    if str(resolved) != raw or resolved in (pathlib.Path('/'), pathlib.Path.home()) or len(resolved.parts) < 4:
        raise ValueError('Refusing a noncanonical, home, or system directory: ' + raw)
    if must_exist and not resolved.is_dir():
        raise ValueError('Directory does not exist: ' + raw)
    return resolved

def main():
    operation, p = sys.argv[1], json.loads(sys.argv[2])
    source = directory(p['remotePath'])
    if not (source / 'package.json').is_file():
        raise ValueError('remotePath must contain package.json for the configured app.')
    if operation == 'validate':
        return {'remotePath': str(source)}
    service = subprocess.run(['systemctl', 'is-active', p['service']], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if operation == 'status':
        database = None
        if p.get('database'):
            result = subprocess.run(['pg_isready', '-q', '-d', p['database']], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            database = result.returncode == 0
        return {'remotePath':str(source), 'service':service.stdout.strip() or 'unknown',
                'databaseReady':database, 'diskFreeBytes':shutil.disk_usage(source).free}
    if operation != 'snapshot':
        raise ValueError('Unknown remote operation')
    backups = directory(p['backupPath'], must_exist=False)
    uploads = directory(p['uploadsPath']) if p.get('uploadsPath') else None
    for a, b in [(source, backups)] + ([(source, uploads), (backups, uploads)] if uploads else []):
        if a == b or a in b.parents or b in a.parents:
            raise ValueError('Source, uploads and backup directories must be separate.')
    os.umask(0o077)
    backups.mkdir(parents=True, exist_ok=True)
    snapshot_id = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + secrets.token_hex(4)
    partial = backups / (snapshot_id + '.partial')
    complete = backups / snapshot_id
    partial.mkdir(mode=0o700)
    run(['tar', '--exclude=node_modules', '--exclude=.next', '--exclude=.git', '--exclude=output',
         '-czf', str(partial/'source.tgz'), '-C', str(source.parent), source.name])
    if p.get('database'):
        import tempfile
        with tempfile.TemporaryFile() as err, gzip.open(partial/'database.sql.gz', 'wb') as out:
            proc = subprocess.Popen(['sudo', '-n', '-u', 'postgres', 'pg_dump', '--dbname=' + p['database']],
                                    stdout=subprocess.PIPE, stderr=err)
            shutil.copyfileobj(proc.stdout, out)
            proc.stdout.close()
            code = proc.wait()
            if code:
                err.seek(0)
                raise RuntimeError('pg_dump failed: ' + err.read(3000).decode(errors='replace'))
    if uploads:
        run(['tar', '-czf', str(partial/'uploads.tgz'), '-C', str(uploads.parent), uploads.name])
    artifacts = []
    for artifact in sorted(partial.iterdir()):
        digest = hashlib.sha256()
        with artifact.open('rb') as stream:
            for block in iter(lambda:stream.read(1024*1024), b''):
                digest.update(block)
        artifacts.append({'file':artifact.name, 'bytes':artifact.stat().st_size, 'sha256':digest.hexdigest()})
    manifest = {'id':snapshot_id, 'project':p['name'], 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'remotePath':str(source), 'database':p.get('database'), 'uploadsPath':p.get('uploadsPath'),
                'artifacts':artifacts, 'consistency':'online; source, database and uploads captured sequentially'}
    (partial/'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    partial.rename(complete)
    return {'snapshotId':snapshot_id, 'path':str(complete), 'artifacts':artifacts,
            'consistency':manifest['consistency']}

try:
    print(json.dumps({'ok':True, 'data':main()}))
except Exception as error:
    detail = error.stderr.decode(errors='replace')[:3000] if isinstance(error, subprocess.CalledProcessError) else str(error)
    print(json.dumps({'ok':False, 'error':detail}))
`;
