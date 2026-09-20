---
title: "Swarm 的 Context Variables 和 LangChain 的 Memory，到底是不是一回事？"
published: 2026-09-20
description: "这两个常被混为一谈的「记忆」，一个管「传」，一个管「存」。本文用三张图讲清它们的定位、生命周期、数据边界和使用限制，以及实际项目里到底该怎么搭配。"
image: "./memory-overview.webp"
tags: [Agent, Swarm, LangChain, 记忆, 多Agent, AI]
category: 教程
lang: zh_CN
draft: false
---

我第一次读 Swarm 的文档时，看到「上下文变量（Context Variables）」这段，第一反应是：

> 这不就是给 Agent 加会话记忆吗？LangChain 里写个函数存一下不也能搞定？

后来我把这个问题来回嚼了好几遍，才发现自己把两个**作用范围完全不同**的东西，硬塞进了一个概念里。

它们都被中文社区叫作「记忆」，都能让 AI「记住点东西」，所以特别容易被当成同一件事的两种实现。但如果你真按这个理解去写项目，很快就会踩坑——比如指望 `context_variables` 帮你自动记住用户说过的话，或者以为换了个更「高级」的记忆对象，多个 Agent 就能共享记忆了。

这篇文章想做的事很简单：**把这两套「记忆」各自的位置摆正。**

:::note 读完这篇你能分清
- 为什么说 Swarm 的 Context Variables 管「传」，LangChain 的 Memory 管「存」
- 两者的生命周期、数据形态、作用域到底差在哪
- `context_variables` 为什么**不会**自动提取关键信息，它到底适合什么场景
- 多 Agent 场景下「共享记忆」的正确姿势，以及实际项目里两者应该怎么配合
:::

![Swarm Context Variables 与 LangChain Memory 的总览对比](./memory-overview.webp)

*图 1：同样是「记忆」，一个负责在单次运行里传递，一个负责跨轮次存储。*

## 一、先纠正一个容易误导的类比

很多讲 Swarm 的文章（包括我最早看的那篇）会用这样一个类比：

> 上下文变量就像一块**所有对话参与者都能查看和更新的共享白板**，有点类似操作系统里线程的共享内存。

这个类比本身没错，但它太容易让人往「持久化」上想了。

「共享内存」这个词，天然带着一种「大家都知道、一直都在」的感觉。于是读者很容易顺势理解成：**只要我把用户偏好丢进上下文变量，那用户新开一个对话页面，AI 也应该记得我。**

这是不对的。

Swarm 的上下文变量，作用范围被严格限制在**一次 `client.run()` 调用**里。它不是一块钉在墙上的白板，更像是**一次会议里大家传阅的那张纸**——会议结束，纸就收走了。

> 想在新会话里继续用？可以，但得**你自己**在会议结束后把纸上的内容抄进档案柜，下次开会前再取出来贴上新的纸。

这个「自己抄、自己贴」的动作，就是应用层的持久化。Swarm 不管这段。

## 二、一句话记住区别：一个管「传」，一个管「存」

我把这个区别压缩成了一句最土的话：

- **LangChain 的记忆，是「存东西的地方」**——重点是数据放在哪、怎么持久化。
- **Swarm 的 Context Variables，是「传东西的管子」**——重点是同一次运行里，不同组件怎么拿到同一份数据。

不过这里要诚实补一句，免得你被这个说法绕进去：**把数据放进字典，本身也是一种「存」。**

`context_variables = {"user_id": 456}` 这行代码，当然是把 456 存起来了。所以「传 vs 存」只是一个方便记忆的简化说法。严格来讲，两者真正的差别在三个地方：

1. **生命周期**：这份数据活多久？
2. **作用域**：谁能看见它？
3. **持久化归谁管**：谁负责在运行结束后把它留下来？

把这三件事问清楚，混淆就自然没了。

## 三、五个维度看清差别

| 维度 | Swarm · Context Variables | LangChain · Memory / ChatMemory |
| --- | --- | --- |
| **核心定位** | 单次运行内的共享状态容器 | 跨轮次 / 跨会话的对话历史容器 |
| **作用域** | 一次 `client.run()` 调用 | 跨轮次、跨会话 |
| **数据形态** | Python `dict`，几 KB 的结构化字段 | `messages` 序列（`HumanMessage` / `AIMessage`），存的是对话全文 |
| **生命周期** | 运行结束即消失，框架不负责落盘 | 取决于后端：内存对象重启就没，换成 VectorStore / 数据库就持久 |
| **多 Agent 共享** | `handoff` 时**自动**跟着走 | 框架层面**不为此设计**，要共享得自己在应用层搭桥 |

