"""
DRISHTI AI severity engine.

Severity is *not* model confidence. A model can be 99% sure it sees a hairline
crack; that crack is still a low-severity hazard. This module scores how
dangerous a hazard actually is, on a 0-100 scale, from four weighted signals:

    40%  hazard size      (how much of the frame the defect occupies)
    30%  hazard type      (an open manhole is intrinsically worse than debris)
    20%  model confidence (how sure the detector is that it is there at all)
    10%  location risk    (context: highway vs residential lane)

Every component returns 0-100 so the weights stay readable, and each one is a
separate function so a trained severity regressor can replace any single piece
later without touching the rest.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

WEIGHTS = {"size": 0.40, "type": 0.30, "confidence": 0.20, "location": 0.10}

# Intrinsic danger of each hazard class, 0-100.
HAZARD_TYPE_RISK: Dict[str, float] = {
    "open_manhole": 100.0,   # can swallow a wheel or a person
    "broken_road": 85.0,     # surface failure across the carriageway
    "pothole": 75.0,
    "waterlogging": 65.0,    # hides whatever is underneath it
    "debris": 50.0,
    "road_crack": 35.0,      # early-stage deterioration
}

# Context multiplier inputs, 0-100.
LOCATION_RISK: Dict[str, float] = {
    "highway": 100.0,
    "national_road": 90.0,
    "arterial": 80.0,
    "urban": 65.0,
    "residential": 45.0,
    "rural": 40.0,
    "unknown": 60.0,
}

SEVERITY_BANDS = [(30, "LOW"), (60, "MODERATE"), (80, "HIGH"), (100, "CRITICAL")]


def area_ratio(bbox: Dict[str, float], image_width: int, image_height: int) -> float:
    """Fraction of the frame covered by the bounding box, clamped to 0-1."""
    if not image_width or not image_height:
        return 0.0
    width = max(0.0, float(bbox["x2"]) - float(bbox["x1"]))
    height = max(0.0, float(bbox["y2"]) - float(bbox["y1"]))
    return min(1.0, (width * height) / float(image_width * image_height))


def size_score(ratio: float) -> float:
    """
    Map coverage to 0-100 with a saturating curve: a defect covering 30% of the
    frame is already about as bad as it gets from a size standpoint, so we stop
    rewarding growth past that point instead of scaling linearly to 100%.
    """
    saturation = 0.30
    return min(100.0, (min(ratio, saturation) / saturation) * 100.0)


def type_score(hazard_type: str) -> float:
    return HAZARD_TYPE_RISK.get(hazard_type, 55.0)


def confidence_score(confidence: float) -> float:
    return max(0.0, min(1.0, float(confidence))) * 100.0


def location_score(context: Optional[str] = None) -> float:
    """
    Placeholder for road-class lookup. Today the frontend does not send a road
    class, so everything scores as 'unknown'. Wiring in an OSM road-type lookup
    later only means passing a real key here.
    """
    return LOCATION_RISK.get((context or "unknown").lower(), LOCATION_RISK["unknown"])


def label_for(score: float) -> str:
    for ceiling, label in SEVERITY_BANDS:
        if score <= ceiling:
            return label
    return "CRITICAL"


def score_detection(
    hazard_type: str,
    confidence: float,
    bbox: Dict[str, float],
    image_width: int,
    image_height: int,
    location_context: Optional[str] = None,
) -> Dict[str, Any]:
    """Score a single detection and return the breakdown alongside the total."""
    ratio = area_ratio(bbox, image_width, image_height)

    components = {
        "size": size_score(ratio),
        "type": type_score(hazard_type),
        "confidence": confidence_score(confidence),
        "location": location_score(location_context),
    }
    total = sum(components[k] * WEIGHTS[k] for k in WEIGHTS)
    score = int(round(max(0.0, min(100.0, total))))

    return {
        "severity": score,
        "severityLabel": label_for(score),
        "areaRatio": round(ratio, 4),
        "components": {k: round(v, 1) for k, v in components.items()},
    }


def aggregate(detections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Roll individual detections up into one report-level severity.

    The worst hazard sets the floor, then each additional hazard adds a small
    compounding penalty: three moderate potholes on one stretch of road are a
    worse maintenance problem than one moderate pothole, but not three times worse.
    """
    if not detections:
        return {"overallSeverity": 0, "severityLabel": "LOW", "primaryHazard": "none"}

    ranked = sorted(detections, key=lambda d: d["severity"], reverse=True)
    worst = ranked[0]
    extra = min(12.0, 4.0 * (len(ranked) - 1))
    total = int(round(min(100.0, worst["severity"] + extra)))

    return {
        "overallSeverity": total,
        "severityLabel": label_for(total),
        "primaryHazard": worst["type"],
    }
