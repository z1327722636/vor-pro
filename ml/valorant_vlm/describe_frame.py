import json
from typing import Literal

from valorant_vlm.client import VLMClient
from valorant_vlm.prompts import DESCRIBE_FRAME_PROMPT

FrameDescriptionKey = Literal["standing", "aim", "landing"]


def generate_descriptions(
    standing_img: str,
    aim_img: str,
    landing_img: str,
    client: VLMClient | None = None,
    map_hint: str | None = None,
    agent_hint: str | None = None,
) -> dict[FrameDescriptionKey, str]:
    if client is None:
        return {"standing": "", "aim": "", "landing": ""}
    hint = ""
    if map_hint or agent_hint:
        hint = f"\nKnown hints: map={map_hint or 'unknown'}, agent={agent_hint or 'unknown'}."
    raw = client.complete_with_images(
        system_prompt="You write concise Valorant lineup notes for human editing.",
        user_prompt=DESCRIBE_FRAME_PROMPT + hint,
        image_paths=[standing_img, aim_img, landing_img],
        json_mode=True,
    )
    data = json.loads(raw)
    return {
        "standing": str(data.get("standing", "")),
        "aim": str(data.get("aim", "")),
        "landing": str(data.get("landing", "")),
    }
