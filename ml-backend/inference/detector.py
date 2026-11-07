"""
Hazard detector with three interchangeable backends.

  USE_MOCK_MODEL=true             -> deterministic-ish synthetic detections
  USE_MOCK_MODEL=false, *.onnx    -> YOLOv8 ONNX export(s) run with onnxruntime
                                     (no torch: small enough for a 2-core VPS).
                                     MODEL_PATH may list several comma-separated
                                     .onnx files; their detections are merged
                                     with class-aware NMS (a small ensemble).
  USE_MOCK_MODEL=false, *.pt      -> Ultralytics YOLO weights

Models trained on other label sets are mapped onto DRISHTI's six classes by
name (see HAZARD_ALIASES); classes with no sensible mapping are dropped rather
than guessed, so e.g. "road marking" never shows up as a pothole.

The mock mode exists so the whole product (upload -> queue -> worker -> polling
-> result page -> map -> dashboard) can be demonstrated end to end before the
trained weights are ready, and so a demo never dies because a GPU is missing.
"""
from __future__ import annotations

import ast
import logging
import random
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2

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


# Model label (lower-cased, separators as spaces) -> DRISHTI hazard class.
HAZARD_ALIASES = {
    "pothole": "pothole",
    "potholes": "pothole",
    "road crack": "road_crack",
    "crack": "road_crack",
    "longitudinal crack": "road_crack",
    "transverse crack": "road_crack",
    "lateral crack": "road_crack",
    "d00": "road_crack",
    "d10": "road_crack",
    "alligator crack": "broken_road",
    "crack severe": "broken_road",
    "severe crack": "broken_road",
    "broken road": "broken_road",
    "d20": "broken_road",
    "d40": "pothole",
    "open manhole": "open_manhole",
    "manhole": "open_manhole",
    "waterlogging": "waterlogging",
    "water logging": "waterlogging",
    "flood": "waterlogging",
    "debris": "debris",
}


