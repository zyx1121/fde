import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { operate } from '../scripts/lib/operations.mjs';
import manifest from '../plugin.json' with { type:'json' };

const server = new McpServer({name:manifest.name, version:manifest.version});
const project = z.string().optional().describe('Configured project name; omitted uses defaultProject from the local FDE profile.');
const definitions = [
  ['status', 'Read the configured app workspace, remote systemd/PostgreSQL health and HTTP health status. Does not start or change services.', {project}, {readOnlyHint:true, destructiveHint:false, idempotentHint:true}],
  ['sync', 'Sync local source to a configured demo over SSH/rsync. Protects .env files, dependencies and build output. Deletes remote source files only if the profile enables sync.delete. Does not restart, build, change login settings or sync production. dryRun previews changes.', {project, dryRun:z.boolean().optional()}, {readOnlyHint:false, destructiveHint:true, idempotentHint:true}],
  ['snapshot', 'Back up deployed remote source (including server env), optional PostgreSQL database and uploads into a private remote snapshot directory, with checksums. Captures these sequentially, not atomically. Does not sync local edits first or delete previous snapshots. Failed backups remain .partial and are never reported complete.', {project}, {readOnlyHint:false, destructiveHint:false, idempotentHint:false}],
];
for (const [operation, description, inputSchema, annotations] of definitions) {
  server.registerTool('fde_' + operation, {description, inputSchema, annotations:{...annotations, openWorldHint:true}}, async args => {
    const result = await operate(operation, args);
    return {content:[{type:'text', text:JSON.stringify(result)}], structuredContent:result, isError:!result.ok};
  });
}
await server.connect(new StdioServerTransport());
