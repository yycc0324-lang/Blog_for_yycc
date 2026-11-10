---
title: "Agent 项目 M1 续：执行树里的耗时是怎么来的"
published: 2026-11-09
publishedAt: 2026-11-09T20:00:00+08:00
description: "一条 9 秒的 Agent 请求，执行树上 8 个节点的耗时只有两个是量的。记录 answer 的 8925 怎么被倒推出来、0ms 的三种来源、token 为什么不在 span 上，以及把每次模型调用单独计时之后树该长什么样。"
tags: [Agent, Trace, Spring Boot, 可观测性, 教程]
category: 教程
lang: zh_CN
draft: false
---

上一篇 [M1 复盘](/posts/agent-m1-pitfalls/) 的末尾提到 Trace 是空壳，`duration_ms` 写死 0，span 没有父子，token 一直是 0。后来把这三处都修了，树能挂起来，每个节点也有毫秒数。

修完我打开一条 9 秒的记录，看了一会儿发现不对。

## 1. 一条 9 秒的请求

```text
agent.run        9117ms
├─ code_agent       0ms
├─ search_code    146ms
├─ search_code     46ms
├─ read_file        0ms
├─ read_file        0ms
├─ read_file        0ms
└─ answer         8925ms
```

`0 + 146 + 46 + 0 + 0 + 0 + 8925 = 9117`，子节点加起来正好等于根。

第一眼看这个结果挺舒服，账是平的。盯久了会发现一个问题：最后那个 8925 不是量出来的。

## 2. 总时长是量的

Java 在调 Python 前后各取一次时间：

```java
long start = System.currentTimeMillis();
AgentRunResponse resp = agentRuntimeClient.run(req);
int latencyMs = (int) (System.currentTimeMillis() - start);
```

这段包住的是「Java 把请求发出去，到 Python 把结果吐回来」。9117 里有网络、FastAPI 处理、4 次模型调用、5 次工具调用、Python 的 JSON 序列化。Java 自己写库、拼返回值的时间不在里面。

这个数可以信。

## 3. 工具耗时也是量的

Python 用 `perf_counter()` 包住工具调用：

```python
tool_started = time.perf_counter()
result = run_tool(name, arguments, request.repo_url)
duration_ms = int((time.perf_counter() - tool_started) * 1000)
```

146ms、46ms 是这么来的，从进入工具到返回结果。三个 `read_file` 是 0，因为本地读文件不到 1 毫秒，乘 1000 再取整就没了。

0 说明它很快，不说明它没跑。

## 4. answer 的 8925 是算的

Python 在循环结束后补了一条 `answer`：

```python
started_at = time.perf_counter()

for _ in range(max(1, settings.agent_max_steps)):
    ...

steps.append({
    "type": "answer",
    "tool": "answer",
    "args": {"query": query},
    "status": "success",
    "result_count": len(citations),
    "duration_ms": int((time.perf_counter() - started_at) * 1000),
})
```

`started_at` 记在第一次调模型之前，所以这个数是整轮，包含所有模型调用和所有工具。

Java 如果原样落库，`answer 9117 + 工具 192 = 9309`，子节点比根还大。所以 Java 里加了这段：

```java
int toolMillis = steps.stream()
        .filter(s -> "tool_call".equals(s.getType()))
        .mapToInt(s -> s.getDurationMs() == null ? 0 : s.getDurationMs())
        .sum();

if ("answer".equals(step.getType())) {
    durationMs = Math.max(0, latencyMs - toolMillis);
}
```

`8925 = 9117 - 192`。这个数是 Java 现算的。

模型接口返回 `content`、`tool_calls`、`usage` 三样东西。它不知道这次调用花了多久，返回体里没有耗时的字段。

## 5. 倒推的代价

这次请求里模型被调用了 4 次。真实顺序大概是：

```text
想 2s → 搜 146ms → 想 1.8s → 搜 46ms → 想 2.2s → 读三次 → 想 2.7s → 回答
```

