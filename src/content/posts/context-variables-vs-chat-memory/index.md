---
title: "Swarm 解剖笔记：Agent、模型、框架各管什么？以及两种「记忆」到底差在哪"
published: 2026-09-20
description: "从一张 Swarm 时序图出发，把 Agent 对象、instructions 函数、Tool、AI 模型、Swarm 框架这五者的分工彻底拆开；再顺着「刷新网页还记得吗」这个追问，讲清 Context Variables 和 LangChain Memory 的区别、生命周期与使用限制。"
image: "./memory-overview.webp"
tags: [Agent, Swarm, LangChain, 多Agent, 记忆, AI]
category: 教程
lang: zh_CN
draft: false
---

我盯着一张 Swarm 的时序图看了很久，越看越觉得哪里不对，于是问题一个接一个冒出来：

- 智能体对象（Agent）在这张图里，好像从头到尾没给 Swarm 和模型**传递过任何东西**？
- 指令函数（instructions）能理解成自己写的 Tool 吗？
- 要调用哪个 Agent 专家，是 AI 决定的，还是程序员写死的？
- 没有算力，Agent 凭什么告诉 Swarm 该干嘛？难道靠程序员的 `if-else`？
- 用户说过的话被记下来了，关掉网页再回来，Agent 还记得吗？

这些问题问得很杂，但它们其实指向同一个核心：**在 Swarm 里，到底谁在干活？**

所以这篇文章我打算先把「人」分清楚，再顺着「记忆」这条线走到底。图和代码都给上。

![Swarm Context Variables 与 LangChain Memory 的总览对比](./memory-overview.webp)

*图 0：先给结论——一个管「传」，一个管「存」。后面慢慢展开。*

## 一、先把五个人认清楚

一张 Swarm 的图里其实站着五个角色：

| 角色 | 是什么 | 在哪 |
| --- | --- | --- |
| **Agent 对象** | 配置表：我是谁、我怎么说话、我能用什么工具、我用哪个模型 | 你的 Python 进程内存里 |
| **instructions 函数** | Agent 配置的一部分，用来动态生成系统提示词 | 你写的代码里 |
| **Tool / 功能函数** | Agent 配置的一部分，真正执行动作（查天气、查账户…） | 你写的代码里 |
| **AI 模型** | 真正的推理引擎、算力的来源 | OpenAI / 别人的服务器上 |
| **Swarm 框架** | 调度器：读配置、组装请求、执行工具、处理交接 | 你的 Python 进程内存里 |

![Swarm 内部角色分工图](./swarm-role-division.webp)

*图 1：三者的数据流向——所有「传递」的发起方都是 Swarm。*

### 1.1 Agent 对象：它不是执行者，是一张「配置表」

:::note 你可能会问：智能体对象在 Swarm 和指令函数中间到底是干啥的？
:::

**它什么都不干。它只被读取。**

时序图里，Agent 只出现在两个动作里：

```
Swarm框架 → 获取agent.instructions → 智能体对象
          → 获取agent.model        → 智能体对象
```

注意箭头的方向：**是 Swarm 主动去「获取」Agent 的属性，不是 Agent 主动「推」给 Swarm。**

```python
agent = Agent(
    name="客服",
    instructions=instructions,   # 字符串 或 函数
    model="gpt-4o",              # 用哪个模型
    functions=[...],             # 挂了哪些工具
)
```

这个对象创建完就静静地待着。Agent 自己不执行、不推理、不调用函数，它就是一张**被查询的配置表**。

至于「它全程没传递东西」——你的观察是对的，而且这正是设计意图。因为 Agent 是**无状态的配置对象**：可以预创建、可以复用。如果它主动往外推数据，就得自己维护状态、知道当前在跟谁说话、消息发到哪了……那它就不是 Agent，而是 Swarm 了。

> 用演戏打个比方：**Agent 是演员**（提供角色设定和技能），**Swarm 是导演**（决定什么时候让谁上场、带什么道具）。演员不会自己冲上台，得导演叫。

### 1.2 instructions 函数 ≠ Tool（这是最容易混的地方）

:::note 你可能会问：指令函数可以理解为自己写的 Tool 吗？反正都是我自己写的 Python 函数。
:::

**不能。** 它们虽然都是你写的函数，但走的是两条完全不同的路。

![instructions 函数与 Tool 的两条路径对比图](./instructions-vs-tool.webp)

