from workers.celery_app import celery_app


@celery_app.task(name="workers.dedup_tasks.deduplicate_lineups")
def deduplicate_lineups(job_id: int) -> dict[str, int | str]:
    return {"job_id": job_id, "status": "queued"}