def to_hazard(label: str) -> Optional[str]:
    key = str(label).strip().lower().replace("_", " ").replace("-", " ")
    if key.replace(" ", "_") in settings.HAZARD_CLASSES:
        return key.replace(" ", "_")
    return HAZARD_ALIASES.get(key)


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

        paths = [p.strip() for p in settings.MODEL_PATH.split(",") if p.strip()]
        missing = [p for p in paths if not Path(p).is_file()]
        if not paths or missing:
            log.warning("MODEL_PATH %s not found — falling back to MOCK mode", missing or settings.MODEL_PATH)
            self.mode = "mock"
            return

        if all(p.lower().endswith(".onnx") for p in paths):
            self._load_onnx(paths)
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

    def _load_onnx(self, paths: List[str]) -> None:
        try:
            import onnxruntime as ort

            options = ort.SessionOptions()
            if settings.TORCH_THREADS > 0:
                options.intra_op_num_threads = settings.TORCH_THREADS

            self.sessions = []
            for path in paths:
                session = ort.InferenceSession(path, sess_options=options, providers=["CPUExecutionProvider"])
                meta = session.get_modelmeta().custom_metadata_map
                names = ast.literal_eval(meta["names"]) if meta.get("names") else {}
                class_names = [names[i] for i in sorted(names)] if isinstance(names, dict) and names else list(settings.HAZARD_CLASSES)
                imgsz = ast.literal_eval(meta.get("imgsz", "[640, 640]"))
                size = int(imgsz[0] if isinstance(imgsz, (list, tuple)) else imgsz)
                self.sessions.append({"session": session, "names": class_names, "size": size, "path": path})
                log.info("ONNX model %s loaded; class map %s", Path(path).name, {n: to_hazard(n) for n in class_names})

            self.model = self.sessions[0]["session"]
            self.class_names = sorted({to_hazard(n) for s in self.sessions for n in s["names"]} - {None})
            self.mode = "onnx"
        except Exception as exc:  # noqa: BLE001
            log.error("could not load ONNX model (%s) — falling back to MOCK mode", exc)
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
        if self.mode == "onnx":
            return self._predict_onnx(image)
        return self._predict_yolo(image)

    def _predict_onnx(self, image: np.ndarray) -> List[Dict[str, Any]]:
        candidates: List[Dict[str, Any]] = []
        for entry in self.sessions:
            candidates.extend(self._run_onnx(entry, image))
        if len(self.sessions) == 1 or not candidates:
            return candidates

        # Merge the models' opinions: same hazard + overlapping box -> keep the
        # most confident one.
        boxes = [
            [c["boundingBox"]["x1"], c["boundingBox"]["y1"],
             c["boundingBox"]["x2"] - c["boundingBox"]["x1"], c["boundingBox"]["y2"] - c["boundingBox"]["y1"]]
            for c in candidates
        ]
        classes = [settings.HAZARD_CLASSES.index(c["type"]) for c in candidates]
        keep = cv2.dnn.NMSBoxesBatched(
            boxes, [c["confidence"] for c in candidates], classes,
            settings.CONFIDENCE_THRESHOLD, settings.IOU_THRESHOLD,
        )
        return [candidates[int(i)] for i in np.array(keep).flatten()]

    def _run_onnx(self, entry: Dict[str, Any], image: np.ndarray) -> List[Dict[str, Any]]:
        session, names, size = entry["session"], entry["names"], entry["size"]
        h, w = image.shape[:2]
        scale = min(size / w, size / h)
        nw, nh = int(round(w * scale)), int(round(h * scale))
        pad_x, pad_y = (size - nw) // 2, (size - nh) // 2

        # Letterbox exactly like Ultralytics: keep aspect, pad with grey.
        canvas = np.full((size, size, 3), 114, dtype=np.uint8)
        canvas[pad_y : pad_y + nh, pad_x : pad_x + nw] = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_LINEAR)
        blob = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).transpose(2, 0, 1)[None].astype(np.float32) / 255.0

        output = session.run(None, {session.get_inputs()[0].name: blob})[0][0]  # (4 + classes, anchors)
        preds = output.T
        scores = preds[:, 4:]
        cls_ids = scores.argmax(axis=1)
        confs = scores[np.arange(len(scores)), cls_ids]
        keep = confs >= settings.CONFIDENCE_THRESHOLD
        if not keep.any():
            return []
        preds, cls_ids, confs = preds[keep], cls_ids[keep], confs[keep]

        cx, cy, bw, bh = preds[:, 0], preds[:, 1], preds[:, 2], preds[:, 3]
        x1 = (cx - bw / 2 - pad_x) / scale
        y1 = (cy - bh / 2 - pad_y) / scale
        x2 = (cx + bw / 2 - pad_x) / scale
        y2 = (cy + bh / 2 - pad_y) / scale

        boxes_xywh = np.stack([x1, y1, x2 - x1, y2 - y1], axis=1).tolist()
        indices = cv2.dnn.NMSBoxesBatched(
            boxes_xywh, confs.tolist(), cls_ids.tolist(), settings.CONFIDENCE_THRESHOLD, settings.IOU_THRESHOLD
        )

        detections: List[Dict[str, Any]] = []
        for i in np.array(indices).flatten():
            idx = int(cls_ids[i])
            hazard = to_hazard(names[idx]) if idx < len(names) else None
            if hazard is None:
                continue  # vehicles, road markings, "Other": not hazards we score
            detections.append(
                {
                    "type": hazard,
                    "confidence": round(float(confs[i]), 4),
                    "boundingBox": {
                        "x1": round(float(max(0, x1[i])), 1),
                        "y1": round(float(max(0, y1[i])), 1),
                        "x2": round(float(min(w - 1, x2[i])), 1),
                        "y2": round(float(min(h - 1, y2[i])), 1),
                    },
                }
            )
        return detections

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
                name = to_hazard(name)
                if name is None:
                    continue  # unmapped class: skip rather than mislabel
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
