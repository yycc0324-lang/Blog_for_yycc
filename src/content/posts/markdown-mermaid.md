---
title: Mermaid 图表图库
published: 2024-05-02
description: 一份 Mermaid 图表图库，覆盖流程、交互、数据模型、排期与项目历程。
tags: [示例, Markdown, Mermaid]
category: 示例
lang: zh_CN
draft: false
---

Mermaid 能把 Markdown 里的文字描述变成图表。下面的示例借用 Shirone 的内容工作流，演示技术文章与项目笔记里常用的各种图表类型。

## 流程图

流程图用来描述一个过程，包括判断分支，以及回到先前步骤的路径。

```mermaid
flowchart TD
    accTitle: 文章发布工作流
    accDescr: 一篇文章依次经过撰写、校验、预览与构建，最后发布。校验失败会把它退回修改。
    Draft[撰写 Markdown] --> Check{校验通过？}
    Check -->|否| Revise[修改文章]
    Revise --> Check
    Check -->|是| Preview[本地预览]
    Preview --> Build[构建静态页面]
    Build --> Publish[发布]
```

## 时序图

时序图按时间顺序呈现参与者之间的协作。这个例子顺着一次 Swup 导航，从发起请求一直跟到 Mermaid 完成渲染。

```mermaid
sequenceDiagram
    accTitle: 站内导航后的图表渲染
    accDescr: 读者发起导航，Swup 替换文章内容，随后 Mermaid 渲染器为新页面上的图表做增强。
    actor Reader as 读者
    participant Browser as 浏览器
    participant Swup
    participant Content as 文章区域
    participant Renderer as Mermaid 渲染器
    Reader->>Browser: 打开另一篇文章
    Browser->>Swup: 发起站内导航
    Swup->>Content: 替换页面内容
    Swup-->>Renderer: 派发 content:replace
    Renderer->>Content: 查找 Mermaid 容器
    Renderer-->>Browser: 插入主题化 SVG
```

## 实体关系图

实体关系图用来建模结构化数据，以及作者、文章、标签和评论之间的连接关系。

```mermaid
erDiagram
    accTitle: 博客内容关系
    accDescr: 作者撰写文章，文章接收评论，而关联表把文章连接到多个标签。
    AUTHOR ||--o{ POST : 撰写
    POST ||--o{ COMMENT : 接收
    POST ||--o{ POST_TAG : 归类为
    TAG ||--o{ POST_TAG : 分组
    AUTHOR {
        string id PK
        string display_name
    }
    POST {
        string slug PK
        string title
        datetime published_at
        string author_id FK
    }
    COMMENT {
        string id PK
        string post_slug FK
        string body
    }
    TAG {
        string id PK
        string label
    }
    POST_TAG {
        string post_slug FK
        string tag_id FK
    }
```

## 类图

类图用来表达软件设计里的职责划分、公开方法与依赖方向。

```mermaid
classDiagram
    accTitle: Markdown 渲染模块
    accDescr: 内容管线通过 Mermaid 插件生成回退标记，客户端渲染器随后把它增强为 SVG。
    class ContentPipeline {
        +render(markdown)
        +collectMetadata()
    }
    class MermaidPlugin {
        +transform(codeFence)
        +createFallback()
    }
    class DiagramRenderer {
        +initialize()
        +renderAll()
        +refreshTheme()
    }
    class ThemeTokens {
        +primary
        +surface
        +outline
    }
    ContentPipeline --> MermaidPlugin : 使用
    DiagramRenderer --> MermaidPlugin : 增强输出
    DiagramRenderer --> ThemeTokens : 读取
```

## 状态图

状态图展示一个对象的生命周期，以及把它在各个状态之间推动的事件。

```mermaid
stateDiagram-v2
    accTitle: 文章生命周期
    accDescr: 一篇文章从草稿走向评审和发布；它可能被退回修改，也可能最终被归档。
    state "草稿" as Draft
    state "评审中" as InReview
    state "已发布" as Published
    state "已归档" as Archived
    [*] --> Draft
    Draft --> InReview : 提交
    InReview --> Draft : 请求修改
    InReview --> Published : 通过
    Published --> Draft : 撤回
    Published --> Archived : 归档
    Archived --> [*]
```