*图 2：一个的产物是「提示词」，一个的产物是「工具返回」。*

| | instructions 函数 | Tool / 功能函数 |
| --- | --- | --- |
| **谁调用它** | Swarm 框架 | **AI 模型决定**，Swarm 代执行 |
| **什么时候** | 每次准备 AI 请求之前 | AI 返回 `tool_calls` 之后 |
| **传什么参数** | `context_variables` | AI 提取的参数 + `context_variables` |
| **返回值给谁** | 返回给 Swarm，拼进系统提示词 | 作为 tool 消息塞回对话历史 |
| **AI 知道它存在吗** | **不知道**，AI 只看到它生成后的文字 | **知道**，AI 看到它的 JSON schema |

用一句话概括区别：

> **指令函数是「你写、Swarm 调、结果变成提示词」；Tool 是「你写、AI 决定调、结果变成工具返回」。**

也正因为如此，**指令函数不执行任何业务操作**——它不查数据库、不调 API，只负责「根据上下文，现场拼一段提示词出来」。真正干活的是 Tool。

#### 那「众多动态 prompt」是怎么选的？

:::note 你可能会问：一个 Agent 可以准备很多段动态 prompt，Swarm 怎么确认这次用哪一段？靠 AI 判断吗？
:::

**不靠 AI。** 这里根本没有「从多个 prompt 里挑一个」的动作。

Swarm 做的事非常朴素：

```python
if callable(agent.instructions):
    instructions = agent.instructions(context_variables)  # 是函数 → 调用它
else:
    instructions = agent.instructions                     # 是字符串 → 直接用
```

`callable()` 是 Python 内置函数，判断一个对象能不能加括号执行：函数返回 `True`，字符串返回 `False`。

所谓「众多动态 prompt」，其实是**同一个函数，根据不同的 `context_variables` 返回不同的字符串**：

```python
def instructions(context_variables):
    if context_variables.get("vip"):
        return "你是一位 VIP 专属客服，语气要更热情。"
    return "你是一位普通客服，语气专业即可。"
```

- 选择逻辑：**程序员写死的 `if-else`**
- 判断依据：`context_variables`
- 执行者：Python 解释器
- **AI 模型此时还没出场**——Swarm 是在「准备调用 AI」的阶段就把这段 prompt 定好了，然后连同对话历史、工具 schema 一起发给模型。AI 看到的只是结果。

#### 顺带一个细节：Tool 怎么拿到上下文？

AI 在决定调用工具时，**只会提取用户明确说出来的参数**（比如 `location="Paris"`）。它不会、也不该去管 `context_variables`——那是框架内部的共享状态，不是从对话里能提取的东西。

所以 Swarm 在中间补了一手：

```python
if __CTX_VARS_NAME__ in func.__code__.co_varnames:
    args[__CTX_VARS_NAME__] = context_variables   # 向功能注入上下文
raw_result = func(**args)                          # 执行功能
```

翻译一下：**你这个工具函数的参数列表里，如果写了一个叫 `context_variables` 的参数，Swarm 就自动把当前上下文塞进去；没写就不塞。**

于是你的工具函数可以同时拿到两样东西：**AI 提取的业务参数** + **Swarm 维护的上下文**。

### 1.3 模型不是 Swarm「判断」出来的

:::note 你可能会问：Swarm 拿到提示词和工具后，会判断该用哪个 AI 模型吧？
:::

**不会。** 模型名是 **Agent 自己配好的**，Swarm 只是**读**它，不是**选**它。

```python
agent = Agent(model="gpt-4o", ...)      # 这里就定死了
# Swarm 内部： chat.completions.create(model=agent.model, ...)
```

Swarm 不会说「这任务简单，换个便宜的」，也不会说「这任务复杂，升到 GPT-4」。**Agent 说用什么，Swarm 就用什么。**

模型唯一会「变」的场景是 **handoff**：当前 Agent 把对话交给另一个 Agent，Swarm 更新 `active_agent`，下一轮循环重新去读**新 Agent** 的 `agent.model`。变的原因是**换了 Agent**，不是 Swarm 自己判断的。

:::note 你可能会问：Agent 不需要算力判断调用吗？没有算力，Agent 靠什么告诉 Swarm 东西，难道靠程序员写的逻辑？
:::

这个问题问得很尖锐，而且答案是：**这两件事要分开看。**