这张表值得多看一眼的是最后两行，它们是最容易踩坑的地方。

**数据形态决定了它能装什么。** `context_variables` 装的是 `{"name": "张三", "user_id": 456}` 这类小字段；ChatMemory 装的是「用户说过什么、AI 回了什么」的完整消息列表。前者是**结构化变量**，后者是**长篇文本**。

**多 Agent 共享是 Swarm 的原生设计，但不是 LangChain ChatMemory 的设计目标。** 下面第四节细说。

![两种记忆的生命周期对比](./memory-lifecycle.webp)

*图 2：`context_variables` 只在单次 run 内活着；ChatMemory 每一轮都写进后端，下一轮还能取回来。*

## 四、生命周期与多 Agent：差别的真正来源

### 4.1 `context_variables` 是怎么流动的

在 Swarm 里，流程大致是这样的：

```python
response = client.run(
    agent=agent,
    messages=messages,
    context_variables={"user_id": 456, "name": "张三"},
)
```

这次运行中：

- Agent 的 `instructions` 可以是**函数**，运行时从 `context_variables` 里读 `name`，动态生成系统提示词；
- 功能函数（Tool / Function）被执行时，Swarm 会**自动把同一个字典注入进去**，让它能读到 `user_id`；
- 功能函数还能通过返回 `Result` **写回**新值，更新这块「白板」；
- 如果发生 **handoff**（把任务交接给另一个 Agent），这个字典会**原样带着走**，新 Agent 不用你重新传。

所以它在多 Agent 协作上是「开箱即用」的共享载体——这也是 Swarm 文档里强调的：上下文变量让 Agent 之间协作时不会丢失重要信息。

但请注意最后一步：运行结束后，你只能在 `Response.context_variables` 里把它捞出来。**你不捞，它就没了。**

### 4.2 ChatMemory 的「持久」，靠的不是函数，是后端

很多人对 LangChain 记忆的印象是「就一个简单的函数调用」：

```python
memory.save_context(inputs, outputs)
memory.load_memory_variables({})
```

看起来确实很朴素。但它能做到「跨会话还在」，靠的**不是**这两个调用本身，而是它们背后挂着的**存储后端**：

- `ConversationBufferMemory`：数据放在内存里，**进程一重启就没了**——这一点其实和 Swarm 的字典很像；
- 换成基于 VectorStore 的实现：数据落进 Chroma 这类向量库，可以配置持久化到磁盘；
- 换成 MongoDB / Postgres 之类的 Store：数据直接写库，跨进程、跨重启都能读回来。

同一个 `save_context`，背后可能只是往内存字典塞了一条，也可能是真的写进了数据库。**区别不在调用方式，在你给它配了什么后端。**

### 4.3 为什么 ChatMemory 不能直接当「多 Agent 共享记忆」

LangChain 的 `ConversationBufferMemory` 这类对象，核心职责是维护**某一条对话线程的消息历史**，供同一个 Agent 在后续轮次里「回忆」。

在 LangChain 的标准多 Agent 架构（比如 Supervisor 模式）里，Agent 之间的协作通常走**工具调用 / 任务分发**：主 Agent 把信息写进任务描述传给子 Agent，子 Agent 往往各有各的上下文窗口。它并**不是**靠一个共享的 Memory 对象来协同的。

当然，你完全可以在应用层手动把同一个 `shared_memory` 对象传给多个 Agent 用——社区里确实有人这么干。但那是你自己搭的桥，不是框架替你做的，和 Swarm 那种 `context_variables` 跟着 handoff 自动流动，是两种体验。

> 一句话：**Swarm 的共享是机制自带的，LangChain 的共享是你自己接的线。**

## 五、职责边界：什么该进 messages，什么该进 context_variables

搞清楚了上面的区别，就能回答一个非常实际的问题：

> 我这段用户输入——「我叫小明，我在 A 高中上学，周末要和小美去约会，晚上还得写作业，帮我找个近点的好吃的店」——到底该把什么塞进 `context_variables`？

答案可能和你期待的不太一样：**这段文本本身，什么都不用塞。**

![messages 与 context_variables 的职责边界](./memory-boundary.webp)

*图 3：对话全文交给模型理解；只有需要显式跨组件传递的已知字段，才放进上下文变量。*

正确的分工是这样的：

