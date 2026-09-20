# 自建 Meting 音乐接口部署（QQ 音乐 / 网易云）

侧栏音乐播放器在 `meting` / `mixed` 模式下通过 **Meting API** 拉取远端歌单。
本仓库自带一份可复现的 Docker 部署资产与两个脚本，覆盖本机开发与线上部署两种场景。

| 类别 | 文件 |
| --- | --- |
| 资产 | `docs/meting/{Dockerfile, docker-compose.yml, nginx-meting.conf, qq-cookie.txt.example}` |
| 脚本 | `scripts/deploy-meting.sh`（部署 / 自测 / 刷新 / 日志）、`scripts/update-meting-cookie.sh`（只换 Cookie） |
| 前端配置 | `src/config/musicConfig.ts` → `meting.api / server / type / id` |

---

## 1. 链路与前提

```
浏览器（侧栏播放器）
  → Meting API（本机 http://127.0.0.1:8899 或线上 https://meting.example.com）
    → QQ 音乐 / 网易云接口（带登录 Cookie 请求元数据与音频地址）
      → 音频 CDN（302 跳转，音频流量不经过自己的服务器）
```

- **跨域**：Meting 的 `index.php` 自带 `Access-Control-Allow-Origin: *`，本地 `http → http`、
  线上 `https → https` 都可直连；**不要**让 https 页面请求 `http://` 接口，会被浏览器按混合内容拦截。
- **Cookie**：只决定"能否取到音频地址"，**必须留在服务端**，永远不要写进前端配置或提交到 Git。
- **谁需要操作**：只有站长（服务端）配置一次；**访客打开网页即可听**——不需要 Cookie、不需要任何命令，
  也不需要改任何设置（浏览器先向 Meting 请求，音频地址由服务端带 Cookie 换取后返回）。
- **端口**：容器只绑回环地址，不对外暴露；对外统一由 Nginx 反代（见 `docs/meting/nginx-meting.conf`）。

## 2. 本机现状（推荐：直接共用现成容器）

本机已有一个运行中的 Meting 容器，本仓库**无需再部署即可使用**：

| 项 | 值 |
| --- | --- |
| 容器 | `meting`（healthy），仅绑定 `127.0.0.1` |
| 地址 | `http://127.0.0.1:8899` |
| Cookie | 宿主机 `~/meting-local/qq-cookie.txt`（只读挂载进容器） |
| 前端指向 | `src/config/musicConfig.ts` 的 `meting.api`（当前即 8899） |

自检命令（把输出写文件再读，避免终端滚动丢失结果）：

```bash
curl -s -o /tmp/mp.json -m 20 \
  'http://127.0.0.1:8899/?server=tencent&type=playlist&id=9777005268'
python3 -c "import json;d=json.load(open('/tmp/mp.json'));print(len(d),'tracks')"

curl -s -o /dev/null -m 20 -L -w 'audio: %{http_code} %{content_type} %{size_download}B\n' \
  'http://127.0.0.1:8899/?server=tencent&type=url&id=<某首曲目的 mid>'
```

期望：歌单返回曲目数组；`type=url` 返回 `200 audio/mpeg` + 数 MB。
若歌单正常但 `type=url` 是 `200` + `0B` → 该曲为 VIP/版权曲目，见第 4、6 节。

维护命令**不需要任何前缀**（部署目录会自动识别，连"与其它站点共用的容器"也认得出来）：

```bash
bash scripts/update-meting-cookie.sh      # 换 Cookie（macOS 直接读剪贴板）
bash scripts/deploy-meting.sh test        # 自测（自动打到正在运行的容器端口上）
bash scripts/deploy-meting.sh refresh     # 清歌单缓存，立刻同步歌单改动

# 等价的 pnpm 快捷方式
pnpm meting:cookie                        # 换 Cookie
pnpm meting:test                          # 自测
pnpm meting:refresh                       # 清歌单缓存
pnpm meting:logs                          # 看容器日志
pnpm meting:deploy                        # 部署 / 重建（见第 3 节）
```

识别顺序：`$HOME/shirone-meting` → `/www/wwwroot/shirone-meting` → **运行中容器的挂载反推**
（见 `scripts/meting-common.sh`）；需要强制指定时才加前缀 `DEPLOY_DIR=/你的目录`。

## 3. 路径 B：让 Shirone 自带一套（可选）

本仓的 compose 使用独立容器名与端口，可与第 2 节的容器**并存而不冲突**：

