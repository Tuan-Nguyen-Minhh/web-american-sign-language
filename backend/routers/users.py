from fastapi import APIRouter, Depends, status, HTTPException
from jwt_token import hash_password, get_current_user
import schemas
from database import get_db
import models
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/user",
    tags=['Users']
)

@router.post('/', response_model=schemas.ShowUser, status_code=status.HTTP_201_CREATED)
def create_user(request: schemas.User, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(models.User).filter(
        (models.User.email == request.email) | (models.User.name == request.name)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='User already exists'
        )
    
    new_user = models.User(
        name=request.name, 
        email=request.email, 
        password=hash_password(request.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get('/{id}', response_model=schemas.ShowUser)
def get_user(
    id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f'User with id {id} not found'
        )
    return user