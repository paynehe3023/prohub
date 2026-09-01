from pathlib import Path


def _srt_time(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def extract_subtitles(video_path: str, output_dir: str) -> dict:
    try:
        import cv2
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("字幕 OCR 需要安装 opencv-python 和 pytesseract，并配置 Tesseract OCR。") from exc

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError("无法读取视频，字幕 OCR 已停止。")
    fps = capture.get(cv2.CAP_PROP_FPS) or 25
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    samples = []
    index = 0
    interval = max(1, int(fps * 1.5))
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if index % interval == 0:
            height = frame.shape[0]
            crop = frame[int(height * 0.65):]
            text = " ".join(pytesseract.image_to_string(crop, lang="chi_sim+eng").split())
            start = index / fps
            if text:
                if samples and samples[-1]["text"] == text:
                    samples[-1]["end"] = round((index + interval) / fps, 3)
                else:
                    samples.append({"start": round(start, 3), "end": round(start + interval / fps, 3), "text": text})
        index += 1
    capture.release()
    for item in samples:
        item["end"] = min(item["end"], round(total / fps, 3)) if total else item["end"]
    srt = "\n\n".join(
        f"{number}\n{_srt_time(item['start'])} --> {_srt_time(item['end'])}\n{item['text']}"
        for number, item in enumerate(samples, 1)
    )
    return {"items": samples, "srt": f"{srt}\n" if srt else "", "frames": total}
