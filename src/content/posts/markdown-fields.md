---
title: Markdown 字段卡片
description: 用于 API 与组件参数文档的字段卡片。
published: 2026-08-30
category: 指南
lang: zh_CN
draft: true
---

当若干相关选项属于同一个 API 或组件时，就用 `field-group`。把字段名写在起始行，然后在描述之前补上元数据标签。

:::: field-group

::: field tex
@type object
@optional

TeX 解析器的选项。
:::

::: field output
@type `'svg' | 'chtml'`
@default `'svg'`
@optional

输出格式，SVG 或通用 HTML。
:::

::::

## 基础字段

必填、可选和已废弃这三种状态可以在同一组里混用。默认值会与类型分开呈现，方便一眼扫过。

:::: field-group

::: field title
@type string
@required

组件的可见标题。这个值会显示在页面标题上，应当足够简短、便于快速扫读。
:::

::: field disabled
@type boolean
@default `false`
@optional

控件是否以禁用状态启动。
:::

::: field locale
@type `'en' | 'zh-CN' | 'ja-JP'`
@default `'en'`
@optional

用于格式化日期、数字和可访问标签的区域设置。
:::

::::

## 富文本描述

描述就是普通的 Markdown。在元数据行之后，链接、强调、列表和行内代码都依然可用。

:::: field-group

::: field render
@type `(value: unknown) => string`
@required

把一个值渲染成最终输出。回调应当返回一个**安全字符串**，并且可以使用 `formatValue` 辅助函数。

- 保持渲染结果可预期。
- 不要在回调里发起网络请求。
:::

::: field retries
@type number
@default `3`
@optional

请求被判定为失败之前的最大尝试次数。
:::

::: field legacyMode
@type boolean
@deprecated

为向后兼容而保留。新的集成应当改用 `compatibility`。
:::

::::

## 独立字段

当只需要在示例或代码块旁边说明单个选项时，可以不带分组、单独使用一个字段。

::: field format
@type `'short' | 'long'`
@default `'short'`
@optional

控制结果的格式化方式。
:::

## 书写说明

- `@type` 和 `@default` 的值会渲染成代码标记。
- `@required`、`@optional` 和 `@deprecated` 会补一个状态徽章。
- 元数据之后的任意普通 Markdown 都会成为字段描述。
- 无法识别的 `@tags` 不会被丢弃，而是作为描述文本保留显示。
