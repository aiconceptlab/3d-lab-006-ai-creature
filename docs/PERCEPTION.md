# Local camera perception

In room mode, explicitly enable Notice people. EfficientDet Lite0 identifies the category “person” in a reduced camera frame. Inference runs in a worker on CPU, away from the render loop. Only a fresh visible/not-visible result influences behaviour. Frames and identity data are not uploaded or saved. The AI state sends the coarse boolean, not the photograph.

This does not detect a real thrown ball, map furniture, measure real-person distances or guarantee visibility in poor light. A negative frame does not prove the room is empty. The model can misclassify. Errors leave room tracking and ordinary pet play available.

Runtime: @mediapipe/tasks-vision 1.0.1. Model: EfficientDet Lite0 uint8, obtained from https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite. SHA-256: 2e04c53bfeac0ac2a30c057c7e2a777594ce39baaac35a92f74fb1e8c4fc4e0b.

Official integration guide: https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js. The worker uses a classic script because the runtime's WASM loader requires importScripts. A real blank-frame negative inference is included in browser verification; positive detections and performance must also be checked with an actual phone camera.