## XY 坐标图

XY 图把柱状与折线组合起来，在共享坐标轴上比较数值与趋势。

```mermaid
xychart-beta
    accTitle: 六周内容表现
    accDescr: 柱状表示按周归一化后的发布量，折线表示归一化后的阅读完成度。
    title "六周内容表现"
    x-axis "周" [1, 2, 3, 4, 5, 6]
    y-axis "相对得分" 0 --> 100
    bar [36, 52, 44, 68, 76, 84]
    line [48, 55, 62, 61, 73, 81]
```

## 饼图

饼图用紧凑的方式比较各类别在整体中的占比。

```mermaid
pie showData
    accTitle: 文章主题占比
    accDescr: 工程类占四成，设计体系占两成五，其余由指南与随笔分摊。
    title 文章主题占比
    "工程" : 40
    "设计体系" : 25
    "指南" : 20
    "随笔" : 15
```

## 甘特图

甘特图把任务、依赖和里程碑沿日历时间轴排开。

```mermaid
gantt
    accTitle: 主题发布计划
    accDescr: 发布计划从需求与交互设计，推进到组件开发、测试与发布。
    title 主题发布计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    section 设计
    确认需求 :done, brief, 2024-05-06, 2d
    打磨交互 :done, interaction, after brief, 3d
    section 实现
    开发组件 :active, components, after interaction, 6d
    编写示例 :examples, after interaction, 4d
    section 校验
    自动化测试 :tests, after components, 3d
    发布 :milestone, release, after tests, 0d
```

## 思维导图

思维导图把一个中心主题展开成若干相关领域与支撑概念。

```mermaid
mindmap
  root((Shirone))
    内容体验
      Markdown
      搜索
      图表
    界面体系
      M3E 令牌
      响应式布局
      配色方案
    工程质量
      Astro Check
      Playwright
      无障碍
```

## 时间线

时间线用来概括重要事件或阶段，而不需要精确的日历时长。

```mermaid
timeline
    title Mermaid 支持演进
    管线设计 : 识别 Mermaid 代码围栏
             : 保留源码回退
    客户端增强 : 按需加载运行时
               : 应用主题令牌
    可靠性 : 支持 Swup 导航
           : 验证响应式与可访问输出
```

## 用户旅程图

用户旅程图把任务各阶段的动作、参与者与体验评分组合在一起。

```mermaid
journey
    accTitle: 读者理解一篇技术文章
    accDescr: 读者发现文章，结合正文与图表去理解它，然后继续探索相关主题。
    title 读者理解一篇技术文章
    section 发现
      浏览文章列表: 4: Reader
      挑一个主题: 5: Reader
    section 理解
      阅读文章: 4: Reader
      查看关系图: 5: Reader
    section 继续
      打开相关文章: 4: Reader
      收藏页面: 3: Reader
```

## Git 图

Git 图展示一个功能分支在合入主线之前，工作是如何推进的。

```mermaid
gitGraph
    accTitle: Mermaid 功能分支历史
    accDescr: 一个功能分支先加入渲染器与测试，再合入主分支等待发布。
    commit id: "base"
    branch mermaid
    checkout mermaid
    commit id: "add-renderer"
    commit id: "add-tests"
    checkout main
    merge mermaid id: "merge-mermaid"
    commit id: "release"
```

## 看板

看板按工作流状态把任务分组，让当前进度一目了然。

```mermaid
kanban
  backlog[待办]
    docs[编写作者文档]
    examples[扩充示例数据]
  active[进行中]
    themes[验证主题适配]
  complete[已完成]
    fallback[源码回退]
    rendering[客户端渲染]
```

## 桑基图

桑基图用连线宽度表示流量或其他数量如何在节点之间流转。

```mermaid
sankey-beta
落地页,阅读,720
发现页,阅读,430
阅读,探索,360
阅读,专题,210
阅读,外链跳转,140
```

每个示例都使用标准的 `mermaid` 代码围栏。服务端会保留一份可读的源码标记，浏览器再把它增强为跟随当前主题的 SVG。主题切换或 Swup 导航到本篇文章时，图表都会重新渲染。
