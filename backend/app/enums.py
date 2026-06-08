from enum import Enum


class MapName(str, Enum):
    ASCENT = "ascent"
    BIND = "bind"
    HAVEN = "haven"
    SPLIT = "split"
    ICEBOX = "icebox"
    BREEZE = "breeze"
    FRACTURE = "fracture"
    PEARL = "pearl"
    LOTUS = "lotus"
    SUNSET = "sunset"
    ABYSS = "abyss"


class Side(str, Enum):
    ATTACK = "attack"
    DEFENSE = "defense"


class ThrowType(str, Enum):
    DIRECT = "direct"
    JUMP_THROW = "jump_throw"
    WALK_THROW = "walk_throw"
    CROUCH_THROW = "crouch_throw"
    LEFT_CLICK = "left_click"
    RIGHT_CLICK = "right_click"


class JobSource(str, Enum):
    URL = "url"
    KEYWORD = "keyword"
    LOCAL_FILE = "local_file"
    MANUAL_UPLOAD = "manual_upload"
    VIDEO_FRAME_PICK = "video_frame_pick"


class JobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    SCENE_SPLIT = "scene_split"
    CV_FILTER = "cv_filter"
    VLM_PARSE = "vlm_parse"
    AWAIT_USER_PICK = "await_user_pick"
    FRAME_GRAB = "frame_grab"
    VLM_DESCRIBE = "vlm_describe"
    AWAIT_USER_CONFIRM = "await_user_confirm"
    DEDUP = "dedup"
    DONE = "done"
    FAILED = "failed"


class FrameRole(str, Enum):
    STANDING = "standing"
    AIM = "aim"
    LANDING = "landing"


class FrameSource(str, Enum):
    AUTO = "auto"
    USER_PICKED = "user_picked"
    USER_UPLOADED = "user_uploaded"


class LineupSource(str, Enum):
    AI_AUTO = "ai_auto"
    USER_MANUAL_UPLOAD = "user_upload"
    USER_MANUAL_VIDEO = "user_video"
    USER_CORRECTED = "user_corrected"
