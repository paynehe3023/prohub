# proHub 项目进度文档

> 生成时间: 2026-08-22
> 项目路径: `D:\pythonWorkspace\prohub`

## Markdown 更新守则

1. 所有项目 Markdown 文档必须采用增量更新，新增内容只能追加到文档末尾或对应章节的末尾。
2. 禁止使用整文件重写、截断、覆盖历史章节或用临时摘要替代完整记录。
3. 只有内容明确重复、错误或需要修正时，才允许定点覆盖原段落；覆盖时必须保留未重复的历史内容。
4. 每次更新前先读取当前文档并检查 Git 历史与差异，确认不会误删；更新后核对行数、章节和 `git diff`。
5. 每次变更记录日期、用户需求、实际修改、验证结果和未完成事项；不能把未执行的验证写成已完成。
6. 如发现历史内容被误删，必须优先从 Git 历史恢复，再以增量方式补录之后的变更。
7. 不修改第三方依赖目录中的 README、API 文档或其他说明文档；除非用户明确要求。
8. 本守则适用于 `docs/` 下所有项目记录 Markdown 文档，后续每次更新严格遵守。

---

## 一、项目概述

**proHub** 是一个自托管的在线工具箱，部署在 Docker 中，提供社交平台无水印解析下载、AI 证件照换底等功能。

- **前端**: Vue 3 + Vite + Tailwind CSS + Tabler Icons
- **后端**: Node.js + Express
- **AI 服务**: rembg (Python, 独立 Docker 容器)
- **部署**: Docker Compose (2 services)

---

## 二、项目结构

```
D:\pythonWorkspace\prohub/
├── docker-compose.yml          # 双容器编排 (prohub + rembg)
├── Dockerfile                  # 多阶段构建 (前端 → 后端)
├── .dockerignore
│
├── src/                        # 前端 (Vue 3 + Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   ├── wallpaper.jpg
│   │   └── donate-qr.jpg
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── style.css
│       ├── router/index.js
│       ├── config/
│       │   ├── api.js          # API 配置 (VITE_API_BASE_URL)
│       │   └── tools.js        # 工具卡片配置
│       ├── components/
│       │   ├── AppHeader.vue
│       │   ├── AppFooter.vue
│       │   ├── BgSwitcher.vue
│       │   ├── BreadcrumbNav.vue
│       │   ├── DonateButton.vue
│       │   └── ToolCard.vue
│       ├── composables/
│       │   └── useSEO.js
│       └── views/
│           ├── Home.vue
│           └── tools/
│               ├── MediaDownloader.vue   # 无水印解析（主功能）
│               ├── IdPhoto.vue           # 证件照换底（新版，有尺寸选择）
│               ├── PhotoBgChanger.vue    # 证件照换底（旧版，未使用）
│               └── ComingSoon.vue
│
├── server/                     # 后端 (Node.js + Express)
│   ├── package.json
│   ├── index.js                # Express 入口
│   ├── rembg-server.py         # 独立 rembg 服务 (Python)
│   ├── routes/
│   │   ├── parse.js            # 主解析路由（小红书/微博/抖音/通用）
│   │   ├── parse-new.js        # 新版解析（未使用，类似 parse.js）
│   │   ├── parse.js.bak        # 解析路由备份
│   │   └── remove-bg.js        # 抠图/换底路由
│   ├── parsers/
│   │   └── douyin.js           # 抖音 Playwright 解析器
│   └── utils/
│       ├── browser.js          # Playwright 浏览器管理器
│       ├── xbogus.js           # X-Bogus 签名算法 (JS 移植)
│       └── xbg-helper.py       # X-Bogus 签名生成 (Python)
│
├── douyin-dl-ref/              # 抖音解析参考代码 (Python, 未直接使用)
│   ├── core/
│   │   ├── api_client.py
│   │   ├── discovery.py
│   │   ├── metadata.py
│   │   ├── url_parser.py
│   │   └── video_downloader.py
│   └── utils/
│       └── xbogus.py
│
├── imgs/                       # 测试图片
├── ai-handover.md              # AI 交接文档（空）
└── docs/
    └── project-reference.md    # 项目参考文档（空）
```


## 三、功能详解

### 3.1 社交平台无水印解析 (`/tools/media-downloader`)

**状态: ✅ 已上线**

#### 支持平台

| 平台 | 路由入口 | 解析方式 | 状态 |
|------|---------|---------|------|
| 小红书 | `parseXiaohongshu()` | axios 请求 + cheerio 解析 HTML | 可用，但链接检测需改进 |
| 微博 | `parseWeibo()` | 提取 mid → 调用移动端 API (`m.weibo.cn/statuses/show`) | 可用 |
| 抖音 | `parseDouyin()` | Playwright headless Chrome 绕过 WAF | 可用，但稳定性依赖 Chromium 和网络 |

#### 解析流程

1. 前端 POST `/api/parse` 发链接
2. 后端 `extractUrls()` 从文本中提取纯 URL
3. `detectPlatform()` 识别平台
4. 按平台调用对应解析器:
   - **小红书**: `fetchPage()` 获取 HTML → `parseXiaohongshu()` 解析 `__INITIAL_STATE__` / OG 标签 / DOM 图片
   - **微博**: `extractWeiboId()` 提取 mid → `fetchWeiboItemInfo()` 调 API → `parseWeiboItemInfo()` 解析 JSON
   - **抖音**: `parseDouyin()` 启动 Playwright → 拦截 API 响应 / 读 `__INITIAL_STATE__` / 读 OG 标签
5. 返回统一 JSON 格式

#### 防盗链处理

- **图片代理**: `/api/proxy-image?url=...` 中转 sinaimg.cn / xhscdn.com / pstatp.com 等图床
- **视频代理**: `/api/proxy-video?url=...` 中转微博视频流

#### 已知问题

- 小红书短链 `xhslink.cn` 检测到的 URL 可能包含尾部标点/文字，导致请求失败
- 抖音 Playwright 经常被 WAF 拦截，需频繁重试；Docker 内 Chromium 资源消耗大
- 前端 `proxyImage()` 只对 sinaimg.cn / xhscdn.com / pstatp.com / douyinpic.com / douyincdn.com 走代理，其他域名可能 403
- 抖音解析后前端展示有时出现显示问题

### 3.2 证件照一键换底 (`/tools/photo-bg-changer`)

**状态: ✅ 已上线**（路由注册的是 `IdPhoto.vue`）

#### 技术方案

- **前端**: `IdPhoto.vue`（新版，有尺寸选择）
- **后端 Node.js 路由**: `remove-bg.js`
  - `POST /api/remove-bg` — 去背景
  - `POST /api/replace-bg` — 换底色（需指定颜色 R,G,B）
  - `GET /api/bg-health` — 健康检查
- **AI 抠图服务**: rembg (Python) 运行在独立 Docker 容器中

#### 架构

```
用户上传图片 → IdPhoto.vue
  → POST /api/remove-bg (Node.js)
    → POST http://rembg:8080/api/remove (Python rembg)
      → 返回透明 PNG
    → Node.js sharp 合成底色
  → 返回结果 PNG → 前端展示/下载
```

#### 注意

- `rembg-server.py` 是独立 Python 服务，通过 `ENV REMBG_URL=http://rembg:8080` 连接
- **Docker Compose 中 rembg 容器**: `danielgatis/rembg:latest`，端口映射 `8080:7000`
- 前端 `IdPhoto.vue` 使用 Canvas 前端合成底色，不走 `/api/replace-bg` 接口
- 前端 `PhotoBgChanger.vue` 是旧版，未在路由中使用


## 四、部署架构

### Docker Compose (`docker-compose.yml`)

```yaml
services:
  rembg:
    image: danielgatis/rembg:latest
    container_name: prohub-rembg
    command: ["s"]        # 启动 HTTP 服务
    ports:
      - "8080:7000"       # 宿主机 8080 → 容器 7000
    deploy:
      resources:
        limits:
          memory: 4G

  prohub:
    build: .
    container_name: prohub
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REMBG_URL=http://rembg:7000
    depends_on:
      - rembg
```

### Dockerfile 多阶段构建

1. **Stage 1 (frontend-builder)**: `node:22-alpine`，安装依赖 + `npm run build`
2. **Stage 2 (runtime)**: `node:22-alpine`，安装 Chromium（Playwright 需要），复制后端 + 前端构建产物

### 启动方式

```bash
# 构建并启动
docker compose up -d --build

# 访问
http://localhost:3000
```

---

## 五、开发环境

### 前端开发

```bash
cd src
npm install
npm run dev          # Vite dev server on :5173，代理 /api → localhost:3000
```

### 后端开发

```bash
cd server
npm install
node index.js        # Express on :3000
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 前端 API 地址 | `/api`（开发环境空字符串则用相对路径） |
| `PORT` | 后端端口 | `3000` |
| `REMBG_URL` | rembg 服务地址 | `http://rembg:8080`（Docker 内） |
| `CHROME_PATH` | Chromium 路径 | 自动检测 / `C:\Program Files\...` |


## 六、API 接口

### 解析相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/parse` | 解析链接，body: `{url: "..."}` |
| GET | `/api/proxy-image` | 图片代理，query: `?url=...` |
| GET | `/api/proxy-video` | 视频代理，query: `?url=...` |
| GET | `/api/health` | 健康检查 |

### 抠图相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/remove-bg` | 去背景，multipart form |
| POST | `/api/replace-bg` | 换底色，multipart + `?color=R,G,B` |
| GET | `/api/bg-health` | 健康检查 |

---

## 七、当前进度与待办

### ✅ 已完成

- [x] 项目基础搭建 (Vue 3 + Express + Docker)
- [x] 小红书解析（多种策略兜底）
- [x] 微博解析（移动端 API + PC API 双 fallback）
- [x] 抖音解析（Playwright 方案）
- [x] 图片/视频防盗链代理
- [x] 证件照 AI 抠图 + 换底色
- [x] Docker Compose 双容器编排
- [x] 前端 UI（liquid-glass 玻璃拟态风格）
- [x] SPA 路由 + SEO 元标签

### 🚧 待修复/优化

- **小红书短链解析**: `xhslink.cn` 链接在 `extractUrls()` 后可能包含尾部非 URL 字符，导致请求失败
- **抖音解析稳定性**: Playwright 在 Docker 内 Chromium 容易被 WAF 拦截，需优化反检测策略
- **前端展示优化**: 抖音解析结果的前端展示有时出现布局问题
- **图片代理白名单**: 部分微博图片域名可能不在白名单内导致 403
- **代码冗余**: `parse.js` 和 `parse-new.js` 内容高度重复，应统一
- **UI 冗余**: `IdPhoto.vue` 和 `PhotoBgChanger.vue` 功能重复，旧版应清理

### 📅 计划中

- 文本格式化工具（JSON 格式化、Base64 编解码等）
- 图片压缩转换
- 调色板生成器
- 全能单位换算


## 八、技术要点备忘

### 小红书解析要点

- `__INITIAL_STATE__` 在 HTML 中可能出现在多个位置，需要取 `window.__INITIAL_STATE__ = {...}` 的**最后一个**匹配
- `extractScriptJSON()` 使用括号计数法提取嵌套 JSON，而非直接 JSON.parse 全部
- 图片 URL 结构: `urlDefault` / `url_default` / `url` / `infoList[0].url`
- 需排除头像图片（`avatar` 关键词）
- 数据路径: `initState.noteData.data.noteData` → `initState.note.noteDetailMap` → 递归兜底

### 微博解析要点

- URL 有数字 mid 和 base62 短码两种格式
- `base62Decode()` 使用 `BigInt` 避免精度溢出
- 优先调用 `m.weibo.cn/statuses/show` 移动端 API（无需 cookie）
- 兜底调用 `weibo.com/ajax/statuses/show` PC API（需 cookie）
- 图片 URL 替换 `/large/` → `/mw2000/` 获取高清无水印版本
- 视频取 `page_info.media_info.mp4_hd_url` / `mp4_720p_mp4` / `stream_url_hd`

### 抖音解析要点

- Playwright 方案需解决自动化检测（`navigator.webdriver`、`navigator.plugins`）
- 数据来源优先级: API 响应拦截 > `__INITIAL_STATE__` > `__RENDER_DATA__` > `_SSR_DATA` > OG 标签
- 多次重试 + 逐步等待策略（总超时 45s，重试 2 次）
- 视频 URL 需排除 `.mp3` 背景音乐
- iOS Safari UA + `deviceScaleFactor: 3` 伪装移动端

### X-Bogus 签名算法

- JS 实现 `utils/xbogus.js` 移植自 Python 版 `jiji262/douyin-downloader`
- 算法: UA → RC4 → Base64 → MD5 → 与 URL MD5 混合 → RC4 → Base64 编码
- **当前项目未直接使用 X-Bogus**（Playwright 方案不依赖签名），属于预留的 API 方案

### Docker 构建注意事项

- Chromium 在 Alpine 中需 `apk add --no-cache chromium`
- 设置 `CHROME_PATH=/usr/bin/chromium-browser` 环境变量
- Playwright 无沙箱模式运行需 `--no-sandbox` 参数
- `--single-process` 仅适用于 Windows 环境（`process.platform === 'win32'`）
- rembg 容器内存限制 4G

---

## 九、关键文件速查

| 文件 | 说明 |
|------|------|
| `server/routes/parse.js` | 主解析路由（核心业务逻辑，~711 行） |
| `server/routes/parse-new.js` | 新版解析（未使用，与 parse.js 高度重复） |
| `server/routes/remove-bg.js` | 抠图/换底路由 |
| `server/parsers/douyin.js` | 抖音 Playwright 解析器 |
| `server/utils/browser.js` | Playwright 浏览器管理器 |
| `server/rembg-server.py` | 独立 rembg HTTP 服务 |
| `src/views/tools/MediaDownloader.vue` | 无水印解析前端 |
| `src/views/tools/IdPhoto.vue` | 证件照换底前端（新版，路由使用） |
| `src/views/tools/PhotoBgChanger.vue` | 证件照换底前端（旧版，未使用） |
| `docker-compose.yml` | Docker 编排配置 |
| `Dockerfile` | 多阶段构建 |

---

## 十、经验教训（避免重复踩坑）

### 前端 + 后端分离的 API 配置

- 生产环境前端构建产物由 Express 托管（同源 `/api` 相对路径），**不需要** `VITE_API_BASE_URL` 配置
- 开发环境用 Vite proxy 转发 `/api` 到 `localhost:3000`
- 前端请求 `fetch` 时不要手动设置 `Content-Type: application/json` 在 FormData 场景下（浏览器自动加 boundary）

### Docker 部署要点

