from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from .. import jwt_token, models, schemas
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import json
from pathlib import Path

router = APIRouter(
    prefix="/api/detection",
    tags=['Hand Detection']
)

# Initialize YOLO model (load once when module is imported)
model_path = Path(__file__).parent.parent / "detection" / "yolov8.pt"
model = None

def load_model():
    global model
    try:
        if model_path.exists():
            model = YOLO(str(model_path))
            print(f"YOLO model loaded successfully from {model_path}")
        else:
            print(f"Warning: YOLO model not found at {model_path}")
            model = None
    except Exception as e:
        print(f"Error loading YOLO model: {e}")
        model = None

# Load model on import
load_model()

class HandDetectionService:
    @staticmethod
    # Process a single frame and detect hands (bounding boxes and confidence scores)
    def process_frame(image_data: bytes) -> dict:
        """
        Process a single frame and detect hands
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            dict: Detection results with bounding boxes and confidence scores
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Could not decode image")
            
            # Check if model is loaded
            if model is None:
                raise ValueError("YOLO model is not loaded")
            
            # Run YOLO detection
            results = model(img)[0]
            
            # Extract hand bounding boxes
            detections = []
            
            for box in results.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                conf = float(box.conf[0])
                
                # Filter by confidence threshold
                if conf >= 0.3:
                    detections.append({
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "confidence": round(conf, 3),
                        "class_name": "hand"
                    })
            
            return {
                "success": True,
                "detections": detections,
                "total_hands": len(detections)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "detections": [],
                "total_hands": 0
            }
    
    # Process a base64 encoded frame
    @staticmethod
    def process_base64_frame(base64_data: str) -> dict:
        """
        Process a base64 encoded frame
        
        Args:
            base64_data: Base64 encoded image string
            
        Returns:
            dict: Detection results
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            # Decode base64 to bytes
            image_data = base64.b64decode(base64_data)
            
            return HandDetectionService.process_frame(image_data)
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Base64 processing error: {str(e)}",
                "detections": [],
                "total_hands": 0
            }

# Detect hands in uploaded image file
@router.post("/detect-frame", response_model=schemas.DetectionResponse)
async def detect_hands_from_upload(
    file: UploadFile = File(...),
    current_user: models.User = Depends(jwt_token.get_authenticated_user)
):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        # Read file contents
        contents = await file.read()
        
        # Process the frame
        result = HandDetectionService.process_frame(contents)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection failed: {str(e)}"
        )

# ASL Prediction endpoint (compatible with LiveDetectionInterface)
@router.post("/predict", response_model=schemas.ASLPredictionResponse)
async def predict_asl_sign(request: schemas.DetectionRequest, current_user: models.User = Depends(jwt_token.get_authenticated_user)):
    try:
        base64_data = request.image
        
        # Process the frame
        result = HandDetectionService.process_base64_frame(base64_data)
        
        if result["success"] and result["detections"]:
            # Get the highest confidence detection
            best_detection = max(result["detections"], key=lambda x: x["confidence"])
            
            # For now, return generic hand detection result
            prediction = f"Hand Gesture ({result['total_hands']} hands)"
            confidence = best_detection["confidence"]
            
            return JSONResponse(content={
                "prediction": prediction,
                "confidence": confidence,
                "total_hands": result["total_hands"],
                "detections": result["detections"]
            })
        else:
            return JSONResponse(content={
                "prediction": "No gesture detected",
                "confidence": 0.0,
                "total_hands": 0,
                "detections": []
            })
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ASL prediction failed: {str(e)}"
        )

# WebSocket endpoint for real-time detection with lower latency. Maintains persistent connection for continuous frame processing.
@router.websocket("/ws")
async def websocket_detection_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected")
    
    try:
        # Keep connection alive and process frames continuously
        while True:
            try:
                # Receive base64 image data from client
                data = await websocket.receive_text()
                
                # Parse JSON data
                message = json.loads(data)
                
                # Check for authentication token
                token = message.get("token")
                if not token:
                    await websocket.send_json({
                        "error": "Authentication required",
                        "success": False
                    })
                    continue
                
                # Get image data
                base64_image = message.get("image")
                if not base64_image:
                    await websocket.send_json({
                        "error": "No image data provided",
                        "success": False
                    })
                    continue
                
                # Process the frame (non-blocking)
                result = HandDetectionService.process_base64_frame(base64_image)
                
                if result["success"] and result["detections"]:
                    # Get the highest confidence detection
                    best_detection = max(result["detections"], key=lambda x: x["confidence"])
                    
                    prediction = f"Hand Gesture ({result['total_hands']} hands)"
                    confidence = best_detection["confidence"]
                    
                    # Send detection results back to client
                    await websocket.send_json({
                        "prediction": prediction,
                        "confidence": confidence,
                        "total_hands": result["total_hands"],
                        "detections": result["detections"],
                        "success": True
                    })
                else:
                    await websocket.send_json({
                        "prediction": "No gesture detected",
                        "confidence": 0.0,
                        "total_hands": 0,
                        "detections": [],
                        "success": True
                    })
                    
            except json.JSONDecodeError:
                # Send error but keep connection alive
                try:
                    await websocket.send_json({
                        "error": "Invalid JSON format",
                        "success": False
                    })
                except Exception as send_error:
                    print(f"Failed to send error message: {send_error}")
                    break  # Connection closed, exit loop
            except Exception as e:
                # Send error but keep connection alive
                print(f"Error processing frame: {e}")
                try:
                    await websocket.send_json({
                        "error": str(e),
                        "success": False
                    })
                except Exception as send_error:
                    print(f"Failed to send error message: {send_error}")
                    break  # Connection closed, exit loop
                
    except WebSocketDisconnect:
        print("WebSocket client disconnected gracefully")
    except Exception as e:
        print(f"WebSocket connection error: {e}")