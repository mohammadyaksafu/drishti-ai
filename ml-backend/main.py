"""
DRISHTI AI local FastAPI service.

This is the developer/ops surface for the ML machine: health checks, a manual
job trigger, and queue inspection. The production prototype flow is the MongoDB
polling worker (services/worker.py) — this API is intentionally *not* on the
critical path, so the local machine never has to be exposed to the internet.

    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from config import settings
from inference.detector import get_detector
from services.pipeline import analyse

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("drishti.api")

app = FastAPI(
    title="DRISHTI AI · Local Inference Service",
    description="YOLO hazard detection and severity scoring for DRISHTI AI. Runs on the local ML machine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyseRequest(BaseModel):
    imageUrl: str
    reportId: Optional[str] = "adhoc"


@app.on_event("startup")
def warm_up() -> None:
    detector = get_detector()
    log.info("detector ready in %s mode", detector.mode)


@app.get("/health")
def health() -> Dict[str, Any]:
    detector = get_detector()
    try:
        db.get_client()
        mongo = "connected"
    except Exception as exc:  # noqa: BLE001
        mongo = f"unreachable: {exc}"

    return {
        "status": "healthy",
        "model": "loaded" if detector.loaded else "unavailable",
        "mode": detector.mode,
        "modelVersion": settings.MODEL_VERSION,
        "mongodb": mongo,
        "cloudinary": "connected" if settings.cloudinary_ready else "not configured",
    }


@app.get("/model")
def model_info() -> Dict[str, Any]:
    return get_detector().info()


@app.get("/queue")
def queue() -> Dict[str, Any]:
    try:
        return {"success": True, "queue": db.queue_counts()}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"MongoDB unreachable: {exc}") from exc


@app.post("/process/{job_id}")
def process_job(job_id: str) -> Dict[str, Any]:
    """Manually run one queued job. Useful for debugging without the worker loop."""
    try:
        object_id = ObjectId(job_id)
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail="That job id is not a valid ObjectId") from exc

    job = db.get_db().mljobs.find_one({"_id": object_id})
    if not job:
        raise HTTPException(status_code=404, detail="No job with that id")
    if job["status"] == "completed":
        raise HTTPException(status_code=409, detail="That job is already completed")

    db.get_db().mljobs.update_one(
        {"_id": object_id}, {"$set": {"status": "processing", "startedAt": db.now()}}
    )

    try:
        result = analyse(job["imageUrl"], str(job["reportId"]), str(job["_id"]))
        db.complete_job(job, result)
        return {"success": True, "jobId": job_id, "result": result}
    except Exception as exc:  # noqa: BLE001
        db.fail_job(job, f"{type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc


@app.post("/analyse")
def analyse_url(payload: AnalyseRequest) -> Dict[str, Any]:
    """Run the pipeline on any image URL without touching the queue."""
    try:
        return {"success": True, "result": analyse(payload.imageUrl, payload.reportId or "adhoc", "adhoc")}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
