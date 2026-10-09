# 自建 Meting 音乐服务（架构与日常维护）

侧栏播放器的歌曲音频由腾讯 QQ 音乐的 CDN 提供。本目录的资产负责另一件事：拿站长账号的会员 Cookie，去向 QQ 音乐要一条带签名的临时播放地址。

首次部署、Cookie 获取方法、故障排查表在 [`../DEPLOYMENT_METING.md`](../DEPLOYMENT_METING.md)。本文讲两件事：这套东西怎么运转，以及换歌单 / 换 Cookie / 改配置时具体动哪里。

## 1. 一次播放请求经过谁

```text
访客浏览器
  │ ①  请求 https://cnyicheng.top/meting/?server=tencent&type=url&id=<歌曲 mid>
  │     这个地址在构建时就写进了 src/data/music.ts
  ▼
站点 Nginx   location /meting/  ──proxy_pass──▶  127.0.0.1:8900
  ▼
容器 shirone-meting（meting-api：PHP 8.2 + Apache）
  │ ②  读 qq-cookie.txt，带会员 Cookie 调 QQ 音乐官方接口
  ▼
QQ 音乐  ──③  302 跳转──▶  http://aqqmusic.tc.qq.com/xxx.mp3?vkey=…
  ▼
访客浏览器  ──④  直连 QQ CDN 拉音频（音频流量不经过服务器）
```

第 ③ 步返回的是 http 地址，浏览器按混合内容规则会自动升级到 https；该 CDN 支持 https，实测同一条地址两种协议都能取到音频。

## 2. 各部分职责

| 组成 | 位置 | 职责 |
| --- | --- | --- |
| QQ 音乐 CDN | 腾讯 | 音频字节的真正来源 |
| meting-api 容器 | 服务器 `127.0.0.1:8900` | 接收歌曲 mid，用服务端的 Cookie 换取带 vkey 的临时播放地址。歌曲字节由 QQ CDN 直接发给浏览器，Cookie 只留在容器内 |
| Nginx `location /meting/` | 站点 `cnyicheng.top` 的配置 | 把公网请求转给容器。同域同证书，没有 CORS 与混合内容问题 |
| 曲库 | `src/data/music.ts` | 构建时生成的静态歌曲清单，见第 5.1 节 |
| 会员 Cookie | 服务器 `$DEPLOY_DIR/qq-cookie.txt` | 决定 VIP / 版权曲目能否拿到地址 |
| 前端配置 | `src/config/musicConfig.ts` | 接口地址 `api`、平台 `server`、歌单 `id`、播放器行为 |

镜像里装的是 meting-api 的代码（`Dockerfile` 中的 `COPY meting-api/ /var/www/html/`）加 PHP 8.2 基础环境。Cookie 不在镜像里。

## 3. Cookie 与镜像的关系

Cookie 是宿主机上的一个文件，由 compose 只读挂载进容器（`./qq-cookie.txt:/var/www/html/qq-cookie.txt:ro`），`index.php` 被注入的逻辑每次请求都重新读它。换 Cookie 只需覆盖宿主机文件，不用重建镜像、不用重启容器，下一次请求即生效。

> ⚠️ Linux 的 bind mount 会校验属主与权限。容器内 Apache 以 `www-data`(UID 33) 读这个文件，属主 root 加权限 600 会造成「文件在容器里、Cookie 却读不到」，表现是歌单能正常解析、逐首探测全是 0 字节。两个脚本现在都会自动 `chown 33:33`；手动放文件时请自己补一句：
>
> ```bash
> chown 33:33 $DEPLOY_DIR/qq-cookie.txt
> ```
>
> macOS 的 Docker Desktop 不校验权限，这个坑只在 Linux 上出现。

## 4. 改什么就要做什么

| 想改的东西 | 要动的地方 | 重建镜像 / 重启容器 |
| --- | --- | --- |
| Cookie（到期、换账号） | 覆盖 `$DEPLOY_DIR/qq-cookie.txt` | 都不需要 |
| 歌单内容（加歌、删歌） | `meting:refresh` 清缓存，再重新体检生成曲库并重新构建前端 | 都不需要 |
| 歌单 ID（换整个歌单） | `src/config/musicConfig.ts` 的 `meting.id`，再重新体检与构建 | 都不需要 |
| 音源平台（tencent 换 netease 等） | `musicConfig` 的 `server` 与 `id` 一起改 | 都不需要 |
| meting-api 代码或版本 | `pnpm meting:deploy`，会用最新源码重建镜像 | 都需要 |
| 反代路径或域名 | 站点 Nginx 配置，并用新的 `PUBLIC_DOMAIN` 重新部署 | 需要重建容器，`API_URI` 写在 index.php 里 |