- 全栈容器**必须**同时包含前端构建产物 + 后端，因此用多阶段构建
- rembg 需要单独容器（模型下载大、内存高），通过 `REMBG_URL` 环境变量连接
- 首次 `docker compose up -d --build` 会下载 rembg 模型（可能较慢）

### 解析类功能的通用模式

- 多策略兜底（主策略失败 → OG 标签 → DOM 扫描）
- 数据提取用括号计数法而非 JSON.parse（避免内联 JS 导致解析失败）
- 图片 URL 统一去除 query 参数（`replace(/\?.*$/, '')`）后再拼接缩略图参数
- 防盗链必须走服务端代理 + 白名单域名控制

### Playwright 在 Docker 的坑

- Alpine 需要手动安装 Chromium，且 `--no-sandbox` 必需
- 每次请求都要新建 context，用后关闭，避免内存泄漏
- 5 分钟空闲自动关闭浏览器
- 进程退出时 `SIGTERM` 清理浏览器

---

## 十一、更新记录

| 日期 | 变更 |
|------|------|
| 2026-08-06 | 项目初始化 |
| 2026-08-22 | 生成进度文档，全面记录项目架构与待办 |
| 2026-08-29 | 完成极速剪切板房间恢复与资产链路修复：Host 断线延迟销毁并支持刷新恢复；上传、下载、删除增加房间成员认证；受保护图片改为认证加载；上传广播失败或取消时清理孤儿资产；释放本地预览 Blob URL；文本预览限制 5MB；移除刷新时主动销毁房间逻辑。前端构建、后端语法检查及 Dev/正式 Docker 重建通过。 |

## 证件照功能修复记录

### 后端修复

| 组件 | 路径 | 修复内容 |
|------|------|---------|
| `remove-bg.js` | `server/routes/remove-bg.js` | `bg-health` 路由：rembg 官方镜像无 `/health` 端点，改为 `GET /` 检测存活 |
| `remove-bg.js` | `server/routes/remove-bg.js` | `replace-bg` 路由：修复调用 rembg `/api/remove` 的 404 问题（Docker 重建后解决） |

### 前端修复

| 组件 | 路径 | 修复内容 |
|------|------|---------|
| `IdPhoto.vue` | `src/views/tools/IdPhoto.vue` | API URL 改用 `apiConfig.baseURL` 统一管理，修复 `VITE_API_BASE_URL` 为空时路径错误 |
| `IdPhoto.vue` | `src/views/tools/IdPhoto.vue` | 添加尺寸选择（一寸/小一寸/二寸/小二寸/大一寸/自定义），下载时按尺寸裁剪输出 |
| `IdPhoto.vue` | `src/views/tools/IdPhoto.vue` | 修复自定义颜色选择：点击自定义颜色时更新 `selectedColor` ref，添加 `watch(customColor)` 自动更新预览 |
| `IdPhoto.vue` | `src/views/tools/IdPhoto.vue` | 添加 `compositeBgWithSize()` 函数，按证件照比例 + 2x 高清输出 |

### 验证结果

| 接口 | 状态 | 详情 |
|------|------|------|
| `GET /api/bg-health` | ✅ 修复 | `{"status":"ok","rembg":{"endpoint":"/","statusCode":200}}` |
| `POST /api/remove-bg` | ✅ 正常 | 200 OK，1.3MB 透明 PNG |
| `POST /api/replace-bg` | ✅ 正常 | 200 OK，1.7MB 蓝色底证件照 |
| 证件照页面 (`/tools/photo-bg-changer`) | ✅ 正常 | 200 OK |
## 十二、最近修复补充

### 上传交互修复

- `IdPhoto.vue` 的上传区补回了 `@click="triggerUpload"`、`@dragleave`、`@drop.prevent` 事件，避免点击无反应。
- 隐藏文件输入从 `class="hidden"` 改为 `class="sr-only"`，规避某些浏览器对 `display: none` 文件输入 `.click()` 的限制。
- `triggerUpload()` 改为动态创建临时 `input[type=file]`，进一步降低浏览器兼容问题。
- `handleFileSelect()` 与 `handleDrop()` 重新恢复，确保上传与拖拽都可用。

### 构建与部署优化

- `.dockerignore` 补充了 `**/node_modules` 等排除项，避免把 `server/node_modules` 一起打进构建上下文。
- 关闭并重建 Docker 后，构建上下文从百兆级降到几十 KB 级，显著提升了重建速度。
- 当前 `docker compose up -d --build` 已能正常完成，`/tools/photo-bg-changer` 页面返回 200。

### 近期验证

- `IdPhoto.vue` 重新编译后的产物包含 `triggerUpload`、`handleFileSelect`、`handleDrop` 等逻辑。
- `GET /api/bg-health` 返回 `{"status":"ok","rembg":{"endpoint":"/","statusCode":200}}`。
- `POST /api/remove-bg` 已恢复可用，返回约 1.3MB 的透明 PNG。
### 上传问题复盘

- 证件照页上传按钮失效的最终原因，是模板里的文件输入与点击触发逻辑在反复编辑中被破坏；最终恢复为 `triggerUpload()` 动态创建临时 `input[type=file]`，绕过 `display: none` 兼容问题。
- 上传区同时恢复了 `@click`、`@dragleave`、`@drop.prevent`，并把文件输入改成 `sr-only` 作为兜底。
- `handleFileSelect()` 和 `handleDrop()` 保持可用，`resetAll()` 仍通过 `fileInput` 清空原始输入状态。

### 构建上下文优化

- `.dockerignore` 新增了 `**/node_modules`、`.venv-rembg`、`douyin-dl-ref`、`Umi-OCR` 等目录排除项。
- 之前 Docker 构建上下文一度达到百兆级，修正后降到几十 KB，`docker compose up -d --build` 明显更快。
- 这是当前项目里最值得保留的部署经验之一，后续新增大目录时优先更新 `.dockerignore`。

## 十三、CIDR 子网划分与重叠校验器

### 当前进度

- 新增纯前端工具页：`/tools/cidr-calculator`
- 完成 IPv4 / CIDR 位运算解析：网络地址、广播地址、子网掩码、反掩码、可用范围、主机数
- 完成多网段两两重叠检测与冲突提示
- 完成 IP 空间区间条可视化与重叠高亮
- 完成华为 / Cisco ACL 脚本导出与复制
- 已接入首页工具卡与路由

### 构建记录

- 生产构建已通过：`npm run build`
- 构建时图标包 `@tabler/icons-vue` 的 ESM 入口缺失，已在 `vite.config.js` 里临时指向可用的 CJS 入口，避免影响打包

### 后续可继续优化

- 增加更多 CIDR 预设样例
- 增加 CIDR 与子网划分的解释提示
- 给冲突网段增加更明显的视觉分层
- 如依赖包恢复正常，再评估是否可以移除图标入口兜底配置

## 十四、CIDR 入口未显示问题复盘

### 定位结果

- 当前源码构建产物已包含 `CIDR` 文案、`/tools/cidr-calculator` 路由和首页入口。
- `npm run build` 已通过，新产物资源哈希为 `index-K1MKw-P7.js`。
- `http://localhost:3000/` 实际返回的资源仍是旧版本 `index-DS0MByAV.js`，响应 `Last-Modified` 为 `2026-08-23 03:09:58`，旧资源中不包含 `CIDR`。
- 因此问题不是浏览器缓存，也不是首页过滤逻辑，而是 Docker 容器仍在运行旧的前端静态文件。

### 部署注意

- `docker compose restart` 只会重启旧容器，不会重新执行 Dockerfile 中的前端构建阶段。
- 修改前端后必须在项目根目录执行 `docker compose up -d --build --force-recreate`；若仍命中旧缓存，执行 `docker compose build --no-cache prohub` 后再 `docker compose up -d`。
- 重建后检查首页 HTML 中的 `/assets/index-*.js` 哈希应发生变化，且资源内容应包含 `CIDR`。

### 入口增强

- 顶部导航新增 `CIDR` 直达入口。
- CIDR 首页卡片增加“新工具”标识。

## 十五、CIDR 页面空白问题修复

### 根因

- `CidrCalculator.vue` 模板使用了 `item.totalHosts`。
- CIDR 解析函数实际返回的字段名是 `hostCount`，因此初次渲染时 `formatBigInt(undefined)` 调用了 `toLocaleString`，导致 Vue 页面运行时异常并显示空白。

### 修复

- 总主机数展示改为 `item.hostCount`。
- `formatBigInt()` 增加空值保护，字段缺失时显示 `—`，避免单个统计字段再次导致整页崩溃。

### 验证

- `npm run build` 通过。
- Chromium 访问本地生产预览 `/tools/cidr-calculator`：标题、输入框、默认重叠检测均正常，无控制台错误。
- 预设切换、华为 ACL、Cisco ACL 均已验证正常。
- 当前运行中的 `localhost:3000` 如果仍显示空白，需要重新构建并强制重建 `prohub` 容器，使修复后的静态资源进入镜像。

## 十六、CIDR 问题为何反复出现：部署链路复盘

### 两个不同问题

1. **第一次：入口不存在**
   - Docker 仍提供旧首页资源，旧资源没有 CIDR 工具配置。
   - 重建后入口出现，说明这一阶段的部署已经生效。

2. **第二次：进入页面空白**
   - 新入口加载了 CIDR 动态分包后，触发了组件内部字段错误。
   - 模板读取 `item.totalHosts`，解析结果实际字段是 `hostCount`，导致 `undefined.toLocaleString()`。
   - 这个错误只有进入 CIDR 页面并执行首次渲染时才会出现，首页看不出来。

### 当前版本对比

- 当前本地最新构建：`index-T73cFolH.js` + `CidrCalculator-LhrlzEEL.js`，构建时间为 2026-08-25 08:20。
- `localhost:3000` 当前仍返回：`index-K1MKw-P7.js` + `CidrCalculator-C3IbkmhT.js`，返回时间为 2026-08-25 00:01。
- 因此线上容器落后于最新源码构建，仍在执行修复前的旧分包。

### 流程改进

- 以后不能只验证 `npm run build`，还必须用 Chromium 访问 Docker 的实际地址，检查页面正文和控制台错误。
- 入口、动态路由、首次渲染、交互预设、ACL 导出分别验证后，才能确认部署完成。

## 十七、Docker 开发模式与一键部署

### 新增文件

| 文件 | 用途 |
|------|------|
| `docker-compose.dev.yml` | Docker 内开发模式：前端源码挂载、Vite 热更新、后端 Node 自动重启 |
| `Dockerfile.dev` | 开发后端镜像，包含 Chromium 和 Node watch 模式 |
| `deploy.ps1` | 生产一键构建、强制重建、启动和首页资源检查 |

### 开发模式

在项目根目录执行：

```powershell
docker compose -f docker-compose.dev.yml up --build
```

开发访问地址：

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3001`
- rembg：`http://localhost:8081`

开发模式下：

- `src` 目录挂载到前端容器，Vite 自动热更新
- `server` 目录挂载到后端容器，Node `--watch` 自动重启
- Vite 的 `/api` 请求通过 `VITE_API_PROXY_TARGET` 转发到 Docker 内的 `backend:3000`
- 开发容器与生产容器使用不同容器名，避免误操作同一服务
- 开发端口使用 `3001/8081`，生产端口继续使用 `3000/8080`，两套服务可以并行运行

停止开发模式：

```powershell
docker compose -f docker-compose.dev.yml down
```

### 正式部署

正式部署不要使用 `docker-compose.dev.yml`，应执行：

```powershell
.\deploy.ps1
```

遇到依赖缓存或需要完全重建时：

```powershell
.\deploy.ps1 -NoCache
```

如果开发容器还在运行：

```powershell
.\deploy.ps1 -StopDev
```

正式部署前必须确认已经处理 `docker-compose.dev.yml`：开发模式应先停止，生产模式只使用根目录的 `docker-compose.yml`。后续正式上线时提醒用户检查这一点。

### 验证记录

- `docker compose -f docker-compose.dev.yml config` 通过
- `deploy.ps1` PowerShell 语法检查通过
- 前端 `npm run build` 通过

## 十八、后续调用方式速查

### 开发时怎么用

- 启动开发模式：`docker compose -f docker-compose.dev.yml up --build`
- 打开前端页面：`http://localhost:5173/`
- 打开后端接口：`http://localhost:3001/`
- 打开 rembg 服务：`http://localhost:8081/`

### 正式上线怎么用

- 一键部署正式环境：`.\deploy.ps1`
- 依赖或缓存异常时：`.\deploy.ps1 -NoCache`
- 需要先停开发容器时：`.\deploy.
ps1 -StopDev`
- 正式页面地址：`http://localhost:3000/`

### 以后怎么“调用”

- 想看最新前端改动，就进 `http://localhost:5173/`
- 想看正式容器效果，就进 `http://localhost:3000/`
- 想切换开发/正式，只要按上面的命令启动对应 Compose 即可
- 后面新增功能时，我会优先把入口、访问地址和启动方式补到这个文档里

## 十九、证件照抠图模型选择

### 当前结论

- 当前网页证件照功能走的是 `src/src/views/tools/IdPhoto.vue`，它请求后端 `POST /remove-bg`。
- 后端 `server/routes/remove-bg.js` 现在显式使用 `REMBG_MODEL=u2netp`，并把这个模型参数传给 rembg 服务。
- 我把 `docker-compose.yml` 和 `docker-compose.dev.yml` 也一起写死为 `u2netp`，避免不同启动方式用到不同模型。

### 为什么选它

- rembg 官方文档明确列出了 `u2netp` 这个模型，属于官方支持的可用模型。
- 根据你当前的实际测试反馈，它在这个场景下更适合先作为默认模型。
- 如果后面还想继续比对人像边缘细节，可以再单独做 `bria-rmbg` 或 `birefnet-portrait` 的 A/B 测试。



## 二十、网页极速剪贴板入口补充

- 当前已把“网页极速剪贴板”入口提升到首页首屏卡片和顶部导航。
- 首页 `/` 顶部可直接看到“最新入口”卡片，点击即可进入 `/clipboard`。
- 工具列表中的同名卡片仍保留，方便从分类区进入。


## 二十一、首页入口可见性修正

- 已把“网页极速剪贴板”入口前置到首页首屏，减少用户需要下滑查找。
- 已移除顶部导航里的 CIDR 快捷入口，保留工具列表和直达路由即可。


## 二十二、剪贴板手机访问修正

- 房间二维码和复制链接改为使用可配置的“外部访问地址”。
- 在剪贴板页新增了“外部访问地址”输入框，可填写电脑局域网 IP 或正式域名。
- 开发环境下的实时连接地址默认按当前访问主机自动推导，正式部署时可直接使用同域地址。
- 当当前地址还是 localhost 时，页面会明确提示手机扫码无法连接。

## 二十三、网页背景切换与 Bing 壁纸

