---
name: fde
description: "Build and change live client POCs in a configured FDE workspace using reusable UI components and environment tools. Use for customer demos, quick POCs, 開 dev 模式, or preserving a demo for independent deployment; applies to configured FDE projects."
---

# FDE

FDE means Forward Deployed Engineer, also Fastest Development Environment.
The user describes the outcome in natural language; operate the environment for them.

## Resolve the workspace

Use the installed FDE MCP tool schemas as the operation contract. Read status to
resolve the selected project's workspace, mode and service health. Environment
settings live in the local FDE profile, outside this plugin; see
[operations](references/operations.md) only for setup or a scripts fallback.
If the named project is ambiguous, inspect the configured projects before choosing.

Read the resolved workspace's AGENTS.md and project design notes before editing.
Preserve its theme, navigation, accounts, auth mode and data unless the request
changes them. Project choices take precedence over starter defaults.

Work in an existing configured workspace. Creating a new project or replacing the
current demo requires that intent in the request. Local source is authoritative;
remote dependency installs may change manifests or generated components, which must
be retrieved before the next sync. Never overwrite the remote environment file.

## Presentation and templates

FDE owns environment operations, not a mandatory page template. For a personal
tool, temporary interactive page or research demo, use the separate task-web
plugin when available. It supplies the zyx shell and a clean starter; FDE handles
configured workspace status, sync and snapshots. A client design or an existing
project shell takes precedence. No task-web dependency is required for FDE.

## Live demo

Use the main context for the small requested change, edit locally, and sync with
the environment tool. An existing watcher may already synchronize saves. Ordinary
TSX/CSS changes use HMR; don't restart or build just for those edits.

For this live demo mode, don't proactively add git/PR workflows, subagents,
review passes, builds, tests, lint, typechecks, browser automation or screenshots.
Run checks when requested; inspect a reported blocking error only as far as needed
to fix it. This fast path applies to the configured demo, not plugin development,
shared component registries, or production maintenance.

Keep screens minimal: essential titles, controls, data and concise processing/error
states. Avoid decorative labels, repeated instructions and permanent limit copy.
Reuse actual installed components and inspect their exports. If the project uses
the zyx/shadcn starter, read [composition notes](references/components.md) as needed.

A sync doesn't restart stopped services. If startup or dependency/config changes
require a service action, use the workspace's documented lifecycle script within
the requested task. Scope it to this project's service.

## Data and AI

Use parameterized queries and preserve existing data when seeding. Protect
sensitive pages, server actions and API routes with real server authorization;
a cookie-presence redirect isn't sufficient. Respect the app's selected login
mode and credentials. Do not rotate accounts as a side effect of deployment.

Keep keys on the server and uploads in the configured persistent directory.
Successful file storage does not imply extraction or AI processing. Distinguish
simulation from real provider calls; reuse the app's authorized provider setup.

Before an authorized replacement/reset, snapshot source, database and uploads.
A snapshot captures deployed remote source; sync first if it must include local
edits. Backups include server secrets and remain private on the remote host.
The bundled snapshot is online and sequential, not an atomic application snapshot.

## Preserve or promote a POC

For a request to keep a POC permanently, read [promotion](references/promotion.md).
Preserve theme, navigation, login settings, data and the original demo. Production
builds and focused verification belong to this workflow, not the live edit loop.

The first release provides environment status, demo sync and remote snapshots.
Automatic provisioning, promotion and background-job tools are not implemented;
use an existing project's deployment workflow and available infrastructure tools,
or identify the missing setup. Never invent a tool or claim an unfinished
deployment is complete.
