# FDE package boundary

FDE is a solution plugin. The zyx1121 marketplace is a catalog, while each plugin
owns its release. The existing zyx plugin remains available during incremental
extraction. FDE initially came from a local skill, not from the monolithic repo.

The portable root manifests are canonical. The build generates Claude-compatible
manifests from them and a dependency-bundled Node MCP server. Both hosts use the
same skill and operation code. Plugin updates never write profiles or customer
data into the package.

Local profiles identify existing workspaces and SSH targets. Reusing SSH/rsync
keeps the first version independent of the all-purpose utils MCP package.
Future provisioning can integrate infrastructure providers without copying
unrelated mail/calendar tools into FDE.

The first version supports status, sync and snapshot. The scripts fallback uses
the same operation functions as MCP. Tool schemas carry parameter semantics;
skill references carry workflow decisions rather than a second tool manual.

Deferred: clean app templates/bootstrap, automatic promotion, durable job
storage/status, provider adapters and production release/rollback automation.
A future long-running operation must persist its state outside the installed
plugin and explicitly handle interruption; MCP alone does not provide that.

Release procedure: run checks, commit generated artifacts, tag the release,
then update the marketplace's fixed commit. Keep existing marketplace identities
stable and test installation in both hosts before migrating local skill paths.