- **`messages` 负责「理解」**：把完整对话历史交给模型，模型自己就能从文本里读出「用户叫小明」「在 A 高中」「要约会」「赶时间」。这些不需要你提前结构化。
- **`context_variables` 负责「共享」**：只有当某个信息**需要被跨 Agent、跨函数显式传递**时，才把它放进字典。

比如一个订票场景：用户说「我要订去北京的票」，模型从 `messages` 里理解出目的地是北京。但你的系统还有个专门查航班的 Agent 或函数，需要拿到「北京」这个值——这时候才轮到你把 `destination` 显式放进 `context_variables`。

这里有个关键问题：**这个「提取」动作是谁做的？**

**是开发者。** Swarm 自己**不会**去原文里检索关键词，也不会判断「小美」算不算关键变量。常见做法有三种：

1. 你写规则提取（正则匹配、表单收集）；
2. 你调一次 LLM 做结构化抽取，让它输出 JSON，你再塞进字典；
3. 你写的功能函数执行后，通过 `Result(context_variables={...})` 自己写回。

Swarm 只负责三件事：**把字典传进 `run()`、handoff 时带着它走、把函数写回的值合并进去。** 就这三件。

## 六、使用限制：各自的「不要指望」

### 6.1 Context Variables 的限制

- **不自动提取。** 它是一只空箱子，谁往里放东西、放什么，完全由开发者和函数决定。
- **只适合预设场景。** 因为你必须**提前知道有哪些字段**需要共享——客服、订票、账户查询、订单处理这类流程相对固定的业务，是它的主场。
- **不适合开放文本理解。** 用户输入完全开放、你无法预判他会提到什么信息时，提前定义字段是徒劳的。这种场景交给 `messages` 和模型。
- **不持久化。** 运行结束即消失，要留就得自己在外面存。
- **容量小。** 官方定位是 KB 级的小数据，官方示例就是 `{"name": "James", "user_id": 123}` 这种量级。它会被传给 `instructions` 函数和所有功能函数，塞进大段文本只会拖慢执行。

### 6.2 Memory / ChatMemory 的限制

- **持久化是「配置」出来的，不是自带的。** 不配后端，默认实现一样是进程重启就丢。
- **不负责跨 Agent 共享。** 如上文所说，需要你自己在应用层把同一个记忆对象接给多个 Agent。
- **存全文会膨胀。** 对话越长，塞进上下文窗口的内容越多，token 成本和延迟都会跟着涨，通常还需要自己做窗口裁剪、摘要或检索。
- **它管「说过什么」，不管「关键字段是什么」。** 想让系统拿一个可靠的 `user_id`，你还是得自己从文本里结构化出来。

## 七、实际项目里，正确的搭配长这样

把两者的职责切开之后，一个典型的生产写法是：

```python
# 1) 取出「说过什么」和「关键字段」——这两份数据由你自己持久化
messages = load_messages_from_db(conversation_id)
context = load_context_from_db(conversation_id)   # {"user_id": 123, "name": "张三"}

# 2) 把关键字段交给 Swarm，让它在这一轮里自动传给各个 Agent / 函数
response = client.run(
    agent=agent,
    messages=messages,
    context_variables=context,
)

# 3) 运行结束，把更新后的两份数据分别存回去
save_messages_to_db(response.messages)            # 对话全文 → ChatMemory 的职责
save_context_to_db(response.context_variables)    # 关键字段 → 自己持久化
```

分工一句话：

- **`messages`（配合 ChatMemory）管「对话记录」**——长篇文本，可以很长，需要持久化和裁剪；
- **`context_variables` 管「跨 Agent / 跨函数传递的关键字段」**——几 KB 的结构化变量，随运行而生、随运行而灭。

它们不是二选一，也不是互相替代，而是**一个负责让模型理解上下文，一个负责让系统组件之间可靠地共享状态**。

## 八、最后，用三句话收尾

1. **Swarm 的 `context_variables` 管「传」**：单次运行内的共享状态，随 handoff 自动流动，运行完就没了，且**不会自动提取字段**。
2. **LangChain 的 Memory 管「存」**：对话历史的存储与检索，能不能持久取决于你给它配了什么后端，且**不会自动跨 Agent 共享**。
3. **开放文本的理解交给模型和 `messages`；只有「已知、且要显式跨组件传递」的字段，才放进 `context_variables`。**

想清楚这三句，再去看那些「共享白板」「共享内存」的类比，就不会被带偏了。
