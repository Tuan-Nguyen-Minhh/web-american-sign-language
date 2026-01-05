from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from .. import jwt_token, models, schemas

router = APIRouter(
    prefix="/api/detection",
    tags=['Hand Detection']
)

# NOTE: Model detection has been moved to frontend for better performance
# The detection now runs locally in the browser using ONNX Runtime Web
# This eliminates the need to send frames to the backend

# Health check endpoint
@router.get("/health")
async def detection_health_check():
    """
    Health check endpoint for detection service
    """
    return JSONResponse(content={
        "status": "ok",
        "message": "Detection service running (client-side mode)",
        "mode": "frontend"
    })