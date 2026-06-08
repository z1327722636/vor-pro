import argparse
import json
import os

from valorant_cv.triplet_extractor import extract_triplets
from valorant_vlm.client import VLMClient
from valorant_vlm.lineup_parser import parse_triplet_lineup


def main() -> None:
    parser = argparse.ArgumentParser(description="Run video -> triplet frames -> Lineup JSON")
    parser.add_argument("video_path")
    parser.add_argument("--model", default=os.getenv("LITELLM_MODEL", "qwen/qwen2.5-vl-72b-instruct"))
    parser.add_argument("--api-key", default=os.getenv("DASHSCOPE_API_KEY") or os.getenv("OPENAI_API_KEY"))
    parser.add_argument("--output-dir", default="storage/frames")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    triplets = extract_triplets(args.video_path, output_dir=args.output_dir)
    if args.dry_run or not args.api_key:
        print(json.dumps({"triplets": [triplet.__dict__ for triplet in triplets]}, ensure_ascii=False, indent=2))
        return

    client = VLMClient(model=args.model, api_key=args.api_key)
    outputs = [
        parse_triplet_lineup(
            triplet.standing_path,
            triplet.aim_path,
            triplet.landing_path,
            client,
        ).model_dump()
        for triplet in triplets
    ]
    print(json.dumps(outputs, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
