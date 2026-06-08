from dataclasses import dataclass


@dataclass(frozen=True)
class HudDetection:
    is_gameplay: bool
    confidence: float
    label: str = "valorant_gameplay"


def detect_hud_frame(image_path: str) -> HudDetection:
    """Cheap heuristic fallback for gameplay frame detection.

    YOLO weights can be plugged in later; this baseline avoids sending blank frames onward.
    """
    try:
        import cv2
        import numpy as np

        img = cv2.imread(image_path)
        if img is None:
            return HudDetection(False, 0.0, "unreadable")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 80, 180)
        edge_ratio = float(np.count_nonzero(edges)) / float(edges.size)
        confidence = min(edge_ratio * 8.0, 1.0)
        return HudDetection(confidence > 0.08, confidence)
    except Exception:
        return HudDetection(True, 0.3, "unchecked")


def detect_hud_batch(image_paths: list[str]) -> list[HudDetection]:
    return [detect_hud_frame(path) for path in image_paths]