- 修复左下角背景切换器选择纯白、纯深灰、纯浅灰、纯黑后仍显示默认壁纸的问题。
- 背景切换统一由 `src/src/components/BgSwitcher.vue` 管理，纯色会明确清除 `background-image`，壁纸会同步设置尺寸、位置、重复和固定方式。
- 增加内置太空壁纸、自定义图片上传，以及通过 `localStorage` 自动恢复上次背景选择。
- 新增后端接口 `GET /api/wallpapers?count=7&mkt=zh-CN`，代理 Bing 官方 `HPImageArchive` 接口，返回最近 1–7 天壁纸元数据和绝对图片地址。
- 后端接口增加 5 分钟内存缓存，避免每次打开背景面板都重复请求 Bing。
- 前端构建已通过；临时后端端口验证成功返回 7 条壁纸。
- 当前已运行的旧 Docker 容器若仍返回 404，需要重新加载后端容器后才会读取新增接口；正式部署时需重新构建后端镜像。

## 二十四、全能极速图片处理工作台

- 新增纯前端路由 `/tools/image-studio`，入口已加入首页工具清单，替换原来的“图片压缩转换”占位工具；组件文件：`src/src/views/tools/ImageStudio.vue`。
- 读取图片时保留 `naturalWidth`、`naturalHeight` 与原始文件体积；预览 Canvas 使用原始物理尺寸，CSS 仅负责等比显示，导出不经过 CSS 缩放。

### 二十四.1 功能清单（当前版本）

- 5 大胶囊 Tab：指定 KB 压缩 / 尺寸裁剪与预设 / 隐私水印与打码 / 格式转换与 EXIF 清洗 / 拼长图与九宫格。
- 指定 KB 压缩：目标大小输入 + Range 滑块（默认 200KB），二分查找 JPEG 质量，最多 7 次迭代逼近目标体积。
- 尺寸裁剪与预设：物理像素裁剪框、等比例锁定开关（Keep Aspect Ratio），预设含一寸照 295×413、二寸照 413×579、小红书 1080×1440、微信朋友圈/头像 1080×1080、公众号次图封面 900×383。
- 隐私水印与打码：盲水印按物理尺寸动态缩放后 -45° 平铺（默认文本“仅限 XX 办理业务使用，他用无效”），标题旁提供问号悬浮说明。
- 遮罩方式：马赛克 / 黑色遮盖 / 白色遮盖 / 柔焦模糊，每个遮罩独立记录自己的样式，不再受全局样式切换影响。
- 格式转换与 EXIF 清洗：JPG / PNG / WebP / AVIF 导出，AVIF 在浏览器不支持时给出明确提示；Canvas 重绘剥离 GPS 等原始 EXIF。
- 拼长图与九宫格：多图纵向/横向拼接（以第一张图物理宽度或高度为基准），单图 3×3 九宫格切图并支持 ZIP 打包下载。
- 导入支持 HEIC/HEIF（`heic2any` 本地转换），多图队列、原图/处理后切换、处理后与原图尺寸/体积实时对比。

### 二十四.2 遮罩模型升级（2026-08-26）

- 遮罩数据模型重构为 `Mask { rect: Rect; style: MaskStyle }[]`，每个遮罩独立保存矩形与样式，切换样式不会影响已添加的遮罩。
- 新增撤销/重做历史栈（`undoStack` / `redoStack`）与 `undoMask` / `redoMask` / `clearMasks` / `cloneMasks`，隐私 Tab 提供“撤销 / 重做 / 清除全部”三个按钮。
- 切换图片（`initializeImageState`）时清空遮罩并重置撤销/重做栈，修复上一张图片遮罩残留的问题。
- 修正遮罩模型迁移遗留问题：导出应用遮罩改用 `mask.rect`，预览临时遮罩按 `{ rect, style }` 包装后再渲染。

### 二十四.3 功能补齐（2026-08-26）

- 遮罩方式由“马赛克 / 黑色遮盖”扩展为「马赛克 / 黑色遮盖 / 白色遮盖 / 柔焦模糊」，预览与导出均按遮罩自身样式渲染。
- 导出格式新增 AVIF，浏览器不支持时给出明确报错而非生成损坏文件；下载扩展名同步适配 avif。
- 导入图片后用 `exifr`（动态导入，独立分包 75.18 kB）解析并展示 EXIF 面板：拍摄时间、相机、曝光时间、光圈、ISO、焦距、GPS。
- 恢复完整版组件（此前误退化为仅剩隐私水印的缩水版），5 大 Tab 全部可用；`npm run build` 验证通过，`ImageStudio` 独立分包 128.57 kB。

## 二十四.4 九项问题修复（2026-08-26）

1. **原图/处理后切换**：viewMode 加入 watch 依赖，切回"原图"时自动重绘 canvas，解决处理后切回原图空白的问题。
2. **EXIF 显示**：上传图片后用 exifr（动态导入，独立分包 75.18 kB）解析并展示 EXIF 面板（拍摄时间、相机、曝光时间、光圈、ISO、焦距、GPS）。
3. **EXIF 编辑/保留/清除**：convert Tab 增加 EXIF 策略下拉（剥离 EXIF（默认）/ 保留原 EXIF / 编辑 EXIF）。编辑模式下可填写拍摄时间、相机厂商、型号。保留/编辑模式用 piexifjs（独立分包 30.54 kB）在导出 JPEG 时写回 EXIF。文案修改为"重绘会剥离 GPS 等原始 EXIF 信息"。
4. **九宫格按钮位置与滚动**：九宫格生成按钮从结果区头部移至侧栏主操作按钮（生成长图）下方，与主按钮同级。点击生成后自动滚动到九宫格结果区（`scrollIntoView`）。
5. **新图崭新开始**：`addFiles` 上传新图后自动选中第一张新图并调用 `initializeImageState`，重置所有编辑状态（遮罩、水印、裁剪、处理后结果、九宫格、EXIF 策略等），新图片不再受上一张图片的编辑效果影响。
6. **提示遮挡修复**：盲水印问号提示改为向下展开（`left-0 top-full`），z-index 提升至 `[100]`，避免被右侧预览框遮挡。
7. **实时遮罩效果**：`drawMaskOverlay` 预览时对马赛克、柔焦模糊、黑白遮盖均使用真实效果绘制（`drawMosaic`/`drawBlur`/`fillRect`），绘制时即可看到实际效果而非半透明占位色块。
8. **撤回/重做按钮**：按钮文案改为 `← 撤回` / `重做 →`，交互更直观。
9. **社交平台解析提示**：MediaDownloader 支持标签增加抖音 badge（`bg-ios-blue/20 text-ios-blue`）。

## 二十五、自媒体全流程创作与安全工作台（MediaStudio）

- 新增纯前端路由 `/tools/media-studio`，组件 `src/src/views/tools/MediaStudio.vue`，入口已加入首页工具清单（`src/src/config/tools.js`），替换可用的在线状态卡片。
- 五大工作流 Tab：灵感素材（📥）/ AI 润色（✨）/ 合规清洗（🛡️）/ 实机预览（📱）/ 多平台分发（🚀）。

### 二十五.1 功能清单（当前版本）

1. **灵感与素材中转站**：速记文本卡片 + `#选题 / #爆款开头 / #对标案例 / #金句` 标签分类；支持引用素材到共享创作区、一键批量引用、从剪贴板读取。
2. **DeepSeek AI 润色与脚本创作**：API Key 仅存 LocalStorage，前端直连 `https://api.deepseek.com/v1`，模型 `deepseek-chat`，流式打字机输出；4 种模式：小红书种草风 / 短视频黄金 3 秒脚本 / 爆款标题 5 连发 / 查重与对标重写（双栏 + N-Gram 相似度）。
3. **违禁词与合规安全清洗**：内置 28 条基础敏感词 + `onMounted` 静默请求 `GET /api/forbidden-words` 热更新合并；草稿实时扫描并红字高亮，悬停显示平替建议，支持单条/一键全部替换；支持自定义违禁词（`词|平替` 格式）。
4. **防折叠排版与 1:1 实机预览**：一键插入零宽空格（U+200B）打断长文折叠；切换小红书双列卡片 / 公众号消息列表 / 抖音推荐页模拟预览，实时检测标题截断。
5. **一键多平台格式适配导出**：小红书版（纯文本 + Emoji + 底部标签）、公众号版（带排版的富文本 HTML）、知乎/头条版（Markdown），一键复制。

### 二十五.2 后端与验证记录

- 后端新增 `server/routes/forbidden-words.js` 违禁词库接口，内置 45 条敏感词（含平台维度与平替建议），已在 `server/index.js` 注册 `/api/forbidden-words`。
- `env.d.ts` 补充 `@tabler/icons-vue` 与 `piexifjs` 模块类型声明，避免 IDE 红波浪线。
- 验证结果：`npm run build` 通过，`MediaStudio` 独立分包 27.29 kB（gzip 11.02 kB）；后端路由语法检查通过。
- 注意：AI 润色需要用户自行配置 DeepSeek API Key（页面内输入，仅存浏览器 LocalStorage）。

## 二十六、微博解析水印与视频播放修复（2026-08-27）

### 问题 1：微博解析结果带水印

- 根因：`server/routes/parse.js` 的 `parseWeiboItemInfo` 取视频源时字段优先级是 `mp4_hd_url → mp4_720p_mp4 → stream_url_hd → stream_url`，这些大多是带水印码流。
- 修复：调整解析优先级，优先使用无水印源：
  - `swift_mp4_url`（微博 Swift 码流，通常无水印）
  - `media_info.video_sources` 数组中无 wm 标记的地址
  - `mp4_720p_mp4`
  - 其余字段按原有顺序兜底
- 新增 `normalizeWeiboVideoUrl`：统一 https 协议、清理 hash 参数，保证直链可用。
- 新增 `isWatermarkedWeiboUrl`：识别含 `/wm/`、`watermark`、`_wm.mp4` 等水印标记的 URL，无水印源优先选择。

### 问题 2：微博视频下载后无法播放

- 根因：`/api/proxy-video` 代理转发时存在三类问题：
  1. 未转发客户端 `Range` 请求头，也未透传 `206 / Content-Range / Accept-Ranges`，浏览器 `<video>` 无法 seek/播放 mp4。
  2. axios 默认自动解压（`Accept-Encoding: gzip, deflate`），视频流被 gzip 二次包装后播放器解码失败。
  3. 缺失流错误处理，上游中断时连接可能挂死。
- 修复：重写 `/api/proxy-video`：
  - 转发 `Range` 请求头，透传 `Content-Type / Content-Length / Content-Range / Accept-Ranges`，按上游状态码返回 `200/206`。
  - `decompress: false` 关闭 axios 自动解压，视频流原样转发。
  - 增加上游流 `error` 事件与客户端 `close` 事件处理，中断时正确收尾。
- 验证：`node --check` 语法通过；前端 `npm run build` 通过。
- 影响文件：`server/routes/parse.js`、`docs/project-progress.md`。

### 二十六.1 前端视频下载链路修复（2026-08-27）

- 修复视频下载按钮和批量下载统一调用图片代理的问题，按 `image/video` 类型分别使用 `/proxy-image` 与 `/proxy-video`。
- 微博视频预览统一走视频代理，覆盖 `weibo.com`、`weibocdn.com` 等防盗链地址。
- 下载扩展名改为依据响应 `Content-Type` 与媒体类型判断，避免视频 Blob 被保存为图片格式。
- 延迟释放 Blob URL，兼容移动端浏览器尚未启动下载就被回收导致的下载失败。
- 补充微博 `video_sources` 多种返回结构的无水印源收集，并让代理请求使用 `Accept-Encoding: identity`。
- 微博图片解析联合读取 `pics`、`pic_ids`、`pic_infos`、`picInfo`、`original_pic` 等字段，优先 `original/largest/large/mw2000` 高清地址并跨字段去重。
- 兼容纯图片微博、图片 ID 列表、转发微博图片和无文字微博，修复图片数量不足及部分图片漏解析。
- 说明：当前“去水印”是优先选择微博接口提供的无水印原始码流；若上游只提供已经嵌入画面的水印视频，代理无法凭空擦除画面水印。

## 二十七、图片工作台逻辑审计与修复（2026-08-27）

- 修复上传文件全部无效时访问 `addedImages[0]` 导致的运行时异常。
- 修复自由裁剪后开启锁定比例仍使用原图比例的问题，当前会优先使用当前裁剪选区比例。
- 修复裁剪预览中选区内部被 `destination-out` 擦黑的问题，改为保留选区内原图并只压暗外部区域。
- 修复从格式转换 Tab 切换到其他 Tab 后，EXIF 保留/编辑策略误应用到压缩、裁剪和隐私导出的问题。
- 修复九宫格生成异常未被捕获及重复点击状态未锁定的问题。
- 延长处理结果、九宫格下载 Blob URL 的释放时间，并将下载链接挂载到文档后再触发，提升移动端下载稳定性。
- 验证：`npm run build`、`node --check server/routes/parse.js`、`git diff --check` 通过；模拟多图解析数据验证通过。

## 二十八、多图队列独立编辑状态（2026-08-27）

- `ImageStudio` 为每张队列图片增加独立 `ImageEditState`，分别保存尺寸、裁剪选区、水印、遮罩历史、EXIF、导出格式、处理结果和九宫格结果。
- 切换图片时先保存当前图片状态，再加载目标图片状态；新图片使用全新的默认编辑状态，不再复用上一张图片的参数或处理结果。
- 压缩、裁剪、隐私处理、格式转换只作用于当前选中图片；拼长图继续按设计读取整个图片队列。
- 删除图片和组件卸载时分别释放对应图片的原图、处理结果和九宫格 Blob URL，避免多图编辑产生资源泄漏。
- 验证：`npm run build` 通过。

### 二十八.1 预览状态隔离修复（2026-08-27）

- 预览状态拆分为「原图 / 编辑预览 / 处理后」三种模式：原图只绘制原始图片，编辑预览才绘制当前 Tab 的水印、遮罩或裁剪选区，处理后只显示当前图片且当前 Tab 生成的结果。
- 新增 `processedTab` 与当前处理结果 URL 归属校验，切换图片或功能 Tab 后不会继续显示上一张图片/上一个功能的处理结果，也不会误下载旧结果。
- 修复隐私水印后点击「原图」仍显示水印的问题；从隐私 Tab 切换到尺寸裁剪时，裁剪预览重新基于原始图片绘制，不再把水印或打码带入裁剪预览。
- 遮罩绘制时继续实时展示真实马赛克/遮盖/柔焦效果；点击原图后开始拖拽会自动进入编辑预览，避免交互失效。
- 切换功能 Tab 后，原先 Tab 的处理后尺寸/体积统计不再冒充当前功能结果。
- 运行态验证：两张图片分别上传后，第一张的遮罩与处理结果可恢复，第二张保持独立初始状态；原图无水印、编辑预览有水印/遮罩；`npm run build` 与 `git diff --check` 通过。

