from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from .. import jwt_token, models, schemas
import cv2
import numpy as np
import base64
import joblib
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
    """
    features = []
    for landmark in hand_landmarks.landmark:
        features.append(landmark.x)
        features.append(landmark.y)
    return np.array(features).reshape(1, -1)

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