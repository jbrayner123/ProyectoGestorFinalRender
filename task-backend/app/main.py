# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import tasks, auth, user, notifications, categories  # AGREGAR categories

from app.core.database import engine, Base
import os
from dotenv import load_dotenv
load_dotenv()

from app.core.config import ALLOWED_ORIGINS

app = FastAPI(title="API Gestor de Tareas")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# incluir routers
app.include_router(tasks.router, prefix="", tags=["Tasks"])
app.include_router(auth.router, prefix="", tags=["Auth"])
app.include_router(user.router, prefix="", tags=["User"])
app.include_router(notifications.router, prefix="", tags=["Notifications"])
app.include_router(categories.router, prefix="", tags=["Categories"])  # NUEVA LÍNEA

@app.on_event("startup")
def on_startup():
    # crear tablas si no existen (solo en dev; en prod usa migraciones)
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "API Gestor de Tareas funcionando"}