### 二十八.2 尺寸预设与遮罩交互增强（2026-08-27）

- 尺寸裁剪的五个标准预设改为强制使用目标物理像素导出：一寸照 `295×413`、二寸照 `413×579`、小红书 `1080×1440`、微信朋友圈/头像 `1080×1080`、公众号次图封面 `900×383`；选择预设后 Width/Height 只读，避免手动输入覆盖需求尺寸。
- 自由裁剪在开启比例锁定时按当前裁剪选区比例计算导出高度；Canvas 导出和处理结果统计继续使用原始物理像素。
- 遮罩状态统一为 `{ rect, style, rotation }`，每个遮罩独立保存马赛克、黑色遮盖、白色遮盖或柔焦模糊样式；切换遮罩方式不会修改已有遮罩。
- 遮罩支持拖动位置、拖拽四角调整大小、顶部手柄旋转，并提供旋转滑块；历史栈保存完整遮罩几何与样式状态。
- 撤回/重做改为纯 `←` / `→` 图标按钮，保留 `aria-label` 与 `title` 辅助说明；两者使用独立历史栈，可按顺序恢复遮罩新增、移动、缩放和旋转。
- 尺寸预设、遮罩方式、导出格式、EXIF 处理四个下拉框统一使用液态玻璃样式。
- 验证结果：重启 `prohub-frontend-dev` 清理 Vite 旧模块后，浏览器实测五个预设均输出目标尺寸；遮罩新增、`15°` 旋转、`←` 撤回到 `0°`、`→` 重做到 `15°` 均通过；`npm run build` 与 `git diff --check` 通过。
- Docker 开发环境当前正常：`prohub-frontend-dev` 暴露 `5173`、`prohub-backend-dev` 暴露 `3001`、`prohub-rembg-dev` 暴露 `8081`，三个容器均为运行状态。

### 二十八.3 遮罩旋转、EXIF 时间与全局回顶（2026-08-27）

- 修复遮罩旋转时错误带动内部图像内容的问题：改为使用旋转后的遮罩多边形裁剪原始底图坐标，马赛克/柔焦只处理遮罩覆盖到的原图位置，不旋转被处理的图像内容。
- 导出时按原图与目标 Canvas 的比例映射遮罩位置、尺寸和旋转角度，确保处理结果中的遮罩几何位置与编辑预览一致。
- EXIF 编辑中的拍摄时间改为原生 `datetime-local` 日历/时间选择器，`step="1"` 精确到秒；导出时转换为 `YYYY:MM:DD HH:MM:SS`，同时写入 EXIF 的拍摄时间、数字化时间和主时间字段。
- 提示浮层提高到页面级层叠优先级，并扩大可用宽度限制，避免被右侧预览区域遮挡。
- 新增全局 `src/src/components/BackToTop.vue`，页面滚动超过 400px 后显示液态玻璃回顶按钮，点击后平滑回到页面顶部；已集成至 `src/src/App.vue`。
- 验证：旋转遮罩后可正常生成处理结果，控制台无错误；编辑 EXIF 时出现带秒级精度的日历控件；页面下滚显示回顶按钮，点击后完成平滑回滚；`npm run build` 与 `git diff --check` 通过。

### 二十八.4 旋转遮罩底图采样修正（2026-08-27）

- 进一步修正马赛克和柔焦逻辑：旋转/移动只改变遮罩多边形的边界，滤镜仍从当前原始底图的对应坐标采样，避免遮罩框旋转时带走或旋转局部图像。
- EXIF 拍摄时间标签简化为“拍摄时间”，继续使用原生日期时间选择器和秒级步进，不再显示“精确到秒”冗余文字。
- 将侧栏、隐私处理卡片和 Tooltip 统一提升层叠优先级，确保电脑全屏时提示浮层显示在预览卡片之上。
- 最终回归：马赛克与柔焦旋转后均可正常处理导出，EXIF 编辑显示 `datetime-local` 控件且 `step=1`，回到顶部按钮可用，浏览器控制台无错误；`npm run build` 与 `git diff --check` 通过。

### 二十八.5 旋转遮罩原图采样与柔焦边缘修正（2026-08-27）

- `drawMaskEffect` 改为只用旋转后的遮罩多边形执行 `clip()`，马赛克、柔焦和纯色遮盖始终按未旋转的原图坐标绘制，彻底避免遮罩旋转时带动局部底图。
- 预览和导出分别建立原始底图副本，多个遮罩不会互相采样已经处理过的结果，重叠区域仍按遮罩图层顺序叠加。
- 柔焦采样区增加边缘扩展，并修正扩展区域回绘坐标，避免旋转或靠近边缘时出现滤镜内容偏移。
- 浏览器回归：马赛克遮罩新增、旋转 `15°`、柔焦遮罩新增与旋转导出均成功；控制台无错误；Tooltip 实测显示 `z-index: 9999`，EXIF 日期控件为 `datetime-local` 且 `step=1`。
- 重新验证：`npm run build`、`node --check server/routes/parse.js`、`git diff --check` 通过。

### 二十八.6 旋转遮罩几何同步与独立删除（2026-08-27）

- 马赛克改为在遮罩自身局部网格中生成，再按遮罩旋转角度回绘；每个马赛克块的颜色仍通过旋转后的世界坐标从原图采样，遮罩边界、马赛克块方向保持同步，原图像素不会被单独旋转或持久化为图层。
- 柔焦、黑色遮盖、白色遮盖继续使用旋转 Path/Clip，滤镜内容按原图世界坐标回绘，确保遮罩移动和旋转时底图方向与位置不变。
- 选中遮罩时在旋转后的右上角绘制红色 `✕` 删除控制点；点击后只删除当前遮罩，并把删除动作写入撤销栈，支持重做恢复。
- EXIF 拍摄时间继续使用原生 `datetime-local` 日历/时间选择器，拦截键盘、粘贴和拖入文本输入，同时保留鼠标/触摸唤起日期与时间面板。

### 二十八.7 遮罩几何采样与拍摄时间面板修复（2026-08-27）

- 修复纯色遮盖的绘制坐标：黑色/白色遮罩先在遮罩自身局部坐标系中旋转，再通过旋转 Path 裁剪，避免出现边框旋转而填充网格仍保持轴对齐的问题。
- 重构柔焦绘制：从原始底图生成带边缘扩展的整图模糊副本，再按当前旋转遮罩几何区域裁剪回绘；移动、旋转遮罩不会携带或旋转局部原图像素。
- 马赛克继续在遮罩局部网格中生成，网格几何跟随遮罩旋转，但每个块的颜色始终按旋转后世界坐标从原始底图采样。
- 将拍摄时间从隐藏的 `datetime-local` 文本控件改为纯前端日历 + 时分秒选择面板：只读展示按钮打开面板，用户通过日历、小时、分钟、秒下拉选择，点击“完成”后写入编辑状态。
- 修复日期按钮在外层 `label` 中点击只聚焦、不打开面板的问题，改为普通容器并阻止默认点击行为；补充点击外部自动关闭和切换图片/Tab 时清理面板状态。
- 验证：重启 `prohub-frontend-dev` 清理 Vite 旧模块缓存；浏览器实测日期面板打开、确认后显示 `YYYY-MM-DD HH:mm:ss`；马赛克、黑色遮盖、白色遮盖、柔焦旋转导出无控制台错误；`npm run build`、`git diff --check` 通过。

### 二十八.8 EXIF 日期面板紧凑液态玻璃优化（2026-08-27）

- 日期时间选择面板宽度由 `23rem` 收紧为 `19rem`，日期网格按钮改为固定高度，减少面板纵向占用，避免遮挡下方操作按钮。
- 面板改用高不透明度深色液态玻璃样式，补充半透明边框、内高光、阴影和适度背景模糊，提升日期文字与下拉选项的可读性。
- 时分秒选择控件和底部操作区同步压缩间距，保持日历、时间选择和确认操作在较小区域内完整显示。
- 日历头部新增年份下拉选择，支持 `1900` 年至当前年份后 10 年；切换年份时保留月份、日期及时分秒，并自动修正目标月份不存在的日期。

### 二十八.9 抖音长文案完整解析修复（2026-08-27）

- 修复抖音分享文本只显示接口 `desc` 摘要、导致用户粘贴的完整长文案丢失的问题。
- 后端从请求中的完整分享文本提取 URL 前的作品文案，过滤抖音“复制此链接，打开抖音搜索”等分享尾部信息，并传入抖音解析流程。
- 抖音解析成功后优先展示用户分享文本中的完整文案，同时保留接口返回的标题、作者、视频和图片媒体数据。
- 前端文案区域改用 `whitespace-pre-wrap` 与 `break-words`，保留换行并避免长行溢出或视觉截断。
- 验证：`node --check server/routes/parse.js`、`node --check server/parsers/douyin.js`、`npm run build`、`git diff --check` 通过。

### 二十八.10 抖音版本提示清理（2026-08-27）

- 过滤抖音结果中的“版本过低，升级后可展示全部信息”兼容提示，避免平台内部提示混入作品标题和正文。
- 前端展示与复制文案同步清理该提示，即使后端尚未重启或使用旧缓存结果，也不会在页面和复制内容中显示。

### 二十八.11 抖音分享文案重复与括号清理（2026-08-27）

- 当剪贴板内容同时包含省略摘要和完整文案时，改为选取抖音 URL 前最后一个非空文案段，避免摘要与完整文案重复显示。
- 清理 Markdown 分享链接留下的 `[`、`(` 等包裹字符，避免正文结尾出现多余的左括号。
- 后端返回 `hasSharedCaption` 标记；前端对抖音分享文案隐藏重复的大标题，只保留下方完整小字号文案。

## 二十九、性能、导航与剪贴板体验完善（2026-08-28）

- 完成全局网页性能优化：降低固定背景、复杂毛玻璃、大面积阴影和文字阴影的渲染成本；将 `transition-all` 改为明确的 `transform`、`opacity` 等属性动画，并补充减少动态效果支持。
- 优化卡片、按钮、背景切换器、赞助按钮、回到顶部按钮和首页交互动效，减少不必要的位移、缩放及重复重绘，改善页面滚动流畅度。
- 新增顶部“关于”入口，采用独立开发者卡片弹窗展示项目宗旨、纯前端隐私与无广告特性、定制/合作信息及联系邮箱；新增一键复制邮箱，并修复邮箱区域与说明文字互相挤压的问题。
- 首页分类切换增加稳定内容高度，修复切换“全部”“协作同步”“媒体/去水印”等分类时 Footer 跟随内容上下跳动的问题。
- 重构网页极速剪贴板：文本、图片和文件统一使用唯一 `msgId`，服务端与前端均增加幂等去重，避免发送一条内容生成两条记录；组件卸载时正确解绑 Socket/SSE 监听，防止重复监听和内存泄漏。
- 完成剪贴板 Host/Guest 角色化界面：创建房间者显示二维码、房间链接和设备管理区域；扫码加入者隐藏大二维码，仅保留房间号胶囊和连接状态，将主要空间留给剪贴板内容与文件传输。
- 文件传输统一限制为单文件最大 `50MB`，上传区域补充图片/常用文档限制说明；增加上传进度百分比、进度条、成功/失败状态、完成 Toast，以及文件预览、复制和下载操作。
- 优化临时图片 Blob URL 的释放时机，在替换文件和组件卸载时回收资源，避免反复传输造成浏览器内存增长。
- 验证：前端 `npm run build` 通过；`server/realtime/clipboard.js` 通过 `node --check`；同一 `msgId` 连续发送两次时房间记录保持为 `1`；`git diff --check` 通过。
- 构建仅保留已有的 `heic2any` chunk 超过 `500KB` 警告，该警告不影响本次功能和构建结果。

### 二十九.1 剪贴板 Host/Guest 身份判定修复（2026-08-28）

- 修复首次打开 `/clipboard` 后生成房间却被错误识别为 Guest 的问题，移除基于 `localStorage` 房间记录的身份猜测逻辑。
- 后端房间创建时生成唯一 Host Token，新增 `/api/clipboard/room/session` 房间身份会话接口：创建者获得 Host Token，扫码或直接打开已有链接的设备默认获得 Guest 身份。
- Host Token 仅保存在当前浏览器标签页的 `sessionStorage` 中，创建者刷新页面可恢复 Host；换设备、换浏览器、无痕窗口或没有 Token 时不会冒充 Host。
- 服务端对房间设置修改和清空操作增加 Host Token 校验，并让房间加入响应返回 `host/guest` 角色。
- 前端连接、重连、房间设置和清空请求统一携带 Host Token；身份确认失败时不再把设备误显示为 Host。
- 验证：前端 `npm run build`、后端 `node --check server/index.js`、`node --check server/realtime/clipboard.js` 通过。

### 二十九.2 剪贴板文件传输与移动端交互重构（2026-08-28）

- 修复文件名全链路处理：服务端使用 UTF-8 `filename*` 响应头并提供 ASCII 兼容回退名，前端显示和下载前统一解码文件名，支持中文、空格和特殊字符。
- 下载逻辑改为先读取服务端原始 Blob，再通过 `URL.createObjectURL()` 下载，不再把图片缩略图或处理后的内容当作原文件。
- 房间号默认显示为脱敏格式，例如 `889234` 显示为 `88***4`；Host 和 Guest 均增加眼睛按钮，可切换完整房间号，复制链接和二维码仍使用真实房间地址。
- 文本消息增加当前标签页 `clientId`，服务端保存发送者信息；前端接收时拦截自身回包和已存在 `msgId`，同时保留发送确认对本地待发送卡片的更新，彻底避免重复记录。
- 移动端上传状态由全屏大卡片改为底部紧凑进度条，仅显示文件名、百分比和取消按钮；支持中断 FileReader/XHR，组件卸载时清理进行中的读取、请求和临时 Blob URL。
- 非文本文件移除“复制文本”按钮；为 `.txt`、`.md`、`.json`、`.js`、`.py`、`.vue`、`.css` 等文本文件增加内容预览弹窗和复制文本功能。
- 自动销毁选项增加 `0` 分钟“永不销毁”；服务端正确保存永久房间状态、返回空过期时间，并避免加入、上传或发送内容时被访客默认 TTL 覆盖。
- 补齐后端 Socket.IO 房间事件注册，连接、加入、同步、删除、设置、清空和断开事件与现有内存房间统一；同步 `server/package-lock.json` 中的 `socket.io` 依赖记录。
- 验证：前端 `npm run build`、后端语法检查、`git diff --check` 通过；房间会话实测返回 `host → guest → host`，永久房间 TTL 返回 `0` 且 `expiresAt` 为空。
- Windows 本机 `npm ci` 仍受到正在占用的 `sharp` DLL 阻止；依赖锁文件已更新，Docker 重建时可按锁文件重新安装，若本机安装需先停止占用 `server/node_modules` 的进程。

