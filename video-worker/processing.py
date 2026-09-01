from pathlib import Path
from typing import Callable

try:
    from .audio import analyze_bgm
    from .ocr import extract_subtitles
    from .transcription import transcribe
except ImportError:
    from audio import analyze_bgm
    from ocr import extract_subtitles
    from transcription import transcribe


Progress = Callable[[int, str], None]


def process_video(
    video_path: str,
    output_dir: str,
    progress: Progress,
    model_name: str = "small",
    selected_tasks: set[str] | None = None,
) -> dict:
    selected = {"subtitle", "transcript", "bgm"} if selected_tasks is None else selected_tasks
    result = {"subtitles": None, "transcript": None, "bgm": None}
    task_steps = [("subtitle", "ocr", extract_subtitles), ("transcript", "whisper", transcribe), ("bgm", "bgm", analyze_bgm)]
    enabled_steps = [step for step in task_steps if step[0] in selected]
    for index, (task_name, stage, worker) in enumerate(enabled_steps):
        progress(10 + int(index * 85 / max(1, len(enabled_steps))), stage)
        result[task_name] = worker(video_path, output_dir) if task_name != "transcript" else worker(video_path, model_name)
    progress(100, "completed")
    return result
