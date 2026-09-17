---
title: Markdown 折叠面板
published: 2026-08-28
description: 把可选的 Markdown 内容收进紧凑、可访问的 M3E 展开面板里。
tags: [示例, Markdown, 折叠面板, Shirone]
category: 指南
lang: zh_CN
draft: false
---

折叠面板可以把彼此相关的可选细节归到一个紧凑的分组里。标题和正文都完整支持行内与块级 Markdown，而浏览器原生的展开语义让每个面板在没有客户端 JavaScript 时也能正常使用。

## 独立面板

默认情况下，各项互不影响、可以各自展开。在标题前加 `:+` 可以让该项初始就展开，加 `:-` 则可以在分组使用 `expand` 时让它保持收起。

::: collapse
- **环境要求**

  使用 Node.js 22 或更高版本，并在安装依赖前启用 Corepack。

- :+ 安装依赖

  在仓库根目录执行工作区的包管理命令。

  ```powershell
  pnpm.cmd install
  ```

- 校验命令

  在构建生产产物之前，先检查内容管线。

  - `pnpm.cmd check:manifest`
  - `npx.cmd astro check`
:::

## 手风琴模式

当希望"同时只展开一个"时，加上 `accordion`。浏览器会直接把这组原生折叠区归为一组，因此打开另一项会自动收起上一项，而且不需要水合。

::: collapse accordion expand
- `expand` 在这里起什么作用？

  当没有任何一项带 `:+` 标记时，它会让第一项初始展开。

- 标题里可以写 Markdown 吗？

  可以。标题支持行内 **强调** 与 `代码`，而面板正文支持完整的块级 Markdown。

- 在窄屏上会怎样？

  内容内边距会变得更紧凑，长文本会正常换行，嵌入的代码则保留自己的横向滚动区域。
:::

## 作者语法

````markdown
::: collapse accordion
- :+ First title

  First panel content.

- Second title with `code`

  Second panel content.
:::
````

容器里必须恰好包含一个顶层无序列表。每一项都需要一个标题段落、一个空行和正文内容。写法非法或内容混杂时，它会保持为一个普通可读的 Markdown 列表。
