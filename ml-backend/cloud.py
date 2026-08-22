"""Cloudinary upload + image download helpers for the worker."""
from __future__ import annotations

import logging
from typing import Dict, Optional

import cloudinary
import cloudinary.uploader
import cv2
import numpy as np
import requests

from config import settings

log = logging.getLogger("drishti.cloud")

if settings.cloudinary_ready:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def download_image(url: str, timeout: int = 30) -> np.ndarray:
    """Fetch a report image from Cloudinary and decode it into a BGR array."""
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()

    data = np.frombuffer(response.content, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("The downloaded file could not be decoded as an image")
    return image


def upload_annotated(jpeg_bytes: bytes, report_id: str) -> Optional[Dict[str, str]]:
    """Upload the annotated frame. Returns None when Cloudinary is not configured."""
    if not settings.cloudinary_ready:
        log.warning("Cloudinary credentials missing — skipping annotated upload")
        return None

    result = cloudinary.uploader.upload(
        jpeg_bytes,
        folder="drishti-ai/annotated",
        public_id=f"report_{report_id}",
        overwrite=True,
        resource_type="image",
    )
    return {"url": result["secure_url"], "publicId": result["public_id"]}
