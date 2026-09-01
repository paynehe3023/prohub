# Debug Session: upload-load-failed

状态：[OPEN]

## 症状

正式网页上传视频后，日志显示：

- 已载入视频，准备处理 2 项任务
- 正在提交任务至 `/video-worker/jobs`
- 任务提交失败：`Load failed`

## 假设

1. Node `/video-worker` 代理未正确转发 multipart 上传请求。
2. Python Worker 在上传写盘、参数解析或创建异步任务时异常断开连接。
3. Docker 容器网络或 Worker 进程在请求期间重启。
4. 浏览器对代理响应、SSE 或跨源头处理异常，统一显示为 `Load failed`。

## 证据记录

- 待采集浏览器请求结果。
- 待采集 Node 主站日志。
- 待采集 Python Worker 日志。
- 待采集容器状态和网络连通性。

## 修复状态

尚未修改业务逻辑，等待运行时证据。
