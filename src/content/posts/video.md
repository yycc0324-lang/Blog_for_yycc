---
title: 在文章里插入视频
published: 2023-08-01
description: 这篇文章演示如何在博客文章中嵌入视频。
tags: [示例, 视频]
category: 示例
draft: false
---

直接把 YouTube 或其他平台提供的嵌入代码复制过来，粘贴进 Markdown 文件即可。

```yaml
---
title: Include Video in the Post
published: 2023-10-19
// ...
---

<iframe width="100%" height="468" src="https://www.youtube.com/embed/5gIf0_xpFPI?si=N1WTorLKL0uwLsU_" title="YouTube video player" frameborder="0" allowfullscreen></iframe>
```

## YouTube

::youtube{id="5gIf0_xpFPI" title="YouTube video" preload="auto"}

## Bilibili

::bilibili{bvid="BV1fK4y1s7Qf" title="Bilibili video" p=1 preload="auto"}

## AcFun

::acfun{acid="ac48649632" title="AcFun video" preload="auto"}

## ArtPlayer

::artplayer{src="https://www.pexels.com/download/video/38538991/" title="Sintel trailer" preload="auto"}
