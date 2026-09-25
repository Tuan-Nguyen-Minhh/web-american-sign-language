from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from .. import jwt_token, models, schemas
import cv2
import numpy as np
import base64
import joblib
import json
from pathlib import Path

# import mediapipe
try:
    import mediapipe as mp
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    MEDIAPIPE_AVAILABLE = True
except (AttributeError, ImportError):
    # Fallback for newer mediapipe versions
    MEDIAPIPE_AVAILABLE = False

router = APIRouter(
    prefix="/api/detection",
    tags=['Hand Detection']
)

# Load SVM model safely
model_path = Path(__file__).parent.parent / "detection" / "svm.joblib"
svm_model = None
if model_path.exists():
    try:
        svm_model = joblib.load(model_path)
    except Exception as e:
        print(f"Warning: Failed to load SVM model from {model_path}: {e}")
else:
    print(f"Warning: SVM model file not found at {model_path}")

# Initialize MediaPipe Hands if available
hands_detector = None
if MEDIAPIPE_AVAILABLE:
    try:
        hands_detector = mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    except Exception as e:
        print(f"Warning: Failed to initialize MediaPipe Hands: {e}")
        hands_detector = None

# Health check endpoint
@router.get("/health")
async def detection_health_check():
    classes = []
    if svm_model is not None and hasattr(svm_model, 'classes_'):
        classes = svm_model.classes_.tolist()
    return JSONResponse(content={
        "status": "ok",
        "message": "Detection service running",
        "mode": "backend",
        "mediapipe": "enabled" if (MEDIAPIPE_AVAILABLE and hands_detector is not None) else "unavailable",
        "svm_model": "loaded" if svm_model is not None else "unavailable",
        "model_classes": classes
    })

def normalize_landmarks_xy(hand_landmarks, flip: bool = False) -> np.ndarray:
    """
    Preprocess landmarks to match training pipeline:
      - x flip: x := 1-x if flip
      - center at wrist (landmark 0)
      - scale by max L2 distance from wrist
      - flatten to shape (42,)
    """
    data = []
    for lm in hand_landmarks.landmark:
        x = (1.0 - lm.x) if flip else lm.x
        data.append([x, lm.y])

    keypoints = np.asarray(data, dtype=np.float32)  # (21, 2)
    wrist = keypoints[0].copy()
    coords = keypoints - wrist  # translation invariance

    dists = np.linalg.norm(coords, axis=1)  # (21,)
    scale = float(dists.max())
    if scale < 1e-6:
        scale = 1.0
    coords = coords / scale  # scale invariance

    return coords.reshape(-1).astype(np.float32)  # (42,)

