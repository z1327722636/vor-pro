from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MapPrediction:
    map_name: str | None
    confidence: float


def classify_map(image_path: str, template_dir: str | None = None) -> MapPrediction:
    """Template-match minimap area against known map images when templates exist."""
    if template_dir is None:
        return MapPrediction(None, 0.0)
    try:
        import cv2

        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return MapPrediction(None, 0.0)
        best_name: str | None = None
        best_score = 0.0
        for template_path in Path(template_dir).glob("*.png"):
            template = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)
            if template is None or template.shape[0] > img.shape[0] or template.shape[1] > img.shape[1]:
                continue
            result = cv2.matchTemplate(img, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            if float(max_val) > best_score:
                best_score = float(max_val)
                best_name = template_path.stem
        return MapPrediction(best_name, best_score)
    except Exception:
        return MapPrediction(None, 0.0)
