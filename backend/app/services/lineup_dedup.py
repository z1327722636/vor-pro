import hashlib
from pathlib import Path


def hash_file(path: str) -> str:
    data = Path(path).read_bytes()
    return hashlib.sha256(data).hexdigest()


def build_lineup_dedup_hash(map_name: str, agent: str, side: str, ability: str, standing_image_path: str) -> str:
    raw = "|".join([map_name, agent.lower(), side, ability.lower(), hash_file(standing_image_path)])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
