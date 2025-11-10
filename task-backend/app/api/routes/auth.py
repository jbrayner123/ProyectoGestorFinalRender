from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.schemas import auth as auth_schemas
from app.models import models as models
from app.core import database, security
from app.core.rate_limiting import login_rate_limiter

from typing import Optional

router = APIRouter()

@router.post("/auth/register", response_model=auth_schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: auth_schemas.RegisterIn, db: Session = Depends(database.get_db)):
    # verificar si email existe
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    hashed = security.hash_password(payload.password)
    user = models.User(name=payload.name, email=payload.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = security.create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/auth/login", response_model=auth_schemas.Token)
def login(request: Request, payload: auth_schemas.LoginIn, db: Session = Depends(database.get_db)):
    client_ip = request.client.host
    
    # Verificar si la IP está bloqueada por demasiados intentos fallidos
    if login_rate_limiter.is_blocked(client_ip):
        block_time = login_rate_limiter.get_block_time_remaining(client_ip)
        retry_after = int(block_time)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Espere {retry_after} segundos antes de intentar nuevamente.",
            headers={"Retry-After": str(retry_after)}
        )
    
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    
    # Verificar credenciales
    if not user or not security.verify_password(payload.password, user.hashed_password):
        # Registrar intento fallido
        login_rate_limiter.record_request(client_ip)
        
        remaining_attempts = login_rate_limiter.get_remaining_requests(client_ip)
        
        if remaining_attempts > 0:
            raise HTTPException(
                status_code=401, 
                detail=f"Credenciales inválidas. Le quedan {remaining_attempts} intentos."
            )
        else:
            block_time = login_rate_limiter.get_block_time_remaining(client_ip)
            retry_after = int(block_time)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Espere {retry_after} segundos antes de intentar nuevamente.",
                headers={"Retry-After": str(retry_after)}
            )
    
    # Si el login es exitoso, limpiar los intentos fallidos para esta IP
    login_rate_limiter.clear_requests(client_ip)
    
    token = security.create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}