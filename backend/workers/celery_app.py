from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "vor_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "workers.download_tasks",
        "workers.search_tasks",
        "workers.cv_tasks",
        "workers.vlm_tasks",
        "workers.frame_pick_tasks",
        "workers.dedup_tasks",
    ],
)

celery_app.conf.task_routes = {
    "workers.download_tasks.*": {"queue": "download"},
    "workers.search_tasks.*": {"queue": "download"},
    "workers.cv_tasks.*": {"queue": "cv"},
    "workers.vlm_tasks.*": {"queue": "vlm"},
    "workers.frame_pick_tasks.*": {"queue": "manual"},
    "workers.dedup_tasks.*": {"queue": "dedup"},
}
celery_app.conf.task_track_started = True
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.task_publish_retry = False
celery_app.conf.broker_connection_timeout = 1
celery_app.conf.broker_transport_options = {
    "socket_timeout": 1,
    "socket_connect_timeout": 1,
}