树上是：

```text
工具 192ms + answer 8.9s
```

想知道第一轮是不是提示词太长，第三轮是不是上下文变大，看不出来。所有思考被揉进最后一个节点。

后面接 RAG，会多出检索、重排，倒推的减法要跟着改。答辩时被问「为什么回答要 9 秒」，只能答「模型慢」。实际 9 秒是 4 次调用拼起来的，单次大概 2 秒。

## 6. 0ms 的三种来源

| 节点 | 0 的来源 |
| :--- | :--- |
| `route` | 写死 |
| `read_file` | 真实耗时，小于 1ms 被截断 |
| 所有节点 | Java DTO 没声明字段，Jackson 丢掉 |

第三种最误导。Python 已经返回了 `duration_ms: 146`，Java 的 `AgentStep` 只声明了 `type`、`tool`、`args`、`status`、`result_count` 五个字段。Jackson 默认把不认识的字段丢掉，启动不报错，运行时不警告，表现就是整棵树全 0。

加一行注解就好：

```java
@JsonProperty("duration_ms")
private Integer durationMs;
```

拿到一条全 0 的 trace，先去 DTO 里找字段。只有 `read_file` 是 0、别的节点有值，那是正常的。

## 7. 时间轴是拼的

`AgentTraceService.completeTask` 里有个游标：

```java
LocalDateTime cursor = rootStartedAt;
for (AgentStep step : steps) {
    LocalDateTime startedAt = cursor;
    LocalDateTime endedAt = cursor.plusNanos(durationMs * 1_000_000L);
    cursor = endedAt;
}
```

它知道每段多长，不知道每一段真实从几点开始。于是从 `task.startedAt` 出发，按步骤顺序一段段往后排。树上的 `started_at`、`ended_at` 是拼出来的时间轴，不是真实发生的时刻。

根的开始取建任务的时间，总时长从调 Python 开始算，两者差几毫秒，根的结束时间会比真实结束稍晚。

还有个副作用。`duration_ms` 是 0 的节点，`cursor` 不动，几个 `read_file` 的 `started_at` 完全相同。查询只按 `started_at` 排序，兄弟节点的顺序就不稳定。建表用的是 `DATETIME(3)`，只到毫秒，0ms 的节点必然并列。要固定顺序，排序里加 `id` 兜底。

## 8. token 不在 span 上

`trace_span` 的列里没有 token。token 存在 `message` 表：

```text
prompt_tokens, completion_tokens, total_tokens
```

写这三列的地方只有保存助手消息的那一处。查 Trace 时读的是另一张表，所以 `getTrace` 里曾经是：

```java
response.setTokens(0);
```

修法是顺着 `span.message_id` 去 `message` 表拿一次：

```java
int tokens = 0;
for (TraceSpan span : spans) {
    if (span.getMessageId() != null) {
        tokens = messageRepository.findById(span.getMessageId())
                .map(m -> m.getTotalTokens() == null ? 0 : m.getTotalTokens())
                .orElse(0);
        break;
    }
}
```

取第一个带 `messageId` 的 span 就够，一次 trace 的所有 span 都指向同一条助手消息。

不要遍历 span 求和。消息里的总数已经是多轮模型调用累加出来的，求和会翻倍。

聊天页气泡下面的 token 和 Trace 详情页的 token 是两个来源。前者来自消息表，后者来自 `/api/traces/{id}`。查的时候先分清在哪一页。

失败任务没有助手消息，span 的 `message_id` 为空，这时 token 是 0，属于正常。

## 9. 统计和超时是一回事

这条容易被忽略：统计出来的耗时，决定了超时该配多少。

有一次请求跑了 384012ms。当时 Java 调 Python 的读超时是 180 秒，走 `/api/chat` 一定失败。后来改成 600 秒，可以用环境变量覆盖。