# Process frame with MediaPipe, extract landmarks, and predict ASL letter using SVM model
@router.post("/predict-asl")
async def predict_asl_letter(file: UploadFile = File(...)):
    if not MEDIAPIPE_AVAILABLE or hands_detector is None:
        raise HTTPException(
            status_code=503,
            detail="MediaPipe is not available."
        )
    if svm_model is None:
        raise HTTPException(
            status_code=503,
            detail="SVM model is not available. Please ensure svm.joblib is placed in backend/detection/"
        )
    
    try:
        # Read image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Convert BGR to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = hands_detector.process(image_rgb)
        
        if not results.multi_hand_landmarks:
            return JSONResponse(content={
                "status": "no_hand_detected",
                "prediction": None,
                "confidence": 0.0,
                "message": "No hand detected in the frame",
                "processed_image": None
            })
        
        # Extract features from first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        features = normalize_landmarks_xy(hand_landmarks, flip=False).reshape(1, -1)  # (1, 42)
        
        # Make prediction with SVM model
        prediction = svm_model.predict(features)[0]
        
        # Get prediction probabilities (confidence scores)
        try:
            if hasattr(svm_model, 'predict_proba'):
                probabilities = svm_model.predict_proba(features)[0]
                confidence = float(np.max(probabilities))
            elif hasattr(svm_model, 'named_steps') and hasattr(svm_model.named_steps.get('svc', None), 'predict_proba'):
                probabilities = svm_model.predict_proba(features)[0]
                confidence = float(np.max(probabilities))
            else:
                # If probability not available, use decision function
                decision_values = svm_model.decision_function(features)
                if decision_values.ndim > 1:
                    confidence = float(np.max(np.abs(decision_values)))
                else:
                    confidence = float(np.abs(decision_values[0]))
                # Normalize to 0-1 range (approximation)
                confidence = min(1.0, confidence / 5.0)
        except Exception as e:
            confidence = 0.8  # Default confidence
        
        # Return prediction result (no image processing needed)
        return JSONResponse(content={
            "status": "success",
            "prediction": prediction,
            "confidence": confidence,
            "message": f"Detected ASL letter: {prediction}"
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting ASL letter: {str(e)}")

# WebSocket endpoint: Receives base64-encoded frames and returns predictions.
@router.websocket("/ws")
async def websocket_detection_endpoint(websocket: WebSocket, token: str | None = Query(default=None)):
    if not MEDIAPIPE_AVAILABLE or hands_detector is None:
        await websocket.close(code=1011, reason="MediaPipe not available")
        return
    if svm_model is None:
        await websocket.close(code=1011, reason="SVM model not loaded")
        return
    
    # Authenticate via query parameter if provided
    user_payload = None
    if token:
        user_payload = jwt_token.verify_access_token(token)
        if not user_payload:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
            return
    
    await websocket.accept()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                # Parse incoming message
                message = json.loads(data)
                
                # If not authenticated via query param, verify token from message payload
                if not user_payload:
                    msg_token = message.get('token')
                    if msg_token:
                        user_payload = jwt_token.verify_access_token(msg_token)
                    if not user_payload:
                        await websocket.send_json({
                            "status": "error",
                            "error": "Authentication required. Invalid or missing token."
                        })
                        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
                        break

                base64_image = message.get('image', '')
                
                if not base64_image:
                    await websocket.send_json({
                        "status": "error",
                        "error": "No image data provided"
                    })
                    continue
                
                # Decode base64 image
                if ',' in base64_image:
                    base64_image = base64_image.split(',')[1]
                
                image_bytes = base64.b64decode(base64_image)
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image is None:
                    await websocket.send_json({
                        "status": "error",
                        "error": "Invalid image data"
                    })
                    continue
                
                # Convert BGR to RGB for MediaPipe
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
                # Process with MediaPipe
                results = hands_detector.process(image_rgb)
                
                if not results.multi_hand_landmarks:
                    # No hand detected
                    await websocket.send_json({
                        "status": "no_hand_detected",
                        "prediction": None,
                        "confidence": 0.0
                    })
                    continue
                
                # Extract features from first detected hand
                hand_landmarks = results.multi_hand_landmarks[0]
                features = normalize_landmarks_xy(hand_landmarks, flip=False).reshape(1, -1)  # (1, 42)
                
                # Make prediction with SVM model
                prediction = svm_model.predict(features)[0]
                
                # Get confidence score
                try:
                    if hasattr(svm_model, 'predict_proba'):
                        probabilities = svm_model.predict_proba(features)[0]
                        confidence = float(np.max(probabilities))
                    elif hasattr(svm_model, 'named_steps') and hasattr(svm_model.named_steps.get('svc', None), 'predict_proba'):
                        probabilities = svm_model.predict_proba(features)[0]
                        confidence = float(np.max(probabilities))
                    else:
                        decision_values = svm_model.decision_function(features)
                        if decision_values.ndim > 1:
                            confidence = float(np.max(np.abs(decision_values)))
                        else:
                            confidence = float(np.abs(decision_values[0]))
                        confidence = min(1.0, confidence / 5.0)
                except Exception:
                    confidence = 0.8
                
                # Send prediction result
                await websocket.send_json({
                    "status": "success",
                    "prediction": prediction,
                    "confidence": confidence
                })
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "status": "error",
                    "error": "Invalid JSON format"
                })
            except Exception as e:
                await websocket.send_json({
                    "status": "error",
                    "error": f"Processing error: {str(e)}"
                })
    
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        print("WebSocket connection closed")