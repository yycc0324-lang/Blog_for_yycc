# 自建 Umami + 私密访问统计页部署

Shirone 的访问统计依赖 **Umami**：Umami 负责采集与聚合，博客只负责读取。
本文覆盖「在服务器上把 Umami 跑起来 → 反代出 HTTPS → 把三个值接进博客 → 构建部署」全流程。

| 类别 | 文件 |
| --- | --- |
| Umami 资产 | `docs/umami/{docker-compose.yml, .env.example, nginx-umami.conf}` |
| 辅助脚本 | `scripts/deploy-umami.sh`（up / down / logs / test / update）、`scripts/check-visitor-stats-env.mjs` |
| 前端配置 | `src/config/umamiConfig.ts`（采集）、构建期 `.env`（私密统计页） |
| 功能说明 | `docs/umami-guide.md` |

> 如果你参照的是 2022 年的老教程（MySQL + `mikecao/umami` 镜像），下面的 compose 是当前
> 官方 v2 + PostgreSQL 版本，两者都能用；后台入口、`script.js`、`/share/<id>` 分享链接格式一致。
> 老教程里的「分享链接」同样可以在 Settings → Websites → Share 里找到。

---

## 1. 链路

```
访客浏览器
  ├─ 打开博客任意页面 → 加载 https://umami.example.com/script.js → 上报访问
  └─ 打开 /stats/ → 输入密码 → 解密出分享链接 → 请求 https://umami.example.com/api/...
                                    └─ 数据由 Umami 的 PostgreSQL 聚合后返回
```

- 博客仍是纯静态 `dist/`，**构建产物里没有统计服务**；
- Umami 是独立容器 + 数据库，**重新 `pnpm build` 不会影响它**，访客数据不会丢；
- `/stats/` 的分享链接和密码只存在于**构建期环境变量**里，产物中为密文。

## 2. 服务器上部署 Umami

前置：服务器已有 Docker 与 Docker Compose 插件（`docker compose version` 有输出）。

```bash
# 在服务器上取本仓库（或只把 docs/umami 这三个文件拷上去）
git clone <你的仓库> shirone && cd shirone/docs/umami

# 1) 准备密钥
cp .env.example .env
openssl rand -hex 32   # 生成后填到 POSTGRES_PASSWORD
openssl rand -hex 32   # 再生成一次填到 APP_SECRET
vi .env

# 2) 启动
docker compose up -d

# 3) 自检
docker compose ps                 # 两个容器都应是 healthy
curl -fsS http://127.0.0.1:3000/api/heartbeat && echo OK
```

国内服务器如果拉 `ghcr.io` 慢，可先配置镜像加速，或把 image 换成你能访问的镜像源再 `docker compose up -d`。
用仓库自带脚本也行：

```bash
bash scripts/deploy-umami.sh up      # 等价于 compose up -d
bash scripts/deploy-umami.sh test    # 健康检查
bash scripts/deploy-umami.sh logs    # 跟踪日志
```

首次登录 Umami 后台是 `admin` / `umami`，**登录后第一件事改密码**。

## 3. Nginx 反代 + HTTPS

把 `docs/umami/nginx-umami.conf` 拷进 Nginx 配置目录，替换 `umami.example.com` 与证书路径，
`nginx -t && nginx -s reload`。宝塔面板用户：新建站点 → 反向代理到 `http://127.0.0.1:3000` → 申请 Let's Encrypt 证书即可。

验证：

```bash
curl -I https://umami.example.com/script.js
# 期望 200，Content-Type: application/javascript
```

## 4. 在 Umami 后台建站点，拿三个值

1. 登录 `https://umami.example.com` → **Settings → Websites → Add website**
   - Name：随意，如 `My Blog`
   - Domain：你的博客域名，如 `cnyicheng.top`
2. 进入该站点，记下 **Website ID**（形如 `1f2e3d4c-...`）。
3. **Settings → Websites → 你的站点 → Share**（老版本在 Edit 里）创建分享链接，得到
   `https://umami.example.com/share/<shareId>`。
4. 采集脚本地址就是 `https://umami.example.com/script.js`。

到此你手里应该有：

| 值 | 用途 | 放到哪 |
| --- | --- | --- |
| `https://umami.example.com/script.js` | 采集脚本 | `umamiConfig.scriptUrl` |
| `1f2e3d4c-...` | 站点 ID | `umamiConfig.websiteId` |
| `https://umami.example.com/share/<shareId>` | 读取统计 | 构建期环境变量 `VISITOR_STATS_SHARE_URL` |

