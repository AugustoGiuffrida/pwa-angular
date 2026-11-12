// Configuración de Workbox: genera dist/pwa-api-cache/browser/sw.js después de `ng build`
module.exports = {
  globDirectory: 'dist/pwa-api-cache/browser/',

  // Precaché: archivos de la interfaz que se guardan al instalar el service worker.
  // Las respuestas de la API no se guardan acá: las tareas y los cambios pendientes viven en
  // localStorage (src/app/tasks-store.service.ts), así que no hay una segunda copia que pueda quedar vieja.
  globPatterns: [
    '**/*.{html,js,css,webmanifest}',
    'assets/**/*.png',
  ],

  swDest: 'dist/pwa-api-cache/browser/sw.js',

  // El nuevo service worker toma el control de la página apenas se activa
  skipWaiting: true,
  clientsClaim: true,
};
