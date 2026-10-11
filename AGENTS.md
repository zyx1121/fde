# fde

Claude Code and Codex plugin: the `fde` skill (`skills/fde/`) plus a Node MCP server (`src/server.mjs`, bundled to `dist/server.mjs`) that runs operations from `scripts/lib/` over SSH. Read [README.md](README.md) and [docs/architecture.md](docs/architecture.md) first.

## Rules

- `fde_status` never changes anything. Keep it read-only.
- `fde_sync` protects `.env` files, dependencies, build output and persistent data. It deletes remote files only when the profile sets `sync.delete`.
- Never change a client's theme, navigation, accounts or login settings as a side effect.
- Site values come from the local profile. Do not put hostnames, paths or client data in this repo.
- `plugin.json` and `mcp.json` are the manifest sources. Do not hand-edit the generated `.claude-plugin/plugin.json`, `.mcp.json` or `dist/server.mjs`.
- Repository documents and code comments are English.

## Where to run things

In Loki's environment, run `npm ci`, the build and the tests on `ssh sandbox` in a login shell (`bash -lc`). Do not install dependencies in the iCloud clone.

## Verify

```sh
npm ci
npm run check
```

For a change to sync or snapshot, also run the operation against a throwaway demo, never against a client's live demo.

## Release

1. Bump `version` in `package.json` and `plugin.json`, run `npm run check`, and commit the regenerated files.
2. Merge the PR. Then pin the new commit in [zyx1121/marketplace](https://github.com/zyx1121/marketplace) (see its AGENTS.md).
