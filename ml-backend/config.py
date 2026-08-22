"""Central configuration for the DRISHTI AI local ML service."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


class Settings:
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "drishti_ai")

    MODEL_PATH: str = os.getenv("MODEL_PATH", str(BASE_DIR / "models" / "best.pt"))
    USE_MOCK_MODEL: bool = _bool("USE_MOCK_MODEL", True)
    # Inference device. "cpu" is the default because this prototype is meant to run
    # on an ordinary laptop; set DEVICE=0 (or "cuda:0") only if a CUDA GPU is present.
    DEVICE: str = os.getenv("DEVICE", "cpu").strip() or "cpu"
    # Threads torch may use on CPU. 0 means "let torch decide", which is usually right;
    # cap it if the worker is competing with the API or a dev server for cores.
    TORCH_THREADS: int = _int("TORCH_THREADS", 0)
    # Long edge the image is resized to before inference. Dropping to 480 roughly
    # halves CPU time at some cost in small-defect recall.
    IMAGE_SIZE: int = _int("IMAGE_SIZE", 640)
    CONFIDENCE_THRESHOLD: float = _float("CONFIDENCE_THRESHOLD", 0.35)
    IOU_THRESHOLD: float = _float("IOU_THRESHOLD", 0.45)
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "drishti-mock-v1")

    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")

    POLL_INTERVAL_SECONDS: int = _int("POLL_INTERVAL_SECONDS", 6)
    MAX_ATTEMPTS: int = _int("MAX_ATTEMPTS", 3)
    WORKER_ID: str = os.getenv("WORKER_ID", "local-worker")

    HAZARD_CLASSES = [
        "pothole",
        "road_crack",
        "broken_road",
        "open_manhole",
        "waterlogging",
        "debris",
    ]

    @property
    def cloudinary_ready(self) -> bool:
        return all(
            [self.CLOUDINARY_CLOUD_NAME, self.CLOUDINARY_API_KEY, self.CLOUDINARY_API_SECRET]
        )

    @property
    def model_file_exists(self) -> bool:
        return Path(self.MODEL_PATH).is_file()
    @property
    def on_cpu(self) -> bool:
        return str(self.DEVICE).lower() in {"cpu", ""}

settings = Settings()
