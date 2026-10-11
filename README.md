<div align="center">

<h1>FDE</h1>

<p><strong>Change a live client POC by asking your agent, then sync it safely.</strong></p>

[![CI](https://img.shields.io/github/actions/workflow/status/zyx1121/fde/check.yml?branch=main&style=flat-square&label=CI)](https://github.com/zyx1121/fde/actions)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-D97757?style=flat-square)](https://github.com/zyx1121/marketplace)
[![License](https://img.shields.io/github/license/zyx1121/fde?style=flat-square)](LICENSE)

**English** | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

</div>

> Use FDE to switch the current demo to a light theme, and sync it when you finish.

FDE stands for Forward Deployed Engineer, and also for Fastest Development Environment. It lets Codex and Claude Code work on a client demo that already runs. The skill holds the workflow, 3 MCP tools do the work, and you never type a CLI command.

## Features

- **Reads the demo's health**: the systemd service, PostgreSQL and the HTTP health URL, without changing anything.
- **Syncs your code**: rsync over SSH, which protects `.env` files, dependencies, build output and persistent data.
- **Takes snapshots**: the deployed source, the database and the uploads, with SHA-256 checksums.
- **Keeps the client's design**: the theme, navigation, accounts and login settings stay as the project has them.

## Quick start

```sh
claude plugin marketplace add zyx1121/marketplace
claude plugin install fde@zyx1121
```

Codex: `codex plugin marketplace add zyx1121/marketplace`, then `codex plugin add fde@zyx1121`.

Copy [examples/fde.config.example.json](examples/fde.config.example.json) to `~/.config/fde/config.json` and set your workspace, SSH alias and service. Open a new session and use the skill: `/fde:fde` in Claude Code or `$fde` in Codex. Ask "What is the status of the demo?".

The plugin needs Node.js 22 or later, SSH and rsync. The MCP server ships bundled in `dist/`.

## Usage

| Tool | Does | Changes |
|------|------|---------|
| `fde_status` | reads the workspace, the service, PostgreSQL and HTTP health | nothing |
| `fde_sync` | copies local source to the demo over SSH and rsync | remote source. It deletes remote files only when `sync.delete` is on |
| `fde_snapshot` | backs up the deployed source, the database and the uploads | a new private snapshot directory on the remote |

Each tool takes an optional `project`. Without it, the tools use `defaultProject` from the profile. The remote requirements and limits are in [skills/fde/references/operations.md](skills/fde/references/operations.md).

For a personal page with the zyx shell, install [task-web](https://github.com/zyx1121/task-web). FDE has no template dependency.

## Configuration

`~/.config/fde/config.json` holds one entry per project. `FDE_CONFIG_PATH` and `XDG_CONFIG_HOME` move it.

| Key | Sets |
|-----|------|
| `workspace` | the local source directory |
| `sshHost`, `remotePath` | the SSH alias and the remote directory |
| `service` | the systemd unit |
| `database`, `uploadsPath`, `backupPath` | what a snapshot copies, and where it writes |
| `healthUrl` | the URL that `fde_status` requests |
| `sync.delete`, `sync.exclude` | whether sync deletes remote files, and what it skips |

The profile, SSH keys, runtime state and client data stay out of this repo and out of the plugin cache.

## How it works

The skill decides the steps. The MCP server (`dist/server.mjs`) runs each operation from `scripts/lib/`, which works over SSH. A snapshot copies the source, the database and the uploads one after another, so it is not atomic.

## Limits

- FDE does not create VMs or scaffold a new app.
- It does not promote a demo to production. Each project keeps its own deploy flow.
- A snapshot is sequential, not atomic.

## For AI agents

Facts for coding agents and LLM tools. The rules for changing the code are in [AGENTS.md](AGENTS.md).

- **Summary**: Plugin with a skill and 3 MCP tools that read, sync and snapshot a running Next.js or Node client demo over SSH.
- **Type**: plugin
- **Interfaces**: MCP `fde` (stdio, `dist/server.mjs`) with `fde_status`, `fde_sync`, `fde_snapshot`. Skill `fde`.
- **Install**: `claude plugin install fde@zyx1121`, after `claude plugin marketplace add zyx1121/marketplace`
- **Run**: the host starts the MCP server
- **Verify**: call `fde_status` and expect the service and health results
- **Config**: `~/.config/fde/config.json`, `FDE_CONFIG_PATH`
- **Secrets**: none in the plugin. SSH keys stay in SSH config, and the remote `.env` stays on the remote.
- **Limits**: no VM creation, no scaffold, no promotion. Snapshots are not atomic.

## Development

```sh
npm ci
npm run check
```

`plugin.json` and `mcp.json` are the manifest sources. The build writes the Claude-compatible files and `dist/server.mjs`, and CI fails when the committed copies are stale. [docs/architecture.md](docs/architecture.md) records why FDE is its own plugin.

## License

[MIT](LICENSE)
