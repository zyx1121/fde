import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const manifest = await read('plugin.json');
const pkg = await read('package.json');
if (pkg.version !== manifest.version) throw new Error('package.json version must match plugin.json');
const { $schema, extensions, ...compat } = manifest;
await mkdir(new URL('.claude-plugin/', root), {recursive:true});
await writeFile(new URL('.claude-plugin/plugin.json', root), JSON.stringify(compat, null, 2) + '\n');
const portable = await read('mcp.json');
const servers = JSON.parse(JSON.stringify(portable.mcpServers).replaceAll('${PLUGIN_ROOT}', '${CLAUDE_PLUGIN_ROOT}'));
await writeFile(new URL('.mcp.json', root), JSON.stringify({mcpServers:servers}, null, 2) + '\n');
await build({
  absWorkingDir:fileURLToPath(root), entryPoints:['src/server.mjs'], outfile:'dist/server.mjs',
  bundle:true, platform:'node', target:'node22', format:'esm', legalComments:'eof',
  banner:{js:"import { createRequire as __fdeCreateRequire } from 'node:module'; const require = __fdeCreateRequire(import.meta.url);"},
});
