from fastapi import APIRouter, HTTPException, Response, status, Query, Depends, Request
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.core import database
from app.models import models
from app.schemas import tasks as schemas
from datetime import datetime, date
from app.core.auth import get_current_user_with_rate_limit
from app.core.priority_queue import TaskPriorityQueue

router = APIRouter()

def _is_overdue_from_values(due_date, status):
    if due_date is None:
        return False
    if isinstance(due_date, str):
        due = date.fromisoformat(due_date)
    elif isinstance(due_date, date):
        due = due_date
    else:
        return False
    return due < date.today() and status != "completed"

def create_notification(db: Session, task_id: int, user_id: int, message: str):
    """Función auxiliar para crear notificaciones"""
    notification = models.Notification(
        task_id=task_id,
        user_id=user_id,
        message=message
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

@router.get("/listarTareas", response_model=schemas.TaskListResponse)
def list_tasks(
    request: Request,
    q: Optional[str] = Query(None),
    status: Optional[schemas.TaskStatus] = Query(None),
    important: Optional[bool] = Query(None),
    category_id: Optional[int] = Query(None),  # ✅ AGREGADO
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(10, ge=1, le=100, description="Elementos por página"),
    sort: Optional[str] = Query("created_at:desc", description="Ordenar por campo:dirección (ej: 'title:asc', 'priority:desc')"),
    use_priority_queue: bool = Query(False, description="Usar cola de prioridad para ordenamiento"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Lista SOLO las tareas del usuario autenticado con paginación, filtrado y ordenamiento.
    """
    query = db.query(models.Task).filter(models.Task.user_id == current_user.id)

    # Aplicar filtros
    if q:
        qn = f"%{q.lower()}%"
        query = query.filter(
            or_(
                models.Task.title.ilike(qn),
                models.Task.description.ilike(qn)
            )
        )
    
    if status:
        query = query.filter(models.Task.status == status.value)
    
    if important is not None:
        query = query.filter(models.Task.important == important)
    
    # ✅ NUEVO: Filtro por categoría
    if category_id is not None:
        query = query.filter(models.Task.category_id == category_id)

    # Resto del código permanece igual...
    # Usar cola de prioridad para ordenamiento
    if use_priority_queue:
        all_tasks = query.all()
        local_priority_queue = TaskPriorityQueue()
        local_priority_queue.push_all(all_tasks)
        priority_ordered_tasks = local_priority_queue.get_priority_list()
        
        total = len(priority_ordered_tasks)
        offset = (page - 1) * limit
        tasks = priority_ordered_tasks[offset:offset + limit]
        
        total_pages = (total + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1

        return {
            "tasks": tasks,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    else:
        # Ordenamiento tradicional
        if sort:
            sort_parts = sort.split(":")
            sort_field = sort_parts[0]
            sort_direction = sort_parts[1] if len(sort_parts) > 1 else "asc"
            
            if hasattr(models.Task, sort_field):
                field = getattr(models.Task, sort_field)
                if sort_direction == "desc":
                    query = query.order_by(desc(field))
                else:
                    query = query.order_by(asc(field))
        else:
            query = query.order_by(models.Task.created_at.desc())

        total = query.count()
        offset = (page - 1) * limit
        tasks = query.offset(offset).limit(limit).all()

        total_pages = (total + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1

        return {
            "tasks": tasks,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }

@router.get("/tareas-prioritarias", response_model=List[schemas.TaskOut])
def get_priority_tasks(
    limit: int = Query(10, ge=1, le=50, description="Número de tareas prioritarias a obtener"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Obtiene las tareas más prioritarias.
    Ordena por: prioridad, fecha de vencimiento e importancia.
    """
    tasks = db.query(models.Task).filter(
        models.Task.user_id == current_user.id,
        models.Task.is_completed == False
    ).all()
    
    priority_queue = TaskPriorityQueue()
    priority_queue.push_all(tasks)
    priority_tasks = priority_queue.get_priority_list(limit)
    
    return priority_tasks

@router.get("/tareas-proximas-vencer", response_model=List[schemas.TaskOut])
def get_upcoming_tasks(
    limit: int = Query(10, ge=1, le=50, description="Número de tareas próximas a vencer"),
    days_threshold: int = Query(3, ge=1, description="Días para considerar como 'próximo'"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Obtiene las tareas próximas a vencer.
    """
    from datetime import timedelta
    
    today = date.today()
    threshold_date = today + timedelta(days=days_threshold)
    
    tasks = db.query(models.Task).filter(
        models.Task.user_id == current_user.id,
        models.Task.is_completed == False,
        models.Task.due_date.isnot(None),
        models.Task.due_date <= threshold_date,
        models.Task.due_date >= today
    ).all()
    
    date_priority_queue = TaskPriorityQueue()
    date_priority_queue.push_all(tasks)
    upcoming_tasks = date_priority_queue.get_priority_list(limit)
    
    return upcoming_tasks

@router.post("/crearTarea", status_code=status.HTTP_201_CREATED, response_model=schemas.TaskOut)
def create_task(
    request: Request,
    payload: schemas.TaskCreate, 
    response: Response,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    """
    Crea la tarea para el usuario autenticado.
    """
    obj = payload.dict()
    now = datetime.utcnow()

    status_value = "completed" if obj.get("is_completed") else "pending"
    completed_at_value = now if obj.get("is_completed") else None

    task = models.Task(
        title=obj["title"],
        description=obj.get("description"),
        due_date=obj.get("due_date"),
        due_time=obj.get("due_time"),
        priority=obj.get("priority"),
        status=status_value,
        important=bool(obj.get("important")),
        user_id=current_user.id,
        category_id=obj.get("category_id"), 
        created_at=now,
        updated_at=now,
        completed_at=completed_at_value,
        is_completed=bool(obj.get("is_completed"))
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    create_notification(
        db=db,
        task_id=task.id,
        user_id=current_user.id,
        message=f"📝 Tarea creada: {task.title}"
    )

    response.headers["Location"] = f"/listarTarea/{task.id}"
    return task

@router.get("/listarTarea/{task_id}", response_model=schemas.TaskOut)
def get_task(
    request: Request,
    task_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    t = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="not found")
    if t.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta tarea")
    return t

@router.put("/editarTarea/{task_id}", response_model=schemas.TaskOut)
def update_task(
    request: Request,
    task_id: int, 
    payload: schemas.TaskUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    t = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="not found")
    if t.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta tarea")

    data = payload.dict(exclude_unset=True)
    
    old_status = t.status
    old_completed = t.is_completed

    if t.status == "completed" and data.get("status") and data.get("status") != "completed":
        raise HTTPException(status_code=400, detail="completed tasks cannot change to other states")

    if "title" in data: t.title = data["title"]
    if "description" in data: t.description = data["description"]
    if "due_date" in data: t.due_date = data["due_date"]
    if "due_time" in data: t.due_time = data["due_time"]
    if "priority" in data: t.priority = data["priority"]
    if "important" in data: t.important = data["important"]
    if "category_id" in data: t.category_id = data["category_id"]
    # Manejar is_completed y status de forma sincronizada
    if "is_completed" in data:
        t.is_completed = data["is_completed"]
        if t.is_completed:
            t.status = "completed"
            t.completed_at = datetime.utcnow()
        else:
            t.status = "pending"
            t.completed_at = None
    
    # Si se actualiza status directamente, sincronizar is_completed
    if "status" in data:
        t.status = data["status"]
        if t.status == "completed":
            t.is_completed = True
            t.completed_at = datetime.utcnow()
        else:
            t.is_completed = False
            t.completed_at = None

    t.updated_at = datetime.utcnow()
    db.add(t)
    db.commit()
    db.refresh(t)

    if ("is_completed" in data and data["is_completed"] and not old_completed) or \
       ("status" in data and data["status"] == "completed" and old_status != "completed"):
        create_notification(
            db=db,
            task_id=t.id,
            user_id=current_user.id,
            message=f"✅ Tarea completada: {t.title}"
        )
    
    elif "is_completed" in data and not data["is_completed"] and old_completed:
        create_notification(
            db=db,
            task_id=t.id,
            user_id=current_user.id,
            message=f"🔄 Tarea pendiente: {t.title}"
        )
    
    if "priority" in data and data["priority"] == "urgent" and t.priority != "urgent":
        create_notification(
            db=db,
            task_id=t.id,
            user_id=current_user.id,
            message=f"🚨 Prioridad urgente: {t.title}"
        )
    
    if "important" in data and data["important"] == True and not t.important:
        create_notification(
            db=db,
            task_id=t.id,
            user_id=current_user.id,
            message=f"⭐ Tarea importante: {t.title}"
        )
    
    if "due_date" in data and data["due_date"]:
        due_date = data["due_date"]
        today = date.today()
        days_until_due = (due_date - today).days
        
        if days_until_due == 1:
            create_notification(
                db=db,
                task_id=t.id,
                user_id=current_user.id,
                message=f"⏰ Tarea próxima: {t.title} vence mañana"
            )
        elif days_until_due == 0:
            create_notification(
                db=db,
                task_id=t.id,
                user_id=current_user.id,
                message=f"🚨 Tarea vence hoy: {t.title}"
            )
        elif days_until_due < 0:
            create_notification(
                db=db,
                task_id=t.id,
                user_id=current_user.id,
                message=f"🔴 Tarea vencida: {t.title}"
            )
    
    elif any(key in data for key in ['title', 'description', 'due_time', 'priority']):
        create_notification(
            db=db,
            task_id=t.id,
            user_id=current_user.id,
            message=f"✏️ Tarea actualizada: {t.title}"
        )

    return t

@router.delete("/eliminarTarea/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    request: Request,
    task_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    t = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="not found")
    if t.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta tarea")
    
    create_notification(
        db=db,
        task_id=task_id,
        user_id=current_user.id,
        message=f"🗑️ Tarea eliminada: {t.title}"
    )
    
    db.delete(t)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)