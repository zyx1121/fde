import { stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { FdeError, loadProject } from './config.mjs';
import { run, quote, SSH_OPTIONS } from './process.mjs';
import { REMOTE_SCRIPT } from './remote.mjs';

export const PROTECTED = ['.env', '.env.*', 'node_modules', '.next', '.git', 'output', '.playwright-cli', 'tsconfig.tsbuildinfo'];
export async function remote(operation, project, env=process.env) {
  const args = ['python3', '-', operation, JSON.stringify(project)].map(quote).join(' ');
  const {stdout} = await run('ssh', [...SSH_OPTIONS, project.sshHost, args], {
    input:REMOTE_SCRIPT, timeout:operation === 'snapshot' ? 300000 : 30000, env
  });
  let result;
  try { result = JSON.parse(stdout); }
  catch { throw new FdeError('INVALID_REMOTE_RESPONSE', 'Remote Python did not return JSON. Check SSH login output.'); }
  if (!result.ok) throw new FdeError('REMOTE_FAILED', result.error);
  return result.data;
}
async function localWorkspace(p) {
  let resolved;
  try {
    resolved = await realpath(p.workspace);
    if (!(await stat(path.join(resolved, 'package.json'))).isFile()) throw new Error();
  } catch { throw new FdeError('WORKSPACE_NOT_FOUND', 'workspace must be an existing app directory containing package.json: ' + p.workspace); }
  if (resolved === homedir() || resolved.split(path.sep).filter(Boolean).length < 3) throw new FdeError('INVALID_WORKSPACE', 'Refusing a home or system directory.');
  return resolved;
}
async function health(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(10000), redirect:'error'});
    await response.body?.cancel();
    return {url, ok:response.ok, status:response.status};
  } catch { return {url, ok:false, status:null}; }
}
export async function operate(operation, args={}, env=process.env) {
  try {
    if (!['status', 'sync', 'snapshot'].includes(operation)) throw new FdeError('UNKNOWN_OPERATION', 'Supported operations: status, sync, snapshot.');
    if (!args || typeof args !== 'object' || Array.isArray(args) ||
        Object.keys(args).some(k => !['project', ...(operation === 'sync' ? ['dryRun'] : [])].includes(k)) ||
        (args.project != null && typeof args.project !== 'string') ||
        (args.dryRun != null && typeof args.dryRun !== 'boolean')) {
      throw new FdeError('INVALID_ARGUMENTS', 'Use an optional project name and, for sync only, a boolean dryRun.');
    }
    const p = await loadProject(args.project, env);
    const workspace = await localWorkspace(p);
    if (operation === 'status') {
      const [runtime, endpoint] = await Promise.all([remote('status', p, env), health(p.healthUrl)]);
      return {ok:true, operation, project:p.name, mode:p.mode, workspace,
        healthy:runtime.service === 'active' && runtime.databaseReady !== false && endpoint?.ok !== false,
        runtime, endpoint};
    }
    if (operation === 'snapshot') {
      return {ok:true, operation, project:p.name, ...await remote('snapshot', p, env)};
    }
    if (p.mode !== 'demo') throw new FdeError('PRODUCTION_SYNC_DISABLED', 'fde_sync only supports demo projects. Use the production project deployment workflow.');
    await remote('validate', p, env);
    const argv = ['-az', '--itemize-changes', '--safe-links', '-e', ['ssh', ...SSH_OPTIONS].join(' ')];
    if (p.sync.delete) argv.push('--delete');
    if (args.dryRun) argv.push('--dry-run');
    for (const pattern of [...PROTECTED, ...p.sync.exclude]) argv.push('--exclude=' + pattern);
    argv.push('--', workspace + '/', p.sshHost + ':' + quote(p.remotePath + '/'));
    // Quote the remote path ourselves for macOS rsync 2.x. Newer rsync must
    // not escape those quotes a second time; all other arguments are fixed.
    const {stdout} = await run('rsync', argv, {timeout:180000,
      env:{...env, RSYNC_OLD_ARGS:'1', RSYNC_PROTECT_ARGS:'0'}});
    const changes = stdout.trim().split('\n').filter(Boolean);
    return {ok:true, operation, project:p.name, dryRun:args.dryRun ?? false,
      mirror:p.sync.delete, changes:changes.slice(0, 200), truncated:changes.length > 200};
  } catch (error) {
    return {ok:false, operation, error:{code:error.code || 'OPERATION_FAILED', message:error.message}};
  }
}
