from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, database, jwt_token as token

router = APIRouter(
    prefix="/api/admin",
    tags=['Admin']
)

# Get all users (Admin only)
@router.get('/users', response_model=List[schemas.ShowUser])
def get_all_users(
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(token.get_current_admin_user)
):
    users = db.query(models.User).all()
    return users

# Get user by ID (Admin only)
@router.get('/users/{user_id}', response_model=schemas.ShowUser)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(token.get_current_admin_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user

# Delete user (Admin only)
@router.delete('/users/{user_id}')
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(token.get_current_admin_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    # Prevent admin from deleting themselves
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} deleted successfully"}

# Update user role (Admin only)
@router.patch('/users/{user_id}/role')
def update_user_role(
    user_id: int,
    role: str,  # 'admin' or 'user'
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(token.get_current_admin_user)
):
    if role not in ['admin', 'user']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'admin' or 'user'"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    user.role = models.UserRole.ADMIN if role == 'admin' else models.UserRole.USER
    db.commit()
    db.refresh(user)
    
    return {"message": f"User {user.name} role updated to {role}", "user": {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value
    }}

# Get detection history for a specific user (Admin only)
@router.get('/users/{user_id}/detection-history', response_model=List[schemas.DetectionHistoryResponse])
def get_user_detection_history(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(token.get_current_admin_user),
    limit: int = 50
):
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    
    # Get detection histories for this user
    import json
    histories = db.query(models.DetectionHistory)\
        .filter(models.DetectionHistory.user_id == user_id)\
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

# Get system statistics (Admin only)
@router.get('/statistics')
def get_system_statistics(
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(token.get_current_admin_user)
):
    total_users = db.query(models.User).count()
    total_admins = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).count()
    total_regular_users = total_users - total_admins
    total_detection_histories = db.query(models.DetectionHistory).count()
    
    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_regular_users": total_regular_users,
        "total_detection_histories": total_detection_histories
    }
