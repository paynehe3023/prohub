import asyncio
import shutil
from pathlib import Path
from typing import AsyncIterator

try:
    from .models import Job, utc_now
    from .processing import process_video
except ImportError:
    from models import Job, utc_now
    from processing import process_video


class JobManager:
    def __init__(self, storage_dir: str):
        self.storage = Path(storage_dir)
        self.storage.mkdir(parents=True, exist_ok=True)
        self.jobs: dict[str, Job] = {}
        self.events: dict[str, list[asyncio.Queue]] = {}

    def create(self, job: Job) -> None:
        self.jobs[job.id] = job
        self.events[job.id] = []

    def get(self, job_id: str) -> Job | None:
        return self.jobs.get(job_id)

    def _publish(self, job: Job) -> None:
        job.updated_at = utc_now()
        for queue in self.events.get(job.id, []):
            queue.put_nowait(job.public())

    async def run(self, job: Job, model_name: str, selected_tasks: set[str] | None = None) -> None:
        job.status = "processing"
        self._publish(job)
        loop = asyncio.get_running_loop()
        def progress(value: int, stage: str) -> None:
            job.progress, job.stage = value, stage
            self._publish(job)
        try:
            job.result = await loop.run_in_executor(
                None,
                process_video,
                job.video_path,
                str(Path(job.video_path).parent),
                progress,
                model_name,
                selected_tasks,
            )
            bgm = job.result.get("bgm") if isinstance(job.result, dict) else None
            audio = bgm.get("audio") if isinstance(bgm, dict) else None
            if isinstance(audio, dict) and audio.get("filename"):
                audio["url"] = f"/jobs/{job.id}/files/{audio['filename']}"
            job.status = "completed"
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
        self._publish(job)

    async def stream(self, job_id: str) -> AsyncIterator[dict]:
        job = self.jobs[job_id]
        queue: asyncio.Queue = asyncio.Queue()
        self.events[job_id].append(queue)
        try:
            yield job.public()
            while job.status not in {"completed", "failed"}:
                try:
                    yield await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    # Keep proxies and browsers from treating an idle SSE stream as dead.
                    yield {"type": "heartbeat", "status": job.status}
            yield job.public()
        finally:
            subscribers = self.events.get(job_id)
            if subscribers and queue in subscribers:
                subscribers.remove(queue)

    def remove_file(self, job: Job) -> None:
        shutil.rmtree(Path(job.video_path).parent, ignore_errors=True)

    def remove(self, job_id: str) -> None:
        job = self.jobs.pop(job_id, None)
        self.events.pop(job_id, None)
        if job:
            self.remove_file(job)
