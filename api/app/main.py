"""API de tareas para la PWA: FastAPI + SQLite, sin ORM ni autenticación."""

import os
import sqlite3
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, StrictBool, StrictStr, field_validator


class TaskInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Estrictos: "true" o 1 no se convierten en booleano, ni un número en texto
    title: StrictStr
    completed: StrictBool

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El título no puede estar vacío")
        return value


class Task(BaseModel):
    id: UUID
    title: str
    completed: bool


class TaskList(BaseModel):
    tasks: list[Task]


def create_app() -> FastAPI:
    database_path = Path(os.getenv("DATABASE_PATH", "./data/tasks.db"))
    # localhost y 127.0.0.1 son orígenes distintos para el navegador: se permiten los dos
    default_origins = ",".join(
        f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in (4200, 8080)
    )
    origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", default_origins).split(",")
        if origin.strip()
    ]

    @contextmanager
    def connect():
        connection = sqlite3.connect(database_path)
        connection.row_factory = sqlite3.Row
        try:
            with connection:  # confirma la transacción al salir sin errores
                yield connection
        finally:
            connection.close()

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        database_path.parent.mkdir(parents=True, exist_ok=True)
        with connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    completed INTEGER NOT NULL
                )
                """
            )
        yield

    app = FastAPI(title="API de tareas", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
    )

    # La copia offline la maneja la PWA en localStorage: el navegador no debe guardar estas respuestas
    @app.middleware("http")
    async def no_store(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/tasks"):
            response.headers["Cache-Control"] = "no-store"
        return response

    def to_task(row: sqlite3.Row) -> dict:
        return {"id": row["id"], "title": row["title"], "completed": bool(row["completed"])}

    @app.get("/api/tasks", response_model=TaskList)
    def list_tasks():
        with connect() as connection:
            # rowid conserva el orden de creación aunque una tarea se modifique después
            rows = connection.execute("SELECT id, title, completed FROM tasks ORDER BY rowid").fetchall()
        return {"tasks": [to_task(row) for row in rows]}

    @app.put(
        "/api/tasks/{id}",
        response_model=Task,
        responses={201: {"model": Task, "description": "Tarea creada"}},
    )
    def put_task(id: UUID, task: TaskInput, response: Response):
        with connect() as connection:
            # Bloquea antes de consultar para que la existencia y la escritura sean atómicas
            connection.execute("BEGIN IMMEDIATE")
            exists = connection.execute("SELECT 1 FROM tasks WHERE id = ?", (str(id),)).fetchone()
            connection.execute(
                """
                INSERT INTO tasks (id, title, completed) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET title = excluded.title, completed = excluded.completed
                """,
                (str(id), task.title, int(task.completed)),
            )
        response.status_code = status.HTTP_200_OK if exists else status.HTTP_201_CREATED
        return {"id": id, **task.model_dump()}

    # Idempotente: repetir el borrado (por ejemplo, un reintento) también responde 204
    @app.delete("/api/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_task(id: UUID):
        with connect() as connection:
            connection.execute("DELETE FROM tasks WHERE id = ?", (str(id),))
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.get("/api/tasks/{id}", response_model=Task)
    def get_task(id: UUID):
        with connect() as connection:
            row = connection.execute("SELECT id, title, completed FROM tasks WHERE id = ?", (str(id),)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="La tarea no existe")
        return to_task(row)

    return app


app = create_app()
