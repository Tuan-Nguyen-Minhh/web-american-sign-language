from typing import List, Annotated
from fastapi import APIRouter, Depends, status, HTTPException
from .. import jwt_token, schemas, database, models
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/blog",
    tags=['Blogs']
)

@router.get('/', response_model=List[schemas.ShowBlog])
def all_blogs(db: Annotated[Session, Depends(database.get_db)], current_user: Annotated[schemas.User, Depends(jwt_token.get_current_user)]):
    blogs = db.query(models.Blog).all()
    return blogs

@router.post('/', status_code=status.HTTP_201_CREATED)
def create(request: schemas.Blog, db: Annotated[Session, Depends(database.get_db)], current_user: Annotated[schemas.User, Depends(jwt_token.get_current_user)]):
    new_blog = models.Blog(title=request.title, body=request.body, user_id=current_user.id)
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return new_blog

@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def destroy(id:int, db: Annotated[Session, Depends(database.get_db)], current_user: Annotated[schemas.User, Depends(jwt_token.get_current_user)]):
    blog = db.query(models.Blog).filter(models.Blog.id == id).first()
    
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Blog with id {id} not found')
    
    # Check if user owns the blog
    if blog.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail='Not authorized to delete this blog')
    
    db.delete(blog)
    db.commit()
    return None

@router.put('/{id}', status_code=status.HTTP_202_ACCEPTED)
def update(id:int, request: schemas.Blog, db: Annotated[Session, Depends(database.get_db)], current_user: Annotated[schemas.User, Depends(jwt_token.get_current_user)]):
    blog = db.query(models.Blog).filter(models.Blog.id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Blog with id {id} not found')
    
    # Check if user owns the blog
    if blog.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail='Not authorized to update this blog')
    
    blog.title = request.title
    blog.body = request.body
    db.commit()
    db.refresh(blog)
    return blog

@router.get('/{id}', status_code=status.HTTP_200_OK, response_model=schemas.ShowBlog)
def show(id:int, db: Annotated[Session, Depends(database.get_db)], current_user: Annotated[schemas.User, Depends(jwt_token.get_current_user)]):
    blog = db.query(models.Blog).filter(models.Blog.id == id).first()
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f'Blog with id {id} not found'
        )
    return blog