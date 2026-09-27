# Umami 统计集成指南

本项目使用 [oddmisc](https://www.npmjs.com/package/oddmisc) 集成 Umami 网站统计。

> 服务器自建 Umami 的完整步骤（Docker + PostgreSQL + Nginx + HTTPS + 博客接入）见
> [`docs/DEPLOYMENT_UMAMI.md`](./DEPLOYMENT_UMAMI.md)。

## 快速开始

### 1. 启用统计

编辑 `src/config/umamiConfig.ts`：

```ts
import type { UmamiConfig } from "@/types/umamiConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

export const umamiConfig: UmamiConfig = withUserConfig("umami", {
  enable: true,
  shareUrl: "https://your-umami-instance.com/share/<shareId>",
  // 可选：同时配置以下两项后，页面会加载官方 Umami 脚本采集访问数据。
  websiteId: "your-website-id",
  scriptUrl: "https://your-umami-instance.com/script.js",
  // 可选：在顶栏右上角显示唯一访客数（默认 false）。
  visitorBadge: true,
});
```

启用内容分离（`external`）模式时，无需修改主题代码仓。在内容仓创建
`config/umami.yaml`，写入需要覆盖的字段即可：

```yaml
# 内容仓/config/umami.yaml
enable: true
shareUrl: https://your-umami-instance.com/share/<shareId>
# 可选：只有需要向 Umami 上报访问时才同时填写以下两项。
# websiteId: your-website-id
# scriptUrl: https://your-umami-instance.com/script.js
# 可选：顶栏右上角显示唯一访客数。
# visitorBadge: true
```

配置覆盖会在 `content:sync` 时自动编译并合并到主题默认值；未填写的字段继续使用默认值。
`websiteId` 与 `scriptUrl` 都是可选字段：同时省略时仅启用公开分享统计；需要访问采集时必须同时填写，单独填写任一字段不会加载采集脚本。

### 2. 获取分享链接

在 Umami 后台：
1. 进入 **Settings** → **Share URL**
2. 创建新的分享链接
3. 复制生成的 URL（格式如下）

支持的 URL 格式：
- `https://umami.example.com/share/<shareId>`
- `https://cloud.umami.is/analytics/us/share/<shareId>`
- `https://umami.example.com/analytics/share/<shareId>`

### 3. 可选访问采集

`shareUrl` 只负责读取公开分享统计。需要让 Shirone 页面本身向 Umami 上报访问时，
在 `enable: true` 的前提下再同时配置 `websiteId` 与 `scriptUrl`；只配置其中一项不会加载采集脚本。

采集脚本与 `shareUrl` 已解耦：你可以只配 `websiteId` + `scriptUrl` 而**不配** `shareUrl`，
让访问正常被记录、同时不把分享链接注入全站（私密统计页 `/stats/` 正是靠这一点保持分享链接不公开）。

### 4. 顶栏唯一访客徽标（可选）

设置 `visitorBadge: true` 后，顶栏右上角会显示 Umami 的 `visitors`（唯一访客数）。
该数字由 Umami 服务端为每个访客生成的匿名标识去重统计，不需要项目新增接口或数据库；
运行时复用现有 `getSiteStats()` 请求，结果按 oddmisc 默认缓存策略缓存。

需要让新访客持续累加，必须同时配置 `websiteId` 与 `scriptUrl`；否则徽标只能读取
Umami 中已有的历史公开统计。徽标在 `<480px` 的视口自动隐藏，避免挤压移动端顶栏；
关闭 `visitorBadge` 或 `enable: false` 时不产生任何访客徽标 DOM 与额外请求。

### 5. 独立访问统计页 `/stats/`（密码保护，可选）

除了顶栏徽标，还可以生成一个**独立跳转、需要密码**的统计页：

```bash
# .env（已 gitignore，不会提交；服务器上构建时同样需要）
VISITOR_STATS_SHARE_URL="https://your-umami-instance.com/share/<shareId>"
VISITOR_STATS_PASSWORD="一个足够长的密码"
# VISITOR_STATS_HINT="可选：显示在密码框下方的提示"
```

构建后访问 `https://your-domain/stats/`，输入密码即可查看：

| 区间 | 指标 |
|---|---|
| 今日 / 近 7 天 / 近 30 天 / 全部时间 | 访客数（`visitors`，匿名去重）、页面浏览、访问次数 |
| 实时 | 当前在线人数（`getActiveVisitors`） |
| 近 30 天 | 按天 pageviews 迷你趋势图 |

实现方式与安全边界：

- **静态至上**：不新增任何常驻服务端。分享链接与密码只通过**构建期环境变量**注入；
  页面在构建时用密码把 `shareUrl` 加密成 AES-GCM 密文（复用
  `utils/password-protection` 与 `PasswordGate`），产物 HTML 中既没有明文密码，
  也没有明文分享链接。
- **按需加载**：只有密码解密成功后才 `import("oddmisc")` 拉取统计；未解锁时
  对统计接口零请求，且 oddmisc 不进入首屏包。
- **未配置即关闭**：`VISITOR_STATS_SHARE_URL` 或 `VISITOR_STATS_PASSWORD` 任一缺失时，
  `/stats/` 直接重定向到 404，页面不进导航、`noindex`。
- **区间不可相加**：今日 / 7 天 / 30 天区间互相包含，各自是「该区间内去重人数」，
  不要相加当总量。
- **密码强度**：这是纯静态页面的门控，密文随产物公开，属于「防君子不防小人」。
  请使用足够长的随机密码；如需真正的访问控制，应在托管层启用
  Vercel / Netlify 的密码保护或 Cloudflare Access。
- **数据口径**：`visitors` 是 Umami 用匿名访客 ID 去重的「浏览器档案数」，
  同一人换浏览器 / 清缓存会算新访客，不是自然人身份。

## 零额外负担原则

- `enable: false` 时：零网络请求、零 DOM、零客户端脚本与样式
- 仅当 `enable: true` 且 `shareUrl` 有效时才注入 oddmisc 运行时与统计 UI
- `visitorBadge` 默认 `false`；关闭时零额外 DOM、零额外请求，开启后复用同一份站点统计缓存
- UI 由 SSR 直接输出稳定数值槽，异步数据只替换槽内文本，不改变布局
- 官方 Umami 采集脚本仅在 `websiteId` 与 `scriptUrl` 都有效时加载

## 客户端 API

启用后，浏览器控制台可用 `window.oddmisc`：

```js
// 站点整体统计
const site = await window.oddmisc.getSiteStats();

// 指定页面统计
const about = await window.oddmisc.getPageStats("/about");

// 实时在线访客
const live = await window.oddmisc.getActiveVisitors();

// 就绪事件
window.addEventListener("oddmisc-ready", (e) => {
  e.detail.client.getSiteStats().then(console.log);
});
```

## 返回结构

```ts
interface StatsResult {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces?: number;
  totaltime?: number;
  comparison?: {
    pageviews?: number;
    visitors?: number;
    visits?: number;
    bounces?: number;
    totaltime?: number;
  };
  _fromCache?: boolean;
}
```

## 缓存机制

- 内存 + localStorage 双级缓存
- 默认 TTL：1 小时（由 oddmisc 管理）
- 缓存命中时返回值带 `_fromCache: true`
- `client.clearCache()` 可清空缓存

## 错误处理

所有错误继承自 `UmamiError`（带 `code` 与可选 `status`）：

- `UmamiUrlError` — `INVALID_URL`，无效分享链接
- `UmamiAuthError` — `AUTH_FAILED`，401，shareId 失效
- `UmamiNetworkError` — `NETWORK_ERROR`，非预期状态码
- `UmamiTimeoutError` — `TIMEOUT`，请求超时（默认 10s）

## Node 端使用

```ts
import { createUmamiClient } from "oddmisc";

const client = createUmamiClient({
  shareUrl: "https://your-umami-instance.com/share/<shareId>",
});

const page = await client.getPageStats("/about");
const site = await client.getSiteStats();
const series = await client.getPageviews({
  startAt: Date.now() - 24 * 3600_000,
  endAt: Date.now(),
  unit: "hour",
  timezone: "Asia/Shanghai",
});
const topPaths = await client.getMetrics("path", { limit: 10 });
```

## 浏览器兼容性

现代浏览器（Chrome 60+、Firefox 60+、Safari 12+）；需要 `fetch`、`URL`、`AbortController`、`localStorage`。