| 项 | 本仓默认值 | 覆盖方式 |
| --- | --- | --- |
| 容器 / 镜像 | `shirone-meting` | 改 `docs/meting/docker-compose.yml` |
| 回环端口 | `8900` | `METING_PORT=... bash scripts/deploy-meting.sh` |
| 部署目录 | `/www/wwwroot/shirone-meting`，本机不可写时回退 `~/shirone-meting` | `DEPLOY_DIR=...` |
| 对外域名 | `meting.example.com` + `https` | `PUBLIC_DOMAIN` / `PUBLIC_SCHEME` |

```bash
# 1) 先备好 Cookie 放置目录（可留空，只影响 VIP 曲目）
mkdir -p ~/shirone-meting
cp docs/meting/qq-cookie.txt.example ~/shirone-meting/qq-cookie.txt

# 2) 一键部署：抓取 meting-api 源码 → 注入 Cookie → 构建镜像 → 起容器 → 跑连通性自测
bash scripts/deploy-meting.sh

# 3) 前端指向新端口（否则仍会用 8899 的共用容器）
#    src/config/musicConfig.ts → api: "http://127.0.0.1:8900/?server=:server&type=:type&id=:id&r=:r"
```

> 已在运行共用容器（第 2 节）时执行本命令：脚本会提示并**自动改用 8900** 单独起一套，
> 不会去抢 8899；若显式传 `METING_PORT=xxxx`，它会同步改写部署目录里的 compose 端口。

脚本子命令：

| 命令 | 用途 |
| --- | --- |
| `bash scripts/deploy-meting.sh` | 构建 + 启动 + 自测 |
| `bash scripts/deploy-meting.sh test` | 只重跑自测（改完歌单 / Cookie 后用） |
| `bash scripts/deploy-meting.sh refresh` | 清服务端歌单缓存，立刻同步歌单改动 |
| `bash scripts/deploy-meting.sh restart` | 改过 `index.php` 后重启容器 |
| `bash scripts/deploy-meting.sh logs` | 查看容器日志 |
| `bash scripts/deploy-meting.sh down` | 停止并移除容器 |

其他可用环境变量：`TEST_PLAYLIST_ID`（默认就是本博客的 `9777005268`）、`TEST_SERVER`、
`ENABLE_CACHE` / `CACHE_TIME`（歌单缓存，默认 30 分钟）、`ENABLE_AUTH` / `AUTH_SECRET`（接口签名）。

---

## 4. QQ 音乐 Cookie（VIP / 版权曲目必需）

Cookie 决定"能否取到音频地址"：免费曲目通常无需 Cookie，**VIP 曲目必须有带权限的账号 Cookie**。

```
1) 浏览器登录 y.qq.com（建议用独立小号开会员，避免影响主力账号）
2) F12 → Application → Storage → Cookies → https://y.qq.com 或
   Network → 任意请求 → Request Headers → cookie → Copy value
3) 交给脚本处理（会自动剔除 ct= 等破坏鉴权的字段、校验 uin/qm_keyst、备份旧文件、权限 600）
```

```bash
# 一条命令搞定（部署目录自动识别，不需要任何前缀）：
bash scripts/update-meting-cookie.sh                 # macOS 直接读剪贴板
pnpm meting:cookie                                   # 同上（pnpm 快捷方式）
bash scripts/update-meting-cookie.sh -f cookie.txt   # 从文件读取
cat cookie.txt | bash scripts/update-meting-cookie.sh  # 从管道读取（服务器上推荐）

# 需要强制指定目录时才加前缀：
DEPLOY_DIR=/你的目录 bash scripts/update-meting-cookie.sh
```

脚本会自动认出共用的 `~/meting-local` 容器并给出提示；写入该目录后**两个站点同时生效**（无需重启容器）。

要点：**无需重启容器、无需重建镜像**，覆盖宿主机文件后下一次请求即生效（`index.php` 每次请求都重新读它）。
`qq-cookie.txt` 已在 `.gitignore` 中，切勿提交或外发。

## 5. 前端配置（`src/config/musicConfig.ts`）

