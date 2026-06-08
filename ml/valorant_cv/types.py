from dataclasses import dataclass
from typing import Literal

FrameRole = Literal["standing", "aim", "landing"]


@dataclass(frozen=True)
class VideoFrame:
    timestamp_ms: int
    image_path: str


@dataclass(frozen=True)
class DetectionScore:
    label: str
    confidence: float
