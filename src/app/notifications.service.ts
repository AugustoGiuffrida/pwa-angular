import { Injectable, isDevMode } from '@angular/core';

// Avisos del sistema operativo que muestra el service worker mientras la app está abierta (no son push)
@Injectable({ providedIn: 'root' })
export class NotificationsService {

  // Sin service worker (npm start) o sin soporte del navegador no se ofrecen
  readonly available = !isDevMode() && 'Notification' in window && 'serviceWorker' in navigator;
  requesting = false;

  // Se lee siempre del navegador: el permiso puede cambiar desde los ajustes del sitio
  get permission(): NotificationPermission {
    return this.available ? Notification.permission : 'default';
  }

  // Solo se pide permiso desde el botón, nunca al abrir la app
  async enable() {
    if (!this.available || this.requesting) {
      return;
    }
    this.requesting = true;
    try {
      await Notification.requestPermission();
    } finally {
      this.requesting = false;
    }
  }

  async notify(body: string) {
    if (this.permission !== 'granted') {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Lista de tareas', {
        body,
        icon: 'assets/icons/icon-192x192.png',
        tag: 'tasks-sync',
        lang: 'es',
      });
    } catch {
      // El aviso es opcional: la tarjeta de estado ya muestra el resultado de la sincronización
    }
  }
}
