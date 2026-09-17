---
title: Markdown 选项组
published: 2026-08-28
description: 用紧凑、可联动的 M3E 选项组来呈现彼此并列的 Markdown 内容。
tags: [示例, Markdown, 标签页, Shirone]
category: 指南
lang: zh_CN
draft: false
---

选项组能把等价的多种做法并在一起，而不必重复周围的说明。每个选项都接受完整的块级 Markdown，而选中的值还能与同一页上的另一个选项组联动。

## 选择包管理器

用 `@tab:active` 来指定初始选中的选项。在 `#` 后面加后缀可以提供一个稳定的值，同时不改变显示出来的标题。

::: tabs#package-manager

@tab npm

用 npm 安装这个包：

```powershell
npm install astro
```

@tab:active **pnpm**#pnpm

用 pnpm 安装这个包：

```powershell
pnpm.cmd add astro
```

@tab Bun#bun

用 Bun 安装这个包：

```powershell
bun add astro
```

:::

## 运行项目

这一组共用 `package-manager` 这个 id。在上面选择一个选项，下面与之匹配的命令会同步更新，并记住这次选择供下次访问使用。

::: tabs#package-manager

@tab npm

```powershell
npm run dev
```

@tab pnpm

```powershell
pnpm.cmd dev
```

@tab Bun#bun

```powershell
bun run dev
```

:::

## 更多并列选项

当选项行变长时，它们会保持在一行内，并在窄屏上于自己的导航区域内横向滚动。

::: tabs

@tab 本地工作站

开发某个功能时，使用本地工具链。

@tab 托管预览环境

发布一个临时预览用于评审。

@tab 持续集成

对每一次改动都运行确定性的校验。

@tab 生产部署

把已经验证过的产物发布到生产环境。

@tab 离线恢复流程

当网络不可用时，从本地产物恢复。

:::

## 作者语法

````markdown
::: tabs#package-manager

@tab npm

Use npm instructions here.

@tab:active **pnpm**#pnpm

Use pnpm instructions here.

:::
````

每个选项组至少需要两个 `@tab` 段落，且每段正文都要与它的标记之间用一个空行隔开。写法非法或不完整的选项组会保持为普通可读的 Markdown。
