from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core import database, security
from app.models import models
from app.schemas import user as user_schemas
from app.core.auth import get_current_user_with_rate_limit

router = APIRouter()

@router.get("/user", response_model=user_schemas.UserOut)
def get_current_user_profile(current_user: models.User = Depends(get_current_user_with_rate_limit)):
    return current_user

@router.put("/user", response_model=user_schemas.UserOut)
def update_current_user_profile(
    payload: user_schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    try:
        print(f"🔍 Recibiendo actualización para usuario: {current_user.id}")
        print(f"📦 Payload recibido: {payload.dict()}")
        
        # Verificar contraseña actual antes de cualquier modificación
        if not security.verify_password(payload.current_password, current_user.hashed_password):
            print("❌ Contraseña actual incorrecta")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="La contraseña actual es incorrecta"
            )

        # Obtener el usuario fresco de la base de datos
        user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Verificar si el email ya está en uso por otro usuario
        if payload.email and payload.email != user.email:
            existing = db.query(models.User).filter(
                models.User.email == payload.email,
                models.User.id != user.id
            ).first()
            if existing:
                print("❌ Email ya está en uso")
                raise HTTPException(status_code=400, detail="El email ya está registrado")

        # Actualizar campos
        updated = False
        
        if payload.name is not None and payload.name != user.name:
            user.name = payload.name
            updated = True
            print(f"✏️ Actualizando nombre a: {payload.name}")
        
        if payload.email is not None and payload.email != user.email:
            user.email = payload.email
            updated = True
            print(f"✉️ Actualizando email a: {payload.email}")
        
        if payload.password is not None and payload.password.strip():
            user.hashed_password = security.hash_password(payload.password)
            updated = True
            print("🔒 Actualizando contraseña")

        if not updated:
            print("⚠️ No hay cambios para aplicar")
            return user

        # Guardar cambios
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ Usuario actualizado correctamente: {user.name}, {user.email}")
        return user
        
    except HTTPException:
        # Re-lanzar excepciones HTTP
        raise
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )

@router.delete("/user", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user_profile(
    payload: user_schemas.UserDelete,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_with_rate_limit)
):
    try:
        # Verificar contraseña antes de eliminar la cuenta
        if not security.verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="La contraseña actual es incorrecta"
            )

        # Obtener el usuario fresco de la base de datos
        user_to_delete = db.query(models.User).filter(models.User.id == current_user.id).first()
        if not user_to_delete:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Eliminar usuario
        db.delete(user_to_delete)
        db.commit()
        
        print(f"✅ Usuario {user_to_delete.email} eliminado correctamente")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error al eliminar usuario: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )