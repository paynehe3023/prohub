from typing import Any


def _transcribe_faster(video_path: str, model_name: str) -> dict[str, Any]:
    from faster_whisper import WhisperModel

    try:
        model = WhisperModel(model_name, device="cuda", compute_type="float16")
        segments, info = model.transcribe(video_path)
        backend = "faster-whisper-cuda"
    except Exception:
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        segments, info = model.transcribe(video_path)
        backend = "faster-whisper-cpu"
    normalized = [
        {"id": index, "start": float(segment.start), "end": float(segment.end), "text": segment.text.strip()}
        for index, segment in enumerate(segments)
        if segment.text.strip()
    ]
    return {
        "text": " ".join(segment["text"] for segment in normalized).strip(),
        "segments": normalized,
        "language": getattr(info, "language", None),
        "backend": backend,
    }


def _transcribe_openai(video_path: str, model_name: str) -> dict[str, Any]:
    import whisper

    result = whisper.load_model(model_name).transcribe(video_path, fp16=False)
    return {
        "text": result.get("text", "").strip(),
        "segments": result.get("segments", []),
        "language": result.get("language"),
        "backend": "openai-whisper-cpu",
    }


def transcribe(video_path: str, model_name: str = "small") -> dict:
    try:
        return _transcribe_faster(video_path, model_name)
    except ImportError:
        try:
            return _transcribe_openai(video_path, model_name)
        except ImportError as exc:
            raise RuntimeError("Whisper 转写不可用：请安装 faster-whisper。") from exc
    except Exception as exc:
        raise RuntimeError(f"Whisper 转写失败（模型 {model_name}）：{exc}") from exc
