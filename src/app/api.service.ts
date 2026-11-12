import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { Task } from './task';

// La respuesta no tiene la forma documentada en el README
export class InvalidResponseError extends Error {}

// Sin respuesta en este tiempo, la petición se trata como un fallo de red
const TIMEOUT_MS = 10_000;

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // API de la carpeta api/ (uvicorn en el puerto 8000)
  private readonly tasksUrl = 'http://localhost:8000/api/tasks';

  constructor(private readonly http: HttpClient) { }

  getTasks(): Observable<Task[]> {
    return this.http.get<unknown>(this.tasksUrl).pipe(timeout(TIMEOUT_MS), map(parseTasks));
  }

  // Crea o reemplaza la tarea: repetir el mismo PUT no la duplica
  putTask(task: Task): Observable<Task> {
    const { title, completed } = task;
    return this.http.put<unknown>(`${this.tasksUrl}/${task.id}`, { title, completed }).pipe(
      timeout(TIMEOUT_MS),
      map(body => {
        if (!isTask(body) || body.id !== task.id) {
          throw new InvalidResponseError('La API devolvió una tarea con un formato inesperado.');
        }
        return body;
      }),
    );
  }

  // También responde 204 si la tarea ya no existía
  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.tasksUrl}/${id}`).pipe(timeout(TIMEOUT_MS));
  }
}

function parseTasks(body: unknown): Task[] {
  const tasks = (body as { tasks?: unknown } | null)?.tasks;
  if (!Array.isArray(tasks) || !tasks.every(isTask)) {
    throw new InvalidResponseError('La API devolvió datos con un formato inesperado.');
  }
  return tasks;
}

export function isTask(value: unknown): value is Task {
  const task = value as Partial<Task> | null;
  return typeof task?.id === 'string'
    && typeof task.title === 'string'
    && task.title.trim() !== ''
    && typeof task.completed === 'boolean';
}
