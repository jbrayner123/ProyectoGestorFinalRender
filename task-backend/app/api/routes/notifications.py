from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core import database
from app.models import models
from app.schemas import notification as schemas
from app.core.auth import get_current_user_with_rate_limit

router = APIRouter()

@router.get("/notifications", response_model=schemas.NotificationListResponse)
def get_user_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    is_read: Optional[bool] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    # Consulta base
    query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    
    # Filtrar por estado de lectura si se especifica
    if is_read is not None:
        query = query.filter(models.Notification.is_read == is_read)
    
    # Obtener totales
    total = query.count()
    unread_count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    
    # Paginación
    offset = (page - 1) * limit
    notifications = query.order_by(models.Notification.created_at.desc()).offset(offset).limit(limit).all()
    
    # Agregar título de tarea a cada notificación
    notifications_with_titles = []
    for notification in notifications:
        task = db.query(models.Task).filter(models.Task.id == notification.task_id).first()
        notification_dict = {**notification.__dict__}
        notification_dict['task_title'] = task.title if task else "Tarea eliminada"
        notifications_with_titles.append(notification_dict)
    
    return {
        "notifications": notifications_with_titles,
        "total": total,
        "unread_count": unread_count
    }

@router.put("/notifications/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    
    # Agregar título de tarea
    task = db.query(models.Task).filter(models.Task.id == notification.task_id).first()
    notification_dict = {**notification.__dict__}
    notification_dict['task_title'] = task.title if task else "Tarea eliminada"
    
    return notification_dict

@router.put("/notifications/read-all", response_model=dict)
def mark_all_notifications_as_read(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return {"message": "Todas las notificaciones marcadas como leídas"}

@router.delete("/notifications/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    db.delete(notification)
    db.commit()
    return