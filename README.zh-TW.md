<!-- 翻譯自 README.md @ docs/readme-template-v2。只翻 "For AI agents" 以上的章節，英文版更新時一起改。 -->

<div align="center">

<h1>FDE</h1>

<p><strong>用說的請 agent 修改正在運作的客戶 POC，再安全地同步上去。</strong></p>

[![CI](https://img.shields.io/github/actions/workflow/status/zyx1121/fde/check.yml?branch=main&style=flat-square&label=CI)](https://github.com/zyx1121/fde/actions)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-D97757?style=flat-square)](https://github.com/zyx1121/marketplace)
[![License](https://img.shields.io/github/license/zyx1121/fde?style=flat-square)](LICENSE)

[English](README.md) | **繁體中文** | [简体中文](README.zh-CN.md)

</div>

> Use FDE to switch the current demo to a light theme, and sync it when you finish.

FDE 是 Forward Deployed Engineer，也代表 Fastest Development Environment。它讓 Codex 和 Claude Code 直接處理已經在運作的客戶 demo。skill 負責流程，3 個 MCP 工具負責執行，你完全不用打 CLI 指令。

## 功能

- **讀取 demo 狀態**：systemd 服務、PostgreSQL 和 HTTP health 網址，不會改動任何東西。
- **同步程式碼**：透過 SSH 用 rsync 同步，保護 `.env`、相依套件、build 產物和持久資料。
- **建立快照**：備份已部署的原始碼、資料庫和上傳檔案，附 SHA-256 校驗碼。
- **保留客戶的設計**：主題、導覽列、帳號和登入設定都維持專案原本的樣子。

## 快速開始

```sh
claude plugin marketplace add zyx1121/marketplace
claude plugin install fde@zyx1121
```

Codex：先 `codex plugin marketplace add zyx1121/marketplace`，再 `codex plugin add fde@zyx1121`。

把 [examples/fde.config.example.json](examples/fde.config.example.json) 複製成 `~/.config/fde/config.json`，填入 workspace、SSH alias 和服務。開新的對話使用 skill：Claude Code 用 `/fde:fde`，Codex 用 `$fde`。問它「demo 現在狀態如何？」。

需要 Node.js 22 以上、SSH 和 rsync。MCP server 已經打包在 `dist/`。

## 使用方式

| 工具 | 作用 | 會改動 |
|------|------|--------|
| `fde_status` | 讀取 workspace、服務、PostgreSQL 和 HTTP health | 不改動 |
| `fde_sync` | 透過 SSH 和 rsync 把本機原始碼複製到 demo | 遠端原始碼；只有開啟 `sync.delete` 才會刪遠端檔案 |
| `fde_snapshot` | 備份已部署的原始碼、資料庫和上傳檔案 | 遠端新增一個私有的快照目錄 |

每個工具都可以帶 `project`，沒帶就用設定檔的 `defaultProject`。遠端需求和限制寫在 [skills/fde/references/operations.md](skills/fde/references/operations.md)。

要做有 zyx 外框的個人頁面，另外安裝 [task-web](https://github.com/zyx1121/task-web)。FDE 不依賴任何模板。

## 設定

`~/.config/fde/config.json` 每個專案一筆設定，可以用 `FDE_CONFIG_PATH` 或 `XDG_CONFIG_HOME` 改位置。

| 欄位 | 作用 |
|------|------|
| `workspace` | 本機原始碼目錄 |
| `sshHost`、`remotePath` | SSH alias 和遠端目錄 |
| `service` | systemd unit |
| `database`、`uploadsPath`、`backupPath` | 快照要複製的內容，以及寫到哪裡 |
| `healthUrl` | `fde_status` 會請求的網址 |
| `sync.delete`、`sync.exclude` | 同步時是否刪遠端檔案，以及要跳過什麼 |

設定檔、SSH 金鑰、執行狀態和客戶資料都不放進這個 repo，也不放進 plugin 快取。

## 運作方式

skill 決定步驟。MCP server(`dist/server.mjs`)執行 `scripts/lib/` 裡的操作，透過 SSH 完成。快照依序複製原始碼、資料庫和上傳檔案，所以不是原子操作。

## 限制

- FDE 不建立 VM，也不建立新的 app 骨架。
- 它不會把 demo 推上正式環境，每個專案用自己的部署流程。
- 快照是依序進行，不是原子操作。

## 其他

給 AI agent 的結構化資訊與開發說明在[英文版](README.md#for-ai-agents)。

## 授權

[MIT](LICENSE)
