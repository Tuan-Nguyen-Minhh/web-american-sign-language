from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from .. import jwt_token, models, schemas
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from pathlib import Path

router = APIRouter(
    prefix="/api/detection",
    tags=['Hand Detection']
)

# Initialize YOLO model (load once when module is imported)
model_path = Path(__file__).parent.parent / "detection" / "yolov8.pt"
model = None

# Load YOLO model
model = YOLO(str(model_path))

class HandDetectionService:
    @staticmethod
    # Process a single frame and detect hands (bounding boxes and confidence scores)
    def process_frame(image_data: bytes) -> dict:
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Could not decode image")
            
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
async def detect_hands_from_upload(file: UploadFile = File(...),current_user: models.User = Depends(jwt_token.get_current_user)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="File must be an image")
    
    try:
        # Read file contents
        contents = await file.read()
        
        # Process the frame
        result = HandDetectionService.process_frame(contents)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=f"Detection failed: {str(e)}")

# Detect hands in base64 encoded image
@router.post("/detect-base64", response_model=schemas.DetectionResponse)
async def detect_hands_from_base64(request: schemas.DetectionRequest,current_user: models.User = Depends(jwt_token.get_current_user)):
    try:
        base64_data = request.image
        
        # Process the frame
        result = HandDetectionService.process_base64_frame(base64_data)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=f"Detection failed: {str(e)}")