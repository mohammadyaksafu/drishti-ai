"""
DRISHTI AI local ML worker.

Polls MongoDB Atlas for pending jobs, runs inference on this machine, and writes
the result straight back to the database. Nothing about this process needs to be
publicly reachable — it only makes outbound connections to Atlas and Cloudinary,
which is exactly why the heavy model can live on a laptop while the API runs on
Vercel.

    python services/worker.py
"""
from __future__ import annotations

import os
import sys
import time
import signal
import logging
from datetime import datetime

# Allow `python services/worker.py` from the ml-backend root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db  # noqa: E402
from config import settings  # noqa: E402
from inference.detector import get_detector  # noqa: E402
from services.pipeline import analyse  # noqa: E402

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")

RESET = "\033[0m"
DIM = "\033[2m"
BOLD = "\033[1m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
MAGENTA = "\033[35m"

SEVERITY_COLOR = {"LOW": GREEN, "MODERATE": YELLOW, "HIGH": YELLOW, "CRITICAL": RED}

_running = True


def _stop(signum, frame):  # noqa: ARG001
    global _running
    _running = False
    print(f"\n{YELLOW}  Shutting down after the current job…{RESET}")


signal.signal(signal.SIGINT, _stop)
signal.signal(signal.SIGTERM, _stop)


def stamp() -> str:
    return f"{DIM}{datetime.now().strftime('%H:%M:%S')}{RESET}"


def line(char: str = "=", width: int = 52) -> str:
    return char * width


def banner(detector, mongo_ok: bool) -> None:
    info = detector.info()
    model_line = (
        f"{info['mode'].upper()} · " + os.path.basename(info["modelPath"])
        if info["mode"] in ("yolo", "onnx")
        else "MOCK inference engine"
    )
    print()
    print(f"{MAGENTA}{line()}{RESET}")
    print(f"{MAGENTA}{BOLD}       DRISHTI AI  ·  LOCAL ML WORKER{RESET}")
    print(f"{MAGENTA}{line()}{RESET}")
    print()
    print(f"  Model      : {BOLD}{model_line}{RESET}")
    print(f"  Version    : {info['modelVersion']}")
    print(f"  Classes    : {len(info['classes'])} ({', '.join(info['classes'][:3])}…)")
    print(f"  Confidence : ≥ {info['confidenceThreshold']}")
    print(f"  Worker id  : {settings.WORKER_ID}")
    print()
    print(f"  MongoDB    : {GREEN + 'CONNECTED' + RESET if mongo_ok else RED + 'UNREACHABLE' + RESET}")
    print(
        f"  Cloudinary : {GREEN + 'CONNECTED' + RESET if settings.cloudinary_ready else YELLOW + 'NOT CONFIGURED' + RESET}"
    )
    print(f"  Status     : {GREEN}RUNNING{RESET}   (Ctrl+C to stop)")
    print()
    counts = db.queue_counts()
    print(
        f"  Queue      : {counts['pending']} pending · {counts['processing']} processing · "
        f"{counts['completed']} completed · {counts['failed']} failed"
    )
    print(f"{MAGENTA}{line('-')}{RESET}")
    print(f"\n{stamp()}  Checking for jobs…")


def process(job) -> None:
    job_id = str(job["_id"])
    report_id = str(job["reportId"])
    short = job_id[-6:]

    print()
    print(f"{CYAN}{line('-')}{RESET}")
    print(f"{stamp()}  {BOLD}Job #{short} claimed{RESET}  {DIM}(attempt {job.get('attempts', 1)}){RESET}")
    print(f"           Report {report_id}")
    print(f"           pending {DIM}→{RESET} {YELLOW}processing{RESET}")

    try:
        print(f"{stamp()}  Downloading image…")
        print(f"{stamp()}  Running inference…")

        result = analyse(job["imageUrl"], report_id, job_id)

        if result["detections"]:
            print(f"{stamp()}  Detected:")
            for det in result["detections"]:
                colour = SEVERITY_COLOR.get(det["severityLabel"], "")
                print(
                    f"             · {det['type']:<14} {det['confidence'] * 100:5.1f}%   "
                    f"{colour}sev {det['severity']:>3} {det['severityLabel']}{RESET}"
                )
        else:
            print(f"{stamp()}  {DIM}No hazards above the confidence threshold{RESET}")

        colour = SEVERITY_COLOR.get(result["severityLabel"], "")
        print(f"{stamp()}  Calculating severity…")
        print(
            f"           Severity : {colour}{BOLD}{result['overallSeverity']}/100  "
            f"{result['severityLabel']}{RESET}"
        )

        if result["annotatedImageUrl"]:
            print(f"{stamp()}  Annotated image uploaded")
        print(f"{stamp()}  Updating MongoDB…")

        db.complete_job(job, result)

        print(
            f"{stamp()}  {GREEN}✓ Job #{short} completed{RESET}  "
            f"{DIM}({result['processingTimeMs'] / 1000:.1f}s){RESET}"
        )
    except Exception as exc:  # noqa: BLE001 - one bad image must not kill the worker
        retryable = db.fail_job(job, f"{type(exc).__name__}: {exc}")
        state = "requeued for retry" if retryable else "marked FAILED"
        print(f"{stamp()}  {RED}✗ Job #{short} {state}{RESET}")
        print(f"           {RED}{type(exc).__name__}: {exc}{RESET}")
    finally:
        print(f"{CYAN}{line('-')}{RESET}")
        print(f"\n{stamp()}  Waiting for next job…")


def main() -> None:
    detector = get_detector()

    try:
        db.get_client()
        mongo_ok = True
    except Exception as exc:  # noqa: BLE001
        print(f"\n{RED}  MongoDB connection failed: {exc}{RESET}")
        print(f"{DIM}  Check MONGODB_URI in ml-backend/.env and your Atlas IP allow-list.{RESET}\n")
        sys.exit(1)

    banner(detector, mongo_ok)

    idle_ticks = 0
    while _running:
        try:
            job = db.claim_next_job()
        except Exception as exc:  # noqa: BLE001
            print(f"{stamp()}  {RED}Queue read failed: {exc}{RESET}")
            time.sleep(settings.POLL_INTERVAL_SECONDS)
            continue

        if job:
            idle_ticks = 0
            process(job)
        else:
            idle_ticks += 1
            # A quiet heartbeat every ~2 minutes so the demo screen looks alive.
            if idle_ticks % max(1, int(120 / settings.POLL_INTERVAL_SECONDS)) == 0:
                print(f"{stamp()}  {DIM}idle · queue empty{RESET}")
            time.sleep(settings.POLL_INTERVAL_SECONDS)

    print(f"{GREEN}  Worker stopped cleanly.{RESET}\n")


if __name__ == "__main__":
    main()
