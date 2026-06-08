from valorant_vlm.client import VLMClient
from valorant_vlm.parser import LineupVLMOutput, parse_lineup_output
from valorant_vlm.prompts import LINEUP_JSON_INSTRUCTION, LINEUP_SYSTEM_PROMPT


def parse_triplet_lineup(
    standing_img: str,
    aim_img: str,
    landing_img: str,
    client: VLMClient,
    context: str = "",
) -> LineupVLMOutput:
    prompt = LINEUP_JSON_INSTRUCTION
    if context:
        prompt = f"{prompt}\nAdditional context: {context}"
    raw = client.complete_with_images(
        system_prompt=LINEUP_SYSTEM_PROMPT,
        user_prompt=prompt,
        image_paths=[standing_img, aim_img, landing_img],
        json_mode=True,
    )
    return parse_lineup_output(raw)
