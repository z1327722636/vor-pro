import subprocess
from pathlib import Path
from typing import Literal

FrameKey = Literal["standing", "aim", "landing"]


def grab_frame(video_path: str, timestamp_ms: int, output_path: str) -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    seconds = max(timestamp_ms, 0) / 1000.0
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{seconds:.3f}",
        "-i",
        video_path,
        "-frames:v",
        "1",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-y",
        output_path,
    ]
    subprocess.run(command, check=True)
    return output_path


def grab_frames_at_timestamps(
    video_path: str,
    timestamps_ms: dict[FrameKey, int],
    output_dir: str = "storage/frames",
) -> dict[FrameKey, str]:
    return {
        role: grab_frame(video_path, timestamp, str(Path(output_dir) / f"{Path(video_path).stem}_{role}_{timestamp}.png"))
        for role, timestamp in timestamps_ms.items()
    }
