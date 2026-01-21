from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from .. import jwt_token, models, schemas
import cv2
import numpy as np
import base64
import joblib
import json
from pathlib import Path

# Try to import mediapipe with the legacy API
try:
    import mediapipe as mp
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    MEDIAPIPE_AVAILABLE = True
except (AttributeError, ImportError):
    # Fallback for newer mediapipe versions
    MEDIAPIPE_AVAILABLE = False
    print("Warning: MediaPipe solutions API not available")

router = APIRouter(
    prefix="/api/detection",
    tags=['Hand Detection']
)

# Load SVM model
model_path = Path(__file__).parent.parent / "detection" / "svm_asl_model.joblib"
svm_model = joblib.load(model_path)

# Initialize MediaPipe Hands if available
hands_detector = None
if MEDIAPIPE_AVAILABLE:
    hands_detector = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

# Health check endpoint
@router.get("/health")
async def detection_health_check():
    """
    Health check endpoint for detection service
    """
    return JSONResponse(content={
        "status": "ok",
        "message": "Detection service running with SVM model",
        "mode": "backend",
        "mediapipe": "enabled" if MEDIAPIPE_AVAILABLE else "unavailable",
        "model_classes": svm_model.classes_.tolist()
    })

def extract_features_from_landmarks(hand_landmarks) -> np.ndarray:
    """
    Extract features from MediaPipe hand landmarks for SVM model.
    The SVM model expects 42 features (21 landmarks * 2 coordinates: x, y)
    Features are RELATIVE to the wrist (landmark 0) and NORMALIZED by max distance
    to match training data preprocessing.
    """
    landmarks = hand_landmarks.landmark
    
    # Extract all keypoints as numpy array (21 landmarks, 2 coordinates)
    keypoints = np.array([[lm.x, lm.y] for lm in landmarks], dtype=np.float32)
    
    # Normalize keypoints (same as training preprocessing)
    # Step 1: Make relative to wrist (landmark 0)
    wrist = keypoints[0].copy()
    coords = keypoints - wrist
    
    # Step 2: Scale by maximum distance from wrist
    dists = np.linalg.norm(coords, axis=1)
    scale = dists.max()
    if scale < 1e-6:
        scale = 1.0
    coords = coords / scale
    
    # Flatten to 1D array (42 features)
    return coords.reshape(1, -1)

@router.post("/predict-asl")
async def predict_asl_letter(file: UploadFile = File(...)):
    """
    Process frame with MediaPipe, extract landmarks, and predict ASL letter using SVM model
    """
    if not MEDIAPIPE_AVAILABLE or hands_detector is None:
        raise HTTPException(
            status_code=503,
            detail="MediaPipe is not available. Please install: pip install mediapipe==0.9.0"
        )
    
    try:
        # Read image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        print(f"📷 Received image: {image.shape}")
        
        # Convert BGR to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        print("🔍 Running MediaPipe hand detection...")
        results = hands_detector.process(image_rgb)
        
        if not results.multi_hand_landmarks:
            print("⚠️ No hand landmarks detected by MediaPipe")
            return JSONResponse(content={
                "status": "no_hand_detected",
                "prediction": None,
                "confidence": 0.0,
                "message": "No hand detected in the frame",
                "processed_image": None
            })
        
        print(f"✅ Hand landmarks detected: {len(results.multi_hand_landmarks[0].landmark)} landmarks")
        
        # Extract features from first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        features = extract_features_from_landmarks(hand_landmarks)
        
        print(f"📊 Extracted features shape: {features.shape}")
        
        # Make prediction with SVM model
        print("🤖 Running SVM prediction...")
        prediction = svm_model.predict(features)[0]
        
        print(f"🎯 SVM Prediction: {prediction}")
        
        # Get prediction probabilities (confidence scores)
        try:
            if hasattr(svm_model.named_steps['svc'], 'predict_proba'):
                probabilities = svm_model.predict_proba(features)[0]
                confidence = float(np.max(probabilities))
                print(f"📈 Confidence: {confidence * 100:.1f}%")
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
            print(f"Error getting confidence: {e}")
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


@router.websocket("/ws")
async def websocket_detection_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time ASL letter detection.
    Receives base64-encoded frames and returns predictions in real-time.
    """
    if not MEDIAPIPE_AVAILABLE or hands_detector is None:
        await websocket.close(code=1011, reason="MediaPipe not available")
        return
    
    await websocket.accept()
    print("✅ WebSocket client connected")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                # Parse incoming message
                message = json.loads(data)
                base64_image = message.get('image', '')
                
                if not base64_image:
                    await websocket.send_json({
                        "status": "error",
                        "error": "No image data provided"
                    })
                    continue
                
                # Decode base64 image
                # Remove data URL prefix if present (data:image/jpeg;base64,...)
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
                features = extract_features_from_landmarks(hand_landmarks)
                
                # Make prediction with SVM model
                prediction = svm_model.predict(features)[0]
                
                # Get confidence score
                try:
                    if hasattr(svm_model.named_steps['svc'], 'predict_proba'):
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
                print(f"❌ Error processing frame: {str(e)}")
                await websocket.send_json({
                    "status": "error",
                    "error": f"Processing error: {str(e)}"
                })
    
    except WebSocketDisconnect:
        print("🔌 WebSocket client disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {str(e)}")
    finally:
        print("🔚 WebSocket connection closed")