# Preserve a demo as an independent deployment

This release does not ship automatic promotion or durable job tools. Use this
workflow with the existing project deployment scripts and infrastructure tools.

Resolve the source demo, target project and requested domain from the user's
request and local profile. Record the choices already made: theme, navigation,
auth mode, accounts, provider settings and persistent data. Keep secrets in the
private environment; don't include them in public source or tool results.

Snapshot the demo, then create an independent application workspace and runtime
when requested. Copy reusable application source and migrate data deliberately.
Keep the source demo operational. Production projects keep their own AGENTS.md,
release scripts, service configuration and backup procedure.

Use available infrastructure schemas for VM, routing and DNS operations.
An internal DNS record is not public DNS. Start public DNS setup early and wait
for it to resolve correctly before requesting the HTTPS certificate.

Build for production on the appropriate host and verify the meaningful user
flow, authentication/data access, persistent storage and public HTTPS endpoint.
Long-running application work may need durable workers; assess that from the
actual app instead of assuming a request-lifetime callback is durable.

Keep a previous release and a data recovery path, and document updates and
backups in the generated project. Change credentials or presentation only when
requested. Report the real URL and what was verified, including unfinished work.
