import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export class FdeError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function ensure(condition, message) {
  if (!condition) throw new FdeError('INVALID_CONFIG', message);
}
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function configPath(env = process.env) {
  return env.FDE_CONFIG_PATH || path.join(env.XDG_CONFIG_HOME || path.join(homedir(), '.config'), 'fde/config.json');
}
function absolute(value, field, remote = false) {
  ensure(typeof value === 'string' && !/[\x00-\x1f\x7f]/.test(value), field + ' must be a path without control characters.');
  const expanded = !remote && value.startsWith('~/') ? path.join(homedir(), value.slice(2)) : value;
  const api = remote ? path.posix : path;
  ensure(api.isAbsolute(expanded) && api.normalize(expanded) === expanded && !expanded.endsWith('/'), field + ' must be a normalized absolute directory path.');
  ensure(expanded.split('/').filter(Boolean).length >= 3, field + ' must point to a project directory, not a system or home directory.');
  return expanded;
}
const overlaps = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
export async function loadProject(requested, env = process.env) {
  const file = configPath(env);
  let config;
  try { config = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') throw new FdeError('CONFIG_NOT_FOUND', 'Create ' + file + ' using examples/fde.config.example.json from the plugin. Keep machine settings outside the plugin.');
    throw new FdeError('INVALID_CONFIG', 'Cannot read valid JSON from ' + file + '.');
  }
  ensure(object(config) && config.version === 1 && object(config.projects), 'Config requires version: 1 and a projects object.');
  const name = requested ?? config.defaultProject;
  ensure(typeof name === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(name), 'Select a project or configure defaultProject.');
  ensure(Object.hasOwn(config.projects, name) && object(config.projects[name]), 'Unknown project: ' + name);
  const p = config.projects[name];
  ensure(['demo', 'production'].includes(p.mode), 'Project mode must be demo or production.');
  ensure(typeof p.sshHost === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/.test(p.sshHost), 'sshHost must be an SSH config alias or hostname.');
  ensure(typeof p.service === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.@-]*\.service$/.test(p.service), 'service must be a systemd .service name.');
  const workspace = absolute(p.workspace, 'workspace');
  const remotePath = absolute(p.remotePath, 'remotePath', true);
  const backupPath = absolute(p.backupPath, 'backupPath', true);
  const uploadsPath = p.uploadsPath ? absolute(p.uploadsPath, 'uploadsPath', true) : null;
  ensure(!overlaps(remotePath, backupPath), 'backupPath must be outside remotePath.');
  ensure(!uploadsPath || (!overlaps(uploadsPath, remotePath) && !overlaps(uploadsPath, backupPath)), 'uploadsPath must be separate from source and backups.');
  if (p.database != null) ensure(typeof p.database === 'string' && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(p.database), 'database must be a database name, not a connection string.');
  if (p.healthUrl != null) {
    let url;
    try { url = new URL(p.healthUrl); } catch {}
    ensure(url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash, 'healthUrl must be an HTTP(S) URL without credentials, query, or fragment.');
  }
  ensure(p.sync == null || object(p.sync), 'sync must be an object.');
  ensure(p.sync?.delete == null || typeof p.sync.delete === 'boolean', 'sync.delete must be boolean.');
  ensure(p.sync?.exclude == null || (Array.isArray(p.sync.exclude) && p.sync.exclude.every(x => typeof x === 'string' && x.length > 0 && !/[\x00-\x1f\x7f]/.test(x))), 'sync.exclude must contain nonempty rsync patterns.');
  return { name, mode:p.mode, workspace, sshHost:p.sshHost, remotePath, backupPath, uploadsPath,
    service:p.service, database:p.database ?? null, healthUrl:p.healthUrl ?? null,
    sync:{ delete:p.sync?.delete ?? false, exclude:p.sync?.exclude ?? [] } };
}
