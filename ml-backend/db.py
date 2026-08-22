"""MongoDB access for the local worker. Talks to Atlas directly — no public endpoint needed."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from bson import ObjectId
from pymongo import MongoClient, ReturnDocument

from config import settings

log = logging.getLogger("drishti.db")

_client: Optional[MongoClient] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        if not settings.MONGODB_URI:
            raise RuntimeError("MONGODB_URI is not set. Copy .env.example to .env first.")
        _client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=15000)
        _client.admin.command("ping")
        log.info("MongoDB connected")
    return _client


def resolve_db_name() -> str:
    """
    Work out which database to use, preferring the one embedded in MONGODB_URI.

    This is what keeps the worker and the Node API pointed at the same place.
    The API gets its database from the URI path (Mongoose reads it automatically),
    so if the worker took its name from a separate variable the two could silently
    drift apart — the API writing to one database while the worker polls another,
    with no error and an eternally empty queue.

    Order of preference:
      1. the path segment of MONGODB_URI   (…mongodb.net/drishti_ai?retryWrites=true)
      2. MONGODB_DB, only as a fallback when the URI carries no name
      3. "drishti_ai"
    """
    from urllib.parse import urlsplit

    # urlsplit handles both mongodb:// and mongodb+srv://, and strips the query string.
    path = urlsplit(settings.MONGODB_URI).path.lstrip("/")
    name = path.split("?")[0].strip()

    if name:
        return name

    fallback = (settings.MONGODB_DB or "").strip()
    # A name containing '.' or '/' means someone pasted a host or a whole URI in here.
    if fallback and not any(ch in fallback for ch in "./\\ \"$"):
        log.warning(
            "MONGODB_URI has no database in its path — falling back to MONGODB_DB=%r. "
            "Add the name to the URI so the API and this worker cannot drift apart.",
            fallback,
        )
        return fallback

    if fallback:
        log.error(
            "MONGODB_DB=%r is not a valid database name (it looks like a host or URI). Using 'drishti_ai'.",
            fallback,
        )

    return "drishti_ai"


def get_db():
    return get_client()[resolve_db_name()]


def now() -> datetime:
    return datetime.now(timezone.utc)


def claim_next_job() -> Optional[Dict[str, Any]]:
    """
    Atomically move the oldest pending job to `processing`.

    find_one_and_update is a single atomic operation on the server, so two
    workers polling the same queue can never claim the same job.
    """
    db = get_db()
    job = db.mljobs.find_one_and_update(
        {"status": "pending", "attempts": {"$lt": settings.MAX_ATTEMPTS}},
        {
            "$set": {
                "status": "processing",
                "startedAt": now(),
                "workerId": settings.WORKER_ID,
                "updatedAt": now(),
            },
            "$inc": {"attempts": 1},
        },
        sort=[("createdAt", 1)],
        return_document=ReturnDocument.AFTER,
    )
    if job:
        db.reports.update_one(
            {"_id": job["reportId"]},
            {"$set": {"status": "processing", "lifecycle": "PROCESSING", "updatedAt": now()}},
        )
    return job


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return get_db().mljobs.find_one({"_id": ObjectId(job_id)})


def get_report(report_id) -> Optional[Dict[str, Any]]:
    return get_db().reports.find_one({"_id": report_id})


def complete_job(job: Dict[str, Any], result: Dict[str, Any]) -> None:
    """Write detections + severity back onto the report and close the job."""
    db = get_db()
    severity_label = result["severityLabel"]
    lifecycle = "PRIORITIZED" if severity_label in ("HIGH", "CRITICAL") else "AI_COMPLETED"

    db.reports.update_one(
        {"_id": job["reportId"]},
        {
            "$set": {
                "status": "completed",
                "detections": result["detections"],
                "overallSeverity": result["overallSeverity"],
                "severityLabel": severity_label,
                "primaryHazard": result["primaryHazard"],
                "annotatedImageUrl": result.get("annotatedImageUrl"),
                "annotatedImagePublicId": result.get("annotatedImagePublicId"),
                "modelVersion": result.get("modelVersion", settings.MODEL_VERSION),
                "processingTimeMs": result.get("processingTimeMs", 0),
                "priority": result["overallSeverity"],
                "lifecycle": lifecycle,
                "failureReason": "",
                "processedAt": now(),
                "updatedAt": now(),
            }
        },
    )
    db.mljobs.update_one(
        {"_id": job["_id"]},
        {"$set": {"status": "completed", "completedAt": now(), "error": "", "updatedAt": now()}},
    )


def fail_job(job: Dict[str, Any], message: str) -> None:
    """
    Mark a job failed. If attempts are left it goes back to `pending` so the
    next poll retries it; otherwise both job and report are marked failed.
    """
    db = get_db()
    attempts = int(job.get("attempts", 0))
    retryable = attempts < settings.MAX_ATTEMPTS

    db.mljobs.update_one(
        {"_id": job["_id"]},
        {
            "$set": {
                "status": "pending" if retryable else "failed",
                "error": message[:500],
                "completedAt": None if retryable else now(),
                "updatedAt": now(),
            }
        },
    )
    db.reports.update_one(
        {"_id": job["reportId"]},
        {
            "$set": {
                "status": "pending" if retryable else "failed",
                "lifecycle": "PENDING_AI" if retryable else "PROCESSING",
                "failureReason": "" if retryable else message[:500],
                "updatedAt": now(),
            }
        },
    )
    return retryable


def queue_counts() -> Dict[str, int]:
    db = get_db()
    return {
        status: db.mljobs.count_documents({"status": status})
        for status in ("pending", "processing", "completed", "failed")
    }
