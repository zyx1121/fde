// Internal agent fallback: one JSON request on stdin; no interactive CLI.
import { operate } from './lib/operations.mjs';
let raw = '';
for await (const chunk of process.stdin) {
  raw += chunk;
  if (raw.length > 65536) throw new Error('Request exceeds 64 KiB.');
}
try {
  const {operation, ...args} = JSON.parse(raw);
  const result = await operate(operation, args);
  process.stdout.write(JSON.stringify(result) + '\n');
  if (!result.ok) process.exitCode = 1;
} catch {
  process.stdout.write(JSON.stringify({ok:false,error:{code:'INVALID_REQUEST',message:'Send a JSON object with operation and optional project/dryRun on stdin.'}}) + '\n');
  process.exitCode = 1;
}