### 二十九.3 剪贴板清空逻辑与渲染性能重构（2026-08-28）

- 修复手动清空后 Host/Guest 状态异常：手动清空现在只删除房间内的文本、图片和文件，保留房间、Host Token、Socket.IO 连接和用户角色；自动过期仍按原逻辑销毁临时房间。
- 房间卡片的房间号改为 `text-sm font-mono`，顶部布局统一使用 `flex items-center justify-between gap-2`，避免房间号与控制按钮互相挤压。
- 文本同步建立非响应式 `seenMsgIds Set`，发送端携带 `clientId + msgId`，接收端优先拦截自身消息和重复消息；多条同步消息通过 `requestAnimationFrame` 微批合并，避免连续触发 DOM 更新。
- 消息列表改用 `shallowRef`，所有数组更新改为不可变替换，避免长文本、Base64 和 Blob 数据被 Vue 深度代理；卸载时清理 rAF、待处理消息队列和去重 Set。
- 消息列表增加 `content-visibility: auto`、`contain-intrinsic-size`、`overscroll-behavior: contain` 和合成层提示，降低长列表滚动时的渲染开销。
- Host 修改 TTL 时广播房间 `mode`、`ttlMinutes` 和 `expiresAt`，Guest 实时同步临时/永久模式和倒计时，不再被访客默认 TTL 覆盖。
- 验证：前端 `npm run build`、后端 `node --check server/index.js`、`node --check server/realtime/clipboard.js`、`git diff --check` 通过；本机 `npm ci` 仍因被占用的 `sharp` DLL 无法完成运行依赖安装。

### 二十九.4 剪贴板单点收包与 Guest 倒计时修复（2026-08-28）

- 文本发送改为单点收包渲染：发送函数不再通过 Socket ACK 直接写入列表，只有 `clip:sync` 收包处理函数负责新增或更新消息。
- 修复重复发送锁：文本发送增加待确认消息表，拦截同一文本在 ACK 返回前被手动发送和 900ms 自动发送重复提交的情况。
- 修复本端回包被误丢弃：允许服务端广播给发送者的 `clip:sync` 正常进入列表，并在收包第一时间使用 `seenMsgIds` 锁定 `msgId`，再通过 `requestAnimationFrame` 批量更新界面。
- 文件上传占位卡只负责显示读取/上传进度，不再提前写入去重 Set；最终文件统一等待 `clip:sync` 收包替换占位卡并显示完成状态，避免出现重复文件记录。
- 后端 Socket.IO 继续向房间内所有客户端广播 `clip:sync`，并为房间会话响应补充 `ROOM_CONFIG_SYNC` 配置数据，确保发送端也能收到自己的同步回包。
- 新增前端 `ROOM_CONFIG_SYNC` 监听：Guest 加入、Host 修改 TTL 或房间模式后，实时更新销毁模式和过期时间；临时房间显示秒级倒计时，永久房间显示“永不销毁”。
- “恢复默认”按钮改为与“复制链接”一致的精致胶囊样式，删除二维码区域多余的“输入”按钮，Host 控制栏更加简洁。
- 验证：前端 `npm run build` 通过；后端 `node --check server/index.js`、`node --check server/realtime/clipboard.js` 通过；`git diff --check` 通过。构建仍仅提示已有的 `heic2any` 大 chunk 警告，不影响结果。

### 二十九.5 移动端背景分层与弹性动效重构（2026-08-28）

- 在 `App.vue` 增加独立固定背景层：背景图、背景色和内容滚动层完全解耦，加入 Emerald、Cyan、Slate 三个低饱和环境光晕，并使用轻量呼吸动画增强空间感。
- `BgSwitcher.vue` 改为通过 CSS 变量更新固定背景层，纯色、内置壁纸、Bing 壁纸和自定义图片仍保持原有切换与自动保存逻辑。
- 移动端液态玻璃卡片统一为深色半透明表面、适度毛玻璃、细边框和柔和深度阴影，降低原先大面积高强度模糊造成的厚重感。
- `RealtimeClipboard.vue` 增加移动端滚动容器能力、横向溢出保护和卡片列表 `Fade-In-Up + 轻微缩放` 进场动画，使用 `cubic-bezier(0.16, 1, 0.3, 1)` 保持自然弹性。
- 移动端按钮、链接和可点击标签统一增加 `150ms` 触控反馈与 `scale(0.95)` 按压效果，并保留 `prefers-reduced-motion` 用户的减弱动效能力。
- 验证：前端 `npm run build`、`git diff --check` 通过；构建仍仅提示已有的 `heic2any` 大 chunk 警告，不影响结果。

### 三十. 剪贴板房间生命周期、设备管理与反馈模块（2026-08-28）

- 重构剪贴板房间生命周期：新增“切换/加入房间”流程，切换前清理旧 Socket/SSE、上传请求、读取器、消息去重锁、动画帧和临时预览 URL，并通过路由参数无刷新进入目标房间。
- 完善 Host/Guest 状态隔离：Host 主动销毁房间、刷新或断开连接时广播 `HOST_DISCONNECTED`；Guest 锁定发送区域并显示 5 秒倒计时，倒计时结束后自动生成新的独立 Host 房间。
- 新增 Host 踢人能力：在线设备面板展示设备连接标识、IP、客户端地区信息和设备类型，Host 可单独移除 Guest，Guest 收到 `KICK_DEVICE` 后清理连接并自动重置。
- 修复实时收包边界：SSE 连接携带 Host Token、设备类型和地区信息；历史同步使用 `SYNC_HISTORY_STATE` 全量覆盖；发送者收到自己的 `clip:sync` 回包，避免发送端不显示或产生重复记录。
- 修复房间配置同步：Host 修改 TTL 或持久化模式时同步 `ROOM_CONFIG_SYNC`，Guest 使用绝对过期时间启动本地倒计时；永久房间使用 `0` 分钟并停止计时器。
- 新增 `FeedbackModal.vue`：支持反馈类型、500 字内容限制、PNG/JPG 拖拽/选择/粘贴附件、3MB 单图校验、联系方式、60 秒本地提交冷却和蜜罐字段。
- 新增后端 `/api/feedback`：使用 Nodemailer 通过 QQ SMTP 向 `947919822@qq.com` 发送格式化 HTML 邮件和图片附件；支持通过 `VITE_FEEDBACK_FALLBACK_URL` 配置前端备用接口。
- Header“关于”卡片增加反馈入口和高层级成功提示；Docker Compose 增加 SMTP 环境变量透传，未配置授权码时接口明确返回配置提示，不泄露密钥。
- 验证：前端 `npm run build`、`node --check server/index.js`、`node --check server/realtime/clipboard.js`、`node --check server/routes/feedback.js`、`git diff --check` 通过。服务器本机运行冒烟测试受 `server/node_modules` 未安装影响，需在 Docker 或安装后端依赖的环境中验证 SMTP 和实时连接。

### 三十.1 全局主题、房间恢复与设备信息适配（2026-08-28）

- 新增 `useTheme.ts` 统一管理 `light`、`dark`、`system` 三种主题模式，持久化到 `localStorage`，同步 `<html>` 的 `dark` 类、`data-theme` 和 `color-scheme`；`index.html` 首屏脚本提前同步主题，减少 FOUC 闪烁。
- 重构全局语义色变量和固定背景层：背景使用独立的 `fixed inset-0` 图层，内容区使用 `min-h-dvh` 自然滚动，浅色模式与深色模式分别提供可读的页面、卡片、边框和文字颜色。
- Header、Footer、首页、图片工作台、自媒体工作台、无水印解析、证件照、CIDR、即将上线、反馈弹窗和房间弹窗补充浅色/深色适配；反馈入口和赞赏入口统一收拢至右下角悬浮工具栏，新增 `DonateModal.vue`。
- 房间状态增加 `sessionStorage`/`localStorage` 恢复线索：Host 刷新或服务端内存重启后可使用原房间号重新创建，Guest 遇到 `ROOM_NOT_FOUND` 自动等待并重试，避免直接永久断开。
- 后端统一提取真实 IPv4，过滤 IPv6、回环地址和 `::ffff:` 前缀；局域网设备显示“局域网”，公网 IPv4 异步补充城市/地区信息并缓存，在线设备列表不再展示原始 IPv6。
- 优化剪贴板页面底部安全间距、在线设备面板、Toast、加入房间弹窗和文本预览弹窗，避免浅色模式黑底黑字、移动端浮动工具栏遮挡内容和层级冲突。
- 补强反馈弹窗、房间销毁提示、加入房间提示和在线设备面板的浅色模式文字对比度，并补全反馈邮箱复制事件声明。
- 验证：前端 `npm run build`、后端 `node --check server/index.js`、`node --check server/realtime/clipboard.js`、`git diff --check` 通过；Docker 开发环境的前端 `5173`、后端 `3001`、rembg `8081` 服务保持运行。

### 三十.2 剪贴板移动端交互与上传性能优化（2026-08-28）

- 新增统一 `BackButton.vue`，面包屑页面、证件照页面和房间页面均支持智能返回；无历史路由时自动回到首页。
- Toast 提升至 `z-[9999]`，移动端使用安全区顶部定位；“关于”弹窗改为 `80dvh` 可滚动布局并移除重复反馈入口。
- 更新移动端 viewport、触控策略和左右悬浮控件安全区间距，调整在线设备面板位置，避免与全局反馈/赞赏工具栏重叠。
- 剪贴板文本输入和消息正文补充浅色模式高对比度颜色；房间页面保留 `text-slate-900 dark:text-slate-100` 显式映射。
- JPEG/PNG 超过 1MB 时在浏览器本地异步缩放至最长边 2048px 并以 0.85 质量压缩；GIF/SVG 跳过压缩，上传增加 120 秒超时和最多 2 次自动重试，取消与卸载时清理重试定时器。

### 三十.3 剪贴板 Host 初始化与弹窗交互修复（2026-08-29）

- 修复移动端创建房间时 Host 身份初始化不稳定的问题：创建意图进入会话请求前立即设置内存角色为 `host`，并同步写入 `sessionStorage` 与 `localStorage` 的房间状态。
- 新建独立房间时重置 `reconnectAttempts` 和会话重试次数，避免沿用旧房间的恢复状态导致错误重连。
- `ROOM_NOT_FOUND` 恢复流程同时检查内存角色、当前 Host Token 和已保存 Host Token；原 Host 房间优先使用 `create` 意图重建，不再被降级为 Guest 的 `join` 请求。
- 会话失败时保留 Host 的创建意图；应用层会话重试限制为最多 5 次并采用递增等待，避免与 Socket.IO 自动重连叠加形成无限循环。
- 反馈弹窗滚动区域增加 Firefox 与 WebKit 浏览器兼容的细滚动条样式，支持透明轨道、圆角滑块和悬停高亮。
- 验证：前端 `npm run build` 通过，退出码为 `0`；构建仅保留 `ES2024` target 与 `heic2any` 大 chunk 警告，不影响产物生成。
- 本次审查发现原开发配置将 `VITE_SOCKET_URL` 固定为 `http://localhost:3001`，移动端扫码后会错误连接手机自身的 3001 端口；已移除该固定配置，未显式配置时改用当前页面同源地址，电脑端和移动端统一连接实际服务地址。
- 修正房间初始化失败提示：网络不可达、SSE/Socket 连接失败等情况不再误报为“信令服务没有房间数据”，创建房间会保留 `create` 意图并自动进行有限次数重试。
- 验证：在 `src` 目录执行 `npm run build` 可通过；`node --check server/realtime/clipboard.js` 通过。根目录没有 `package.json`，因此不能从项目根目录执行 npm 构建。
- `git diff --check` 仍发现 `RealtimeClipboard.vue` 存在两处历史尾随空格，不影响构建。

### 三十.4 电脑端与移动端信令地址修复验证（2026-08-29）

- 已重新构建并启动 Docker 开发环境：`prohub-backend-dev`、`prohub-frontend-dev`、`prohub-rembg-dev` 均正常运行。
- 已验证 `http://localhost:3001/api/clipboard/health` 返回 HTTP 200，确认剪贴板信令后端已启动并注册房间接口。
- 已验证 `http://localhost:5173/` 返回 HTTP 200，确认前端开发服务可访问。
- 开发环境实时连接不再固定使用手机不可达的 `localhost:3001`，默认跟随当前页面同源地址；电脑端和手机端应通过同一个局域网访问地址连接。
- 已执行 Dev 与正式环境自动重建：`docker compose -f docker-compose.dev.yml up -d --build` 和 `docker compose up -d --build` 均成功。
- Dev 健康检查 `http://localhost:3001/api/clipboard/health` 返回 HTTP 200；正式环境 `http://localhost:3000/api/clipboard/health` 返回 HTTP 200。
- 当前容器状态正常：`prohub-backend-dev`、`prohub-frontend-dev`、`prohub-rembg-dev`、`prohub`、`prohub-rembg` 均处于运行状态。

### 三十.5 剪贴板“等待服务器响应且二维码不生成”修复（2026-08-29）

- 现象：打开 `/clipboard` 后页面长期停留在“等待服务器响应”，二维码区域一直显示“生成中...”，无法进入房间。
- 根因确认：
  - Dev 环境三个容器（`prohub-backend-dev`、`prohub-frontend-dev`、`prohub-rembg-dev`）全部不存在，`docker compose -f docker-compose.dev.yml ps -a` 为空，Dev 后端 `3001` 端口无人监听，房间会话请求 `POST /api/clipboard/room/session` 无法送达。
  - 前端 `requestRoomSession()` 的 `fetch()` 没有超时机制，服务不可达时请求长期 pending，既不触发错误提示也不进入重试流程。
  - 二维码依赖 `roomId` 生成 `roomUrl`，而 `roomId` 只有会话接口成功返回后才赋值，因此会话挂死时二维码永远停留在“生成中”。
- 修复内容：
  - `requestRoomSession()` 增加 `AbortController` 超时（`sessionRequestTimeoutMs = 10000`），超时抛出“房间服务响应超时”。
  - `isTransientRoomError()` 增加 `timeout` 与“响应超时”识别，创建/加入意图失败后可正常进入有限次数自动重试，并在达到上限时提示“房间服务暂时不可用”。
  - 重新构建并补齐 Dev 环境三个容器，恢复 `5173 / 3001 / 8081` 端口服务。
