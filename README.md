# PWA de consulta con Angular

Aplicación web progresiva pequeña que consume una API de Mockachino. Basada en el repositorio de la cátedra [pwa-angular](https://github.com/fabiancontigliani/pwa-angular); el README original quedó en [docs/README-base.md](docs/README-base.md) y el enunciado en [docs/enunciado.md](docs/enunciado.md).

## Decisiones de diseño

### 1. Alternativa elegida y alcance

**Lista de tareas.** La aplicación permite:

- Ver las tareas que devuelve la API.
- Filtrarlas en el navegador: **Todas**, **Pendientes** o **Completadas**.
- Pulsar **Actualizar** para volver a consultar la API.

Es una aplicación **solo de consulta**: no crea, edita ni marca tareas. Para cambiar los datos se edita la respuesta configurada en Mockachino.

Las pantallas de ejemplo del repositorio base (usuarios, tabla de usuarios, personas y contactos) se eliminan, y la lista de tareas pasa a ser la pantalla inicial.

### 2. Campos de cada elemento

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `id` | número | Sí | Identificador único de la tarea |
| `title` | texto | Sí | Descripción de la tarea, no vacía |
| `completed` | booleano | Sí | `true` si la tarea está terminada |

Los tres campos son obligatorios. Si la respuesta no es una lista, o algún elemento no tiene estos campos con su tipo, la aplicación lo muestra como **error de formato**: no lo convierte en una lista vacía ni descarta elementos sin avisar.

### 3. Endpoint y estructura JSON

```text
GET https://www.mockachino.com/<espacio>/tasks
```

_Pendiente: reemplazar `<espacio>` por el identificador real cuando se cree el mock._

- Estado `200` y `Content-Type: application/json`.
- El cuerpo es **una lista directa** de tareas, no un objeto que la contenga:

```json
[
  { "id": 1, "title": "Revisar el repositorio base", "completed": true },
  { "id": 2, "title": "Crear el endpoint en Mockachino", "completed": true },
  { "id": 3, "title": "Conectar la API", "completed": false }
]
```

La respuesta completa cargada en Mockachino está en [docs/mock/tasks.json](docs/mock/tasks.json). La misma URL se usa en el servicio Angular y en `dataGroups` de `ngsw-config.json`.

### 4. Información disponible sin conexión

- **La interfaz completa:** HTML, JavaScript, CSS, manifest e iconos, guardados por el service worker al instalarse.
- **La última lista de tareas obtenida mientras el service worker controlaba la página**, durante un máximo de 7 días.
- **El filtro**, porque se aplica en el navegador sobre la lista ya cargada.

Sin conexión, el botón Actualizar sigue haciendo la petición y el service worker responde con la copia guardada.

### 5. Sin datos, falla de la API y primera carga

| Situación | Qué muestra la aplicación |
| --- | --- |
| Petición en curso | Indicador de carga; el botón Actualizar queda deshabilitado |
| La API devuelve una lista vacía | "No hay tareas." |
| El filtro no deja ninguna tarea | "No hay tareas pendientes." o "No hay tareas completadas." |
| La API falla y no había tareas en pantalla | Mensaje de error y botón **Reintentar** |
| La API falla y ya había tareas en pantalla | Se conservan las tareas y se muestra el error |
| Sin conexión y sin datos guardados (el service worker responde `504`) | "Se necesita conexión para la primera carga de datos." |
| La respuesta no cumple el formato del punto 2 | Error de formato |

Además:

- Un **aviso de sin conexión** aparece según `navigator.onLine` y los eventos `online`/`offline`. Es solo orientativo: no impide la petición, porque el service worker puede responder desde su caché.
- Tras una consulta exitosa se muestra **"Datos obtenidos a las HH:MM"** y no "actualizados del servidor", porque la aplicación no puede saber si la respuesta vino de la red o del caché.
- Nunca se muestran datos de ejemplo escritos en el código en lugar de la respuesta de la API.

### 6. Cambios locales

**No hay cambios locales.** La aplicación no usa `localStorage` ni IndexedDB.

Lo único que se guarda en el navegador es el caché del service worker (Cache Storage). Para restablecerlo: DevTools → **Application** → **Storage** → **Clear site data**. Después hay que volver a abrir la aplicación con conexión para que guarde de nuevo la interfaz y los datos.

## Requisitos

- Node.js **22.x** y npm. _Pendiente: anotar las versiones exactas usadas._
- Chrome o Edge de escritorio para instalar la aplicación y probarla sin conexión.

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

El service worker de Angular (`ngsw-worker.js`) se configura en `ngsw-config.json` con dos tipos de grupos.

### assetGroups

Guardan los archivos necesarios para **abrir la aplicación**:

- `app`: `index.html`, JavaScript, CSS y manifest. Se descargan al instalar el service worker (`prefetch`).
- `assets`: iconos y demás recursos de `public/assets/`. Se cambia de `lazy` a `prefetch` para que estén disponibles desde la primera instalación.

### dataGroups y estrategia elegida

Guardan **respuestas de la API**. Hay un solo grupo, `tasks-api`, para el endpoint de tareas:

| Opción | Valor | Significado |
| --- | --- | --- |
| `strategy` | `freshness` | Primero intenta la red; si falla, usa la copia guardada |
| `timeout` | `5s` | Si la red tarda más de 5 segundos, usa la copia guardada |
| `maxAge` | `7d` | Una copia con más de 7 días deja de usarse |
| `maxSize` | `10` | Máximo de respuestas guardadas (no de tareas dentro de la lista) |

Se elige `freshness` porque prioriza mostrar los datos más recientes cuando hay conexión y recurre al caché solo cuando la red no responde.

## Instalación de la PWA y prueba sin conexión

_Pendiente: pasos para reproducir._

## Limitaciones

- **Hace falta una primera carga con conexión.** Si la aplicación nunca se abrió con conexión, no se puede abrir sin conexión. Si se guardó la interfaz pero no la respuesta de la API, se muestra el aviso de primera carga.
- **Los datos tienen que cargarse con el service worker ya activo.** La primera consulta puede ocurrir antes de que el service worker controle la página; en ese caso hay que recargar o pulsar Actualizar.
- **El caché vence a los 7 días** y se pierde si se borran los datos del sitio o el navegador libera espacio.
- **La aplicación no distingue entre datos de la red y datos del caché.**

## Evidencias

_Pendiente._ Las capturas van en [docs/evidencias/](docs/evidencias/).
