import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { FdeError } from './config.mjs';
const execute = promisify(execFile);
export const SSH_OPTIONS = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2'];
export function quote(value) { return "'" + String(value).replaceAll("'", "'\\''") + "'"; }
export async function run(command, args, {input, timeout=30000, env=process.env} = {}) {
  let child;
  const promise = execute(command, args, {encoding:'utf8', timeout, maxBuffer:1024*1024, env, windowsHide:true});
  child = promise.child;
  child.stdin.on('error', () => {});
  child.stdin.end(input ?? '');
  try { return await promise; }
  catch (error) {
    if (error.killed) throw new FdeError('TIMEOUT', command + ' exceeded its time limit. Check the remote state before retrying.');
    throw new FdeError('COMMAND_FAILED', command + ' failed: ' + (error.stderr?.trim() || error.message).slice(0, 3000));
  }
}
