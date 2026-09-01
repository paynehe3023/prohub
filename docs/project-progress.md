# proHub 项目进度文档

> 生成时间: 2026-08-22
> 项目路径: `D:\pythonWorkspace\prohub`

---

## 三十.5 通知红点与剪贴板销毁提示修复（2026-08-31）

- 统一通知 ID 为字符串后再保存和比较，修复后端 ID 类型变化导致已读状态无法命中、红点长期显示的问题。
- 通知页面在单条已读和一键已读后派发状态更新事件，顶部导航同时监听自定义事件及跨标签页 `storage` 事件，红点立即同步；接口失败时保持无红点。
- 修复剪贴板 Host 点击“退出并销毁”时的 Socket ACK 顺序：先向客户端确认销毁成功，再执行房间清理和 Socket 断开，避免房间已清理后 ACK 丢失而被前端误报“销毁失败”。
- 销毁操作仅在当前 Socket 已连接时发起，成功后继续创建本机独立 Host 房间。
- 验证：前端 Vite 构建、`node --check realtime/clipboard.js` 通过；Docker 镜像已重新构建，`prohub` 与 `prohub-rembg` 容器正常运行。

---

## 三十一. 视频文本与 BGM 智能提取 Worker（2026-08-31）

- 新增独立 Python/FastAPI `video-worker`，提供视频上传、异步任务、任务状态查询和 SSE 进度流。
- 接入 OpenCV/Tesseract 字幕采样、Faster-Whisper 语音转录、FFmpeg 音频抽取、Demucs 人声/BGM 分离、Librosa 变点切片和 ShazamIO 识别流水线。
- 前端新增“视频提取工作台”，支持拖拽上传、视频预览、字幕/转录/BGM 多任务选择、进度日志、结果复制和下载。
- BGM 处理结果增加 MP3 导出及 `/jobs/{job_id}/files/{filename}` 文件下载接口；生产 Node 服务新增 `/video-worker` 反向代理，避免静态 SPA fallback 截获 Worker 请求。
- Docker Compose 增加 `video-worker` 服务、持久化数据卷、Worker 地址和 CORS 配置；前端开发环境继续通过 Vite `/video-worker` 代理联调。
- 当前限制：OCR 默认仍为 Tesseract 中英文固定字幕区域；ShazamIO 识别需要网络检索；Whisper/Demucs 模型首次运行需要下载；尚未完成完全离线音频指纹库、GPU 专用镜像和真实视频全流程测试。
- 验证：Python `compileall`、Node 语法检查、前端 Vite 构建和 `docker compose config` 通过；Worker Docker 构建受 Debian 软件源网络速度影响，尚未完成容器启动验证。

---

## 三十二. SSE 断线恢复与正式网页验证（2026-09-01）

- 修复视频 Worker SSE 长时间无进度事件时被浏览器或代理关闭的问题：服务端空闲 15 秒发送一次心跳事件，保持连接活跃。
- 修复前端将任意 SSE 断线直接判定为任务失败的问题：断线后查询 `/jobs/{job_id}` 真实状态，任务处理中自动重连，已完成任务直接加载结果，只有 Worker 明确失败时才显示错误。
- 修复前端对命名 SSE `progress` 事件的监听，增加重连定时器清理，避免任务结束后继续发起连接。
- 重新构建并重启 Docker 服务，`prohub`、`prohub-video-worker`、`prohub-rembg` 容器均正常运行。
- 验证正式网页代理 `http://localhost:3000/video-worker/health` 和 Worker `http://localhost:8090/health` 均返回 `status: ok`；前端 Vite 生产构建通过。
- 当前测试文件实际名称为 `test-videos/test_vedio3_onlyBgm.mp4`，正式网页应使用该文件进行 BGM 流程复测。

---

## 三十三. BGM 快速提取与人声分离拆分（2026-09-01）

- 将原先 BGM 任务中的 FFmpeg 音频提取、Librosa 分析、Demucs 分离、变点切片和 ShazamIO 识别拆分为独立流程。
- 新增快速 `BGM 提取`任务：仅使用 FFmpeg 从视频提取音频并直接导出 MP3，不再默认执行 Demucs、Librosa 或 ShazamIO，降低短视频处理耗时。
- 新增独立 `人声/BGM 分离`任务：仅在用户选择时启动 Demucs，并保留原有音频分析、变点切片和歌曲识别能力。
- 分离任务输出文件改为 `bgm-separated.mp3`，避免覆盖普通 BGM 提取生成的 `bgm.mp3`。
- 后端新增 `bgm_separation` 任务类型及对应结果、下载 URL；前端新增“人声/BGM 分离”选项，并分别展示快速提取和分离结果。
- 验证：前端 `npm run build` 通过；Docker 镜像重新构建成功；`prohub`、`prohub-video-worker`、`prohub-rembg` 容器正常运行；Worker 健康检查返回 `status: ok`。