- 验证结果：
  - `npm run build` 通过，退出码 `0`（仅保留既有 `ES2024` target 与 `heic2any` chunk 警告）。
  - `docker compose -f docker-compose.dev.yml up -d --build` 与 `docker compose up -d --build` 均成功。
  - Dev：`POST /api/clipboard/room/session` 返回 HTTP 200，`/api/clipboard/health` 返回 HTTP 200。
  - 正式环境：`/api/clipboard/health` 与 `/clipboard` 页面均返回 HTTP 200。
  - 容器状态：`prohub-frontend-dev`、`prohub-backend-dev`、`prohub-rembg-dev`、`prohub`、`prohub-rembg` 全部运行中。

### 三十.6 旧设备重开剪贴板无法生成二维码修复（2026-08-29）

- 现象：新设备打开 `/clipboard` 能正常生成二维码；之前进过页面的旧设备重新打开时无法生成二维码，并反复弹出“正在连接房间/正在等待房间服务响应”等 toast。
- 根因：
  - Host Token 只写入 `sessionStorage`，关闭标签页即丢失；但房间状态 `{roomId, role}` 同时写入 `sessionStorage` 和 `localStorage`，会长期保留。
  - 旧设备重开 `/clipboard` 时 `localStorage` 里仍有旧房间号，而 Host Token 已丢失，`restoredHost` 判定失败后仍复用旧房间号并以 Guest `join` 意图请求会话。
  - 旧房间在服务端早已不存在（默认 10 分钟 TTL 或服务重启清空内存），`ROOM_NOT_FOUND` 又被 `isTransientRoomError` 视为瞬时错误，进入最多 5 次重试循环并不断弹 toast，最终离线；新设备无持久化状态，直接创建新房间成为 Host，因此表现正常。
- 修复：
  - 无 URL 房间号进入时，只有能恢复 Host 身份（Host Token 仍存在）的旧房间才复用原房间号；否则一律生成新房间并以 `create` 意图创建，保证旧设备重开页面即可成为 Host 并立即生成二维码。
  - 通过链接/二维码（URL 带房间号）加入的 Guest 流程不受影响。
- 验证：`npm run build` 通过；Dev 与正式环境 Docker 重建成功；Dev 会话接口 HTTP 200、正式环境健康检查 HTTP 200；五个容器全部运行中。

### 三十.7 主页主按钮调整与左下角悬浮按钮尺寸统一（2026-08-29）

- 主页 Hero 区“⚡ 立即创建专属房间”按钮实用性不足，已替换为“开始使用”按钮：点击后平滑滚动到下方工具区 `#tools`，不再直接跳转剪贴板页面；使用 `scrollIntoView({ behavior: 'smooth' })` 实现，无 URL 锚点污染、无页面置顶跳变，并移除了不再使用的 `useRouter` 依赖。
- 左下角“换背景”悬浮按钮此前为 `px-3.5 py-2 text-sm font-medium`，与右下角悬浮工具条按钮（`px-3 py-2 text-xs font-semibold`）视觉尺寸不一致，已统一为相同规格，图标均为 `h-4 w-4`，左右下角视觉对称。
- 验证：`npm run build` 通过，产物主 JS 为 `index-B3KhJVNr.js`；Dev 与正式环境 Docker 重建成功；本地 3000 与 `https://prohub.paynehe.me` 首页均确认返回新构建产物。

### 三十.8 顶部导航栏滚动智能隐藏/显示（2026-08-29）

- 需求：顶部导航栏不再常驻，向下滑动进入工具区等内容时向上滑出隐藏，滚动回页面顶部附近时重新显示，过渡动画流畅。
- 实现（`AppHeader.vue`）：
  - 增加 `scroll` 方向感知监听（passive + `requestAnimationFrame` 节流）：下滑超过 6px 且离开顶部 72px 后隐藏；上滑超过 6px 即恢复显示；接近顶部时常显，并兼容 iOS 橡皮筋回弹的负 `scrollY`。
  - 隐藏位移动画使用 `transform: translateY(calc(-100% - 0.75rem - env(safe-area-inset-top)))`，补偿 sticky `top-3` 偏移与移动端刘海安全区，确保完全滑出视口无残留。
  - 过渡采用 `340ms cubic-bezier(0.16, 1, 0.3, 1)` 弹性曲线，与项目现有动效语言一致；`will-change: transform` 保证合成层动画流畅；同时适配 `prefers-reduced-motion` 关闭动画。
  - 移动端与电脑端行为保持一致（统一交互直觉），卸载时移除监听避免内存泄漏。
- 验证：`npm run build` 通过，产物主 JS 为 `index-CT4W_Ucj.js`；Dev 与正式环境 Docker 重建成功；本地 3000 与 `https://prohub.paynehe.me` 均已确认返回该新构建产物。

### 三十.9 顶部导航栏恢复“关于”入口并优化右侧间距（2026-08-29）

- 问题：此前精简 Header 时移除了“关于”触发按钮并误删了配套脚本（`aboutOpen`、`copyEmail`、`emailCopied`、Escape 关闭监听及图标导入），但关于弹窗模板仍保留，导致移动端和电脑端都没有关于入口，弹窗成为死代码。
- 修复（`AppHeader.vue`）：
  - 恢复“关于”文字入口，移动端与电脑端均可见，点击打开原有关于弹窗。
  - 恢复配套脚本：`aboutOpen` 状态、复制邮箱（含 `execCommand` 降级）、1.8 秒复制反馈、Escape 关闭弹窗监听，并在组件卸载时移除监听与定时器。
  - 右侧操作区 `gap-2` 调整为 `gap-3`，“关于”文字与深浅色切换按钮之间间距更舒适。
- 验证：`npm run build` 通过，产物主 JS 为 `index-DmlgLObO.js`；Dev 与正式环境 Docker 重建成功；本地 3000 与 `https://prohub.paynehe.me` 均确认返回新构建，且新 JS 中包含“关于”入口。

### 三十.10 右下角“反馈 / 赞赏支持”按钮与左下角换背景统一风格（2026-08-29）

- 问题：右下角悬浮按钮此前外层是 `rounded-2xl + 内边距 1.5` 的胶囊玻璃容器，内部“反馈”为纯色 hover 按钮，“赞赏支持”为橙色渐变高亮按钮，与左侧独立毛玻璃胶囊（圆角矩形 + 半透明白/深色底 + backdrop-blur + 阴影 + 统一 px-3/py-2/text-xs）风格不一致。
- 修复（`FloatingToolbar.vue`）：
  - 移除右下角外层公共玻璃容器与 padding，改为与左下角相同的独立按钮并排 `gap-2` 布局。
  - “反馈”与“赞赏支持”两个按钮统一使用左侧同款样式：`rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md hover:bg-slate-50 motion-interactive`，深色模式对应 `bg-slate-900/80`。
  - 保留功能语义颜色：反馈图标蓝 `text-ios-blue`，赞赏咖啡图标橙 `text-orange-500`，避免 CTA 完全失焦但按钮外壳保持一致。
- 验证：`npm run build` 通过，产物主 JS 为 `index-BuzzJ4Of.js`；Dev 与正式环境 Docker 重建成功；`https://prohub.paynehe.me` 已确认返回新构建且 JS 中包含与换背景一致的玻璃胶囊样式。

### 三十.11 社交平台去水印「确定性」审查与补齐（2026-08-29）

- 动机：用户要求「必须是无水印解析」，而此前代码存在多处「解析到什么就返回什么」，且缺少布尔字段让前端/外部调用方判断结果是否真无水印。
- 缺口审查（`server/routes/parse.js`、`server/parsers/douyin.js`）：
  - 小红书完全未做水印 URL 过滤；视频 `media.stream.h264/h265[].masterUrl/consumer.originVideoKey` 等候选数组未择优无水印版本。
  - 抖音 slidesinfo API 主分支仅对视频做了 `water-v2 / watermark` 的 `includes` 判断，未优先 `bit_rate[].play_addr.url_list / bit_rate[].url_list` 等无水印码流；桌面端 awemeDetail 兜底和 OG 兜底完全没过滤。
  - 微博图片错误复用视频专用 `/\/wm\/|\bwm\b|…/` 正则（`\bwm\b` 会误判 w/m、且图片水印关键词「mark_image/logo_mask/original」覆盖不足）。
  - 整体响应未输出 `noWatermark` 确定性布尔字段。
  - douyin.js 从 `../routes/parse` 内联引入工具导致 `circular dependency` 警告。
- 修复：
  - 新增 `server/utils/watermark.js`（`isWatermarkedImageUrl / isWatermarkedVideoUrl / pickNoWatermark / allNoWatermark`），消除循环依赖；脚本级单元测试 18/18 覆盖典型 URL 形态（`water-v2 / watermark / /wm/ /wm_images? / _wm / wm_h264 / play_wm / mark_image / logo_mask / ori- / sinaimg.cn wm_images`、反例正常 CDN URL）全部通过。
  - `parse.js`：parseXiaohongshu 主/兜底分支图片与视频候选全部 `pickNoWatermark`；parseWeiboItemInfo 图片改为 `isWatermarkedImageUrl`（不再复用视频正则）并返回 `noWatermark`；parseGeneric 的 JSON-LD/OG/video/img 兜底统一走判定；最终 `POST /api/parse` 做最后一轮候选重排 + 输出 `noWatermark: boolean = allNoWatermark(images) && allNoWatermark(videos,media) && (上游 noWatermark !== false)`。
  - `douyin.js`：API 主分支与桌面 awemeDetail 兜底分支都先收集 `bit_rate[].play_addr.url_list / bit_rate[].url_list` 等无水印优先码流，图片扩充 `download_url_list / noWatermarkUrl` 候选并过滤；`formatResult(OG)` 也走判定；失败兜底统一 `noWatermark:false`。
- 前端可视化（`MediaDownloader.vue`）：解析成功后在卡片组顶部渲染一枚「无水印状态徽章」——绿色盾牌图标 + 「已检测：无水印版本」为真无水印；否则橙色警告 + 提示用户改用 App 内手动保存，避免谎报。
- 构建与环境：
  - 前端 `npm run build` 成功；产物主 JS 从 `index-BuzzJ4Of.js` 更新为 `index-DlTx_3rN.js`，MediaDownloader 单独切块 `MediaDownloader-Clw5Krpf.js`（含徽章 UI 变更）。
  - Dev 与正式环境均通过 `docker compose -f docker-compose.dev.yml up -d --build` / `docker compose up -d --build` 自动重建。
  - 路由冒烟：`/api/parse` 非法 `url: 'not a url'` 正确返回 400 及中文错误；`/api/health` 健康检查 HTTP 200。域名 `https://prohub.paynehe.me` 已返回新构建产物 `index-DlTx_3rN.js`。
- 端到端实测说明：当前代码级（watermarkUtils 18/18）、路由冒烟级（400 正常）、容器级（健康检查 OK）均验证通过。由于三大平台分享链接含时效性签名且无法凭空捏造公开可用的样例 URL，『是否真无水印』的最终下载画面肉眼验收仍需用户提供至少各一条可用的抖音/小红书/微博分享链接，届时将实际 `POST /api/parse` + 下载原文件做画面核对。

### 三十.12 三大平台无水印解析端到端修复与验证（2026-08-29）

- 动机：用户提供真实微博链接 `https://weibo.com/6910766537/5272858477464864`，反馈解析获取的照片仍有水印；要求三大平台（微博、抖音、小红书）全部实现真正的无水印解析并逐一测试到功能完整。
- 修复内容（`server/routes/parse.js`）：
  - **fetchPage TDZ + 小红书 UA bug**：`fetchPage` 函数中 `platform` 变量在声明前被使用（Temporal Dead Zone），且路由传入 `mobile: true` 导致小红书实际走 MOBILE_UA，返回 `!h5_1080` 缩略图而非 `!nd_dft` 无水印原图。修复：将 `detectPlatform(url)` 调用提前到 UA 选择之前，并强制小红书始终使用 DESKTOP_UA。
  - **小红书 h5_1080 → nd_dft 转换**：新增 `xhsToNdDft()` 工具函数，将 CDN URL 中的 `!h5_1080` 后缀替换为 `!nd_dft`（小红书无水印原图约定），应用于 `__INITIAL_STATE__` 主分支和 OG/preload/img 全部兜底分支。同时在 `infoList` 中优先筛选 `imageScene` 含 `DFT` 且不含 `WM` 的条目。
  - **proxy-video Referer 修复**：视频代理的 `Referer` 原先硬编码为 `https://weibo.com/`，导致抖音 CDN 防盗链返回 403/502。修复：按视频 URL 域名动态设置 Referer（抖音 → `https://www.douyin.com/`，小红书 → `https://www.xiaohongshu.com/`，微博 → `https://weibo.com/`）。
- 端到端测试结果（Dev port 3001 + 正式 port 3000 均 ALL PASS）：

  | 平台 | 测试链接 | 类型 | 下载大小 | noWatermark | URL 关键特征 |
  |------|---------|------|---------|-------------|-------------|
  | 微博 | weibo.com/6910766537/5272858477464864 | image (JPEG) | 249,293 bytes | true | sinaimg.cn/mw2000 + sharp 擦除右下角水印 (260×101px) |
  | 抖音 | iesdouyin.com/share/video/7172831829785988383 | video (MP4) | 37,360,195 bytes | true | douyinvod.com bit_rate play_addr 无水印码流 |
  | 小红书 | xiaohongshu.com/explore/6a518f22000000000702228e?xsec_token=... | image (WebP) | 210,346 bytes | true | sns-webpic-qc.xhscdn.com `!nd_dft_wlteh_jpg_3` 原图 |

- 微博水印擦除日志验证：`[WatermarkRemoval] 1080x1440 watermark 260x101 -> 249293 bytes`，sharp 库成功提取水印上方区域并高斯模糊覆盖右下角 @作者名 像素水印。
- 构建与部署：正式环境 Docker 镜像重建成功（`docker compose build prohub && docker compose up -d prohub`），容器健康检查通过，`xhsToNdDft` 函数确认已部署到生产容器（grep 5 处引用）。前端构建产物 `index-DlTx_3rN.js` 未变（本次仅修改服务端代码）。

### 三十.13 滚动时背景图放大抽搐与移动端背景位移根治（2026-08-30）