SSE 这边还是 120 秒，长回答会先断。要么把 emitter 的超时对齐到 600 秒，要么在等待期间发心跳。

演示的时候还得把 `agent_max_steps` 从 12 降到 6，提示词里加一句「信息够了就回答」。一条请求 6 分钟，现场没法演。

## 10. 每轮单独计时

想把时间统计准，给每次 `llm_client.chat` 也加一对 `perf_counter`：

```python
answer_ms = 0

for _ in range(max(1, settings.agent_max_steps)):
    llm_started = time.perf_counter()
    response = llm_client.chat(messages, tools=TOOL_SCHEMAS)
    answer_ms = int((time.perf_counter() - llm_started) * 1000)

    ...

    if not tool_calls:
        content = (message.get("content") or "").strip()
        break

    steps.append({
        "type": "llm",
        "tool": "llm",
        "args": {},
        "status": "success",
        "result_count": len(tool_calls),
        "duration_ms": answer_ms,
    })
```

循环结束后那条 `answer` 的 `duration_ms` 改成 `answer_ms`，只表示最后一次调用。

Java 这边把 `toolMillis` 那段求和和 `answer` 的倒推一起删掉，所有步骤都用 Python 返回的值。`mapSpanType` 加一个分支：

```java
if ("llm".equals(stepType)) {
    return "llm";
}
```

`llm` 不是新造的类型。`trace_span.span_type` 的建表注释里本来就写着 `llm / tool / retrieval / internal`，只是代码一直没产出过 `llm`。前端 `SpanType` 里有 `llm`，`TraceTree` 也准备了图标，补一个中文名就行：

```ts
llm: '模型思考',
```

改完树会变成这样：

```text
agent.run        9117ms
├─ code_agent       0ms
├─ llm           2100ms
├─ search_code    146ms
├─ llm           1800ms
├─ search_code     46ms
├─ llm           2200ms
├─ read_file        0ms
├─ read_file        0ms
├─ read_file        0ms
└─ answer        2700ms
```

子节点加起来会略小于根，差的是 HTTP、JSON 和落库的开销。这个差额是真实的，不要为了凑账把它补上。补了又回到倒推。

## 11. 怎么核对

四个检查：

| 检查 | 说明 |
| :--- | :--- |
| 每个非零节点有没有测量点 | `route` 和 `answer` 是重点怀疑对象 |
| 子节点之和是否小于等于根 | 精确相等要警惕倒推，略小正常 |
| 0ms 是哪一种 | 没测、字段被丢、截断 |
| 时间戳是不是真实时刻 | 节点像排队一样首尾相接，就是游标拼的 |

SQL 看一条 trace：

```sql
SELECT name, span_type, duration_ms, started_at, parent_span_id
FROM trace_span
WHERE trace_id = 'trace-xxx'
ORDER BY started_at, id;
```

接口看全貌：

```bash
curl -s http://localhost:8080/api/traces/<traceId> | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
print('spanCount:', d['spanCount'], 'duration:', d['durationMs'], 'tokens:', d['tokens'])
def walk(n, depth=0):
    print('  '*depth + f\"{n['name']} {n['durationMs']}ms\")
    for c in n.get('children') or []: walk(c, depth+1)
for r in d['spans']: walk(r)
"
```

`spanCount` 比预期多，说明根 span 重复写了。`tokens` 是 0，先查 span 的 `message_id`，再查消息的 `total_tokens`。

## 12. 什么时候值得改

如果项目只是输入问题、输出答案的 demo，一个总耗时够了，树可以不要。

这个项目的文档里写了 Trace、Eval、可观测性，后面还要接 RAG、Coding Agent 和多 Agent。那种场景下一个步骤失败就要定位，树是排查用的基础设施。

趁现在工具只有三个、步骤只有七八个，改起来便宜。等 RAG 进来，工具翻倍，再改就得连测试一起补。

现在这棵树能看，`answer` 那个 8.9 秒会一直误导人。
