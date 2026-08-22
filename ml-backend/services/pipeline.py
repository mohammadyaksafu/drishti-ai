"""
The single inference pipeline, shared by the polling worker and the FastAPI
manual-trigger endpoint so both paths behave identically.

    download image -> detect -> score severity -> annotate -> upload -> return
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List

from cloud import download_image, upload_annotated
from config import settings
from inference.annotator import annotate, encode_jpeg
from inference.detector import get_detector
from inference.severity import aggregate, score_detection

log = logging.getLogger("drishti.pipeline")


def analyse(image_url: str, report_id: str, job_id: str) -> Dict[str, Any]:
    started = time.time()

    image = download_image(image_url)
    height, width = image.shape[:2]

    raw = get_detector().predict(image, seed=str(job_id))

    detections: List[Dict[str, Any]] = []
    for det in raw:
        scored = score_detection(
            hazard_type=det["type"],
            confidence=det["confidence"],
            bbox=det["boundingBox"],
            image_width=width,
            image_height=height,
        )
        detections.append(
            {
                "type": det["type"],
                "confidence": float(det["confidence"]),
                "boundingBox": det["boundingBox"],
                "severity": scored["severity"],
                "severityLabel": scored["severityLabel"],
                "areaRatio": scored["areaRatio"],
            }
        )

    summary = aggregate(detections)

    annotated_url = None
    annotated_public_id = None
    if detections:
        frame = annotate(image, detections, summary["overallSeverity"], summary["severityLabel"])
        uploaded = upload_annotated(encode_jpeg(frame), report_id)
        if uploaded:
            annotated_url = uploaded["url"]
            annotated_public_id = uploaded["publicId"]

    return {
        "detections": detections,
        "overallSeverity": summary["overallSeverity"],
        "severityLabel": summary["severityLabel"],
        "primaryHazard": summary["primaryHazard"],
        "annotatedImageUrl": annotated_url,
        "annotatedImagePublicId": annotated_public_id,
        "modelVersion": settings.MODEL_VERSION,
        "processingTimeMs": int((time.time() - started) * 1000),
        "imageSize": {"width": width, "height": height},
    }
