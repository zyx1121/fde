# Environment setup and operation

The MCP server is bundled and runs with Node.js 22+. Operating a configured Linux
host requires local SSH and rsync, remote Python 3, systemd and tar. PostgreSQL
backups additionally need pg_dump and noninteractive sudo as postgres.

Read configuration from FDE_CONFIG_PATH when set, otherwise
`$XDG_CONFIG_HOME/fde/config.json` or `~/.config/fde/config.json`.
Start from `examples/fde.config.example.json` at the plugin root. The agent can
create this private profile using existing workspace and SSH settings; don't
ask the user to learn commands. Store no credentials in it. SSH uses the user's
existing SSH configuration and keys.

Profiles explicitly select demo or production, workspace, remote path, service,
backup and optional upload/database/health settings. Demo sync is refused for
production profiles. Source, uploads and backup directories must be separate.
Only use a project that matches the user's intended target.

The default sync copies changes without deleting remote files. A profile can
enable `sync.delete` to mirror source deletions. Built-in excludes protect
`.env`, `.env.*`, dependencies, build output and git metadata; custom exclusions
are additive. Do not use excluded source directories for customer uploads.
Remote source must already exist and contain package.json. Run installs on the
designated host, then retrieve changed manifests/components before syncing.

The tool schemas describe arguments and outputs. Missing configuration returns
an actionable error; installing the plugin does not create or alter VMs.

## Scripts fallback

If the host cannot load MCP, use the same implementation via
`node <plugin-root>/scripts/invoke.mjs`. Send one JSON object through stdin,
for example `{"operation":"status","project":"demo"}`. It returns JSON.
The supported operations are status, sync and snapshot; sync accepts dryRun.
This is an internal agent interface, not a separate user-facing CLI.

## Snapshots and failures

Each successful snapshot is a unique remote directory containing source.tgz,
optional database.sql.gz and uploads.tgz, and manifest.json with SHA-256 checksums.
Source archives include the remote env file. Directory mode is 0700; files use a
private umask. Don't copy them into this repository or public artifacts.

Source, database and uploads are captured sequentially while the app runs. For
cross-file/database consistency, use the project's maintenance/backup procedure.
On failure, a .partial directory may remain; it is not a completed snapshot.
Check remote state after a timeout before retrying. Restoring or deleting data
uses the project's recovery procedure and is outside these three tools.

For HMR failures inspect only the relevant service/compiler logs. For public
502 errors distinguish a stopped service from a routing failure. Service names,
gateway configuration and infrastructure lessons belong to the environment's
own documentation, not to a portable hardcoded host inventory.
