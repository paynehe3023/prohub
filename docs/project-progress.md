# proHub 项目进度文档

> 生成时间: 2026-08-22
> 项目路径: `D:\pythonWorkspace\prohub`

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
