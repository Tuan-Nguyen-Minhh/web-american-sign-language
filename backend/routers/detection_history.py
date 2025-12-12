from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, jwt_token, database
import json
from datetime import datetime

router = APIRouter(
    prefix="/api/detection-history",
    tags=['Detection History']
)

# Increment session counter when user stops detection (regardless of save)
@router.post("/increment-session")
async def increment_detection_session(
    current_user: models.User = Depends(jwt_token.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Increment total detection sessions counter
    Called when user stops detection (whether they save or not)
    """
    try:
        print(f"Incrementing session for user {current_user.email}")
        print(f"Current sessions: {current_user.total_detection_sessions}")
        
        current_user.total_detection_sessions += 1
        db.commit()
        db.refresh(current_user)
        
        print(f"New sessions count: {current_user.total_detection_sessions}")
        
        return {"message": "Session counter incremented", "total_sessions": current_user.total_detection_sessions}
    except Exception as e:
        print(f"Error incrementing session: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to increment session counter: {str(e)}"
        )

# Save detection history
@router.post("/save", response_model=schemas.DetectionHistoryResponse)
async def save_detection_history(
    request: schemas.SaveDetectionHistoryRequest,
    current_user: models.User = Depends(jwt_token.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Save detection session history to database
    """
    try:
        # Convert detections list to JSON string
        detections_json = json.dumps([{
            "word": det.word,
            "confidence": det.confidence
        } for det in request.detections])
        
        # Create new detection history record
        new_history = models.DetectionHistory(
            user_id=current_user.id,
            session_name=request.session_name,
            total_detections=len(request.detections),
            detections_data=detections_json
        )
        
        db.add(new_history)
        db.commit()
        db.refresh(new_history)
        
        # Return response
        return schemas.DetectionHistoryResponse(
            id=new_history.id,
            session_name=new_history.session_name,
            total_detections=new_history.total_detections,
            created_at=new_history.created_at.isoformat(),
            detections=[schemas.DetectionItem(**det) for det in json.loads(new_history.detections_data)]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save detection history: {str(e)}"
        )

# Get all detection history for current user
@router.get("/", response_model=List[schemas.DetectionHistoryResponse])
async def get_detection_history(
    current_user: models.User = Depends(jwt_token.get_current_user),
    db: Session = Depends(database.get_db),
    limit: int = 50
):
    """
    Get all detection history for current user
    """
    try:
        histories = db.query(models.DetectionHistory)\
            .filter(models.DetectionHistory.user_id == current_user.id)\
            .order_by(models.DetectionHistory.created_at.desc())\
            .limit(limit)\
            .all()
        
        result = []
        for history in histories:
            result.append(schemas.DetectionHistoryResponse(
                id=history.id,
                session_name=history.session_name,
                total_detections=history.total_detections,
                created_at=history.created_at.isoformat(),
                detections=[schemas.DetectionItem(**det) for det in json.loads(history.detections_data)]
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get detection history: {str(e)}"
        )

# Get single detection history by ID
@router.get("/{history_id}", response_model=schemas.DetectionHistoryResponse)
async def get_detection_history_by_id(
    history_id: int,
    current_user: models.User = Depends(jwt_token.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get specific detection history by ID
    """
    try:
        history = db.query(models.DetectionHistory)\
            .filter(
                models.DetectionHistory.id == history_id,
                models.DetectionHistory.user_id == current_user.id
            )\
            .first()
        
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Detection history not found"
            )
        
        return schemas.DetectionHistoryResponse(
            id=history.id,
            session_name=history.session_name,
            total_detections=history.total_detections,
            created_at=history.created_at.isoformat(),
            detections=[schemas.DetectionItem(**det) for det in json.loads(history.detections_data)]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get detection history: {str(e)}"
        )

# Delete detection history
@router.delete("/{history_id}")
async def delete_detection_history(
    history_id: int,
    current_user: models.User = Depends(jwt_token.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Delete specific detection history
    """
    try:
        history = db.query(models.DetectionHistory)\
            .filter(
                models.DetectionHistory.id == history_id,
                models.DetectionHistory.user_id == current_user.id
            )\
            .first()
        
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Detection history not found"
            )
        
        db.delete(history)
        db.commit()
        
        return {"message": "Detection history deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete detection history: {str(e)}"
        )
