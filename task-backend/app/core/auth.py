from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core import database, security
from app.core.rate_limiting import api_rate_limiter
from app.models import models

bearer_scheme = HTTPBearer()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    
    # buscar usuario en DB
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user

def get_current_user_with_rate_limit(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
    db: Session = Depends(get_db)
):
    # Primero obtener el usuario (esto valida el token)
    user = get_current_user(credentials, db)
    
    # Usar user_id + IP como clave única para el rate limiting
    client_ip = request.client.host
    key = f"{user.id}:{client_ip}"
    
    # Verificar rate limiting para API autenticada
    if api_rate_limiter.is_blocked(key):
        block_time = api_rate_limiter.get_block_time_remaining(key)
        retry_after = int(block_time)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Límite de solicitudes excedido. Espere {retry_after} segundos.",
            headers={"Retry-After": str(retry_after)}
        )
    
    # Registrar la solicitud
    api_rate_limiter.record_request(key)
    
    return user