#!/usr/bin/env bash
# Sets up / updates the DRISHTI AI ML worker on the VPS (CPU, no GPU needed).
# Run as root after deploy/setup-vps.sh:
#
#   sudo bash deploy/setup-ml.sh
#
# - Python virtualenv at /opt/drishti-ml-venv (onnxruntime, no torch)
# - Public road-damage detectors (YOLOv8 ONNX exports from Hugging Face) in
#   /opt/drishti-models, checked against pinned SHA-256 hashes
# - ml-backend/.env created from backend/.env (same MongoDB + Cloudinary) if
#   it does not exist yet
# - the worker runs under PM2 as "drishti-ml" (see ecosystem.config.js)
set -euo pipefail

APP_DIR=/var/www/drishti-ai
ML_DIR="$APP_DIR/ml-backend"
VENV=/opt/drishti-ml-venv
MODELS=/opt/drishti-models

# name | url | sha256
MODEL_LIST=(
  "road-anomaly-yolov8m.onnx|https://huggingface.co/Logesshhh/road-anomaly-pothole-yolov8m/resolve/main/pothole_yolov8.onnx|8dbb3232653788ba1b3908ac2d253c24baaf7d772e6b286593938c03e3121555"
  "rdd-yolov8s.onnx|https://huggingface.co/vinothvikas1987/pothole-detection-yolov8/resolve/main/best.onnx|590a20e8c4a7bcbdb32e8a3b7b3a3c1d57d1fa8a7dde5c83fcec8928a4aa753f"
)

echo "==> Python environment"
command -v python3 >/dev/null || { echo "!! python3 is required" >&2; exit 1; }
python3 -m venv --help >/dev/null 2>&1 || apt-get install -y python3-venv
[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$ML_DIR/requirements.txt"

echo "==> Models"
mkdir -p "$MODELS"
for entry in "${MODEL_LIST[@]}"; do
  IFS='|' read -r name url sha <<<"$entry"
  file="$MODELS/$name"
  if [ ! -f "$file" ] || ! echo "$sha  $file" | sha256sum -c --quiet - 2>/dev/null; then
    echo "    downloading $name"
    curl -fsSL -o "$file.part" "$url"
    echo "$sha  $file.part" | sha256sum -c --quiet - || { echo "!! checksum mismatch for $name" >&2; rm -f "$file.part"; exit 1; }
    mv "$file.part" "$file"
  fi
  echo "    ok $name"
done

echo "==> ml-backend/.env"
if [ ! -f "$ML_DIR/.env" ]; then
  get() { grep -E "^$1=" "$APP_DIR/backend/.env" | head -1 | cut -d= -f2-; }
  umask 077
  cat >"$ML_DIR/.env" <<EOF
MONGODB_URI=$(get MONGODB_URI)
MONGODB_DB=drishti_ai
MODEL_PATH=$MODELS/road-anomaly-yolov8m.onnx,$MODELS/rdd-yolov8s.onnx
USE_MOCK_MODEL=false
MODEL_VERSION=road-ensemble-yolov8-onnx-v1
CONFIDENCE_THRESHOLD=0.35
IOU_THRESHOLD=0.45
TORCH_THREADS=2
CLOUDINARY_CLOUD_NAME=$(get CLOUDINARY_CLOUD_NAME)
CLOUDINARY_API_KEY=$(get CLOUDINARY_API_KEY)
CLOUDINARY_API_SECRET=$(get CLOUDINARY_API_SECRET)
POLL_INTERVAL_SECONDS=5
MAX_ATTEMPTS=3
WORKER_ID=vps-worker-01
EOF
  echo "    created from backend/.env"
else
  echo "    kept existing file"
fi

echo "==> Worker (PM2)"
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.js" --only drishti-ml --update-env
pm2 save >/dev/null
sleep 6
pm2 logs drishti-ml --lines 20 --nostream | tail -20
echo "Done."