- **程序员写的逻辑**，负责的是「声明」：Agent 叫什么、用哪个模型、挂哪些函数、instructions 是字符串还是函数。这些写代码的时候就定好了，**不需要算力**。
- **真正需要算力的「判断」**，只有一件事：**用户这句话，该不该触发某个函数调用？** 该调退款函数还是天气函数，还是什么都不调直接回复——这才是模型算出来的。

所以更准确的表述是：

> **Agent 提供「我是谁、我能干什么、我能找谁」的声明。**
> **AI 模型用算力，在这些声明范围内做「现在该干什么」的判断。**
> **Swarm 把判断落地执行。**

没有 AI 模型的算力，Agent 就是一张写死的配置表；但没有程序员的声明，模型也不知道有哪些选项可选。**两者缺一不可，但「选哪个」确实是模型算出来的。**

顺便纠正一个常见误解：**Agent 对象里并不「包含」AI 模型**，它只存了模型的名字（`"gpt-4o"`）。真正的模型在别人的服务器上。更准确的公式是：

> **Agent 对象 = 外置内容（instructions / functions）+ 「用哪个模型」的指针。**

### 1.4 handoff：谁决定转交给哪个 Agent 专家？

:::note 你可能会问：AI 模型和智能体对象，谁才是 Agent？谁判断什么时候调用哪个专家？
:::

**智能体对象才是 Agent**；AI 模型只是它借用的「大脑」。至于「什么时候调用哪个专家」，这件事被拆成了三段，各管一段：

![handoff 的三段分工图](./handoff-division.webp)

*图 3：「调不调」「去哪」「怎么转」分别由三个角色负责。*

| 环节 | 谁负责 | 靠什么 |
| --- | --- | --- |
| **要不要触发转交** | **AI 模型** | 算力判断：用户说「我要退款」，该调 `transfer_to_refund_agent` |
| **转交给谁** | **程序员** | 写死的函数返回值：`def transfer_to_refund_agent(): return refund_agent` |
| **转交动作本身** | **Swarm 框架** | 执行函数 → 更新 `active_agent` → 下一轮用新 Agent 的配置 |

关键点在于：**AI 模型看不到「会转到哪个 Agent」**。它只看到这个函数的名字和文档字符串，它决定的是「调不调」，而不是「调了之后去哪」。

这点很容易被说糊。有人（包括我自己第一次回答时）会说「是 AI 决定找哪个专家」——**不准确**。准确说法是：

> **AI 模型决定「要不要触发转交」，程序员决定「转交给谁」。**

这两件事是分离的，不是「都可以」。如果程序员不写那个函数，AI 模型**永远无法转交**——它的工具列表里根本没有这个选项。

### 1.5 小结

| 组件 | 角色 | 一句话 |
| --- | --- | --- |
| **Agent 对象** | 定义者 | 我是谁、我怎么说话、我能用什么工具、我能转交给谁、我用哪个大脑 |
| **AI 模型** | 决策者 | 在当前 Agent 划定的范围内，用算力决定「现在该做什么」 |
| **Swarm 框架** | 执行者 | 读配置、组请求、发模型、执行工具、切换 Agent |

**Agent 是身份，AI 模型是大脑，Swarm 是手脚。**

## 二、context_variables 到底是个什么东西

分清了角色，再回头看上下文变量就清楚多了。它有三个容易被忽略的细节。

### 2.1 你传进去的字典，Swarm 会先复制一份

```python
def run(...):
    active_agent = agent
    context_variables = copy.deepcopy(context_variables)   # ← 这里
    while ...:
        completion = self.get_chat_completion(
            agent=active_agent,
            context_variables=context_variables,           # 传的是副本
            ...
        )
        if message.tool_calls:
            context_variables.update(partial_response.context_variables)
    return Response(context_variables=context_variables)   # 返回被改过的副本
```

所以：

- **你传进去的**：初始上下文（原始字典，全程不被改动）
- **运行时用的**：深拷贝出来的**副本**
- **你拿回来的**：运行过程中被工具函数更新过的**副本**

要持久化这次运行产生的新数据，得从 `response.context_variables` 里自己取出来存——**你原来那个字典从头到尾是干净的**。

### 2.2 它的生命周期只有「一次 run」

它就是一个普通 Python 字典，随 `client.run()` 而生，随 `client.run()` 而灭。框架不负责持久化。

