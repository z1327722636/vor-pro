from dataclasses import dataclass


@dataclass(frozen=True)
class Scene:
    start_ms: int
    end_ms: int


def split_scenes(video_path: str, threshold: float = 27.0) -> list[Scene]:
    """Use PySceneDetect when available; return one full-video scene as a safe fallback."""
    try:
        from scenedetect import ContentDetector, detect
        scenes = detect(video_path, ContentDetector(threshold=threshold))
        return [
            Scene(
                start_ms=int(start.get_seconds() * 1000),
                end_ms=int(end.get_seconds() * 1000),
            )
            for start, end in scenes
        ]
    except Exception:
        return [Scene(start_ms=0, end_ms=0)]
