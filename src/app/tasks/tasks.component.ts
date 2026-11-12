import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ApiService, InvalidResponseError } from '../api.service';
import { Task } from '../task';

type Filter = 'all' | 'pending' | 'completed';

// 'no-sw': ningún service worker controla la página (por ejemplo, con npm start)
type OfflineCopy = 'saved' | 'missing' | 'no-sw';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit, OnDestroy {

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
  // null hasta la primera comprobación
  offlineCopy: OfflineCopy | null = null;

  private readonly onControllerChange = () => this.checkOfflineCopy();

  constructor(private readonly apiService: ApiService) {}

  ngOnInit() {
    this.loadTasks();
    // Con clientsClaim, el service worker puede tomar el control después de la primera carga
    navigator.serviceWorker?.addEventListener('controllerchange', this.onControllerChange);
  }

  ngOnDestroy() {
    navigator.serviceWorker?.removeEventListener('controllerchange', this.onControllerChange);
  }

  // Solo orientativo: la petición se hace igual, el service worker puede responder desde su caché
  @HostListener('window:online')
  @HostListener('window:offline')
  updateOnline() {
    this.online = navigator.onLine;
  }

  get visibleTasks(): Task[] {
    return this.tasksFor(this.filter);
  }

  get completedCount(): number {
    return this.countFor('completed');
  }

  // Porcentaje de tareas completadas, para la barra de progreso
  get progress(): number {
    const total = this.tasks?.length ?? 0;
    return total === 0 ? 0 : Math.round(this.completedCount / total * 100);
  }

  countFor(filter: Filter): number {
    return this.tasksFor(filter).length;
  }

  private tasksFor(filter: Filter): Task[] {
    const tasks = this.tasks ?? [];
    switch (filter) {
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
      .pipe(finalize(() => {
        this.loading = false;
        // Workbox guarda la respuesta después de entregarla: se espera un momento antes de mirar el caché
        setTimeout(() => this.checkOfflineCopy(), 500);
      }))
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

  private checkOfflineCopy() {
    if (!navigator.serviceWorker?.controller) {
      this.offlineCopy = 'no-sw';
      return;
    }
    this.apiService.hasOfflineCopy()
      .then(saved => this.offlineCopy = saved ? 'saved' : 'missing');
  }

  private describeError(err: unknown): string {
    if (err instanceof InvalidResponseError) {
      return err.message;
    }
    if (!(err instanceof HttpErrorResponse)) {
      return 'Ocurrió un error inesperado al obtener las tareas.';
    }
    // 0: no se obtuvo respuesta, ni de la red ni del caché de Workbox
    const unreachable = err.status === 0;
    if (unreachable && this.tasks === null && !navigator.onLine) {
      return 'Se necesita conexión para la primera carga de datos.';
    }
    if (unreachable) {
      return 'No se pudo conectar con la API.';
    }
    return `La API respondió con un error (${err.status}).`;
  }
}
