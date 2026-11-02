# Trabajo práctico: aplicación web progresiva con Angular y una API

## 1. Objetivo

Desarrollar una aplicación web progresiva (**PWA**) pequeña que consuma una API, utilizando como base obligatoria este repositorio:

<https://github.com/fabiancontigliani/pwa-angular.git>

La aplicación debe permitir:

- Consultar datos de una API, por ejemplo creada en <https://www.mockachino.com/>.
- Instalarse desde un navegador compatible.
- Utilizar un manifest y un service worker.
- Abrirse sin conexión y consultar datos cargados previamente.
- Ejecutarse y demostrarse **localmente**, sin despliegue público.

Aplicar la filosofía **KISS: mantener la solución simple**. Una pantalla principal, un servicio HTTP y un modelo de datos pequeño son suficientes. No es necesario incorporar autenticación, un backend propio ni sincronización de modificaciones offline.

## 2. Elegir una aplicación

Implementar **una sola** de estas alternativas:

| Alternativa | Funcionalidad mínima | Datos sugeridos |
| --- | --- | --- |
| Lista de tareas | Consultar tareas y filtrar pendientes/completadas | `id`, `title`, `completed` |
| Tablón de mensajes | Consultar mensajes y buscar por texto | `id`, `author`, `text` |
| Catálogo sencillo | Consultar productos y filtrar por nombre | `id`, `name`, `price` |

**Recomendación:** elegir tareas si interesa trabajar con filtros de estado, o mensajes si se prefiere una interfaz de lectura. Un tablón no necesita chat, tiempo real ni usuarios registrados.

Para mantener el alcance reducido, la versión mínima será de **consulta**: lectura de la API y filtros locales. Si se agrega marcar tareas o mensajes como leídos, guardar esas preferencias localmente y documentar que no modifican el servidor. No hace falta implementar un CRUD completo.

### Decisiones de diseño que deben quedar documentadas

Antes de programar, escribir en el README de la aplicación:

1. Qué alternativa se eligió y qué permite hacer.
2. Qué campos contiene cada elemento y cuáles son obligatorios.
3. Qué endpoint se consulta y qué estructura JSON devuelve.
4. Qué información estará disponible sin conexión.
5. Qué ocurre cuando no hay datos, falla la API o nunca se cargaron datos previamente.
6. Si existen cambios locales, dónde se guardan y cómo se restablecen.

## 3. Preparar el repositorio base

### 3.1. Herramientas

- Git.
- Node.js **22.x** y npm, compatibles con Angular 18 del proyecto consultado.
- Un editor de código.
- Chrome o Edge de escritorio para una demostración consistente de instalación y service workers.

Comprobar las herramientas:

```bash
git --version
node --version
npm --version
```

Clonar la base en la carpeta donde se desarrollará la aplicación:

```bash
git clone https://github.com/fabiancontigliani/pwa-angular.git
cd pwa-angular
npm ci
```

Usar `npm ci` para instalar las versiones del `package-lock.json`. No actualizar Angular ni regenerar el proyecto desde cero como parte de esta tarea. Si la base cambia de versión, revisar su `package.json` y la compatibilidad de Node antes de instalar.

### 3.2. Reconocer lo que ya existe

En la versión revisada, el repositorio utiliza Angular 18 y componentes standalone. Incluye:

| Archivo | Responsabilidad |
| --- | --- |
| `src/app/api.service.ts` | Consumo HTTP de endpoints de ejemplo |
| `src/app/app.config.ts` | Proveedores HTTP, router y registro del service worker |
| `src/app/app.routes.ts` | Rutas de la aplicación |
| `src/app/app.component.*` | Contenedor y navegación principal |
| `public/manifest.webmanifest` | Metadatos para instalación |
| `public/assets/icons/` | Iconos de la aplicación |
| `ngsw-config.json` | Caché de archivos y respuestas de API |
| `angular.json` | Compilación y activación del service worker en producción |
| `package.json` | Dependencias y comandos de ejecución |

La base ya contiene `@angular/service-worker`, `provideHttpClient()` y `provideServiceWorker(...)`. **No es necesario ejecutar nuevamente `ng add @angular/pwa`.**

Actualmente, el caché de datos contempla endpoints de ejemplo de personas y contactos. Al cambiar la API en el servicio, también hay que cambiar esa configuración: el nuevo endpoint no se almacena automáticamente.

Ejecutar la base para conocer su comportamiento:

```bash
npm start
```

Abrir la dirección que indique Angular, normalmente `http://localhost:4200`. Este modo sirve para desarrollar la interfaz; las pruebas PWA se realizarán con la compilación de producción.

## 4. Crear una API sencilla en Mockachino

