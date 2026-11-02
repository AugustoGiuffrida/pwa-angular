# PWA de consulta con Angular

Aplicación web progresiva pequeña que consume una API de Mockachino. Basada en el repositorio de la cátedra [pwa-angular](https://github.com/fabiancontigliani/pwa-angular); el README original quedó en [docs/README-base.md](docs/README-base.md) y el enunciado en [docs/enunciado.md](docs/enunciado.md).

## Decisiones de diseño

### 1. Alternativa elegida y alcance

_Pendiente._

### 2. Campos de cada elemento

_Pendiente._

### 3. Endpoint y estructura JSON

_Pendiente._ El JSON cargado en Mockachino se guarda en [docs/mock/](docs/mock/).

### 4. Información disponible sin conexión

_Pendiente._

### 5. Sin datos, falla de la API y primera carga

_Pendiente._

### 6. Cambios locales

_Pendiente._

## Requisitos

_Pendiente: versiones de Node y npm usadas._

## Instalación y ejecución local

```bash
npm ci
```

Desarrollo (sin service worker):

```bash
npm start
```

Compilación de producción servida como PWA en `http://localhost:8080`:

```bash
npm run serve:pwa
```

> El `package-lock.json` del repositorio base no coincidía con su `package.json` y `npm ci` fallaba. Se regeneró con `npm install` sin cambiar las versiones de Angular (18.2.14).

## Caché del service worker

### assetGroups

_Pendiente._

### dataGroups y estrategia elegida

_Pendiente._

## Instalación de la PWA y prueba sin conexión

_Pendiente: pasos para reproducir._

## Limitaciones

_Pendiente: primera carga online, vigencia del caché._

## Evidencias

_Pendiente._ Las capturas van en [docs/evidencias/](docs/evidencias/).
