from dataclasses import dataclass


@dataclass(frozen=True)
class MinimapPoint:
    x: float
    y: float
    confidence: float


def parse_minimap_points(image_path: str) -> tuple[MinimapPoint | None, MinimapPoint | None]:
    """Placeholder for minimap player/landing point parsing.

    Returns normalized coordinates when the parser is confident enough.
    """
    return None, None
