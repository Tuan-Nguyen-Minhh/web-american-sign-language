from typing import Annotated
from fastapi import APIRouter, Depends, status, HTTPException
from .. import jwt_token, schemas, database, models
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/user",
    tags=['Users']
)

@router.get('/{id}', response_model=schemas.ShowUser)
def get_user(id: int, db: Annotated[Session, Depends(database.get_db)], current_user: models.User = Depends(jwt_token.get_current_user)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f'User with id {id} not found'
        )
    return user