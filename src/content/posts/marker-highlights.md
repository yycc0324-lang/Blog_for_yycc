---
title: Markdown 标记高亮
published: 2026-08-28
description: 在 Shirone Markdown 中用由设计令牌驱动的高亮语法标记关键短语。
tags: [示例, Markdown, 排版, Shirone]
category: 指南
lang: zh_CN
draft: false
---

标记高亮能把注意力引到一个具体短语上，而不必把周围整段文字拆成一个独立组件。它在构建期渲染为原生 `<mark>` 元素，并自动继承当前生效的 M3E 配色系统。

## 默认强调

当你想用文章的主色调来承载强调时，使用 `==文字==`。比如在一段普通文字里，==让读者记住这一个结论== 就很合适。

如果短语本身需要更强的层次，标记里也可以放 ==嵌套的 **Markdown 强调**==。

## 语义配色

当含义需要不同的色调角色时，加上后缀即可。可用变体有 `primary`、`secondary`、`tertiary`、`error` 和 `tip`。

- ==Primary 把短语与当前主题色关联起来=={.primary}
- ==Secondary 低调地保留一层辅助区分=={.secondary}
- ==Tertiary 额外给出一层编辑判断信号=={.tertiary}
- ==Error 标出需要修正的状态=={.error}
- ==Tip 突出实用建议=={.tip}

## 作者语法

```markdown
==Primary marker==

==Secondary marker=={.secondary}
==Tertiary marker=={.tertiary}
==Error marker=={.error}
==Tip marker=={.tip}
```

像 `==literal marker syntax==` 这样的行内代码，以及代码围栏里的示例都会保持字面形式，因此文档可以讲解语法而不会真的触发它。