## 5. 日常操作

### 5.1 歌单加歌 / 换歌（三步）

当前 `provider: "local"`，曲库是构建时体检出来的静态清单，浏览器运行时不会自己去拉歌单。

```bash
# ① 服务器：清掉服务端 30 分钟的歌单缓存（不清就等半小时）
cd /www/wwwroot/Blog_for_yycc && bash scripts/deploy-meting.sh refresh

# ② 本机：重新体检并生成曲库（接口地址自动取 musicConfig，不用手写 --api）
cd /Library/My_BK/Shirone && pnpm music:audit --write

# ③ 构建并发布
pnpm build        # 把 dist/ 发布到站点，然后强刷页面
```

第 ② 步输出里的 `→ 可播放 N/M` 就是最终进入播放器的数量。体检不通过的曲目（没有版权、会员不覆盖）会被自动剔除，不会写进曲库。

### 5.2 Cookie 到期

VIP 曲目突然全部没声音时，先确认是不是 Cookie：

```bash
bash scripts/deploy-meting.sh test      # 期望全部可播放；结果是 0/N 就是 Cookie 失效
```

重新导出 Cookie（浏览器登录 y.qq.com 后复制请求头里的整条 `cookie:`），再更新：

```bash
bash scripts/update-meting-cookie.sh -f 新Cookie.txt   # 自动校验、备份、chown 33:33
bash scripts/deploy-meting.sh test
```

### 5.3 常用维护命令

| 需求 | 命令 |
| --- | --- |
| 改完歌单或 Cookie 后自测 | `bash scripts/deploy-meting.sh test` |
| 清歌单缓存，立刻同步歌单改动 | `bash scripts/deploy-meting.sh refresh` |
| 改完 index.php 后重启 | `bash scripts/deploy-meting.sh restart` |
| 看容器日志 | `bash scripts/deploy-meting.sh logs` |
| 重建镜像与容器 | `pnpm meting:deploy` |

pnpm 快捷方式等价：`meting:test`、`meting:refresh`、`meting:cookie`、`meting:logs`、`meting:deploy`。

## 6. 容易搞错的几点

- **Cookie 不在镜像里**。换 Cookie 不需要重建镜像，也不需要重启容器。
- **音频不经过你的服务器**。过你服务器的只有「取地址」这一跳。
- **公共 Meting 实例（api.injahow.cn 等）没有你的 Cookie**，周杰伦这类 VIP 曲目在那边一律返回 0 字节，不要切回去。
- **换歌单必须重新构建前端**。`provider: "local"` 的曲库是构建产物，页面不会在运行时同步远端歌单。想让远端自动同步可以切到 `provider: "mixed"`，代价是首屏多一次远端请求。
- **公网地址走 Nginx 路径反代**，不用子域。`PUBLIC_DOMAIN=cnyicheng.top/meting` 会在部署时写进 `index.php` 的 `API_URI`，改路径或改域名都要重新部署。

## 7. 相关文件

| 文件 | 说明 |
| --- | --- |
| [`../DEPLOYMENT_METING.md`](../DEPLOYMENT_METING.md) | 部署步骤、Cookie 获取、故障排查表 |
| [`Dockerfile`](./Dockerfile) | php:8.2-apache + bcmath + meting-api 代码 |
| [`docker-compose.yml`](./docker-compose.yml) | 容器名、端口、缓存与 Cookie 挂载 |
| [`nginx-meting.conf`](./nginx-meting.conf) | 反代片段（子域方案；同域路径方案见文档 §9B） |
| [`qq-cookie.txt.example`](./qq-cookie.txt.example) | Cookie 字段示例 |
| [`../../scripts/deploy-meting.sh`](../../scripts/deploy-meting.sh) | 部署 / 自测 / 刷新 / 日志 |
| [`../../scripts/update-meting-cookie.sh`](../../scripts/update-meting-cookie.sh) | 只换 Cookie |
| [`../../scripts/music/audit-playlist.mjs`](../../scripts/music/audit-playlist.mjs) | 歌单体检并生成 `src/data/music.ts` |
| [`../../src/config/musicConfig.ts`](../../src/config/musicConfig.ts) | 前端接口、平台、歌单 ID |