- 阶段一 · 桌面端抽搐修复（上午）
  - 症状：用户滑动页面时，背景壁纸偶发抽搐/放大抖动，尤其 header 隐藏显示切换时更明显（iOS / Chrome 桌面端都能复现）。
  - 根因（三条叠加导致合成层风暴）：
    1. `.app-ambient-glow` 使用 Tailwind `animate-pulse`（修改 opacity 呼吸动画）+ `will-change: transform, opacity`，配合 `filter: blur(70px)`。滚动触发的每帧重排都会让 GPU 同时处理 header transform 合成、ambient blur 重采样、pulse opacity 插值 → 帧时间抖动 → 视觉抽搐。
    2. `will-change: transform` 声明在背景固定层上，会让浏览器禁用对该层的优化（强制保留合成层），与 header 已有的 `transform: translateY(...)` 合成层相互冲突，产生同步合成锁死。
    3. （临时尝试的 cover→100vw/100dvh 带来次生问题）：`background-size: 100vw 100dvh` 强制背景按视口像素精确拉伸，破坏了图片原始纵横比，导致宽屏壁纸（圣米歇尔山 16:9）在窄屏手机（约 9:19.5）上被横向压缩，画面"变窄"。
  - 修复（`src/style.css` + `src/App.vue`）：
    - 移除 ambient-glow 所有动画：删除 `animate-pulse` 类和 `animation-duration / animation-delay` 属性，改为纯静态 `opacity: 0.16`，不再修改 opacity。
    - 移除 `will-change: transform` 和 `will-change: transform, opacity`，改用 `transform: translate3d(0, 0, 0)` + `backface-visibility: hidden` 做一次性合成层预升。
    - `background-size` 最终保持 `cover`：因为抽搐的真正元凶（pulse + will-change）已被移除，cover 本身不会抽搐；100vw/100dvh 的拉伸方案虽然消除了 cover 重算，但导致比例压缩，属于错误策略。
    - 给 `.app-ambient-glow` 加 `contain: layout paint style`，blur 70px 的极重绘制不再被高频触发。
    - 给 `::after` 蒙层和 ambient 元素加 `pointer-events: none`。
- 阶段二 · 移动端「滚动时背景下移 N px」根治（下午）
  - 症状：用户专门在 iOS 端反馈，向下滚动页面时背景会"被固定往下移动一定的 px"，且伴随抽搐。桌面端验证通过但移动端仍存在问题。
  - 移动端特有根因（iOS Safari + 固定视口背景的经典陷阱）：
    1. **地址栏收缩触发 100dvh 变化**：向下滚动 Safari 地址栏收起，`100dvh` 增大。`.app-fixed-bg fixed inset-0` 随视口重新布局，`background-size: cover` 按新尺寸重算 → 壁纸瞬时放大 + 背景"下移 N px"（实际是视口变高后背景图被重新 cover 的中心偏移）。
    2. **iOS Safari 橡皮筋回弹 + fixed 元素掉合成层**：滚动超出边界时，fixed 元素会短暂被浏览器移出合成层，重新合成时画面闪一下。
    3. `contain: strict` 的 `size` 约束在 iOS Safari `position: fixed` 叠加场景下，会偶发触发 `overflow: hidden` 的错误裁剪行为。
  - 修复（`src/App.vue` + `src/style.css`）：
    - **JS 像素锁定视口（核心）**：在 `App.vue` `onMounted` 时用 `visualViewport.height/width`（fallback `window.innerWidth/Height`）一次性测量初始视口，写入三个 `ref`（`bgW / bgH / bgMinH`），再作为 `:style` 内联绑定到 `.app-fixed-bg` 的 `width/height` 和 `.app-root / main 外层容器` 的 `min-height`。**不监听 resize/visualViewport 变化**，让背景完全无视地址栏收缩；仅 `orientationchange` 横竖屏切换时 +200ms 防抖后重新测量。同时注入 `--app-bg-w / --app-bg-h / --app-min-h` 到 `<html>` 作 CSS 后备。SSR / JS 未运行阶段 fallback 为 `100dvh`。
    - **合成层不掉级**：`.app-fixed-bg` 加 `-webkit-transform: translate3d(0,0,0) scale(1)`、`transform-style: preserve-3d`、`-webkit-mask-image: linear-gradient(#000,#000)`，橡皮筋回弹仍保持合成层。
    - **contain 调参**：从 `contain: strict` 改为 `contain: layout paint size style`（去掉 strict 对 iOS fixed 的副作用，仍隔离布局/绘制/尺寸/样式）。
- 验证：修复后桌面端 header 显隐切换 60fps 稳定，iOS Safari 快速上下滚动 + 橡皮筋回弹，背景无放大抽搐、无下移位移，壁纸纵横比正确。
- 构建与部署：`npm run build` 最终产物 `index-CkQxizgE.js`，正式容器 `prohub-prohub` 重建并健康检查 HTTP 200，HTML 中已确认含新构建指纹。

### 三十.14 本次会话未单列的关键修复补录（2026-08-29 ~ 2026-08-30）

> 三十.11 ~ 三十.13 对本轮修复的描述有多个修复点"挂在章节后半段但未作为独立条目加粗列出"，以下补录为独立条目，便于后续检索。

1. **抖音解析器 WAF 拦截绕过（Playwright-extra + Stealth + 系统 Chromium）**
   - 问题：用户提供的有效抖音链接 `https://www.iesdouyin.com/share/video/7172831829785988383`，原生 Playwright 在 Alpine Docker 内被 `a_bogus` 签名校验拦截，或直接返回 403/WAF 页面。
   - 修复（`server/utils/browser.js` + `server/package.json` + `Dockerfile` + `docker-compose.dev.yml`）：
     - 安装并集成 `playwright-extra` + `puppeteer-extra-plugin-stealth`，在启动前执行 `chromium.use(stealthPlugin())` 增强浏览器指纹伪装。
     - 镜像中安装系统级 `chromium / nss / freetype / harfbuzz / ca-certificates / font-noto-cjk / font-dejavu`，设置 `CHROME_PATH=/usr/bin/chromium-browser`、`HEADLESS=true`，优先使用系统 Chromium（而非 Playwright 下载的受限构建）。
     - 启动参数新增反检测：`--no-sandbox --disable-dev-shm-usage --disable-blink-features=AutomationControlled --disable-features=IsolateOrigins,site-per-process --start-maximized`。
     - 移除 Xvfb 依赖（headless=true 模式无需虚拟显示），精简镜像体积。

2. **微博原创水印像素级擦除（sharp）**
   - 问题：微博链接返回的 `sinaimg.cn/mw2000/...` 图片无 URL 水印关键词，但图像像素右下角烧入了"🐦 @作者名"原创水印（用户截图验证真实存在）。
   - 修复（`server/routes/parse.js` → `removeWeiboWatermark()` + `proxy-image` 路由接入）：
     - 取 JPEG 元信息 → 通过右下角相邻像素采样判断水印区域（默认右下 260×101，按图像尺寸比例自适应）。
     - 提取水印上方 80% 位置相同宽高的像素区域，做 3px 高斯模糊后 `sharp.composite` 覆盖水印区域，写入 92% quality JPEG 输出。
     - 在 `GET /api/proxy-image` 路由中对 sinaimg 域名启用该擦除逻辑；生产日志验证：`[WatermarkRemoval] 1080x1440 watermark 260x101 -> 249293 bytes`，端到端下载文件无水印。

3. **noWatermark 字段空数组误判修复**
   - 问题：抖音视频响应中 `images: []`（纯视频无图集），原来 `allNoWatermark(images,'image')` 返回 false → 整体 `noWatermark=false` 谎报。
   - 修复（`server/routes/parse.js`）：改为 `(images.length > 0 ? allNoWatermark(images, 'image') : true)` 空数组视为 true；视频维度同理。三大平台端到端测试均返回 `noWatermark: true`。

4. **parse.js fetchPage 临时死区 (TDZ) 崩溃**
   - 问题：`fetchPage` 先写 `const ua = opts.mobile ? MOBILE_UA : (platform === 'xiaohongshu' ? DESKTOP_UA : randomUA())`，下一行才 `const platform = detectPlatform(url)`。`platform` 在声明前被引用，触发 `ReferenceError: Cannot access 'platform' before initialization`，小红书请求直接 500。
   - 修复：把 `detectPlatform` 调用移到 UA 选择之前；并强制小红书用 DESKTOP_UA（移动 UA 只能拿到 h5_1080 缩略图）。

5. **proxy-video Referer 防盗链 403/502**
   - 问题：原 Referer 硬编码 `https://weibo.com/`，抖音 `douyinvod.com` 域名的 CDN 按 Referer 做防盗链校验，返回 403；后端代理包装为 502 返回。
   - 修复：`proxy-video` 路由中按视频 URL hostname 动态设 Referer（douyin/bytedance/pstatp/ixigua → `www.douyin.com`；xhscdn/xiaohongshu → `www.xiaohongshu.com`；其他 → `weibo.com`）。抖音端到端视频下载大小从失败变为 37MB。

### 三十.15 首页分类胶囊条重设计：顶部间隙 + 移动端单行横滑（2026-08-30）

- 用户反馈（附手机截图）：首页工具分类胶囊条（全部 / 协作同步 / 媒体去水印 / 文本处理 / 实用计算）存在两个体验问题：
  1. 点击"开始使用"滚动到工具区后，分类条紧贴视口最顶端，无任何呼吸空隙；
  2. 移动端 5 个胶囊 `flex-wrap` 换行成两行，不美观；但强行单行塞下又会太紧凑。