:::note 你可能会问：用户之前说过一些信息，被多 Agent 共享了。现在我关掉网页、刷新重新进来，Agent 还记得吗？
:::

**不记得。刷新后共享状态全部清零。**

因为 `context_variables` 只活在单次运行的内存里。刷新网页本质上就是：

1. 原来的进程 / 会话结束；
2. 内存里的字典被回收；
3. 新会话调用 `client.run()` 时，你不主动传，Swarm 拿到的就是空字典。

要想「还记得」，你必须自己做三件事——**存、取、传**：

```python
# 存：上次运行结束
response = client.run(...)
db.save(conversation_id, response.context_variables)   # 你手动存

# 取：新会话开始
context = db.load(conversation_id)                     # {"name": "小明", "user_id": 456}

# 传：重新塞回去
response = client.run(
    agent=agent,
    messages=load_messages(conversation_id),           # 对话历史也要一起恢复
    context_variables=context,                         # 关键：手动传回
)
```

注意 **messages 和 context_variables 是两回事**：如果你恢复了 `messages`，AI 能从文本里「看到」之前聊过什么——但那是**AI 在读文本**，不是 `context_variables` 自动恢复了。

## 三、那两种「记忆」呢？

到这里，我们终于可以正面回答那个最初的问题了。

### 3.1 一句话区分：一个管「传」，一个管「存」

- **LangChain 的 Memory，是「存东西的地方」**——重点是数据放在哪、怎么持久化。
- **Swarm 的 Context Variables，是「传东西的管子」**——重点是同一次运行里，不同组件怎么拿到同一份数据。

不过要诚实补一句，免得被这个说法绕进去：**把数据放进字典，本身也是一种「存」。** `context_variables = {"user_id": 456}` 当然是把 456 存起来了。

所以「传 vs 存」只是方便记忆的简化说法。严格来讲，两者真正的差别在三个地方：**生命周期**（活多久）、**作用域**（谁能看见）、**持久化归谁管**（谁负责在运行结束后把它留下来）。

| 维度 | Swarm · Context Variables | LangChain · Memory / ChatMemory |
| --- | --- | --- |
| **核心定位** | 单次运行内的共享状态容器 | 跨轮次 / 跨会话的对话历史容器 |
| **作用域** | 一次 `client.run()` 调用 | 跨轮次、跨会话 |
| **数据形态** | Python `dict`，几 KB 的结构化字段 | `messages` 序列，存对话全文 |
| **生命周期** | 运行结束即消失，框架不负责落盘 | 默认在内存；**配了后端**才能持久 |
| **多 Agent 共享** | `handoff` 时**自动**跟着走 | 框架层面**不为此设计**，要共享得自己搭桥 |

![两种记忆的生命周期对比图](./memory-lifecycle.webp)

*图 4：`context_variables` 只在单次 run 内活着；ChatMemory 配了后端才能跨轮存活。*

### 3.2 一个常见说法是错的：「LangChain 持久，Swarm 临时」

:::warning 这里我自己被打脸过一次
我一开始的表述是「LangChain 的记忆是持久的，Swarm 的字典是临时的」。**这个对比不准确。**
:::

准确的事实是：

- **LangChain 的默认实现 `ConversationBufferMemory`**：数据存在**内存**里，进程重启 / 刷新页面**同样丢**。**默认并不持久。**
- **只有当它挂上持久化后端**（`RedisChatMessageHistory`、`PostgresChatMessageHistory`、`MongoDBChatMessageHistory` 之类）时，数据才写进外部存储，才能跨会话恢复。

所以「可以持久」和「默认持久」是两回事。真实的区别不是「一个持久、一个不持久」，而是：

| | LangChain Memory | Swarm context_variables |
| --- | --- | --- |
| 默认存哪 | 内存 | 内存 |
| 刷新后默认记得吗 | **不记得** | **不记得** |
| 框架提供持久化后端吗 | **提供**，换个 Memory 类就能接数据库 | **不提供**，全靠自己写 |
| 要实现持久得写多少代码 | 配置一下 | 自己写「存 / 取 / 传」三套逻辑 |
| 主要存什么 | 对话消息历史（messages） | 结构化共享字段 |

> **两者默认都不持久，刷新后都不记得。区别在于：LangChain 给了你「接上数据库就能持久」的现成路径，Swarm 没有，你得自己从头搭。**

### 3.3 那「不如直接用 LangChain 的 ChatMemory」成立吗？