```ts
provider: "local",              // 当前：只播 src/data/music.ts（歌单体检筛出的"确认可播放"曲目，零远端请求）
                                // 想让远端歌单自动同步：改 "mixed"（本地保底 + 远端合并）或 "meting"（只用远端）
meting: {
  api: "https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&r=:r",
  // 当前用公共 Meting 实例（自建容器只绑 127.0.0.1，公网不可达）。
  // 服务器侧把 Meting 反代到公网后（第 9 节），把 api 换回自建地址
  // （如 "https://meting.你的域名/?server=:server&type=:type&id=:id&r=:r"），
  // 再 `pnpm music:audit --write` 重新生成曲库，即可恢复 VIP 曲目能力。
  server: "tencent",            // tencent = QQ 音乐（netease / kugou 等亦可）
  type: "playlist",
  id: "9777005268",            // ★ 换歌单只改这里（QQ 音乐歌单分享链接里的 id=）
  preload: "metadata",          // 进入视口即预取元数据（不含音频流）；"none" 则交互后才请求
},
```

占位符 `:server / :type / :id / :r` 由 `src/utils/music/meting.ts` 的 `buildMetingUrl()` 填充。
修改后若页面没变化：Markdown / 配置类改动清 `.astro/data-store.json`，Stylus / Svelte 改动清
`node_modules/.vite` 与 `.astro` 后重启 dev。

## 6. 页面级验证清单

```bash
pnpm dev            # http://localhost:4321/
```

1. 侧栏出现音乐卡片，首条曲目来自 `src/data/music.ts`（`provider: "local"` 时不发起任何远端请求）；
2. 点播放 → 进度条走动、有声音；逐首切换应当**全部可播**（列表由 `pnpm music:audit --write` 保证）；
3. 若改回 `"mixed"` / `"meting"`：远端曲目里 VIP / 版权受限的会无声 → 见第 4、8 节；
4. Swup 切页（点导航）音乐不中断（播放器挂在持久侧栏，不在 `#swup-container` 内）。

## 7. 文件说明

| 文件 | 作用 |
| --- | --- |
| `docs/meting/Dockerfile` | `meting-api` 镜像：PHP 8.2 + Apache，补 bcmath，关闭 `display_errors` 并压低错误级别（否则 PHP 8.2 的 Deprecated/Warning 会写进响应体，导致 `header('Location: ...')` 302 跳转失败 —— 表现为"歌单拿得到、点了没声音"） |
| `docs/meting/docker-compose.yml` | 容器编排：只绑回环、缓存持久化、只读挂载 Cookie、healthcheck |
| `docs/meting/nginx-meting.conf` | 线上 Nginx 反代片段（HTTPS + 转发；CORS 由 `index.php` 自带，勿重复添加） |
| `docs/meting/qq-cookie.txt.example` | Cookie 文件模板（仅格式示例） |
| `scripts/deploy-meting.sh` | 一键部署 / 自测 / 刷新缓存 / 重启 / 日志 / 停止 |
| `scripts/update-meting-cookie.sh` | 只更新 Cookie（自动清洗字段 + 备份 + 校验 + 推算有效期） |

## 8. 故障排查（实测经验）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 歌单元数据正常（13 首），部分曲目 `type=url` 返回 `200` + **0 字节 / text/html** | 该曲为 **VIP / 版权受限**，当前 Cookie 的账号无权限 | 属预期行为：免费曲目可播即可；要听 VIP 曲就用带会员的账号更新 Cookie（第 4 节） |
| 所有曲目（含免费）都变成 `text/html` 0 字节 | Cookie 里带了客户端标识字段 **`ct=`**（整条复制浏览器 Cookie 常见） | `bash scripts/update-meting-cookie.sh` 会自动剔除 `ct=` 并保留 `uin` / `qm_keyst` / `psrf_*`；脚本会打印是否剔除 |
| 提示 `uin=o…` 无法匹配 | Meting.php 只认纯数字 `uin` | 按脚本提示在 Cookie 末尾追加 `; uin=你的QQ号` |
| 全平台都不通（连网易云对照组也失败） | 容器未运行 / 出网异常 | `docker ps` 看 healthcheck；`bash scripts/deploy-meting.sh logs`；对照组：`?server=netease&type=url&id=416892104` 应返回 `audio/mpeg` 数 MB |
| 改歌单后不生效 | 服务端歌单缓存默认 30 分钟 | `bash scripts/deploy-meting.sh refresh` |
| 端口被占用 / 容器起不来 | 8899 或 8900 已被其它服务占用 | 部署脚本在显式传 `METING_PORT` 时会自动同步 compose 端口；共用容器场景不要动 8899 |
| 执行 `deploy-meting.sh up` 时提示"检测到共用容器" | 本机已有 8899 的容器，脚本为避免抢端口会自动改用 8900 另起一套 | 只想共用就不需要 `up`，直接 `bash scripts/deploy-meting.sh test` |
| 维护命令报"No such container"之类错误 | 部署目录识别错了（机器上有多套 Meting） | 显式指定：`DEPLOY_DIR=/你的目录 bash scripts/deploy-meting.sh test` |
| 线上页面无声音，控制台报 Mixed Content | https 页面请求了 http 接口 | 用 `docs/meting/nginx-meting.conf` 反代并挂证书，`api` 改成 `https://` 域名 |
| 返回的音频地址域名不对 | 反代丢了 `Host` 头 | 保留 `proxy_set_header Host $host;` |

