"""
Hazard detector with two interchangeable backends.

  USE_MOCK_MODEL=true   -> deterministic-ish synthetic detections, no torch needed
  USE_MOCK_MODEL=false  -> Ultralytics YOLO weights from MODEL_PATH

The mock mode exists so the whole product (upload -> queue -> worker -> polling
-> result page -> map -> dashboard) can be demonstrated end to end before the
trained weights are ready, and so a demo never dies because a GPU is missing.
"""
from __future__ import annotations

import logging
import random
from typing import Any, Dict, List, Optional

import numpy as np

from config import settings

log = logging.getLogger("drishti.detector")

# Weighted so a demo image usually shows the hazards people expect to see.
MOCK_WEIGHTS = [
    ("pothole", 0.34),
    ("road_crack", 0.22),
    ("waterlogging", 0.14),
    ("broken_road", 0.13),
    ("debris", 0.10),
    ("open_manhole", 0.07),
]


class HazardDetector:
    def __init__(self) -> None:
        self.model = None
        self.mode = "mock" if settings.USE_MOCK_MODEL else "yolo"
        self.class_names: List[str] = list(settings.HAZARD_CLASSES)
        self._load()

    # ------------------------------------------------------------------ load
    def _load(self) -> None:
        if self.mode == "mock":
            log.info("detector running in MOCK mode (USE_MOCK_MODEL=true)")
            return

        if not settings.model_file_exists:
            log.warning(
                "MODEL_PATH %s not found — falling back to MOCK mode", settings.MODEL_PATH
            )
            self.mode = "mock"
            return

        try:
            from ultralytics import YOLO  # imported lazily: torch is heavy

            self.model = YOLO(settings.MODEL_PATH)
            names = getattr(self.model, "names", None)
            if isinstance(names, dict):
                self.class_names = [names[i] for i in sorted(names)]
            elif isinstance(names, list):
                self.class_names = names
            log.info("YOLO weights loaded from %s (%d classes)", settings.MODEL_PATH, len(self.class_names))
        except Exception as exc:  # noqa: BLE001 - a demo should degrade, not crash
            log.error("could not load YOLO (%s) — falling back to MOCK mode", exc)
            self.mode = "mock"
            self.model = None

    @property
    def loaded(self) -> bool:
        return self.mode == "mock" or self.model is not None

    def info(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "modelPath": settings.MODEL_PATH,
            "modelFileExists": settings.model_file_exists,
            "modelVersion": settings.MODEL_VERSION,
            "classes": self.class_names,
            "confidenceThreshold": settings.CONFIDENCE_THRESHOLD,
        }

    # --------------------------------------------------------------- predict
    def predict(self, image: np.ndarray, seed: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return raw detections as
        [{"type": str, "confidence": float, "boundingBox": {x1,y1,x2,y2}}, ...]
        in pixel coordinates of the supplied image.
        """
        if self.mode == "mock":
            return self._predict_mock(image, seed)
        return self._predict_yolo(image)

    def _predict_yolo(self, image: np.ndarray) -> List[Dict[str, Any]]:
        results = self.model.predict(
            source=image,
            conf=settings.CONFIDENCE_THRESHOLD,
            iou=settings.IOU_THRESHOLD,
            verbose=False,
        )

        detections: List[Dict[str, Any]] = []
        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
                cls_index = int(box.cls[0])
                name = (
                    self.class_names[cls_index]
                    if 0 <= cls_index < len(self.class_names)
                    else "pothole"
                )
                if name not in settings.HAZARD_CLASSES:
                    # Map any unexpected class name onto the closest supported one.
                    name = "pothole"
                detections.append(
                    {
                        "type": name,
                        "confidence": round(float(box.conf[0]), 4),
                        "boundingBox": {
                            "x1": round(x1, 1),
                            "y1": round(y1, 1),
                            "x2": round(x2, 1),
                            "y2": round(y2, 1),
                        },
                    }
                )
        return detections

    def _predict_mock(self, image: np.ndarray, seed: Optional[str]) -> List[Dict[str, Any]]:
        """
        Produce plausible boxes in the lower two-thirds of the frame, which is
        where road surface actually appears in a phone photo. Seeding on the job
        id keeps a given report's result stable across retries.
        """
        rng = random.Random(seed) if seed else random.Random()
        height, width = image.shape[:2]

        count = rng.choices([1, 2, 3], weights=[0.55, 0.32, 0.13])[0]
        types, weights = zip(*MOCK_WEIGHTS)

        detections: List[Dict[str, Any]] = []
        for _ in range(count):
            hazard = rng.choices(types, weights=weights)[0]

            box_w = int(width * rng.uniform(0.16, 0.46))
            box_h = int(height * rng.uniform(0.14, 0.38))
            x1 = rng.randint(0, max(1, width - box_w - 1))
            y1 = rng.randint(int(height * 0.32), max(int(height * 0.33), height - box_h - 1))

            detections.append(
                {
                    "type": hazard,
                    "confidence": round(rng.uniform(0.62, 0.97), 4),
                    "boundingBox": {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(min(width - 1, x1 + box_w)),
                        "y2": float(min(height - 1, y1 + box_h)),
                    },
                }
            )
        return detections


_detector: Optional[HazardDetector] = None


def get_detector() -> HazardDetector:
    """Lazy singleton so the weights load once per process."""
    global _detector
    if _detector is None:
        _detector = HazardDetector()
    return _detector
