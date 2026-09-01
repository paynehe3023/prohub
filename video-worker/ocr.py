from difflib import SequenceMatcher
import os
import re


# PaddlePaddle CPU 在部分 oneDNN 算子上存在兼容性问题，优先使用稳定执行路径。
os.environ.setdefault("FLAGS_use_mkldnn", "0")
_RAPID_OCR = None
_ONNX_OCR = None


def _srt_time(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _similar(left: str, right: str) -> float:
    return SequenceMatcher(None, _normalize(left), _normalize(right)).ratio()


def _preprocess_variants(image, cv2):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    enlarged = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    denoised = cv2.GaussianBlur(enlarged, (3, 3), 0)
    adaptive = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 11,
    )
    return enlarged, adaptive


def _rapid_text(image) -> str:
    global _RAPID_OCR
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        return ""
    if _RAPID_OCR is None:
        _RAPID_OCR = RapidOCR()
    result, _ = _RAPID_OCR(image)
    if not result:
        return ""
    entries = [
        (float(item[0][0][1]), str(item[1]).strip(), float(item[2]))
        for item in result
        if len(item) >= 3 and str(item[1]).strip() and float(item[2]) >= 0.45
    ]
    entries.sort(key=lambda item: item[0])
    return " ".join(text for _, text, _ in entries)


def _onnx_text(image) -> str:
    global _ONNX_OCR
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        return ""
    if _ONNX_OCR is None:
        _ONNX_OCR = RapidOCR()
    result, _ = _ONNX_OCR(image)
    if not result:
        return ""
    return " ".join(
        str(item[1]).strip()
        for item in result
        if len(item) >= 3 and str(item[1]).strip() and float(item[2]) >= 0.45
    )


def _tesseract_text(image, cv2, pytesseract) -> str:
    candidates = []
    variants = _preprocess_variants(image, cv2)
    for variant, psm in ((variants[0], 6), (variants[1], 11)):
        data = pytesseract.image_to_data(
            variant, lang="chi_sim+eng", config=f"--oem 1 --psm {psm}",
            output_type=pytesseract.Output.DICT,
        )
        words = []
        for text, confidence in zip(data["text"], data["conf"]):
            try:
                score = float(confidence)
            except (TypeError, ValueError):
                score = -1
            if text.strip() and score >= 20:
                words.append(text.strip())
        if words:
            candidates.append(" ".join(words))
    return max(candidates, key=lambda value: (len(_normalize(value)), value), default="")


def _read_text(image, cv2, pytesseract) -> tuple[str, str]:
    text = _rapid_text(image)
    if text:
        return text, "rapidocr-onnxruntime"
    text = _tesseract_text(image, cv2, pytesseract)
    return text, "tesseract"


def _merge_sample(samples: list[dict], text: str, start: float, end: float) -> None:
    if not text:
        return
    if samples and _similar(samples[-1]["text"], text) >= 0.82:
        previous = samples[-1]
        previous["end"] = round(end, 3)
        if len(_normalize(text)) > len(_normalize(previous["text"])):
            previous["text"] = text
        return
    samples.append({"start": round(start, 3), "end": round(end, 3), "text": text})


def extract_subtitles(video_path: str, output_dir: str) -> dict:
    try:
        import cv2
        import pytesseract
    except ImportError as exc:
        raise RuntimeError("字幕 OCR 需要安装 OpenCV 和 OCR 依赖。") from exc

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError("无法读取视频，字幕 OCR 已停止。")
    fps = capture.get(cv2.CAP_PROP_FPS) or 25
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / fps if total else 0.0
    samples = []
    engines = set()
    index = 0
    interval = max(1, int(fps * 1.5))
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if index % interval == 0:
            height = frame.shape[0]
            region = frame[int(height * 0.45):int(height * 0.99), :]
            text, engine = _read_text(region, cv2, pytesseract)
            engines.add(engine)
            start = index / fps
            _merge_sample(samples, text, start, min(start + interval / fps, duration or start + interval / fps))
        index += 1
    capture.release()

    for item in samples:
        if duration:
            item["end"] = min(item["end"], round(duration, 3))
    srt = "\n\n".join(
        f"{number}\n{_srt_time(item['start'])} --> {_srt_time(item['end'])}\n{item['text']}"
        for number, item in enumerate(samples, 1)
    )
    return {
        "items": samples,
        "srt": f"{srt}\n" if srt else "",
        "text": "\n".join(item["text"] for item in samples),
        "frames": total,
        "engine": "+".join(sorted(engines)) or "none",
    }
