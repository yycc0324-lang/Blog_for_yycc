---
title: 正文批注
published: 2026-08-27
description: 在不打断阅读节奏的前提下，为 Shirone 文章添加紧凑、可访问的补充说明。
tags: [示例, Markdown, 批注, Shirone]
category: 指南
lang: zh_CN
draft: false
---

正文批注能把补充上下文留在句子附近，又不必把它直接塞进阅读流里。点一下那个小小的标记，就能展开它的内容。

## 基础语法

在普通文字里放一个 `[+label]` 引用，然后在同一篇文章的其他位置定义与之匹配的批注即可。

```markdown
Astro renders most of a page ahead of time and hydrates **interactive islands** [+islands] only when they need to become interactive.

[+islands]:
  An island is an interactive UI component surrounded by static HTML. This keeps the default page lightweight while preserving focused interactivity.
```

Astro 会提前渲染页面的大部分内容，只有当 **交互岛（islands）** [+islands] 真正需要交互时，才去水合它们。

[+islands]:
  所谓"岛"，就是一个被静态 HTML 包围的交互式 UI 组件。这样既能保持页面默认轻量，又能保留聚焦的交互能力。

## 富内容

批注定义里可以包含段落、强调、链接、列表和行内代码 [+rich-note]，而周围的句子照常往下读。

[+rich-note]:
  **写作建议**

  - 让第一句话自成一体、可以独立看懂。
  - 当读者可能需要原始出处时，给出链接。
  - 举例尽量简短，比如 `client:visible`。

  完整模型见 [Astro 岛屿文档](https://docs.astro.build/en/concepts/islands/)。

## 多重定义

复用同一个标签 [+review]，就能把一个标记背后串起一组彼此相关的短批注。

[+review]: 先写会改变读者下一步动作的那个结论。
[+review]: 把实现层面的证据与背景信息分开陈列。
[+review]: 该写进正文而不是批注里的细节，就删掉。

像 `[+missing]` 这种未定义的引用会保持为普通文本，所以一个没写完的定义永远不会生成一个空控件。
