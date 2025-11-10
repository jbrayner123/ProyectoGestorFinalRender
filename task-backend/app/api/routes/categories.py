from fastapi import APIRouter, HTTPException, Response, status, Depends
from typing import List
from sqlalchemy.orm import Session
from app.core import database
from app.models import models
from app.schemas import category as schemas
from app.core.auth import get_current_user_with_rate_limit

router = APIRouter()

@router.get("/categories", response_model=schemas.CategoryListResponse)
def list_categories(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Lista todas las categorías del usuario autenticado.
    """
    categories = db.query(models.Category).filter(
        models.Category.user_id == current_user.id
    ).all()
    
    # Agregar contador de tareas a cada categoría
    categories_with_count = []
    for category in categories:
        task_count = db.query(models.Task).filter(
            models.Task.category_id == category.id,
            models.Task.user_id == current_user.id
        ).count()
        
        category_dict = {
            **category.__dict__,
            'task_count': task_count
        }
        categories_with_count.append(category_dict)
    
    return {
        "categories": categories_with_count,
        "total": len(categories)
    }

@router.post("/categories", status_code=status.HTTP_201_CREATED, response_model=schemas.CategoryOut)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Crea una nueva categoría para el usuario autenticado.
    """
    # Verificar si ya existe una categoría con el mismo nombre para este usuario
    existing = db.query(models.Category).filter(
        models.Category.user_id == current_user.id,
        models.Category.name == payload.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Ya existe una categoría con el nombre '{payload.name}'"
        )
    
    category = models.Category(
        name=payload.name,
        color=payload.color,
        icon=payload.icon,
        user_id=current_user.id
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    # Agregar task_count = 0 para nueva categoría
    category_dict = {**category.__dict__, 'task_count': 0}
    return category_dict

@router.get("/categories/{category_id}", response_model=schemas.CategoryOut)
def get_category(
    category_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Obtiene una categoría específica por ID.
    """
    category = db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if category.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta categoría")
    
    # Agregar contador de tareas
    task_count = db.query(models.Task).filter(
        models.Task.category_id == category.id
    ).count()
    
    category_dict = {**category.__dict__, 'task_count': task_count}
    return category_dict

@router.put("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    category_id: int,
    payload: schemas.CategoryUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Actualiza una categoría existente.
    """
    category = db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if category.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta categoría")
    
    data = payload.dict(exclude_unset=True)
    
    # Verificar nombre duplicado si se está actualizando
    if "name" in data:
        existing = db.query(models.Category).filter(
            models.Category.user_id == current_user.id,
            models.Category.name == data["name"],
            models.Category.id != category_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe otra categoría con el nombre '{data['name']}'"
            )
    
    # Actualizar campos
    if "name" in data:
        category.name = data["name"]
    if "color" in data:
        category.color = data["color"]
    if "icon" in data:
        category.icon = data["icon"]
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    # Agregar contador de tareas
    task_count = db.query(models.Task).filter(
        models.Task.category_id == category.id
    ).count()
    
    category_dict = {**category.__dict__, 'task_count': task_count}
    return category_dict

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Elimina una categoría.
    Las tareas asociadas NO se eliminan, solo se les quita la categoría (category_id = NULL).
    """
    category = db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if category.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta categoría")
    
    # Desvincular tareas de esta categoría (no eliminarlas)
    db.query(models.Task).filter(
        models.Task.category_id == category_id
    ).update({"category_id": None})
    
    db.delete(category)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/categories/{category_id}/tasks")
def get_category_tasks(
    category_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Obtiene todas las tareas de una categoría específica.
    """
    category = db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    if category.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta categoría")
    
    tasks = db.query(models.Task).filter(
        models.Task.category_id == category_id,
        models.Task.user_id == current_user.id
    ).all()
    
    return {
        "category": category,
        "tasks": tasks,
        "total": len(tasks)
    }