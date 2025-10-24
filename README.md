# PWA Angular - API Cache Demo

Aplicación Progressive Web App (PWA) construida con Angular que demuestra diferentes estrategias de caché para APIs.

## Características

- ✅ Progressive Web App (PWA)
- ✅ Service Worker con estrategias de caché configurables
- ✅ Tres componentes con diferentes estrategias:
  - **Users**: Sin caché (siempre desde red)
  - **Persons**: Caché freshness (network-first)
  - **Contacts**: Caché performance (cache-first)
- ✅ Hash routing para compatibilidad con servidores estáticos
- ✅ Componentes standalone de Angular 18

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
npm install
```

## Desarrollo

Servidor de desarrollo con hot reload:

```bash
npm start
```

Navega a `http://localhost:4200`. La aplicación se recargará automáticamente si cambias algún archivo.

## Producción

### Build

```bash
npm run build
```

Los archivos de producción se generarán en `dist/pwa-api-cache/browser/`.

### Servir PWA localmente

```bash
npm run serve:pwa
```

Esto compila y sirve la aplicación en modo producción con http-server en `http://localhost:8080`.

## Estructura del Proyecto

```
src/
├── app/
│   ├── users/              # Componente sin caché
│   ├── persons/            # Componente con caché freshness
│   ├── contacts/           # Componente con caché performance
│   ├── api.service.ts      # Servicio para llamadas API
│   ├── app.config.ts       # Configuración de la aplicación
│   └── app.routes.ts       # Definición de rutas
├── index.html
├── main.ts
└── styles.css
ngsw-config.json            # Configuración del Service Worker
```

## Estrategias de Caché

### Sin Caché (Users)
- Siempre obtiene datos frescos de la red
- No configura service worker para este endpoint

### Freshness (Persons)
- Prioriza datos frescos (network-first)
- Timeout de 5 segundos
- Cache fallback si la red falla o tarda
- Máximo 1 día de antigüedad

### Performance (Contacts)
- Prioriza velocidad (cache-first)
- Respuesta instantánea desde caché
- Actualiza en segundo plano
- Máximo 7 días de antigüedad

## Tecnologías

- Angular 18
- TypeScript
- RxJS
- Angular Service Worker
- http-server

## Licencia

MIT
