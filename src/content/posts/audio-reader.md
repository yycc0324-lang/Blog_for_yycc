---
title: "音频朗读器：日系动画神秘语音合集"
published: 2026-08-29
description: 一小段日系动画风的神秘语音片段，用 Audio Reader 按需点播。
tags: [示例, 音频朗读器]
category: 示例
draft: false
---

这些短短的日语语音片段，像是从某个动画场景的边缘随手捡来的：一声戏谑的呼唤、一句明亮的问候、一缕轻笑，还有几句来历不明的台词。它们是"氛围样本"而不是台词稿，所以就让声音自己去表达意思吧。

Audio Reader 会让它们保持安静，直到你主动去听。每个喇叭按钮只在你按下之后，才会加载并播放对应的音频。

```markdown
:audio-reader[Clip title]{src="/assets/audio/filename.wav"}
```

## 语音片段

- **Baka**：:audio-reader[バカ]{src="/assets/audio/Baka.wav"}
- **Ciallo**：:audio-reader[Ciallo！！]{src="/assets/audio/Ciallo.wav"}
- **Ehe**：:audio-reader[A joking sense]{src="/assets/audio/Ehe.wav"}
- **Imoi**：:audio-reader[イモい]{src="/assets/audio/Imoi.wav"}
- **Zako**：:audio-reader[雑魚じゃん、雑魚雑魚]{src="/assets/audio/Zako.wav"}

`src` 必须使用站点根路径或 HTTPS 地址，指令里的标签也不能为空。写法非法或不完整的指令会保持为普通 Markdown，不会加载 Audio Reader 的相关资源。
