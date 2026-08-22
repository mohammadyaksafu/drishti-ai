"""Draws DRISHTI-styled bounding boxes and a severity banner onto the source image."""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

# BGR, because OpenCV. Colours match the severity palette used in the web app.
SEVERITY_COLORS: Dict[str, Tuple[int, int, int]] = {
    "LOW": (94, 173, 22),        # green
    "MODERATE": (16, 165, 245),  # amber
    "HIGH": (39, 92, 234),       # orange-red
    "CRITICAL": (68, 43, 190),   # deep red
}
DEFAULT_COLOR = (140, 90, 90)
LABEL_FONT = cv2.FONT_HERSHEY_SIMPLEX


def _readable_type(hazard: str) -> str:
    return hazard.replace("_", " ").upper()


def _draw_label(image: np.ndarray, text: str, x: int, y: int, color, scale=0.55, thickness=1):
    (tw, th), baseline = cv2.getTextSize(text, LABEL_FONT, scale, thickness)
    top = max(0, y - th - baseline - 6)
    cv2.rectangle(image, (x, top), (x + tw + 12, top + th + baseline + 6), color, -1)
    cv2.putText(
        image, text, (x + 6, top + th + 2), LABEL_FONT, scale, (255, 255, 255), thickness, cv2.LINE_AA
    )


def annotate(
    image: np.ndarray,
    detections: List[Dict[str, Any]],
    overall_severity: int,
    severity_label: str,
) -> np.ndarray:
    """Return a copy of `image` with detection boxes and a summary banner."""
    canvas = image.copy()
    height, width = canvas.shape[:2]
    line_width = max(2, int(round(min(width, height) / 320)))

    for det in detections:
        box = det["boundingBox"]
        x1, y1 = int(box["x1"]), int(box["y1"])
        x2, y2 = int(box["x2"]), int(box["y2"])
        color = SEVERITY_COLORS.get(det.get("severityLabel", ""), DEFAULT_COLOR)

        # Softly tint the interior so the defect reads even on a busy photo.
        overlay = canvas.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        cv2.addWeighted(overlay, 0.16, canvas, 0.84, 0, canvas)

        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, line_width)
        label = f"{_readable_type(det['type'])}  {det['confidence'] * 100:.0f}%  |  SEV {det['severity']}"
        _draw_label(canvas, label, x1, y1, color, scale=max(0.45, width / 1600))

    banner_color = SEVERITY_COLORS.get(severity_label, DEFAULT_COLOR)
    banner_h = max(38, int(height * 0.075))
    strip = canvas.copy()
    cv2.rectangle(strip, (0, 0), (width, banner_h), (28, 24, 22), -1)
    cv2.addWeighted(strip, 0.72, canvas, 0.28, 0, canvas)
    cv2.rectangle(canvas, (0, 0), (max(6, int(width * 0.006)), banner_h), banner_color, -1)

    text_scale = max(0.5, width / 1500)
    cv2.putText(
        canvas,
        "DRISHTI AI",
        (int(width * 0.02), int(banner_h * 0.64)),
        LABEL_FONT,
        text_scale,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
    summary = f"{severity_label}  |  {overall_severity}/100  |  {len(detections)} HAZARD(S)"
    (sw, _), _ = cv2.getTextSize(summary, LABEL_FONT, text_scale * 0.85, 2)
    cv2.putText(
        canvas,
        summary,
        (max(0, width - sw - int(width * 0.02)), int(banner_h * 0.64)),
        LABEL_FONT,
        text_scale * 0.85,
        banner_color if severity_label != "LOW" else (220, 255, 220),
        2,
        cv2.LINE_AA,
    )
    return canvas


def encode_jpeg(image: np.ndarray, quality: int = 90) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError("Could not encode the annotated image")
    return buffer.tobytes()
