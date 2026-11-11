// Configuración de Workbox: genera dist/pwa-api-cache/browser/sw.js después de `ng build`
module.exports = {
  globDirectory: 'dist/pwa-api-cache/browser/',

  // 1. Precaché: archivos de la interfaz que se guardan al instalar el service worker
  globPatterns: [
    '**/*.{html,js,css,webmanifest}',
    'assets/**/*.png',
  ],

  swDest: 'dist/pwa-api-cache/browser/sw.js',

  // El nuevo service worker toma el control de la página apenas se activa
  skipWaiting: true,
  clientsClaim: true,

  // 2. Caché en tiempo de ejecución: respuestas de la API de tareas
  runtimeCaching: [
    {
      // Debe coincidir con la URL de src/app/api.service.ts
      urlPattern: ({ url }) => url.href === 'https://www.mockachino.com/13417dd4-d40d-4e/tasks',
      // Primero la red; si falla o tarda más de 5 s, la copia guardada
      handler: 'NetworkFirst',
      options: {
        cacheName: 'tasks-api',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
        },
        // Solo se guardan respuestas correctas
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
  ],
};
