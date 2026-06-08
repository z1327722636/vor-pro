from dataclasses import dataclass
from pathlib import Path

from valorant_cv.ability_tracker import ThrowMoment, detect_throw_moments
from valorant_cv.frame_grabber import grab_frames_at_timestamps


@dataclass(frozen=True)
class FrameTriplet:
    standing_path: str
    aim_path: str
    landing_path: str
    throw_timestamp_ms: int
    confidence: float


def extract_triplets(
    video_path: str,
    output_dir: str = "storage/frames",
    pre_ms: int = 1800,
    post_ms: int = 2500,
) -> list[FrameTriplet]:
    moments = detect_throw_moments(video_path)
    triplets: list[FrameTriplet] = []
    for moment in moments:
        paths = grab_frames_at_timestamps(
            video_path,
            {
                "standing": max(moment.timestamp_ms - pre_ms, 0),
                "aim": moment.timestamp_ms,
                "landing": moment.timestamp_ms + post_ms,
            },
            output_dir=str(Path(output_dir)),
        )
        triplets.append(
            FrameTriplet(
                standing_path=paths["standing"],
                aim_path=paths["aim"],
                landing_path=paths["landing"],
                throw_timestamp_ms=moment.timestamp_ms,
                confidence=moment.confidence,
            )
        )
    return triplets