Mockachino permite definir respuestas HTTP simuladas. Para esta tarea basta un endpoint `GET` que devuelva una colección JSON.

1. Abrir <https://www.mockachino.com/>.
2. Crear un endpoint con método `GET` y una ruta acorde a la aplicación: `/tasks`, `/messages` o `/products`.
3. Configurar estado `200` y respuesta JSON con `Content-Type: application/json`.
4. Guardar la configuración y copiar la URL de lectura generada.
5. Conservar el enlace de administración por separado para poder editar los datos.
6. Verificar desde la aplicación local que el navegador puede leer la respuesta: el servicio debe permitir solicitudes entre orígenes mediante CORS.

No confundir una respuesta simulada a `POST` o `PUT` con persistencia real. Para esta solución se consumirá únicamente `GET`; las modificaciones del conjunto de ejemplo se realizan desde la configuración del mock.

### Opción A: tareas

Configurar una respuesta con esta estructura:

```json
[
  { "id": 1, "title": "Revisar el repositorio base", "completed": true },
  { "id": 2, "title": "Conectar la API", "completed": false },
  { "id": 3, "title": "Probar el modo sin conexión", "completed": false }
]
```

### Opción B: mensajes

```json
[
  { "id": 1, "author": "Cátedra", "text": "Ya está disponible la actividad PWA." },
  { "id": 2, "author": "Equipo", "text": "Revisar la aplicación antes de entregar." }
]
```

Usar identificadores únicos y datos ficticios. Mantener una estructura estable: si se eligió un arreglo directo, el servicio Angular debe esperar ese arreglo, no un objeto con otra forma.

## 5. Implementar la aplicación

### 5.1. Estructura mínima

Adaptar los ejemplos del repositorio para tener:

- Un modelo TypeScript para la entidad elegida.
- Un servicio encargado de la petición HTTP.
- Un componente principal con listado, filtros y estados de carga.
- Estilos simples y adaptables a pantallas pequeñas.

Se puede reutilizar `api.service.ts` y crear un componente para la opción elegida. Ajustar las rutas y los enlaces de navegación para que la pantalla inicial sea la nueva aplicación. Conservar el mecanismo de rutas hash de la base evita necesitar reglas especiales del servidor local.

### 5.2. Tipar el contrato de la API

Ejemplo para tareas, en `src/app/task.ts`:

```typescript
export interface Task {
  id: number;
  title: string;
  completed: boolean;
}
```

