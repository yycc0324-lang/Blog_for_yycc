---
title: Markdown 步骤
published: 2026-08-27
description: 在 Shirone 中把有先后顺序的操作呈现为紧凑、可访问的步骤流。
tags: [示例, Markdown, 步骤, Shirone]
category: 指南
lang: zh_CN
draft: false
---

当某个流程的先后顺序很重要时，就用步骤组件。它不会打断文章的阅读节奏：一条安静的数字导轨提供方向感，而标题、段落、链接、列表和代码依然保持它们各自的原生 Markdown 角色。

## 有序列表语法

把一个 Markdown 有序列表包进 `:::steps` 容器里，每个顶层列表项就会成为一个步骤。

````markdown
:::steps[Production deployment]
1. **Clone and prepare the workspace**

   Clone the repository and enter the project directory.

   ```powershell
   git clone https://github.com/LyraVoid/Shirone.git
   Set-Location Shirone
   ```

2. **Install dependencies**

   Use the repository's pinned package manager.

   ```powershell
   pnpm.cmd install
   ```

3. **Run project checks**

   Confirm Astro diagnostics and TypeScript checks pass.

   ```powershell
   npx.cmd astro check
   pnpm.cmd type-check
   ```

4. **Build the production site**

   Generate the static site and search index.

   ```powershell
   pnpm.cmd build
   ```
:::
````

:::steps[生产部署]
1. **克隆并准备工作区**

   克隆仓库并进入项目目录。

   ```powershell
   git clone https://github.com/LyraVoid/Shirone.git
   Set-Location Shirone
   ```

2. **安装依赖**

   使用仓库锁定版本的包管理器。

   ```powershell
   pnpm.cmd install
   ```

3. **运行项目校验**

   确认 Astro 诊断与 TypeScript 检查都能通过。

   ```powershell
   npx.cmd astro check
   pnpm.cmd type-check
   ```

4. **构建生产站点**

   生成静态站点与搜索索引。

   ```powershell
   pnpm.cmd build
   ```
:::

## 可选参数

- `:::steps[Title]` 或 `title="Title"` 会加一个可见的标签和可访问名称。
- `start=4` 可以改变第一个步骤显示的编号。
- 容器里必须恰好包含一个有序列表。写法非法或内容混杂时，它会保持为普通可读的 Markdown，而不会被启发式地强行解释。
- 渲染在站点构建期完成，不引入任何客户端 JavaScript 或网络请求。
