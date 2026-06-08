import json
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

MapName = Literal[
    "ascent",
    "bind",
    "haven",
    "split",
    "icebox",
    "breeze",
    "fracture",
    "pearl",
    "lotus",
    "sunset",
    "abyss",
]
Side = Literal["attack", "defense"]
ThrowType = Literal["direct", "jump_throw", "walk_throw", "crouch_throw", "left_click", "right_click"]


class LineupVLMOutput(BaseModel):
    map: MapName
    agent: str
    side: Side
    ability: str
    throw_type: ThrowType
    standing_description: str
    aim_description: str
    landing_description: str
    confidence: float = Field(ge=0.0, le=1.0)


def parse_lineup_output(raw_text: str) -> LineupVLMOutput:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()
    try:
        data = json.loads(cleaned)
        return LineupVLMOutput.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError(f"Invalid VLM lineup JSON: {exc}") from exc
