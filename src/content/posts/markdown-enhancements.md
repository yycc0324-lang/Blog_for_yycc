---
title: Shirone Markdown 增强功能
published: 2026-08-19
pinned: true
description: 了解 Shirone 的自定义 Markdown 扩展、表达力组件与写作语法。
tags: [示例, Markdown, 扩展, 主题, Shirone]
category: 指南
lang: zh_CN
draft: false
---

Shirone 提供了一整套主题专属的 Markdown 扩展与自定义语法容器。它们构建在原生 unified AST 处理管线之上，所有扩展都会在站点构建期渲染为可访问的语义化 HTML，做到**零客户端 JavaScript 水合开销**与**100% M3E 设计令牌对齐**。

## 文件树

文件树能把多级项目结构、源码层级和终端目录输出，变成紧凑可交互的树形视图，自带文件类型图标、差异高亮和可折叠分支。

### 1. 嵌套列表语法（`:::file-tree`）

当你想直接把文件层级写成 Markdown 嵌套列表时，使用 `:::file-tree` 块指令。

```markdown
:::file-tree{title="Shirone source tree"}
- src
  - components/
    - ++ Navigation.svelte # added component
    - -- Button.astro # removed component
  - content
    - posts/
      - markdown-enhancements.md
  - layouts/
    - PostLayout.astro
  - plugins
    - markdown/
      - rehype-file-tree.mjs
  - styles
    - markdown/
      - trees.css
  - **content.config.ts** # important file
- public/
  - favicon.svg
- package.json
:::
```

:::file-tree{title="Shirone 源码树"}
- src
  - components/
    - ++ Navigation.svelte # 新增组件
    - -- Button.astro # 已移除组件
  - content
    - posts/
      - markdown-enhancements.md
  - layouts/
    - PostLayout.astro
  - plugins
    - markdown/
      - rehype-file-tree.mjs
  - styles
    - markdown/
      - trees.css
  - **content.config.ts** # 重要文件
- public/
  - favicon.svg
- package.json
:::

#### 书写规则与标记

- **差异状态**：在条目前面加 `++`（绿色背景与徽章）或 `--`（红色背景与删除线）来高亮改动。
- **注释**：`#` 之后的任意文本都会渲染成右对齐、弱化的行内注释。
- **强调**：用 `**粗体**` 包住文件名，让关键文件获得更醒目的视觉权重。
- **可折叠目录**：由嵌套列表项推断出的目录默认是展开的。在名称后加一个斜杠（例如 `components/`），就能创建一个默认收起、读者可点击或用键盘展开的目录。

---

### 2. 终端输出语法（```` ```file-tree ````）

当你手上已经有 `tree` 这类命令行工具生成的目录树文本时，直接把它粘进标记为 `file-tree` 的围栏代码块即可。Unicode 分支符号（`├──`、`└──`、`│`）和 ASCII 分支都会被自动解析。

````markdown
```file-tree title="Build output" icon="simple"
dist
├── _astro/
│   ├── index.css
│   └── page.js
└── favicon.ico
```
````

```file-tree title="构建输出" icon="simple"

dist
├── _astro/
│   ├── index.css
│   └── page.js
└── favicon.ico
```

#### 配置项

- `title="string"`：设置树形视图的自定义标题与可访问标签。
- `icon="colored" | "simple"`：在多色文件类型图标（`colored`，默认）与极简单色图标（`simple`）之间选择。

---

## 代码树

可交互的代码树把左侧的多级文件导航面板和右侧即时切换的代码面板配在一起，为多文件示例、模块或整目录讲解提供接近 IDE 的阅读体验。

### 1. 容器语法（`:::code-tree`）

在 `:::code-tree` 块指令里组合多个围栏代码块。每个代码块用 `title="path/to/file"` 声明自己的路径。

````markdown
:::code-tree{title="Shirone Component Demo" height="380px" entry="src/Button.svelte"}
```svelte title="src/Button.svelte"
<script lang="ts">
  let { label = "Click me" } = $props();
</script>

<button class="m3-btn">{label}</button>
```

```stylus title="src/styles/button.styl"
.m3-btn
  background: var(--primary)
  color: var(--on-primary)
  border-radius: var(--shape-corner-m)
```

```json title="package.json"
{
  "name": "button-demo",
  "version": "1.0.0"
}
```
:::
````

:::code-tree{title="Shirone 组件演示" height="380px" entry="src/Button.svelte"}
```svelte title="src/Button.svelte"
<script lang="ts">
  let { label = "Click me" } = $props();
</script>

<button class="m3-btn">{label}</button>
```

```stylus title="src/styles/button.styl"
.m3-btn
  background: var(--primary)
  color: var(--on-primary)
  border-radius: var(--shape-corner-m)
```

```json title="package.json"
{
  "name": "button-demo",
  "version": "1.0.0"
}
```
:::

#### 配置与标记

- `title="string"`：设置代码树的标题与可访问标签。
- `height="string"`：设置桌面端视图的高度（默认 `420px`，例如 `380px`、`26rem`）。
- `entry="filepath"`：指定首次加载时处于激活状态的文件。
- `icon="colored" | "simple"`：在彩色图标与极简单色文件图标之间切换。
- `:active`：在任意围栏代码块上标注 `:active`，即可把它设为默认激活的标签页。

---

### 2. 本地目录自动导入（`@[code-tree]`）

直接指向工作区里的任意本地目录路径，就能在构建期自动扫描并生成可交互的代码树，无需手动复制文件内容。

```markdown
@[code-tree title="Anime Utilities" entry="status.ts"](/src/utils/anime)
```

@[code-tree title="站点配置" entry="siteConfig.ts"](/src/config)
