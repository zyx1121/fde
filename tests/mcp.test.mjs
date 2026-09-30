import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('bundled server speaks MCP, exposes three tools and returns structured setup errors', async t => {
  const dir=await mkdtemp(path.join(tmpdir(),'fde-mcp-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const standalone=path.join(dir,'server.mjs');
  await copyFile(fileURLToPath(new URL('../dist/server.mjs',import.meta.url)),standalone);
  const transport = new StdioClientTransport({
    command:process.execPath,
    args:[standalone],
    cwd:dir,
    env:{...process.env,FDE_CONFIG_PATH:path.join(dir,'missing.json')},
    stderr:'pipe'
  });
  const client=new Client({name:'fde-test',version:'1.0.0'});
  await client.connect(transport);
  t.after(()=>client.close());
  const tools=await client.listTools();
  assert.deepEqual(tools.tools.map(x=>x.name).sort(),['fde_snapshot','fde_status','fde_sync']);
  assert.equal(tools.tools.find(x=>x.name==='fde_status').annotations.readOnlyHint,true);
  const result=await client.callTool({name:'fde_status',arguments:{}});
  assert.equal(result.isError,true);
  assert.equal(result.structuredContent.error.code,'CONFIG_NOT_FOUND');
  const bad=await client.callTool({name:'fde_sync',arguments:{dryRun:'yes'}});
  assert.equal(bad.isError,true);
});
