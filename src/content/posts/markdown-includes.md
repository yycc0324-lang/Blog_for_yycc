---
title: "Markdown 文件引入"
published: 2026-08-28
description: "在构建期引入本地 Markdown 文件或其中的片段。"
tags: [Markdown, Shirone]
category: 指南
lang: zh_CN
draft: false
---

Shirone 可以引入一个本地 Markdown 文件，也可以只引入其中安全的一段。

<!-- @include: src/content/snippets/include-example.md#public-api -->

整文件引入与行范围引入同样可用：

```markdown
<!-- @include: src/content/snippets/include-example.md -->
<!-- @include: src/content/snippets/include-example.md{1-4} -->
<!-- @include: src/content/snippets/include-example.md{5-} -->
<!-- @include: src/content/snippets/include-example.md{-4} -->
```

写在代码围栏里的引入注释会保持原样，不会被解析。