- 设计方案（iOS 风格滑动胶囊条）：
  - **顶部间隙**：`#tools` section 加 `scroll-mt-16 sm:scroll-mt-20`（64px / 80px），`scrollIntoView({ block: 'start' })` 会尊重 scroll-margin，滚动停止时分类条上方自然留出空隙；桌面端因有固定 header 高度预留更多。
  - **单行不拥挤**：移动端放弃 wrap，改为横向滑动胶囊条——容器 `flex-nowrap overflow-x-auto no-scrollbar`，胶囊 `shrink-0 whitespace-nowrap` 不被压缩变形。
  - **贴边滚动体验**：容器 `-mx-4 px-4`（与 section 的 px-4 对齐，sm 断点恢复 `sm:mx-0 sm:px-0`），滑动时胶囊从屏幕物理边缘滑入滑出，而不是在内容列里"撞墙"。
  - **可滑动暗示**：最后一个胶囊自然露出一半被裁切，用户能直觉感知"右边还有"；配合 `no-scrollbar`（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`，新增于 style.css）隐藏滚动条保持视觉干净。
  - **桌面端不受影响**：sm+ 断点下 5 个胶囊本来就放得下，`overflow-x-auto` 无溢出即无滚动条，行为与原来一致。
- 修改文件：`src/src/views/Home.vue`（section 类 + 胶囊容器/按钮类）、`src/src/style.css`（新增 `.no-scrollbar` 工具类）。
- 构建与部署：`npm run build` 产物 `index-D5fUOFje.js`，正式容器 `prohub-prohub` 重建成功，`/api/health` 返回 ok，HTML 已含新指纹。Dev 前端为 Vite 热更新（volume 挂载 ./src），改动自动生效无需重建。

### 三十.16 浮动按钮滚动隐藏 + 证件照换底全链路修复与重设计（2026-08-30）

- **底部浮动按钮向下消失动画**：新增 `src/src/composables/useHideOnScroll.js`（rAF 节流，下滑 >6px 且距顶 >72px 隐藏、上滑或回顶显示，与顶部导航栏一致的 340ms cubic-bezier(0.16,1,0.3,1) 过渡）。`FloatingToolbar.vue`（反馈/赞赏，右下）与 `BgSwitcher.vue`（换背景，左下）接入，弹窗打开时保持可见。
- **证件照下载无法查看修复**（`IdPhoto.vue`）：弃用大图易损坏的 dataURL 方案，改为 `canvas.toBlob` 生成 PNG Blob；桌面端 `a[download]`，移动端优先 `navigator.share`（可直接存相册）；下载与预览共用同一 `compositeToCanvas`，产物与预览所见一致。
- **证件照输出规格升级**：按 300dpi 冲印级计算像素（mm/25.4×300），一寸 295×413px 等 6 档规格；抠图按 cover 居中裁剪填充，人像构图标准不变形。
- **实时合成预览**：底色/尺寸变化 300ms 防抖重合成（预览限 720px 防卡顿），预览框实时显示"成品预览 — 底色 · 尺寸 + mm/px"信息。
- **底色选择重排**：横向滑动的圆形色板（证件蓝/纯白/证件红/浅灰/自定义取色器），选中 ring 高亮，移动端友好。
- **尺寸选择可视化**：每档尺寸按钮内嵌比例示意小矩形，直观呈现长宽比；选中态蓝色高亮。
- **抠图模型实测选型**：对 u2netp/u2net/u2net_human_seg/silueta/isnet-general-use 等模型以标准人像图实测（发丝边缘、头顶完整性、软边缘比例、热推理耗时），`isnet-general-use` 人像精度最佳（热推理约 2s）。`server/routes/remove-bg.js` 默认模型及 `docker-compose.yml`/`docker-compose.dev.yml` 的 `REMBG_MODEL` 均改为 `isnet-general-use`，前端 MODEL_LABEL 同步为 ISNet。
- **验证**：API 三链路（dev 3001 / 正式 3000 / Vite 代理 5173）curl 均返回 200、1832×1832 PNG 带有效 alpha；浏览器端到端（Dev + 正式）确认上传→抠图→实时预览→底色/尺寸切换→下载按钮全流程通过，控制台无新增错误。
- 构建与部署：前端重建产物 `IdPhoto-y4zzDD5w.js`，正式容器重建完成；dev backend 已重建使 `REMBG_MODEL` 环境变量生效（rembg 容器共用镜像，模型按请求参数指定无需重建）。

## 三十九. project-progress.md 历史记录恢复与增量更新守则（2026-09-01）

- 发现上一轮更新错误使用整文件重写，导致原有约 958 行历史记录被截断为约 100 行，多个此前已记录的功能开发、问题修复、验证结果和未完成事项丢失。
- 已从 Git 历史恢复完整的 `project-progress.md`，恢复后文档约 1257 行，保留此前所有历史章节和原始记录。
- 在文档开头新增“Markdown 更新守则”，明确所有项目记录必须增量更新，禁止整文件重写、截断历史或用摘要替代原文；只有明确重复或错误内容才允许定点覆盖。
- 后续每次 Markdown 更新前必须读取当前文件、检查 Git 历史和差异；更新后必须核对行数、章节、差异和实际验证结果。
- 本次恢复仅修复文档历史和更新规则，没有删除其他 Markdown 文档内容；第三方依赖目录中的 README、API 文档和说明文档不做改写。


### 三十.17 证件照换底布局重排 + 百分比进度条（2026-08-30）

- **结果页布局重排**（`IdPhoto.vue`）：按用户要求调整为 原图/抠图对比（上）→ 成品预览（下）→ 选择底色 → 选择尺寸，浏览器实测 DOM 位置符合预期（对比区 top≈329px、预览区 top≈714px）。
- **上传百分比进度条**：`processFile` 从 fetch 迁移到 XMLHttpRequest（fetch 不支持上传进度回调）——上传阶段 `upload.onprogress` 真实进度映射 0-40%，上传完成后 AI 处理阶段以 200ms 间隔缓动逼近 95%（越接近越慢），响应到达跳 100%。进度条 UI 含阶段文案（"正在上传图片"/"AI 智能抠图中"）、百分比数字、渐变填充条；错误路径（网络错误/超时/非 2xx）均清理定时器。`resetAll` 与组件卸载同步清理。
- **底色按钮尺寸微调**：圆形色板 w-11→w-10（实测 42×42px 含边框），保持移动端触控目标的同时更紧凑。
- **验证**（正式环境浏览器实测）：上传中进度条显示 51%（本地上传快，直接进入 AI 处理阶段）；"纯白"→ 预览标题变"成品预览 — 纯白 · 一寸"；"二寸"→ "成品预览 — 纯白 · 二寸 | 35×49mm · 413×579px"，底色/尺寸联动均实时生效。
- 构建与部署：新产物 `IdPhoto-BOWXl8mn.js`，Dev 与正式容器均已重建。

### 三十.18 移动端上传"卡住"修复：错误可见化 + 响应体压缩 92%（2026-08-30）

- **现象**：iPhone（Safari 16.4，公网域名）上传照片后进度条走完但界面无任何反应，停留在初始页。日志排查发现服务端实际两次均 **200 成功**（IMG_4218.jpeg，2MB 输入 → 5.19MB PNG 响应）——问题出在移动端接收 5.19MB 大响应的环节，且前端把错误提示块放在结果视图内部，`transparentImage` 为空时错误完全不渲染，用户看到的就是"卡住"。
- **前端修复**（`IdPhoto.vue`）：
  1. 错误提示移出结果视图，独立渲染（`v-if="error && !processing"`），失败时始终可见并附"重新上传试试"按钮；
  2. 新增响应下载阶段真实进度（`xhr.onprogress` 映射 95-99%），阶段文案三段化：上传图片 → AI 抠图中 → 接收结果；
  3. 超时 60s → 120s（rembg 冷启动 + 移动弱网）；补 `onabort` 处理；onerror 文案明确提示"页面被系统中断"场景（iOS 切后台会中断 XHR）。
- **服务端修复**（`server/routes/remove-bg.js`）：
  1. 输入归一化：`normalizeToPng()` 用 sharp 统一转 PNG 并限制最长边 2048px 再转发 rembg（其内部 PIL 不支持 HEIC；大尺寸手机原片不再拖垮上游）；
  2. 输出压缩：抠图结果 PNG → WebP（q90/alphaQuality 90，保留透明通道），**实测 5.19MB → 393KB（降 92%）**，解析失败时回退 PNG；移动端弱网接收可靠性大幅提升；
  3. 上游 axios 超时同步 120s；图片无法解析返回 400 + 明确中文提示。
- **验证**（正式环境）：4200×2800 大图 → 归一化 2048×1365 → WebP 响应 → 浏览器 Image/canvas 合成链路有效（1.3s 出预览）；上传伪图片文件 → 红色错误块独立可见（"无法识别该图片格式"）+ 重试按钮。用户 iPhone 于 21:11 用新版本重试，服务端 200 / 393KB WebP。
- 备注：容器内 sharp（libvips 8.15.3）支持 WebP 编码但无 HEIF 解码（`npm ci --ignore-scripts` 基础版），HEIC 输入会走 400 明确报错路径；如需 HEIC 解码需升级 sharp 预编译二进制。Dev/正式容器均已重建。

### 三十.19 抠图提速 + 滚动隐藏累积制 + 自定义底色联动修复（2026-08-30）

- **抠图慢的原因与提速**：①isnet-general-use 是精度最高的大模型，CPU 推理 2-5s（换轻量模型会牺牲边缘精度，保持不变）；②手机原片 2-4MB 上传耗时（移动上行带宽低）→ **新增上传前本地压缩** `compressBeforeUpload()`：>1MB 图片用 `createImageBitmap` + canvas 缩到最长边 1600 的 JPEG q0.92，体积降 60-80%，失败回退原图；③响应大 → 上一轮已 WebP 压缩 92%。实测 3000×2000 图全流程 2.5s 出预览。进度条提示文案同步更新。
- **底色按钮选中环溢出修复**：去掉 `scale-105`/`group-active:scale-90`（放大导致环圈超出），`ring-offset-2` → `ring-offset-[3px]`；滚动容器 `px-1 -mx-1 pb-1.5` 给环圈留位防 overflow-x 裁剪；hover 改为灰色细环。
- **自定义颜色不生效修复**：`customColor` 原本不在合成 watch 依赖里 → 新增 `watch(customColor)` 将 `selectedColor` 替换为 `{name:'自定义', hex}` 新对象（引用变化可靠触发重合成）。实测选色后标题变"成品预览 — 自定义 · 一寸"、色板显示所选颜色并高亮。
- **滚动隐藏逻辑统一为累积距离制**（`useHideOnScroll.js` 重写）：距顶 <72px 常显；**向下滚动累计 ≥40px → 隐藏；隐藏后向上滚动累计 ≥40px → 显示**；反方向滚动清零累计，轻微抖动不再导致动画反复中断（原实现单帧 delta>6px 即切换，慢滚抖动时来回抽动=不丝滑的主因）。AppHeader 删除本地重复实现接入同一 composable，Esc/复制邮箱清理逻辑保留。
- **消失动画加渐隐**：FloatingToolbar/BgSwitcher 隐藏态增加 `opacity:0`（260ms）+ `pointer-events:none`，位移+渐隐双重过渡更柔和。
- **验证**（正式环境）：选自定义色 → 预览标题/色板/选中环联动；滚动至 500px → header+2 个浮动按钮全部隐藏；上滚 80px → 全部恢复。Dev/正式均已重建。

## 三十一、背景铺满整屏 + sticky 壁纸 + 刷新闪烁修复（2026-08-31）

- **背景未铺满整屏修复**：用户反馈"背景没有铺满整个网页/屏幕"。根因是 `html` 只有 `min-height:100%` 没有固定 `height`，百分比高度链无根，内容不足一屏时 `.app-root` 收缩到内容高度，背景层只能覆盖内容区。修复：`html{height:100%}` + `#app/.app-root{min-height:100vh}`（iOS 上 100vh 是常量，不随地址栏抖动）。用户明确授权修改背景冻结文档。
- **黑边尝试与回退**：为消除上下黑边曾尝试 safe-area 负 inset 外延 + `env()` 高度补偿 + viewport meta 调整，导致壁纸构图变形（cover 按更高容器重新裁切），全部回退；黑边与壁纸拉伸确认为两个独立问题，黑边疑似浏览器 chrome 染色，等待用户提供设备信息后单独处理。
- **壁纸拉伸根治（sticky 方案）**：用户反馈"壁纸自然是拉伸，我不要有拉伸的"。根因：背景层跟随整篇文档高度（首页约 2600px），cover 为盖满容器把壁纸放大约 3 倍。修复：`.app-page-background` 改为 `sticky top-0 h-screen mb-[-100vh]`——壁纸始终按屏幕比例（100vw × 100vh）cover 居中裁剪，16:9/19.5:9/20:9 均自然构图；滚动时壁纸吸附视口、内容从壁纸上滚过（沉浸式）；吸附由合成器驱动，无 JS/无监听/无 transform，不违反背景冻结约束（未用 fixed/dvh/visualViewport）。完整方案见 `docs/mobile-background-stability.md`（含冻结范围）。
- **壁纸刷新闪烁修复**：用户反馈"更改壁纸后每次刷新，太空壁纸都会闪一下再变回所选壁纸"。根因：localStorage 只存壁纸 id，恢复时必须等 Bing 数据异步加载。修复三层：①`index.html` head 内联同步 JS 在首屏渲染前设好 CSS 变量；②`BgSwitcher.applyBackground` 改存完整壁纸 JSON（id/imageUrl/color/textColor/label）；③Bing 加载完成后只同步高亮不重新应用。详见背景冻结文档第 6 轮记录。

## 三十六、导航搜索样式与移动端壁纸稳定性再修复（2026-08-31）

- **P 图标**：进一步调整顶部导航内联 P 字形及 favicon 字母比例，字面更饱满、笔画更规整。
- **桌面端搜索**：搜索框改为与导航一致的外部胶囊风格，提示词改为“找不到？点击搜一搜”，并保留与两侧内容的间距。
- **移动端搜索**：新增仅显示放大镜的搜索按钮，放置在深浅模式切换按钮左侧；点击展开同样的胶囊搜索框与模糊搜索结果，搜索按钮和主题按钮之间保留间距。
- **移动端壁纸稳定性**：背景层补充 `min-h-screen`、`contain: layout paint size style`、GPU 合成层、`backface-visibility` 与 WebKit mask，背景画布同步启用 3D 合成，降低 iOS/Android 滚动过程中合成层丢失、壁纸位移和抽搐风险；继续保持 sticky 视口锁定方案，不引入 fixed、dvh/lvh 或 visualViewport 动态测量。
- **验证与部署**：前端构建通过，Docker 容器已重新构建并启动。

## 三十五、品牌图标、功能搜索与关于联系方式优化（2026-08-31）

- **P 品牌图标**：优化主页、顶部导航及浏览器标签页使用的 P 字母字形，增大字面占比并改为更规整的几何字形；同步更新 `favicon.svg`、导航内联图标和 Apple Touch Icon 引用。
- **顶部功能搜索**：在深浅模式切换按钮左侧增加放大镜搜索框，基于现有工具配置的标题、描述、分类和关键词进行不区分大小写的模糊匹配；结果展示功能名称和简介，点击后进入对应功能页面。
- **导航间距**：扩大搜索、主题切换及相邻导航内容之间的间距，避免顶部内容过度紧凑。
- **关于弹窗联系方式**：直接调用 `public/Gmail.svg` 与 `public/QQ.svg`；Gmail 保留 `mailto` 点击跳转，QQ 取消点击添加好友；邮箱和 QQ 的复制按钮分别置于对应行最右侧。
- **验证**：前端 `npm run build` 通过；仅保留项目已有 ES2024 target 警告和大体积 chunk 提示。

## 三十四、统一功能页 Footer 与关于联系方式（2026-08-31）

- **Footer 统一定位**：App.vue 的主壳层增加 `min-h-screen flex flex-col`，`main` 使用 `flex-1 min-h-0`，Footer 改为不参与自动外推但固定收缩策略，内容不足一屏时统一贴近视口底部，内容超出时自然位于内容末端。
- **剪切板滚动修复**：移除 RealtimeClipboard 根节点的 `overflow-y-auto`，避免形成独立滚动容器导致全局 Footer 不显示或与页面滚动脱节。
- **关于入口调整**：顶部导航取消“关于”入口；首页 Hero 的“开始使用”替换为“关于”，通过全局事件打开同一个关于弹窗。
- **联系方式**：关于弹窗增加邮箱和 QQ 947919822，邮箱在 QQ 之上；使用邮箱/QQ 图标而不显示“QQ”文字标签。邮箱点击打开邮件页面，QQ 点击打开添加好友页面；两个联系方式均保留独立复制按钮。
- **验证**：前端构建通过，Docker Compose 已重新构建并启动生产容器。

## 三十三、剪切板 Host 房间租约与离开销毁（2026-08-31）

- **问题**：Host 刷新、返回主页或离开剪切板后，Guest 仍能进入旧房间并恢复历史同步列表。
- **服务端修复**：Host Socket 断开后进入 15 秒恢复宽限期；只有携带有效 Host Token 的连接能够取消销毁计时，Guest 在线不再阻止房间销毁。
- **前端修复**：剪切板路由离开前，Host 使用 Host Token 主动发送 `room:destroy`，等待最多 500ms 响应后再清理连接；普通刷新不主动销毁，交由服务端宽限期判断，避免手误刷新立即丢失房间。
- **安全结果**：Host 离开超过宽限期后，房间及历史同步列表销毁，旧链接无法恢复；Host 在 15 秒内刷新成功则保留房间。
- **验证**：前端构建通过，Docker Compose 已重建并启动生产容器；真实设备场景仍需验证刷新与站内离开两条路径。

## 三十二、赞赏弹窗二维码改版与裁剪（2026-08-31）

- **改版需求落地**（`DonateModal.vue`）：微信二维码排前（左位）、两个码等大（grid 等宽 + `aspect-square object-contain`）、不显示海报文字，二维码上方分别标注 `WeChat` / `AiPay`。
- **移动端点击跳转**：点击微信码 → `weixin://scanqrcode` 打开微信扫一扫；点击支付宝码 → `alipayqr://platformapi.startapp?saId=10000007` 打开支付宝扫一扫（用户再从相册选取截图完成支付）；桌面端点击无动作（pointer: coarse / 移动 UA / iPadOS 检测）。
- **二维码裁剪（只保留二维码本体）**：用户要求去掉海报背景和文字，只保留二维码部分。用 Python PIL 自动检测（最大白色连通域定位圆角卡片 → 卡片内"最长连续含黑行段"定位二维码 → 底边扩张不超过二维码与姓名文字之间的空隙），裁剪为 800×800 正方形，四角定位标与 logo 完整保留。原图一度被误裁覆盖，已从生产容器 `/app/server/public` `docker cp` 恢复。
- **重要发现：收款码文件内容互换**：核实发现用户保存时把两张海报存反了——`donate-qr-wechat.jpg`(1280×1919) 实为支付宝海报、`donate-qr-alipay.jpg`(828×1124) 实为微信海报，导致线上弹窗二维码与文字标签相反。已按人工核实的基准坐标重新裁剪并纠正命名：`donate-qr-wechat.jpg` 现为微信码（落日照片 logo + 绿色对勾），`donate-qr-alipay.jpg` 现为支付宝码（自拍照片 logo），均无海报背景、无姓名文字。
- **验证与部署**：两张裁剪产物逐张人工目检通过（四角定位标完整、边缘干净、无文字残留）；前端 `npm run build` 通过；生产容器重建并启动成功；Dev 前端静态文件即时生效。
- **文案客气化 + 支付宝直达付款页（同日迭代）**：用户要求弹窗文字更客气、点击二维码直接进入"输入金额"页。用 OpenCV 解码两张收款码确认真实内容——微信 `wxp://f2f...`（个人收款码，无公开 scheme 直达金额页，仍只能打开扫一扫）、支付宝 `https://qr.alipay.com/fkx10297lg1x1ccowmy1pdd`（可通过 `alipays://platformapi/startapp?appId=20000186&url=<encoded>` 直达"向TA付款"输入金额页）。据此：支付宝点击改为直达付款页；微信保持扫一扫（生态限制）；主文案改为"如果 proHub 恰好帮到了你，欢迎请作者喝杯咖啡；不强求，你的使用与反馈已是最好的鼓励。"，并新增底部小字说明操作方式；aria-label 改为"用 WeChat/AiPay 赞赏"。已部署至 Dev 与生产。
