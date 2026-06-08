from dataclasses import dataclass


@dataclass(frozen=True)
class ThrowMoment:
    timestamp_ms: int
    ability_slot: int | None
    confidence: float


def detect_throw_moments(
    video_path: str,
    fps: int = 5,
    start_after_ms: int = 10_000,
    min_gap_ms: int = 8_000,
) -> list[ThrowMoment]:
    """Detect likely throw moments via frame differences in the bottom HUD region."""
    try:
        import cv2
        import numpy as np

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []
        native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        step = max(int(native_fps / fps), 1)
        prev_roi = None
        moments: list[ThrowMoment] = []
        frame_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_idx % step != 0:
                frame_idx += 1
                continue
            h, w = frame.shape[:2]
            roi = frame[int(h * 0.76):h, int(w * 0.28):int(w * 0.72)]
            roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            roi_gray = cv2.resize(roi_gray, (240, 80))
            if prev_roi is not None:
                diff = cv2.absdiff(prev_roi, roi_gray)
                score = float(np.mean(diff)) / 255.0
                if score > 0.08:
                    timestamp_ms = int((frame_idx / native_fps) * 1000)
                    if timestamp_ms >= start_after_ms and (not moments or timestamp_ms - moments[-1].timestamp_ms > min_gap_ms):
                        moments.append(ThrowMoment(timestamp_ms, None, min(score * 4.0, 1.0)))
            prev_roi = roi_gray
            frame_idx += 1
        cap.release()
        return moments
    except Exception:
        return []
