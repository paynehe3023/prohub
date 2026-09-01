import asyncio
import json
import os
import shutil
import uuid
from pathlib import Path

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

try:
    from .models import Job
    from .tasks import JobManager
except ImportError:
    from models import Job
    from tasks import JobManager

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.getenv("VIDEO_WORKER_DATA", BASE_DIR / "data"))
UPLOAD_STAGING_DIR = Path(os.getenv("VIDEO_WORKER_UPLOAD_STAGING", UPLOAD_DIR / "staging"))
UPLOAD_STAGING_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = int(os.getenv("VIDEO_WORKER_MAX_UPLOAD_BYTES", str(2 * 1024 * 1024 * 1024)))
manager = JobManager(str(UPLOAD_DIR))
app = FastAPI(title="ProHub Video Worker", version="1.0.0")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("VIDEO_WORKER_CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "video-worker"}


@app.post("/uploads/complete", status_code=202)
async def complete_upload(payload: dict = Body(...)) -> dict:
    source_path = Path(str(payload.get("file_path", ""))).resolve()
    shared_root = UPLOAD_STAGING_DIR.resolve()
    if shared_root not in source_path.parents or not source_path.is_file():
        raise HTTPException(400, "上传文件不存在或尚未完成。")
    filename = str(payload.get("filename") or source_path.name)
    requested_tasks = payload.get("tasks", [])
    if not isinstance(requested_tasks, list):
        raise HTTPException(400, "tasks 必须是 JSON 数组。")
    selected_tasks = {task for task in requested_tasks if task in {"subtitle", "transcript", "bgm", "bgm_separation"}}
    if not selected_tasks:
        raise HTTPException(400, "至少选择一个有效任务。")
    job_id = uuid.uuid4().hex
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = job_dir / f"input{source_path.suffix.lower() or '.mp4'}"
    shutil.move(str(source_path), video_path)
    job = Job(id=job_id, video_path=str(video_path), filename=filename)
    manager.create(job)
    asyncio.create_task(manager.run(job, str(payload.get("whisper_model") or "small"), selected_tasks))
    return job.public()


@app.post("/jobs", status_code=202)
async def create_job(
    video: UploadFile = File(...),
    tasks: str = Form("[\"subtitle\", \"transcript\", \"bgm\"]"),
    whisper_model: str = Form("small"),
) -> dict:
    suffix = Path(video.filename or "video.mp4").suffix.lower() or ".mp4"
    if suffix not in {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}:
        raise HTTPException(415, "仅支持 mp4、mov、mkv、avi、webm、m4v 视频文件。")
    job_id = uuid.uuid4().hex
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = job_dir / f"input{suffix}"
    size = 0
    try:
        with video_path.open("wb") as output:
            while chunk := await video.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "视频文件超过大小限制。")
                output.write(chunk)
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise
    finally:
        await video.close()
    try:
        requested_tasks = json.loads(tasks)
        if not isinstance(requested_tasks, list):
            raise ValueError
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(400, "tasks 必须是 JSON 数组。") from exc
    selected_tasks = {task for task in requested_tasks if task in {"subtitle", "transcript", "bgm", "bgm_separation"}}
    if not selected_tasks:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(400, "至少选择一个有效任务。")
    job = Job(id=job_id, video_path=str(video_path), filename=video.filename or video_path.name)
    manager.create(job)
    asyncio.create_task(manager.run(job, whisper_model, selected_tasks))
    return job.public()


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    job = manager.get(job_id)
    if not job:
        raise HTTPException(404, "任务不存在。")
    return job.public()


@app.get("/jobs/{job_id}/events")
async def job_events(job_id: str) -> StreamingResponse:
    if not manager.get(job_id):
        raise HTTPException(404, "任务不存在。")
    async def event_stream():
        async for event in manager.stream(job_id):
            yield f"event: progress\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/jobs/{job_id}/files/{filename}")
def download_job_file(job_id: str, filename: str):
    job = manager.get(job_id)
    if not job:
        raise HTTPException(404, "任务不存在。")
    job_dir = Path(job.video_path).parent.resolve()
    file_path = (job_dir / filename).resolve()
    if job_dir not in file_path.parents or not file_path.is_file():
        raise HTTPException(404, "文件不存在。")
    return FileResponse(file_path, filename=file_path.name)


@app.delete("/jobs/{job_id}", status_code=204)
def delete_job(job_id: str):
    job = manager.get(job_id)
    if not job:
        raise HTTPException(404, "任务不存在。")
    manager.remove(job_id)
    return None
