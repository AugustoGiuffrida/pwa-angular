import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { ApiService, InvalidResponseError, isTask } from './api.service';
import { NotificationsService } from './notifications.service';
import { Task } from './task';

// Cambio local que la API todavía no confirmó: guardar la versión local de la tarea o borrarla
export type PendingChange = 'save' | 'delete';

interface StoredState {
  tasks: Task[] | null;
  pending: Record<string, PendingChange>;
  lastSyncAt: number | null;
}

const STORAGE_KEY = 'lista-de-tareas.v1';

@Injectable({ providedIn: 'root' })
export class TasksStoreService {

  // null mientras nunca se obtuvo la lista y no se creó ninguna tarea
  tasks: Task[] | null = null;
  // Una marca por tarea: si se edita varias veces sin conexión, se envía solo la última versión
  pending: Record<string, PendingChange> = {};
  lastSyncAt: Date | null = null;
  syncing = false;
  syncError: string | null = null;
  // Cambios que la API rechazó (4xx): se descartan y queda la versión del servidor
  rejected: string[] = [];
  storageError: string | null = null;

  private syncAgain = false;

  constructor(
    private readonly apiService: ApiService,
    private readonly notifications: NotificationsService,
  ) {
    this.load();
    window.addEventListener('online', () => this.sync());
  }

  get pendingCount(): number {
    return Object.keys(this.pending).length;
  }

  add(title: string) {
    const task: Task = { id: crypto.randomUUID(), title: title.trim(), completed: false };
    this.tasks = [...(this.tasks ?? []), task];
    this.markPending(task.id, 'save');
  }

  update(id: string, changes: Partial<Omit<Task, 'id'>>) {
    this.tasks = (this.tasks ?? []).map(task => task.id === id ? { ...task, ...changes } : task);
    this.markPending(id, 'save');
  }

  remove(id: string) {
    this.tasks = (this.tasks ?? []).filter(task => task.id !== id);
    this.markPending(id, 'delete');
  }

  dismissRejected() {
    this.rejected = [];
  }

  // Envía los cambios pendientes y después reemplaza la lista con la del servidor
  async sync(): Promise<void> {
    if (this.syncing) {
      this.syncAgain = true;
      return;
    }
    this.syncing = true;
    this.syncError = null;
    try {
      let sent = 0;
      for (const [id, change] of Object.entries(this.pending)) {
        if (await this.send(id, change)) {
          sent++;
        }
      }
      const serverTasks = await firstValueFrom(this.apiService.getTasks());
      this.tasks = this.withPendingApplied(serverTasks);
      this.lastSyncAt = new Date();
      if (sent > 0) {
        this.notifications.notify(sent === 1
          ? 'Se envió 1 cambio a la API.'
          : `Se enviaron ${sent} cambios a la API.`);
      }
    } catch (err) {
      // Red o servidor: los cambios quedan pendientes y se reintentan en la próxima sincronización.
      // Sin conexión y con datos en pantalla no es un error: el estado de conexión ya lo indica.
      const expectedOffline = !navigator.onLine && this.tasks !== null && !(err instanceof InvalidResponseError);
      this.syncError = expectedOffline ? null : this.describeError(err);
    } finally {
      this.syncing = false;
      this.save();
    }
    if (this.syncAgain) {
      this.syncAgain = false;
      await this.sync();
    }
  }

  // Devuelve true si la API aceptó el cambio
  private async send(id: string, change: PendingChange): Promise<boolean> {
    const task = this.tasks?.find(item => item.id === id);
    let accepted = false;
    try {
      if (change === 'delete') {
        await firstValueFrom(this.apiService.deleteTask(id));
        accepted = true;
      } else if (task) {
        await firstValueFrom(this.apiService.putTask(task));
        accepted = true;
      }
    } catch (err) {
      if (!isRejection(err)) {
        throw err;
      }
      const name = task ? `"${task.title}"` : 'una tarea';
      this.rejected = [...this.rejected, `La API rechazó el cambio de ${name} (${err.status}); se descartó.`];
    }
    // Si la tarea cambió mientras se enviaba, la marca queda para la próxima vuelta
    const current = this.tasks?.find(item => item.id === id);
    if (this.pending[id] === change && current === task) {
      const { [id]: _sent, ...rest } = this.pending;
      this.pending = rest;
    }
    return accepted;
  }

