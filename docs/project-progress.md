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