## 5. 接进博客

### 5.1 开启采集（只配 websiteId + scriptUrl）

编辑 `src/config/umamiConfig.ts`：

```ts
export const umamiConfig: UmamiConfig = withUserConfig("umami", {
  enable: true,
  shareUrl: "", // 关键：留空，分享链接就不会被注入到全站 HTML
  websiteId: "1f2e3d4c-...",
  scriptUrl: "https://umami.example.com/script.js",
  visitorBadge: false, // 想顺便在顶栏显示总访客就设 true（会公开分享链接）
});
```

> 采集脚本与 `shareUrl` 已解耦：只要 `enable: true` 且 `websiteId`、`scriptUrl` 都在，就会加载脚本。
> 这样 `/stats/` 的分享链接能保持私密。若你想要顶栏访客徽标，则需要同时填 `shareUrl`（徽标读的就是它）。

内容仓模式则在 `config/umami.yaml` 写同样的字段。

### 5.2 配置私密统计页

在**执行构建的那台机器**上创建 `.env`（仓库根目录，已被 gitignore）：

```bash
VISITOR_STATS_SHARE_URL="https://umami.example.com/share/<shareId>"
VISITOR_STATS_PASSWORD="一个足够长的密码"
# VISITOR_STATS_HINT="可选提示"
```

校验：

```bash
pnpm stats:check
# 期望：✅ 分享链接格式有效 / ✅ 密码已设置 / 提示 /stats/ 将在构建后可用
```

> 服务器构建 → 在服务器的仓库根目录放 `.env`；CI 构建 → 把这两个值配成仓库 Secrets 并注入构建步骤环境变量。
> 密码是静态页面的门控，密文随产物公开，请用长随机串；要真正安全请用托管层（Vercel/Netlify 密码保护、Cloudflare Access）。

### 5.3 构建并发布

```bash
pnpm install --frozen-lockfile
pnpm build                # 产物在 dist/

# 发布方式任选其一：
# A. 本机构建后 rsync（在本地执行）
rsync -az --delete dist/ user@server:/www/wwwroot/shirone/dist/
# B. 服务器上构建：直接让 Nginx root 指向仓库的 dist/
```

Nginx 静态站只需把 `root` 指向 `dist/`，并给 `/stats/` 配好 fallback（`try_files $uri $uri/ /index.html` 视你的站点而定）。

## 6. 验收清单

- [ ] `curl -I https://umami.example.com/script.js` → 200
- [ ] 打开博客首页，Umami 后台 Realtime 能看到自己
- [ ] `curl -s https://你的博客/stats/ | grep -c '<明文密码或分享链接>'` → 0
- [ ] 浏览器打开 `/stats/`：错误密码被拒；正确密码后出现今日/7日/30日/全部访客、当前在线、趋势图
- [ ] 关闭统计（`umamiConfig.enable: false` 且不配 `VISITOR_STATS_*`）时：全站 0 请求、`/stats/` 跳 404

## 7. 维护

| 操作 | 命令 |
| --- | --- |
| 看 Umami 日志 | `bash scripts/deploy-umami.sh logs` |
| 健康检查 | `bash scripts/deploy-umami.sh test` |
| 升级 Umami | `bash scripts/deploy-umami.sh update` |
| 停止（保留数据） | `bash scripts/deploy-umami.sh down` |
| 备份数据库 | `docker exec shirone-umami-db pg_dump -U umami umami > umami-$(date +%F).sql` |
| 恢复数据库 | `cat umami-YYYY-MM-DD.sql \| docker exec -i shirone-umami-db psql -U umami -d umami` |

> **不要执行 `docker compose down -v`**：`-v` 会删掉 `umami-db-data` 卷，访客数据直接清零。
> 换服务器时，把 compose 目录和数据库 dump 一起迁走即可。

## 8. 常见问题

- **`/stats/` 显示「暂无数据」**：密码对了但分享链接无效/服务不可达。先 `curl https://umami.example.com/share/<shareId>`，应返回含 `token`/`websiteId` 的 JSON。
- **统计一直是 0**：采集脚本没加载。检查 `umamiConfig.enable: true` 且 `websiteId`、`scriptUrl` 都非空，并在页面源码里搜 `data-website-id`。
- **混合内容报错**：博客是 https，Umami 必须也是 https。不能让 https 页面请求 `http://` 接口。
- **分享链接泄露风险**：只要 `umamiConfig.shareUrl` 非空，它就会被注入全站 HTML，`/stats/` 的密码就只剩「挡住 dashboard」的意义。要严格私密就保持它为空。
