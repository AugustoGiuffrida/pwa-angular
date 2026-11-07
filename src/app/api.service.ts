import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task } from './task';

// La respuesta no tiene la forma { "tasks": [...] } documentada en el README
export class InvalidResponseError extends Error {}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Debe coincidir con la URL del grupo "tasks-api" en ngsw-config.json
  private readonly tasksUrl = 'https://www.mockachino.com/13417dd4-d40d-4e/tasks';

  constructor(private readonly http: HttpClient) { }

  getTasks(): Observable<Task[]> {
    return this.http.get<unknown>(this.tasksUrl).pipe(map(parseTasks));
  }
}

function parseTasks(body: unknown): Task[] {
  const tasks = (body as { tasks?: unknown } | null)?.tasks;
  if (!Array.isArray(tasks) || !tasks.every(isTask)) {
    throw new InvalidResponseError('La API devolvió datos con un formato inesperado.');
  }
  return tasks;
}

function isTask(value: unknown): value is Task {
  const task = value as Partial<Task> | null;
  return typeof task?.id === 'number'
    && typeof task.title === 'string'
    && task.title.trim() !== ''
    && typeof task.completed === 'boolean';
}
