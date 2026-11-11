import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),

    // Proveedor de HttpClient para hacer llamadas API
    // El service worker (Workbox) se registra en src/main.ts
    provideHttpClient(),
  ]
};
