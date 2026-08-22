# Model weights

Drop your trained YOLO weights here as `best.pt`, then set in `ml-backend/.env`:

```
MODEL_PATH=./models/best.pt
USE_MOCK_MODEL=false
```

The detector expects these six classes, in this order:

```
0  pothole
1  road_crack
2  broken_road
3  open_manhole
4  waterlogging
5  debris
```

Until a `best.pt` exists the service stays in mock mode automatically, so the
full application still runs end to end.

Training sketch (Ultralytics):

```bash
yolo detect train data=road_hazards.yaml model=yolov8n.pt imgsz=640 epochs=120 batch=16
cp runs/detect/train/weights/best.pt ml-backend/models/best.pt
```
