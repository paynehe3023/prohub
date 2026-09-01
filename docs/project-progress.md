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
