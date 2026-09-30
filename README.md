# FDE

用自然語言操作客戶 POC 的 plugin，同時支援 Codex 與 Claude Code。
FDE 是 Forward Deployed Engineer，也代表 Fastest Development Environment。

> 用 FDE 幫我把目前的 demo 改成 light theme，完成後同步。

Skill 負責工作流程，MCP tools 提供操作介面，scripts 執行實際工作。
你不需要手動操作 CLI。

## 第一版範圍

- 接上已存在的 Next.js／Node demo workspace。
- 查詢服務、PostgreSQL 與 HTTP health 狀態。
- 同步本機程式到 demo；保護環境檔與持久資料。
- 保存遠端 source、資料庫、uploads 與 SHA-256 備份清單。
- 保留專案既有的 theme、導覽列、帳密與登入設定。

本版不建立 VM、不提供乾淨 app scaffold，也尚未實作自動 promotion 或背景
job 工具。正式部署沿用專案自己的部署流程；FDE 不依賴整包 zyx/utils。

## 安裝

請 agent 從 `zyx1121/marketplace` 安裝 `fde`。目前 CLI 也可使用：

```sh
# Claude Code
claude plugin marketplace add zyx1121/marketplace
claude plugin install fde@zyx1121

# Codex（支援 plugin add 的版本）
codex plugin marketplace add zyx1121/marketplace
codex plugin add fde@zyx1121
```

安裝後開新對話，使用 FDE 技能。Codex 可用 `$fde`；
Claude Code 的 plugin skill 為 `/fde:fde`。

需要 Node.js 22+、SSH 與 rsync。MCP server 已打包在 dist，
安裝 plugin 不需要 npm install。遠端需求與操作限制見
[環境操作說明](skills/fde/references/operations.md)。

請 agent 依 [設定範例](examples/fde.config.example.json) 建立本機
`~/.config/fde/config.json`，填入 workspace、SSH alias 與服務資訊。
也支援 XDG_CONFIG_HOME 或 FDE_CONFIG_PATH。設定、SSH keys、runtime state
與客戶資料不放進 plugin repo，也不存進會隨升級更換的 plugin cache。

## 結構與維護

- `plugin.json`、`mcp.json`：可攜 manifest，唯一套件資訊來源。
- `.claude-plugin/plugin.json`、`.mcp.json`：build 產生的相容格式。
- `skills/fde/`：兩個工具共用的技能。
- `scripts/lib/`：MCP 與 scripts fallback 共用的實作。
- `dist/server.mjs`：已打包 MCP server，無安裝期下載或 build。

維護者以 Node.js 22+ 執行 `npm ci`、`npm run check`。
修改後一起提交生成的 manifests 與 dist；CI 檢查它們沒有過期。
套件版號在 plugin.json 與 package.json 保持一致，發佈後由 marketplace
固定到 release commit。詳見 [拆分決策](docs/architecture.md)。

從舊本機 FDE skill 遷移時，先驗證新 plugin，再將舊 skill 與 symlink
移出自動探索目錄並備份，避免重複路由。原有 `zyx@zyx` 不需移除。