---

## 9. 服务器上线清单（照做即可，约 15 分钟）

站长的活（做完基本一劳永逸，除非换歌单 / 换 Cookie）：

```bash
# ① 服务器装 Docker（宝塔：软件商店 → Docker 管理器；或 curl -fsSL https://get.docker.com | sh）
# ② 拉取博客仓库并安装依赖
git clone <你的仓库> && cd <仓库> && pnpm install
# ③ 一条命令部署音乐服务（自动拉源码 → 注入 Cookie → 构建镜像 → 起容器 → 自测）
pnpm meting:deploy                     # 想换端口：METING_PORT=8900 pnpm meting:deploy
# ④ 写入 QQ Cookie（可选；有会员资格的账号才能听 VIP 曲）
pnpm meting:cookie                     # 或 cat cookie.txt | bash scripts/update-meting-cookie.sh
# ⑤ 宝塔建站 + 反向代理 + SSL（脚本结尾会把这三步再打印一遍）
#      目标 URL：http://127.0.0.1:8900      发送域名：$host
# ⑥ 前端指向域名，然后构建发布
#    src/config/musicConfig.ts → api: "https://meting.你的域名/?server=:server&type=:type&id=:id&r=:r"
pnpm build                             # 再把 dist/ 发布到博客站点
```

**访客侧：零操作。** 打开网页即可播放；Cookie 只存在于服务器，浏览器既不接触也拿不到。

日常维护（都在仓库里执行，不需要登服务器改任何配置）：

| 需求 | 命令 |
| --- | --- |
| Cookie 过期（VIP 曲目又变回"不可播放"） | `pnpm meting:cookie` |
| 改了 QQ 歌单想立刻生效 | `pnpm meting:refresh` |
| 怀疑服务异常 | `pnpm meting:test` / `pnpm meting:logs` |
| 换歌单 | 改 `src/config/musicConfig.ts` 的 `meting.id` → `pnpm build` 重新发布 |
| 换台机器 / 重建环境 | 重跑 `pnpm meting:deploy`（脚本自动识别部署目录，不会重复建） |
| 歌单里有放不了的歌 | `pnpm music:audit` 体检；加 `-- --write` 生成"只含可播曲目"的保底列表（见第 10 节） |

---

## 10. 歌单体检：只保留能播放的曲目

`scripts/music/audit-playlist.mjs`（`pnpm music:audit`）会逐首探测歌单，判定"现在能不能放"。
探测方式与真实播放完全一致：请求播放器实际使用的 `type=url` 地址，只看是否 302 跳到音频 CDN
（**不下载音频本体**，因此很快也不产生音频流量）。

```bash
pnpm music:audit                                    # 体检 musicConfig 里配置的歌单
pnpm music:audit -- --server=netease --id=14164869977 --limit=10   # 换平台 / 换歌单 / 只看前 N 首
pnpm music:audit -- --write                         # 生成 src/data/music.ts（原文件备份为 music.ts.bak）
pnpm music:audit -- --api="http://127.0.0.1:8900/?server=:server&type=:type&id=:id&r=:r"  # 指定接口
```

- `--write` **只写可播放曲目**，作为 `provider: "mixed"` 的保底本地列表：远端歌单波动、接口临时故障、
  或某首歌突然下架时，侧栏播放器依然有歌可放（不会出现"点了没声音"的死曲）；
- 不可播放的曲目通常就是 VIP / 版权受限：服务端按账号权限发放播放地址，见第 8 节的排查表；
- 想换平台（例如改用网易云）：先把 `src/config/musicConfig.ts` 的 `server` 与 `id` 换掉，
  再 `pnpm music:audit` 看可播率，必要时 `--write` 刷新保底列表；
- 生成的文件带"由脚本生成 + 生成时间"的头部注释；想恢复手写列表，用 `src/data/music.ts.bak` 覆盖回来即可。