**不成立，因为它们解决的不是同一个层面的问题。**

- 你要的是**对话历史持久化**（刷新后还能看到聊过什么）→ LangChain 的 Memory + 持久化后端确实更省事；
- 你要的是**多 Agent 之间共享结构化状态**（`user_id`、账户类型这类字段，不想塞进对话文本里）→ `context_variables` 是原生设计，LangChain 反而没有直接对应的机制，得你自己搭。

两者不是替代关系。你完全可以在 LangChain 里也维护一份类似的共享字典，或者在 Swarm 外面套一层 LangChain 的持久化消息历史。

### 3.4 职责边界：什么进 messages，什么进 context_variables

:::note 你可能会问：假设用户说——「我叫小明，我在 A 高中上学，周末要和小美去约会，晚上还得写作业，帮我找个近点的好吃的店」——我该把什么塞进 context_variables？
:::

**这段文本本身，什么都不用塞。**

![messages 与 context_variables 的职责边界图](./memory-boundary.webp)

*图 5：对话全文交给模型理解；只有需要显式共享的已知字段才进字典。*

- **`messages` 负责「理解」**：把完整对话交给模型，它自己就能读出「用户叫小明」「在 A 高中」「赶时间」。
- **`context_variables` 负责「共享」**：只有当某个信息**需要被跨 Agent、跨函数显式传递**时，才把它放进字典。

这里最关键的一点：**「提取」这个动作是开发者做的，Swarm 不会自动干。**

Swarm 自己**不会**去原文里检索关键词，也不会判断「小美」算不算关键变量。它只负责三件事：**把字典传进 `run()`、handoff 时带着它走、把工具函数写回的值合并进去。** 就这三件。

常见的字段来源有三种：你写规则提取、你调一次 LLM 做结构化抽取、你写的工具函数通过 `Result(context_variables={...})` 写回。

### 3.5 各自的「不要指望」清单

**Context Variables：**

- **不自动提取**——它是一只空箱子，放什么完全由你和你的函数决定；
- **只适合预设场景**——你必须提前知道有哪些字段要共享（客服、订票、账户查询这类流程固定的业务）；
- **不适合开放文本理解**——用户输入完全开放时，提前定义字段是徒劳的，交给 `messages`；
- **不持久化**——运行结束即消失；
- **容量小**——官方定位是 KB 级，塞进大段文本只会拖慢执行（它会被传给 instructions 函数和所有工具函数）。

**Memory / ChatMemory：**

- **持久化是「配置」出来的**，不是自带的；
- **不负责跨 Agent 共享**——LangChain 的多 Agent 通常走工具调用 / 任务分发，各子 Agent 有各自上下文，要共享得自己在应用层搭桥；
- **存全文会膨胀**——对话越长，token 成本和延迟越高，通常需要自己裁剪、摘要或检索；
- **它管「说过什么」，不管「关键字段是什么」**——想要一个可靠的 `user_id`，还是得自己结构化出来。

### 3.6 实际项目里怎么搭配

```python
# 1) 取出「说过什么」和「关键字段」——这两份都由你自己持久化
messages = load_messages_from_db(conversation_id)
context = load_context_from_db(conversation_id)   # {"user_id": 123, "name": "张三"}

# 2) 关键字段交给 Swarm，让它在本次运行里自动传给各 Agent / 函数
response = client.run(agent=agent, messages=messages, context_variables=context)

# 3) 运行结束，两份分别存回去
save_messages_to_db(response.messages)            # 对话全文 → ChatMemory 的职责
save_context_to_db(response.context_variables)    # 关键字段 → 自己持久化
```

## 四、三句话收尾

1. **Swarm 里：Agent 是配置表，AI 模型是算力，Swarm 是手脚。** 「调不调工具」靠模型算，「调了之后去哪」靠程序员写死，「怎么执行」靠 Swarm 落地——三段各管一段，互不重叠。
2. **`context_variables` 管「传」**：单次运行内的共享状态，随 handoff 自动流动，运行完即消失，**不会自动提取字段**，要持久化得自己「存、取、传」。
3. **LangChain 的 Memory 管「存」**：默认也是内存、刷新也丢；它比 Swarm 多的不是「持久化能力」，而是**现成的持久化插件**。开放文本理解交给 `messages`，只有「已知且需要跨组件显式共享」的字段，才放进 `context_variables`。
