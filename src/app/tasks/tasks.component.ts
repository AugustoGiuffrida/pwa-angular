import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ApiService, InvalidResponseError } from '../api.service';
import { Task } from '../task';

type Filter = 'all' | 'pending' | 'completed';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'completed', label: 'Completadas' },
  ];

  // null mientras nunca se obtuvieron datos
  tasks: Task[] | null = null;
  filter: Filter = 'all';
  loading = false;
  error: string | null = null;
  loadedAt: Date | null = null;
  online = navigator.onLine;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit() {
    this.loadTasks();
  }

  // Solo orientativo: la petición se hace igual, el service worker puede responder desde su caché
  @HostListener('window:online')
  @HostListener('window:offline')
  updateOnline() {
    this.online = navigator.onLine;
  }

  get visibleTasks(): Task[] {
    const tasks = this.tasks ?? [];
    switch (this.filter) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks;
    }
  }

  loadTasks() {
    this.loading = true;
    this.error = null;
    this.apiService.getTasks()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: tasks => {
          this.tasks = tasks;
          this.loadedAt = new Date();
        },
        // Si ya había tareas en pantalla, se conservan
        error: err => this.error = this.describeError(err),
      });
  }

  trackById(_index: number, task: Task) {
    return task.id;
  }

  private describeError(err: unknown): string {
    if (err instanceof InvalidResponseError) {
      return err.message;
    }
    if (!(err instanceof HttpErrorResponse)) {
      return 'Ocurrió un error inesperado al obtener las tareas.';
    }
    // 0: el navegador no llegó a la API; 504: el service worker no tiene red ni copia guardada
    const unreachable = err.status === 0 || err.status === 504;
    if (unreachable && this.tasks === null && !navigator.onLine) {
      return 'Se necesita conexión para la primera carga de datos.';
    }
    if (unreachable) {
      return 'No se pudo conectar con la API.';
    }
    return `La API respondió con un error (${err.status}).`;
  }
}