Adaptar el servicio con el endpoint generado:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from './task';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly tasksUrl =
    'https://www.mockachino.com/REEMPLAZAR_POR_TU_ESPACIO/tasks';

  constructor(private readonly http: HttpClient) {}

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.tasksUrl);
  }
}
```

La URL del ejemplo es un **marcador que debe reemplazarse**, no un endpoint listo para usar. Para mensajes, definir `Message`, `getMessages()` y la ruta correspondiente.

El tipo genérico de `HttpClient` no valida el JSON en tiempo de ejecución. Verificar que el mock cumple el contrato y no ocultar una respuesta incorrecta transformándola silenciosamente en una lista vacía.

### 5.3. Interfaz y estados

La pantalla debe incluir:

1. Título de la aplicación.
2. Listado de tareas, mensajes o productos.
3. Filtro sencillo según la opción elegida.
4. Botón **Actualizar**, que vuelva a realizar la consulta HTTP.
5. Indicador de carga mientras se resuelve la petición.
6. Mensaje de lista vacía cuando una respuesta válida no contiene elementos.
7. Mensaje de error y posibilidad de reintentar cuando no se obtienen datos.
8. Aviso orientativo de estado sin conexión.

Al iniciar el componente, consultar el servicio. Al actualizar, deshabilitar temporalmente el botón y restablecer el estado de carga tanto en éxito como en error; por ejemplo, mediante `finalize` de RxJS.

Si falla una actualización y ya hay elementos en pantalla, conservarlos y mostrar el error. No sustituir un fallo por datos de ejemplo que aparenten provenir de la API.

`navigator.onLine` y los eventos `online`/`offline` sirven como indicación de conectividad, pero no garantizan que la API responda. **No impedir la petición HTTP cuando `navigator.onLine` sea falso:** el service worker puede responder desde su caché.

En los componentes standalone, importar las dependencias de plantilla utilizadas, como `CommonModule` o `FormsModule` si se usa `ngModel`.

## 6. Configurar las características PWA

### 6.1. Manifest e iconos

Editar `public/manifest.webmanifest` para representar la aplicación elegida:

- `name`: nombre completo.
- `short_name`: nombre breve para el acceso instalado.
- `start_url` y `scope`: utilizar `./` para la ejecución desde la raíz local.
- `display`: `standalone`.
- `theme_color` y `background_color`: colores coherentes con la interfaz.
- `icons`: mantener rutas válidas y al menos iconos PNG de 192 × 192 y 512 × 512.

Los archivos dentro de `public/` se copian a la raíz publicada. Por ejemplo, un icono en `public/assets/icons/` se referencia como `assets/icons/...`, no como `public/assets/icons/...`.

Revisar que `src/index.html` enlace el manifest, tenga un título representativo y un color de tema acorde. Comprobar en el navegador que el manifest y sus iconos se descargan sin errores.

### 6.2. Registro del service worker

La base ya registra `ngsw-worker.js` con:

```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000'
})
```

Conservarlo. El registro está deshabilitado en modo de desarrollo y espera a que la aplicación esté estable o se alcance el plazo indicado.

La configuración de producción de `angular.json` ya contiene `serviceWorker: true` y `ngswConfigPath: "ngsw-config.json"`. No agregar un segundo service worker manual que compita por el mismo ámbito.

### 6.3. Almacenar la interfaz y los datos

Son dos responsabilidades distintas:

- `assetGroups`: guarda HTML, JavaScript, CSS y recursos para abrir la aplicación.
- `dataGroups`: guarda respuestas de la API para consultar información sin Internet.

Conservar los grupos de archivos existentes. Para que los iconos y demás recursos locales estén disponibles desde la primera instalación, cambiar el `installMode` del grupo `assets` a `prefetch`; para una aplicación pequeña, su costo es reducido.

Reemplazar los grupos de datos de ejemplo por uno para el endpoint elegido. Ejemplo del valor de **`dataGroups`** dentro de `ngsw-config.json`:

```json
[
  {
    "name": "tasks-api",
    "urls": [
      "https://www.mockachino.com/REEMPLAZAR_POR_TU_ESPACIO/tasks"
    ],
    "cacheConfig": {
      "strategy": "freshness",
      "maxSize": 10,
      "maxAge": "7d",
      "timeout": "5s"
    }
  }
]
```

No reemplazar todo el archivo por este arreglo: conservar `$schema`, `index` y `assetGroups`. Usar exactamente el endpoint de lectura configurado en el servicio Angular.

Esta estrategia intenta obtener datos de la red y puede recurrir al caché cuando la red falla o tarda demasiado. El botón Actualizar puede recibir información cacheada; no debe anunciar que recibió datos nuevos del servidor si no puede comprobarlo.

`maxSize` limita entradas de solicitudes, no la cantidad de tareas dentro del JSON. `maxAge` limita la vigencia del caché: no garantiza disponibilidad indefinida. Los datos también pueden perderse si se borra el almacenamiento del sitio o el navegador lo elimina.

**Condición necesaria para el modo offline:** abrir la app con conexión, esperar a que el service worker controle la página y cargar el endpoint al menos una vez bajo ese control. Si la primera consulta ocurrió antes, recargar o pulsar Actualizar después de la activación.

No es necesario duplicar las respuestas en `localStorage` ni agregar IndexedDB para este alcance. Si se elige guardar preferencias locales, mantenerlas separadas de las respuestas cacheadas.

## 7. Compilar y ejecutar localmente como PWA

Detener el servidor de desarrollo y ejecutar:

```bash
npm run serve:pwa
```

El script de la base compila la aplicación y publica `dist/pwa-api-cache/browser` mediante `http-server`, en el puerto `8080` y con el caché HTTP del servidor deshabilitado. Esto **no deshabilita** el caché administrado por el service worker.

Abrir:

```text
http://localhost:8080
```

`localhost` se considera un contexto confiable para service workers, por lo que no hace falta configurar HTTPS para esta entrega. Una dirección HTTP de la red local no recibe necesariamente ese mismo tratamiento.

Cada modificación de código, manifest o configuración del caché requiere volver a compilar y servir la aplicación. Si existe una versión anterior activa, cerrar las pestañas de la app y volver a abrirla para completar el ciclo de actualización.

## 8. Verificar el funcionamiento

### 8.1. API e interfaz

1. Abrir la aplicación con conexión.
2. Comprobar en la pestaña Network que se consulta el endpoint correcto.
3. Confirmar que la lista coincide con el JSON configurado.
4. Probar el filtro elegido.
5. Editar un dato desde Mockachino y pulsar Actualizar con conexión para comprobar que la app puede obtener cambios.
6. Probar una respuesta vacía y un fallo de consulta. Para verificar el error sin fallback, hacerlo sin una respuesta previa cacheada, por ejemplo en el servidor de desarrollo.
7. Restaurar los datos válidos para las comprobaciones PWA.

### 8.2. Manifest, control e instalación

En DevTools, abrir **Application**:

1. En **Manifest**, comprobar nombre, iconos, URL de inicio y ausencia de errores relevantes.
2. En **Service Workers**, comprobar que el worker está activado y controla la página. Recargar si todavía no la controla.
3. Mantener desactivado **Bypass for network** durante las pruebas del caché.
4. Consultar nuevamente la API para poblar el caché bajo control del worker.
5. En **Cache Storage**, inspeccionar las entradas de archivos y de datos creadas por Angular.
6. Instalar desde la opción de instalación del navegador y abrir la app instalada.
7. Confirmar que aparece con el nombre y el icono elegidos y funciona en una ventana independiente.

No es obligatorio crear un botón de instalación propio. La presentación de esa opción depende del navegador; no asumir que habrá un aviso automático en todos los entornos.

### 8.3. Prueba sin conexión

Con la aplicación ya controlada por el service worker y los datos cacheados:

1. Activar **Offline** en DevTools.
2. Hacer una recarga normal, sin borrar almacenamiento ni anular el service worker.
3. Comprobar que se muestra la interfaz.
4. Comprobar que aparecen los datos previamente consultados.
5. Verificar que el filtro local sigue funcionando.
6. Pulsar Actualizar y comprobar que el fallback de caché permite consultar esos datos.
7. Desactivar Offline y verificar que se pueden obtener datos de red nuevamente.

**No basta con dejar la página abierta y desconectar Internet:** los datos podrían estar solamente en memoria. La recarga offline es parte obligatoria de la comprobación.

Una primera visita completamente offline en un perfil limpio no puede descargar una aplicación que nunca fue instalada o cacheada. Documentar esa limitación. Si la interfaz está almacenada pero la respuesta de la API no, mostrar un mensaje comprensible indicando que se necesita conexión para la primera carga de datos.

### 8.4. Diagnóstico de problemas frecuentes

| Problema | Qué revisar |
| --- | --- |
| No aparece el service worker | Usar la compilación de producción en `localhost:8080` y esperar su registro |
| La interfaz abre offline pero faltan datos | Coincidencia del endpoint en `dataGroups` y carga previa bajo control del worker |
| Los cambios no aparecen | Recompilación, versión activa del worker y estado de conexión |
| La petición falla por CORS | Configuración del servicio remoto; no usar `no-cors`, que impide leer el JSON |
| No aparece la opción de instalar | Manifest, iconos, navegador compatible y si la app ya está instalada |
| El ejemplo de tareas no compila | Imports, modelo y referencias a métodos anteriores del servicio en componentes existentes |

Para reiniciar una prueba desde cero se puede desregistrar el worker y borrar los datos del sitio desde DevTools. Después es obligatorio volver a cargar online; esa limpieza elimina también la información necesaria para la prueba offline.

## 9. Entrega

Entregar el proyecto basado en el repositorio indicado, incluyendo:

- Código fuente y `package-lock.json`.
- README con la opción elegida y las decisiones de diseño.
- Modelo JSON y endpoint de lectura utilizados.
- Versiones de Node/npm y comandos de instalación y ejecución local.
- Explicación breve de `assetGroups`, `dataGroups` y la estrategia elegida.
- Pasos para reproducir instalación y acceso sin conexión.
- Evidencias de la lista cargada, la aplicación instalada y la recarga offline.

No incluir `node_modules` ni exigir un despliegue público para evaluar el trabajo.

### Criterios de aceptación

- [ ] Se utilizó `pwa-angular` como base.
- [ ] Se eligió una aplicación sencilla y se documentó su alcance.
- [ ] Se consume una API real de mock mediante HTTP, sin reemplazarla por un arreglo fijo en el componente.
- [ ] Se manejan carga, lista vacía y errores.
- [ ] El manifest y los iconos representan la aplicación.
- [ ] El service worker se registra y controla la página en la compilación de producción.
- [ ] La aplicación puede instalarse en el navegador elegido para la demostración.
- [ ] La interfaz y los datos cargados previamente sobreviven a una recarga sin conexión.
- [ ] Se documenta la necesidad de una primera carga online y la vigencia limitada del caché.
- [ ] La entrega se puede ejecutar localmente siguiendo el README.

## Referencias

- Repositorio base: <https://github.com/fabiancontigliani/pwa-angular>
- API simulada: <https://www.mockachino.com/>
- Compatibilidad de versiones Angular: <https://angular.dev/reference/versions>
- Service workers en Angular: <https://angular.dev/ecosystem/service-workers>
- Configuración del caché Angular: <https://angular.dev/ecosystem/service-workers/config>