---

## 三十四. BGM 结果展示优化（2026-09-01）

- BGM 识别结果新增歌曲名称、作者、专辑、Shazam 结果标识和歌曲源链接；源链接可点击打开，用于确认当前识别结果是否正确。
- 快速 BGM 提取完成后保留 MP3 文件下载地址，并在结果卡片中提供“直接下载 BGM”链接；普通下载按钮继续可用。
- 人声/BGM 分离结果沿用相同的歌曲信息、源链接和 MP3 下载展示方式。
- 移除前端“视频 Worker 地址”配置区块；正式网页通过内置 `/video-worker` 代理访问 Worker，该地址输入框对正式用户没有实际配置价值。
- 后端扩展 Shazam 结果解析，提取 `title`、`artist`、`album`、`source_url` 等字段，并将识别结果传递到前端。
- 验证：前端 `npm run build` 通过；宿主机未安装 `python` 命令，未执行本地 Python 编译检查，后续以 Docker Worker 构建验证 Python 代码。

---

## 三十五. BGM 结果与上传区域优化（2026-09-01）

- 缩小视频拖拽上传区域的上下留白和上传图标尺寸，减少空白占用；任务卡片改为响应式四列布局，改善桌面端空间利用率。
- 移除页面中的“视频 Worker 地址”配置区块；正式网页统一通过内置 `/video-worker` 代理访问 Worker，不再向用户暴露内部服务地址。
- BGM 结果卡片显示歌曲名称、作者和专辑；识别成功时显示可点击的源链接，用户可打开歌曲页面核对识别结果。
- 快速 BGM 提取和人声/BGM 分离结果均保留 MP3 下载链接，支持网页直接下载。
- Shazam 识别条件：Worker 需要能够访问 Shazam 服务；视频音频应包含清晰、连续且有一定时长的音乐片段，混入较强人声、噪声、音效、片段过短或未收录歌曲时可能无法识别。源链接由识别服务返回，不能保证所有歌曲都有可用链接。
- 验证：前端 `npm run build` 通过；正式网页使用旧 Docker 静态资源时需重新构建并重启 `prohub` 容器后才能看到本次页面修改。

---

## 三十七. 视频分片上传与异步建任务（2026-09-01）

- 将正式网页的视频上传改为“创建上传会话 -> 8MB 分片上传 -> 完成通知 -> Worker 创建异步任务 -> SSE 进度流”。
- Node 新增 `/video-upload/sessions`、`/video-upload/sessions/:id/chunks/:index` 和 `/video-upload/sessions/:id/complete` 接口，分片请求不再等待 Worker 处理视频。
- Node 与 Python Worker 通过共享 Docker 卷 `video-upload-staging` 传递已上传文件，避免大文件再次经过 Node 到 Worker 的长连接转发。
- Worker 新增 `/uploads/complete` 接口，校验暂存文件后移动到任务目录并立即返回任务 ID，视频处理继续在后台执行。
- 前端改为逐片上传并显示上传进度，上传完成后才连接 SSE；原有完整 multipart `/jobs` 接口保留用于兼容。
- 已重新执行 `docker compose up -d --build`，前端构建成功；`prohub`、`prohub-video-worker`、`prohub-rembg` 正常运行，正式代理健康检查通过。

## 三十六. 视频提取工作台交互与预览修复（2026-09-01）

- 修复 `VideoExtractorStudio.vue` 的 TypeScript 红色波浪线：补充 `WorkerEvent.type` 类型，并将任务标签映射声明为 `Record<TaskId, string>`。
- 提取任务默认改为空列表，用户必须主动选择字幕、转录、BGM 提取或人声/BGM 分离任务；未选择任务时开始按钮保持禁用。
- 结果内容仅在数组非空时序列化，空数组不再直接显示为 `[]`；`[]` 原本是空结果数组的 JSON 表示，不是乱码。
- 缩小“拖拽视频到这里”区域的垂直留白，减少页面占用。
- 视频预览增加 `preload="metadata"`、`playsinline`、MIME 类型提示和错误兜底；浏览器不支持当前编码时显示明确提示，但不影响视频上传处理。推荐使用 H.264/AAC 编码的 MP4。
- Worker 地址固定使用正式网页内置代理 `/video-worker`，不再依赖用户配置地址或进入演示模式。
- 验证：编辑器诊断无错误；Docker `docker compose up -d --build` 成功；`prohub`、`prohub-video-worker`、`prohub-rembg` 容器均正常运行。
