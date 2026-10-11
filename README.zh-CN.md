<!-- 翻译自 README.md @ docs/readme-template-v2。只翻译 "For AI agents" 之前的章节，英文版更新时一起改。 -->

<div align="center">

<h1>FDE</h1>

<p><strong>用说的请 agent 修改正在运行的客户 POC，再安全地同步上去。</strong></p>

[![CI](https://img.shields.io/github/actions/workflow/status/zyx1121/fde/check.yml?branch=main&style=flat-square&label=CI)](https://github.com/zyx1121/fde/actions)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-D97757?style=flat-square)](https://github.com/zyx1121/marketplace)
[![License](https://img.shields.io/github/license/zyx1121/fde?style=flat-square)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md) | **简体中文**

</div>

> Use FDE to switch the current demo to a light theme, and sync it when you finish.

FDE 是 Forward Deployed Engineer，也代表 Fastest Development Environment。它让 Codex 和 Claude Code 直接处理已经在运行的客户 demo。skill 负责流程，3 个 MCP 工具负责执行，你完全不用输入 CLI 命令。

## 功能

- **读取 demo 状态**：systemd 服务、PostgreSQL 和 HTTP health 地址，不会改动任何东西。
- **同步代码**：通过 SSH 用 rsync 同步，保护 `.env`、依赖、构建产物和持久数据。
- **创建快照**：备份已部署的源码、数据库和上传文件，附 SHA-256 校验和。
- **保留客户的设计**：主题、导航栏、账号和登录设置都保持项目原本的样子。

## 快速开始

```sh
claude plugin marketplace add zyx1121/marketplace
claude plugin install fde@zyx1121
```

Codex：先 `codex plugin marketplace add zyx1121/marketplace`，再 `codex plugin add fde@zyx1121`。

把 [examples/fde.config.example.json](examples/fde.config.example.json) 复制为 `~/.config/fde/config.json`，填入 workspace、SSH alias 和服务。开新的对话使用 skill：Claude Code 用 `/fde:fde`，Codex 用 `$fde`。问它“demo 现在状态如何？”。

需要 Node.js 22 以上、SSH 和 rsync。MCP server 已经打包在 `dist/`。

## 使用方法

| 工具 | 作用 | 会改动 |
|------|------|--------|
| `fde_status` | 读取 workspace、服务、PostgreSQL 和 HTTP health | 不改动 |
| `fde_sync` | 通过 SSH 和 rsync 把本地源码复制到 demo | 远端源码；只有开启 `sync.delete` 才会删除远端文件 |
| `fde_snapshot` | 备份已部署的源码、数据库和上传文件 | 远端新建一个私有的快照目录 |

每个工具都可以带 `project`，不带就用配置文件的 `defaultProject`。远端要求和限制写在 [skills/fde/references/operations.md](skills/fde/references/operations.md)。

要做带 zyx 外框的个人页面，另外安装 [task-web](https://github.com/zyx1121/task-web)。FDE 不依赖任何模板。

## 配置

`~/.config/fde/config.json` 每个项目一条配置，可以用 `FDE_CONFIG_PATH` 或 `XDG_CONFIG_HOME` 改变位置。

| 字段 | 作用 |
|------|------|
| `workspace` | 本地源码目录 |
| `sshHost`、`remotePath` | SSH alias 和远端目录 |
| `service` | systemd unit |
| `database`、`uploadsPath`、`backupPath` | 快照要复制的内容，以及写到哪里 |
| `healthUrl` | `fde_status` 会请求的地址 |
| `sync.delete`、`sync.exclude` | 同步时是否删除远端文件，以及要跳过什么 |

配置文件、SSH 密钥、运行状态和客户数据都不放进这个 repo，也不放进插件缓存。

## 工作原理

skill 决定步骤。MCP server(`dist/server.mjs`)运行 `scripts/lib/` 里的操作，通过 SSH 完成。快照依次复制源码、数据库和上传文件，所以不是原子操作。

## 限制

- FDE 不创建虚拟机，也不创建新的应用骨架。
- 它不会把 demo 推上生产环境，每个项目用自己的部署流程。
- 快照是依次进行，不是原子操作。

## 其他

给 AI agent 的结构化信息与开发说明见[英文版](README.md#for-ai-agents)。

## 许可证

[MIT](LICENSE)