  // La lista del servidor, con los cambios que todavía no se enviaron aplicados encima
  private withPendingApplied(serverTasks: Task[]): Task[] {
    const local = new Map((this.tasks ?? []).map(task => [task.id, task]));
    const merged = serverTasks
      .filter(task => this.pending[task.id] !== 'delete')
      .map(task => this.pending[task.id] === 'save' ? local.get(task.id) ?? task : task);
    const onlyLocal = [...local.values()]
      .filter(task => this.pending[task.id] === 'save' && !serverTasks.some(item => item.id === task.id));
    return [...merged, ...onlyLocal];
  }

  private markPending(id: string, change: PendingChange) {
    this.pending = { ...this.pending, [id]: change };
    this.save();
    if (navigator.onLine) {
      this.sync();
    }
  }

  private describeError(err: unknown): string {
    if (err instanceof InvalidResponseError) {
      return err.message;
    }
    // 0: no hubo respuesta (sin conexión o API apagada)
    if (err instanceof TimeoutError || (err instanceof HttpErrorResponse && err.status === 0)) {
      if (this.tasks === null) {
        return 'Se necesita conexión con la API para la primera carga de datos.';
      }
      return this.pendingCount > 0
        ? 'No se pudo conectar con la API. Los cambios quedan guardados en este dispositivo.'
        : 'No se pudo conectar con la API.';
    }
    if (err instanceof HttpErrorResponse) {
      return `La API respondió con un error (${err.status}).`;
    }
    return 'Ocurrió un error inesperado al sincronizar.';
  }

  private load() {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      this.storageError = 'No se pudo leer el almacenamiento del dispositivo. Revisá los permisos del sitio.';
      return;
    }
    if (raw === null) {
      return;
    }
    try {
      const state = parseState(JSON.parse(raw));
      this.tasks = state.tasks;
      this.pending = state.pending;
      this.lastSyncAt = state.lastSyncAt === null ? null : new Date(state.lastSyncAt);
    } catch {
      // La copia dañada se reemplaza en el próximo guardado
      this.storageError = 'La copia guardada en este dispositivo estaba dañada y se descartó. La lista se vuelve a descargar de la API.';
    }
  }

  private save() {
    const state: StoredState = {
      tasks: this.tasks,
      pending: this.pending,
      lastSyncAt: this.lastSyncAt?.getTime() ?? null,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      this.storageError = 'No se pudo guardar en el dispositivo (espacio o permisos). El último cambio no quedó guardado.';
    }
  }
}

// 4xx: la API no va a aceptar ese cambio aunque se reintente (salvo 408 y 429, que son temporales)
function isRejection(err: unknown): err is HttpErrorResponse {
  return err instanceof HttpErrorResponse
    && err.status >= 400 && err.status < 500
    && err.status !== 408 && err.status !== 429;
}

function parseState(value: unknown): StoredState {
  const state = value as Partial<StoredState> | null;
  const pending = state?.pending;
  const validTasks = state?.tasks === null || (Array.isArray(state?.tasks) && state.tasks.every(isTask));
  const validPending = typeof pending === 'object' && pending !== null
    && Object.values(pending).every(change => change === 'save' || change === 'delete');
  const validDate = state?.lastSyncAt === null || typeof state?.lastSyncAt === 'number';
  if (!validTasks || !validPending || !validDate) {
    throw new Error('Formato inválido');
  }
  return state as StoredState;
}
