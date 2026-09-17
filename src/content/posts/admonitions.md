---
title: Markdown 提示框
published: 2026-08-27
description: 用 Shirone 的 M3E Markdown 容器呈现提示、警告和可选的详细信息。
tags: [示例, Markdown, 提示框, Shirone]
category: 指南
lang: zh_CN
draft: false
---

提示框（Admonition）能让补充信息在视觉上区分开来，同时又不打断文章的阅读节奏。所有形式都在服务端渲染，并共用同一个紧凑的 M3E 组件。

## 语义变体

::: note 部署上下文
带空格的形式可以接受一个纯文本自定义标题，同时仍兼容参考写法。
:::

:::info
当需要中性的上下文信息、帮助读者理解所在小节时，使用信息块。
:::

:::tip[原有的 **标签** 语法]
带方括号的标签写法依然可用，并且可以在里面写行内 Markdown 强调。
:::

> [!IMPORTANT]
> GitHub Alert 语法会进入同一个渲染器，因此已有文章能保持统一的视觉语言。

:::warning
在生产构建之前，先检查环境变量。
:::

:::caution
不要把凭据、本地配置或私钥连同示例一起发布出去。
:::

## 可选详情

::: details 查看完整命令
这个折叠区使用浏览器原生语义，即使没有客户端 JavaScript，也依然可以通过键盘操作。

```powershell
npx.cmd astro check
pnpm.cmd build
```

- 它默认是收起的。
- 较长的代码可以在自己的代码块内滚动。
- 在窄屏上，容器也不会超出文章宽度。
:::

## 作者语法

```markdown
:::note[Existing title syntax]
Content
:::

::: warning Plume-compatible title syntax
Content
:::

> [!TIP]
> GitHub Alert syntax

::: details Optional content
Hidden until the reader opens it.
:::
```
