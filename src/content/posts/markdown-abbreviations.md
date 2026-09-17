---
title: Markdown 缩写词
published: 2026-08-28
description: 把常见缩写一次性定义好，让读者在正文里随时能看到它的完整含义。
tags: [示例, Markdown, 排版, Shirone]
category: 指南
lang: zh_CN
draft: false
---

缩写词能让技术写作保持紧凑，同时把完整说法留给需要的读者。被定义的词会渲染成原生 `abbr` 元素，含义在鼠标悬停时和辅助技术中都可获得。

## 在正文中

SSR 优先的输出方式，能让初始文档在 JavaScript 运行之前就可见。衡量它的阅读体验时，LCP 与 CLS 会告诉你首屏内容是否又快又稳。

缩写也可以出现在普通 Markdown 旁边，比如 **SSR** 相关的建议；但像 `SSR` 这样的字面代码，以及 [LCP 文档](https://web.dev/articles/lcp) 这类链接，都不会被改动。

## 定义术语

定义可以放在同一篇 Markdown 文档的任意位置。它们不会渲染成可见段落，而且只有这篇文章里匹配到的词才会获得语义化缩写处理。

```markdown
*[SSR]: Server-Side Rendering
*[LCP]: Largest Contentful Paint
*[CLS]: Cumulative Layout Shift

SSR makes an HTML response available before client code runs.
```

*[SSR]: 服务端渲染（Server-Side Rendering）
*[LCP]: 最大内容绘制（Largest Contentful Paint）
*[CLS]: 累积布局偏移（Cumulative Layout Shift）

## 书写边界

术语必须以字母或数字开头，可以包含字母、数字、句点、下划线、加号和连字符。每条定义只对当前文章生效；写法非法或重复的定义会保持为普通 Markdown，而不会悄悄替换掉另一个术语。
