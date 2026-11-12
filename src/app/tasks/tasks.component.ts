import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksStoreService } from '../tasks-store.service';
import { Task } from '../task';

type Filter = 'all' | 'pending' | 'completed';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'completed', label: 'Completadas' },
  ];

  filter: Filter = 'all';
  online = navigator.onLine;
  newTitle = '';
  editingId: string | null = null;
  editTitle = '';

  constructor(readonly store: TasksStoreService) {}

  ngOnInit() {
    this.store.sync();
  }

  // Solo orientativo: la sincronización se intenta igual con el botón
  @HostListener('window:online')
  @HostListener('window:offline')
  updateOnline() {
    this.online = navigator.onLine;
  }

  get tasks(): Task[] | null {
    return this.store.tasks;
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

  isPending(task: Task): boolean {
    return task.id in this.store.pending;
  }

  addTask() {
    if (this.newTitle.trim() === '') {
      return;
    }
    this.store.add(this.newTitle);
    this.newTitle = '';
  }

  toggle(task: Task) {
    this.store.update(task.id, { completed: !task.completed });
  }

  startEdit(task: Task) {
    this.editingId = task.id;
    this.editTitle = task.title;
  }

  saveEdit(task: Task) {
    const title = this.editTitle.trim();
    if (title !== '' && title !== task.title) {
      this.store.update(task.id, { title });
    }
    this.editingId = null;
  }

  cancelEdit() {
    this.editingId = null;
  }

  remove(task: Task) {
    if (window.confirm(`¿Borrar "${task.title}"?`)) {
      this.store.remove(task.id);
    }
  }

  trackById(_index: number, task: Task) {
    return task.id;
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
}
