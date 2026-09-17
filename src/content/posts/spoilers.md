---
title: Markdown 剧透遮罩
published: 2026-08-28
description: 在 Shirone Markdown 中隐藏简短的答案，同时保证剧透内容依然可访问。
tags: [示例, Markdown, 无障碍, Shirone]
category: 指南
lang: zh_CN
draft: false
---

剧透（Spoiler）用来遮住一个简短答案或情节细节，而不是把它从文档里删掉。把鼠标悬停上去、用键盘聚焦，或者直接激活这个原生控件，就能看到内容。

## 行内细节

答案是 :spoiler[**42**]，而这句话里剩下的部分依然是普通的 Markdown。

遮罩里可以包含 `行内代码`，也可以是 :spoiler[一段带有**强调**的较长说明]。

## 作者语法

```markdown
The answer is :spoiler[42].
```

生成的 HTML 使用原生按钮，并带有 `aria-expanded` 状态。即使没有 JavaScript，悬停和聚焦也能让文字显示出来；可选的运行时只为它补上点击与键盘切换。
