import asyncio
import subprocess
from pathlib import Path


def _export_audio(source, path: Path, sample_rate: int) -> None:
    import soundfile as sf

    data = source.detach().cpu().numpy()
    if data.ndim == 2:
        data = data.mean(axis=0)
    sf.write(str(path), data, sample_rate)


def _change_points(y, sr: int) -> list[float]:
    import librosa

    onset = librosa.onset.onset_strength(y=y, sr=sr)
    times = librosa.frames_to_time(range(len(onset)), sr=sr)
    peaks = librosa.util.peak_pick(onset, 3, 3, 3, 5, 0.5, 10)
    points = [0.0, *[float(times[index]) for index in peaks]]
    return sorted({round(point, 3) for point in points if point > 0})


def _track_info(track: dict) -> dict:
    share = track.get("share") or {}
    sections = track.get("sections") or []
    metadata = sections[0].get("metadata") if sections else []
    album = next(
        (item.get("text") for item in metadata or [] if item.get("title") == "Album"),
        None,
    )
    title_zh = track.get("title_zh") or track.get("title_zh_cn")
    artist_zh = track.get("artist_zh") or track.get("artist_zh_cn")
    return {
        "status": "matched" if track else "not_found",
        "title": track.get("title"),
        "title_zh": title_zh,
        "artist": track.get("subtitle"),
        "artist_zh": artist_zh,
        "album": album,
        "key": track.get("key"),
        "source_url": share.get("href") or track.get("url"),
    }


def _safe_filename(value: str) -> str:
    cleaned = "".join("_" if char in '\\\/:*?\"<>|' else char for char in value)
    return " ".join(cleaned.split()).strip() or "未命名"


def _rename_audio(path: Path, identification: dict) -> Path:
    title = identification.get("title_zh") or identification.get("title")
    artist = identification.get("artist_zh") or identification.get("artist")
    if not title or not artist:
        return path
    target = path.with_name(f"{_safe_filename(title)}_{_safe_filename(artist)}{path.suffix}")
    if target != path:
        path.replace(target)
    return target


async def _recognize_file(path: Path) -> dict:
    from shazamio import Shazam

    try:
        match = await Shazam().recognize(str(path))
        return _track_info(match.get("track") or {})
    except Exception as exc:
        return {"status": "failed", "error": str(exc)}


async def _recognize_segments(segment_paths: list[tuple[float, float, Path]]) -> list[dict]:
    results = []
    for start, end, path in segment_paths:
        result = await _recognize_file(path)
        results.append({"start": start, "end": end, **result})
    return results


def extract_bgm(video_path: str, output_dir: str) -> dict:
    output = Path(output_dir)
    mp3_path = output / "bgm.mp3"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-vn", "-ac", "2", "-codec:a", "libmp3lame", "-q:a", "2", str(mp3_path)],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("BGM 提取需要系统安装 ffmpeg。") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("无法从视频提取 BGM 音频。") from exc
    try:
        identification = asyncio.run(_recognize_file(mp3_path))
    except ImportError:
        identification = {"status": "unavailable", "error": "请安装 shazamio 以启用音乐识别。"}

    mp3_path = _rename_audio(mp3_path, identification)
    return {
        "duration": None,
        "identification": identification,
        "source_url": identification.get("source_url"),
        "audio": {"filename": mp3_path.name, "path": str(mp3_path), "format": "mp3"},
    }


def analyze_bgm(video_path: str, output_dir: str) -> dict:
    try:
        import librosa
    except ImportError as exc:
        raise RuntimeError("BGM 分析不可用：请安装 librosa。") from exc

    output = Path(output_dir)
    wav_path = output / "audio.wav"
    try:
        subprocess.run(["ffmpeg", "-y", "-i", video_path, "-vn", "-ac", "1", "-ar", "22050", str(wav_path)], check=True, capture_output=True)
    except FileNotFoundError as exc:
        raise RuntimeError("BGM 分析需要系统安装 ffmpeg。") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("无法从视频提取音频，BGM 分析已停止。") from exc

    y, sr = librosa.load(str(wav_path), sr=None, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo_value = float(tempo[0]) if hasattr(tempo, "__len__") else float(tempo)
    duration = float(len(y) / sr) if sr else 0.0
    result = {
        "duration": round(duration, 2),
        "sample_rate": sr,
        "tempo": round(tempo_value, 2),
        "rms": round(float(librosa.feature.rms(y=y).mean()), 6),
        "spectral_centroid": round(float(librosa.feature.spectral_centroid(y=y, sr=sr).mean()), 2),
        "segments": [],
    }
    bgm_path = output / "bgm-separated.wav"
    mp3_path = output / "bgm-separated.mp3"
    try:
        from demucs.api import Separator
        separator = Separator(model="htdemucs")
        _, separated = separator.separate_audio_file(str(wav_path))
        sources = list(separated.keys())
        if "no_vocals" in separated:
            bgm = separated["no_vocals"]
        else:
            bgm = sum(value for key, value in separated.items() if key != "vocals")
        _export_audio(bgm, bgm_path, separator.samplerate)
        result["separation"] = {"status": "completed", "sources": sources, "path": str(bgm_path)}
    except ImportError:
        result["separation"] = {"status": "unavailable", "error": "请安装 demucs 以启用人声/BGM 源分离。"}
        bgm_path = wav_path
    except Exception as exc:
        result["separation"] = {"status": "failed", "error": f"Demucs 分离失败：{exc}"}
        bgm_path = wav_path

    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(bgm_path), "-codec:a", "libmp3lame", "-q:a", "2", str(mp3_path)],
            check=True,
            capture_output=True,
        )
        result["audio"] = {"filename": mp3_path.name, "path": str(mp3_path), "format": "mp3"}
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        result["audio"] = {"filename": bgm_path.name, "path": str(bgm_path), "format": "wav", "error": f"MP3 导出失败：{exc}"}

    try:
        bgm_y, bgm_sr = librosa.load(str(bgm_path), sr=None, mono=True)
        points = _change_points(bgm_y, bgm_sr)
        points = [point for point in points if point < duration] + [round(duration, 3)]
        slices = []
        for start, end in zip(points, points[1:]):
            if end - start >= 3:
                slice_path = output / f"bgm-{len(slices):04d}.wav"
                sf = __import__("soundfile")
                sf.write(str(slice_path), bgm_y[int(start * bgm_sr):int(end * bgm_sr)], bgm_sr)
                slices.append((start, end, slice_path))
        try:
            from shazamio import Shazam  # noqa: F401
            result["segments"] = asyncio.run(_recognize_segments(slices))
        except ImportError:
            result["segments"] = [{"start": start, "end": end, "status": "unavailable", "error": "请安装 shazamio 以启用音乐识别。"} for start, end, _ in slices]
    except Exception as exc:
        result["segments"] = [{"start": 0.0, "end": round(duration, 3), "status": "failed", "error": f"BGM 变点切片失败：{exc}"}]

    matched = next((segment for segment in result["segments"] if segment.get("status") == "matched"), None)
    result["identification"] = matched or {"status": "not_found" if result["segments"] else "unavailable"}
    if result["identification"].get("source_url"):
        result["source_url"] = result["identification"]["source_url"]
    if result.get("audio", {}).get("filename"):
        separated_path = _rename_audio(Path(result["audio"]["path"]), result["identification"])
        result["audio"]["filename"] = separated_path.name
        result["audio"]["path"] = str(separated_path)
    return result
