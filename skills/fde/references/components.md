# Reuse the configured project's components

These notes apply when the workspace uses the zyx/shadcn starter. Inspect actual
files first; component inventory and provider choices can change by project.

| Need | Start with |
|---|---|
| Sign-in, settings, intake | Field, Input, Label, Button, native FormData |
| AI assistant | Existing chat composition, streaming adapter, MarkdownResponse |
| Documents and uploads | Existing upload composition, Progress, Resizable |
| Records and reports | Table, Input, Pagination; sorting/chart tools as needed |
| User decisions | Dialog, AlertDialog, RadioGroup, Toast |
| Admin workspace | Sidebar inside content, Breadcrumb, Tabs |
| Async work | Loading, empty, error, disabled, success and cancellation states |

Use installed shadcn primitives instead of forking them. For Base UI-based
components, inspect exports: composition uses render rather than Radix asChild.
Buttons inside forms may require explicit type="submit". React action resets can
affect uncontrolled fields; preserve user input on validation errors.

Prefer native forms and the project's existing data layer for small demos. Reuse
stream/cancel/copy and IME behavior from existing chat components. Propagate an
AbortSignal to provider requests. Render model output as safe Markdown; don't
execute generated HTML/JavaScript.

Keep the project's theme, typography, shared chrome and selected navigation.
The zyx registry at https://ui.zyx.tw is a source of components; its defaults do
not override a client's saved light/dark choice. A sample chat shell does not
imply real AI, retrieval, tool use, persistent history or upload extraction.
