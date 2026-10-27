# Plaza · Documento técnico

Cómo levantar el proyecto, cómo está construido y por qué se resolvió así.
Qué hace la aplicación y para quién está en [FUNCIONAL.md](FUNCIONAL.md).

## Índice

1. [Cómo levantar el proyecto](#1-cómo-levantar-el-proyecto)
2. [Arquitectura](#2-arquitectura)
3. [Decisiones técnicas](#3-decisiones-técnicas)
4. [Historial de actualizaciones](#4-historial-de-actualizaciones)

---

## 1. Cómo levantar el proyecto

### Requisitos

- Node.js 22 o superior (probado con Node 24)
- Un MongoDB: local (puerto 27017) o un cluster gratuito de [MongoDB Atlas](https://www.mongodb.com/atlas)

### Pasos

1. Backend (puerto 3000):

   ```bash
   cd backend
   cp .env.example .env     # completar MONGODB_URI
   npm install
   npm run start:dev
   ```

2. Frontend (puerto 4200; en desarrollo ya apunta a `http://localhost:3000`):

   ```bash
   cd frontend
   npm install
   npm start
   ```

3. Abrir <http://localhost:4200> y crear una cuenta desde *Registrarse*.

### Variables de entorno del backend

| Variable | Para qué | Ejemplo local |
|---|---|---|
| `MONGODB_URI` | Cadena de conexión de MongoDB, con el nombre de la base | `mongodb://127.0.0.1:27017/red-social` |
| `URL_PUBLICA` | URL pública del backend. Con ella se arman las URL de las imágenes | `http://localhost:3000` |
| `CORS_ORIGEN` | Orígenes del front que pueden usar la API, separados por coma | `http://localhost:4200` |

En el frontend la URL de la API está en `src/environments/environment.development.ts` (desarrollo) y
`src/environments/environment.ts` (producción).

### Comandos

| Comando | Dónde | Qué hace |
|---|---|---|
| `npm run start:dev` | backend | API con recarga automática |
| `npm test` | backend | Pruebas e2e de la API. Levantan un MongoDB en memoria, no tocan la base real |
| `npm run lint` | backend | ESLint |
| `npm run build` / `npm run start:prod` | backend | Compila a `dist/` y lo ejecuta |
| `npm run perfil -- <correo o usuario> <usuario\|administrador>` | backend | Cambia el perfil de una cuenta (usa la base del `.env`) |
| `npm start` | frontend | Servidor de desarrollo |
| `npm run build` | frontend | Build de producción en `dist/frontend/browser` |

### Deploy

| Parte | Dónde | URL |
|---|---|---|
| Frontend | Vercel (proyecto `plaza-red-social`, carpeta `frontend`) | <https://plaza-red-social.vercel.app> |
| Backend | Render (Blueprint `render.yaml`, servicio `red-social-api`, plan gratuito) | <https://red-social-api-95af.onrender.com> |
| Base de datos | MongoDB Atlas (cluster gratuito en AWS, base `red-social`) | — |

Cada push a `main` publica los dos automáticamente. Para armarlo desde cero:

1. **MongoDB Atlas:** crear un cluster gratuito y un usuario de base de datos, y en *Database & Network Access → IP
   Access List* permitir el acceso desde cualquier IP (`0.0.0.0/0`), porque Render no tiene IP fija. La cadena de
   conexión lleva el nombre de la base antes del `?`: `mongodb+srv://usuario:clave@cluster.../red-social?...`.
2. **Render:** *New → Blueprint* con el repositorio. Toma `render.yaml` (carpeta `backend`, Node 24,
   `npm ci --include=dev && npm run build`, `npm run start:prod`) y pide `MONGODB_URI`, `URL_PUBLICA` (la URL que
   asigna Render) y `CORS_ORIGEN` (la URL de Vercel, con `https://` y sin `/` final).
3. **Vercel:** *Add New → Project*, elegir *Import single project* en la carpeta `frontend`. Toma
   `frontend/vercel.json` (build, carpeta de salida y redirección de todas las rutas a `index.html`). Antes, poner la
   URL de Render en `frontend/src/environments/environment.ts`.

En el plan gratuito, Render apaga el servicio tras 15 minutos sin uso: el primer pedido después de eso tarda cerca de
un minuto.

---

## 2. Arquitectura

### Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21: componentes standalone, signals, formularios reactivos, lazy loading, sin zone.js |
| Backend | NestJS 11 sobre Express, Mongoose, class-validator / class-transformer, bcryptjs, multer |
| Base de datos | MongoDB (Atlas en producción) |
| Pruebas | Jest + Supertest + mongodb-memory-server (backend) |
| Hosting | Vercel (frontend) y Render (backend) |

### Estructura de carpetas

```text
tp2-red-social/
  render.yaml                 deploy del backend en Render
  frontend/
    vercel.json               deploy del frontend en Vercel
    public/                   favicon propio (SVG e ICO)
    src/
      environments/           URL de la API (desarrollo y producción)
      styles.css              estilos generales y variables de color
      app/
        app.routes.ts         rutas (todas con lazy loading)
        core/
          models/             interfaces (Usuario, Publicacion, Comentario, listados)
          services/           AuthService, PublicacionesService y ModalService
          interceptors/       sesion.interceptor.ts: agrega el usuario a cada pedido a la API
          utils/errores.ts    traduce los errores HTTP a mensajes
        shared/
          components/         header, modal, error-campo, tarjeta-publicacion y paginacion
          validators.ts       validadores propios y textos de cada error
        pages/                login, registro, publicaciones (+ nueva-publicacion), mi-perfil, no-encontrada
  backend/
    .env.example
    src/
      main.ts                 arranque y CORS
      app.module.ts           configuración, conexión a MongoDB y ValidationPipe global
      comun/                  utilidades compartidas (recortar textos, validar ids)
      autenticacion/          controller (registro y login), service, DTO, SesionGuard y @UsuarioActual
      usuarios/               esquema Usuario y UsuariosService
      publicaciones/          controllers de publicaciones y comentarios, services, DTO, esquemas y vistas
      imagenes/               esquema Imagen, guardado, GET /imagenes/:id y validación del archivo
      scripts/                cambiar-perfil.ts
    test/                     pruebas e2e (autenticación y publicaciones)
```

### Rutas del frontend

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Redirige a `/publicaciones` | Todos |
| `/publicaciones` | Publicaciones. Acepta `?pagina=2&orden=meGusta` | Todos (publicar y "Me gusta" con sesión) |
| `/mi-perfil` | Datos del usuario y sus últimas 3 publicaciones, o aviso si no hay sesión | Todos |
| `/login` | Ingreso | Todos |
| `/registro` | Alta de cuenta | Todos |
| Cualquier otra | Página 404 | Todos |

Cada ruta define su `title`, que se ve en la pestaña del navegador (por ejemplo, "Mi perfil · Plaza").

### API

| Método | Ruta | Cuerpo | Respuestas |
|---|---|---|---|
| `POST` | `/autenticacion/registro` | `multipart/form-data`: `nombre`, `apellido`, `correo`, `nombreUsuario`, `contrasena`, `fechaNacimiento` (AAAA-MM-DD), `descripcion` y el archivo `imagenPerfil` | **201** usuario creado · **400** datos inválidos o imagen faltante · **409** correo o nombre de usuario en uso |
| `POST` | `/autenticacion/login` | JSON `{ "usuario": "<correo o nombre de usuario>", "contrasena": "..." }` | **200** datos del usuario · **400** faltan datos · **401** credenciales incorrectas |
| `GET` | `/imagenes/:id` | — | **200** la imagen · **404** no existe |
| `GET` | `/publicaciones` | Query: `orden` (`fecha` o `meGusta`, por defecto `fecha`), `usuario` (id), `offset` (por defecto 0), `limit` (1 a 50, por defecto 10) | **200** `{ publicaciones, total, offset, limit }` · **400** parámetros inválidos |
| `POST` | `/publicaciones` | `multipart/form-data`: `titulo`, `mensaje` y el archivo opcional `imagen` | **201** la publicación · **400** datos o imagen inválidos · **401** sin sesión |
| `DELETE` | `/publicaciones/:id` | — | **204** eliminada (baja lógica) · **401** sin sesión · **403** no es el autor ni un administrador · **404** no existe |
| `POST` | `/publicaciones/:id/me-gusta` | — | **201** `{ cantidadMeGusta, meGustaMio }` · **401** · **404** no existe · **409** ya había dado "Me gusta" |
| `DELETE` | `/publicaciones/:id/me-gusta` | — | **200** `{ cantidadMeGusta, meGustaMio }` · **401** · **404** no existe o no había dado "Me gusta" |
| `GET` | `/publicaciones/:id/comentarios` | Query: `offset`, `limit` | **200** `{ comentarios, total, offset, limit }`, los más recientes primero · **404** la publicación no existe |

Los errores siguen el formato de Nest, `{ statusCode, message, error }`. En los 400 de validación `message` es la lista
de errores, uno por campo. En los 409 del registro se agrega `campo` (`correo` o `nombreUsuario`) para que el front
marque el dato repetido. El usuario se devuelve con `id` (en lugar de `_id`) y nunca con la contraseña.

**Sesión en el sprint 2.** Las rutas de publicaciones que modifican algo identifican al usuario con el header
`X-Usuario-Id` (el id que devuelven el registro y el login). Sin ese header, o con un id que no existe, responden 401.
El listado no lo exige: si viene, cada publicación indica en `meGustaMio` si ese usuario ya le dio "Me gusta". En el
sprint 3 el header se reemplaza por el token JWT.

Cada publicación se responde así (el autor viaja sin correo ni contraseña, y nunca la lista de quién dio "Me gusta"):

```json
{
  "id": "6adf…",
  "titulo": "Atardecer en la costa",
  "mensaje": "Así terminó el día.",
  "imagen": "https://red-social-api-95af.onrender.com/imagenes/6adf…",
  "usuario": { "id": "6adf…", "nombre": "Lucía", "apellido": "Fernández", "nombreUsuario": "luciafernandez", "imagenPerfil": "https://…" },
  "cantidadMeGusta": 3,
  "meGustaMio": true,
  "createdAt": "2026-10-27T14:17:02.311Z",
  "updatedAt": "2026-10-27T14:17:02.311Z"
}
```

### Modelo de datos

```mermaid
erDiagram
  usuarios ||--o{ publicaciones : "publica"
  usuarios }o--o{ publicaciones : "da me gusta"
  usuarios ||--|| imagenes : "foto de perfil (por URL)"
  publicaciones ||--o{ comentarios : "tiene"
  usuarios ||--o{ comentarios : "escribe"
  usuarios {
    ObjectId _id PK
    string nombre
    string apellido
    string correo UK "en minúsculas"
    string nombreUsuario UK "en minúsculas"
    string contrasena "hash de bcrypt, select false"
    date fechaNacimiento
    string descripcion
    string imagenPerfil "URL de /imagenes/:id"
    string perfil "usuario o administrador"
    date createdAt
    date updatedAt
  }
  publicaciones {
    ObjectId _id PK
    string titulo
    string mensaje
    string imagen "URL, opcional"
    ObjectId usuario FK
    ObjectId_array meGusta "usuarios"
    boolean activa "baja lógica"
    date createdAt
    date updatedAt
  }
  imagenes {
    ObjectId _id PK
    binary datos
    string tipo "MIME detectado"
    date createdAt
  }
  comentarios {
    ObjectId _id PK
    ObjectId publicacion FK
    ObjectId usuario FK
    string mensaje
    boolean modificado "editado por el autor"
    date createdAt
    date updatedAt
  }
```

`publicaciones` tiene un índice por `activa` y `createdAt` (el listado siempre filtra las activas y por defecto
ordena por fecha) y `comentarios` uno por `publicacion`. Los comentarios ya se listan; se crean y se editan desde el
sprint 3.

### Cómo viajan las peticiones

```text
Registro y login:
  Registro / Login -> AuthService -> HttpClient -> API
  API: ValidationPipe (DTO) + ImagenPipe (archivo) -> AutenticacionController -> AutenticacionService
       -> UsuariosService / ImagenesService -> Mongoose -> MongoDB

Respuesta:
  AuthService guarda el usuario (signal + localStorage) -> header, Publicaciones y Mi perfil se actualizan solos

Publicaciones, "Me gusta" y eliminar:
  Publicaciones / TarjetaPublicacion -> PublicacionesService -> sesionInterceptor (agrega X-Usuario-Id) -> API
  API: SesionGuard (carga el usuario o 401) -> ValidationPipe / ImagenPipe -> PublicacionesController
       -> PublicacionesService -> agregación de Mongoose ($lookup del autor, $size de "Me gusta") -> MongoDB

Mi perfil:
  listar({ usuario, limit: 3 }) y, para cada publicación, comentarios({ limit: 3 }) en paralelo (forkJoin)

Imágenes:
  <img src="https://.../imagenes/:id"> -> ImagenesController -> colección imagenes
```

---

## 3. Decisiones técnicas

**Backend**

- **NestJS 11 y no 12.** La versión 12 salió hace poco y sus paquetes `@nestjs/mongoose` y `@nestjs/config` se
  publican solo como ESM, que Jest no puede cargar. Nest 11 usa CommonJS, que es lo que muestra la mayor parte del
  material y de las guías de deploy.
- **Módulos por dominio**: `AutenticacionModule` usa a `UsuariosModule` (datos de las cuentas) y a `ImagenesModule`
  (archivos). `PublicacionesModule` tiene dos controllers (publicaciones y comentarios) y usa a `UsuariosModule` e
  `ImagenesModule`.
- **Identidad provisoria con un guard (sprint 2).** `SesionGuard` lee el header `X-Usuario-Id`, busca el usuario y lo
  deja en `request.usuario`; el decorador `@UsuarioActual()` lo entrega al controller. `@SesionOpcional()` marca las
  rutas que funcionan sin sesión (el listado). En el sprint 3 solo cambia el guard (el token JWT en lugar del header):
  los controllers no se tocan. Es una medida temporal porque el header se puede falsificar.
- **Listados con agregaciones de MongoDB**: un solo pedido filtra las activas, calcula la cantidad de "Me gusta"
  (`$size`), ordena, pagina (`$skip` y `$limit`), trae al autor (`$lookup` a `usuarios`) y arma la respuesta
  (`$project`), incluido `meGustaMio` (`$in`) para quien pide. El total sale de `countDocuments` en paralelo.
- **"Me gusta" atómico**: el filtro del `updateOne` incluye la condición (`meGusta: { $ne: usuario }` para dar,
  `meGusta: usuario` para quitar), así dos pedidos simultáneos no pueden sumar dos "Me gusta" del mismo usuario.
- **Permisos y status de publicaciones**: 401 sin sesión, 403 si quien elimina no es el autor ni un administrador, 404
  si no existe o ya fue eliminada (también si el id no tiene formato válido), 409 "Me gusta" repetido y 204 al
  eliminar (no hay nada que devolver).
- **Paginación validada**: `PaginacionDto` (`offset` y `limit` con valores por defecto, enteros, `limit` entre 1 y 50)
  y `ListarPublicacionesDto`, que lo extiende con `orden` y `usuario`.
- **Validación con DTO y un `ValidationPipe` global** registrado como `APP_PIPE`, así también se aplica en las
  pruebas:
  - `whitelist: true` descarta los campos no declarados (por ejemplo, un `perfil` enviado en el registro).
  - `transform: true` convierte la fecha de nacimiento en `Date` y recorta los espacios.
  - `stopAtFirstError: true` informa un solo error por campo. class-validator ejecuta los decoradores de abajo hacia
    arriba, por eso en cada propiedad el de "obligatorio" va al final.
- **Contraseñas con bcrypt** (10 rondas). En el login, `bcrypt.compare` encripta la contraseña recibida con la sal del
  hash guardado y compara el resultado. El campo tiene `select: false`: solo se trae explícitamente en el login.
- **Respuestas sin datos sensibles**: el `toJSON` del esquema de usuario cambia `_id` por `id` y borra la
  contraseña, así que ningún controller tiene que acordarse de hacerlo.
- **Status HTTP**: 201 al crear, 200 en el login (`@HttpCode`, porque no crea nada), 400 datos inválidos, 401
  credenciales incorrectas, 404 recurso inexistente y 409 dato repetido. El 409 sale de una verificación previa y
  también del índice único de MongoDB, por si llegan dos registros iguales a la vez.
- **Imágenes guardadas en MongoDB.** El disco de Render se borra en cada reinicio, así que cada archivo va a la
  colección `imagenes` y el usuario guarda solo la URL. `GET /imagenes/:id` la sirve con `Cache-Control` de un año,
  porque una imagen guardada nunca cambia. Si el alta del usuario falla, la imagen se borra.
- **Validación del archivo con un pipe propio (`ImagenPipe`)**: reconoce JPG, PNG, GIF y WEBP por sus primeros bytes,
  porque el tipo que manda el navegador se puede falsear, y guarda el tipo detectado. Rechaza los archivos de más de
  2 MB con un mensaje en castellano. multer tiene además un tope de 10 MB para no cargar en memoria archivos enormes.
- **Configuración con `@nestjs/config`** y CORS limitado a los orígenes de `CORS_ORIGEN`.
- **Pruebas e2e** con Supertest contra un MongoDB en memoria (mongodb-memory-server), sin tocar la base real: 42 en
  total. Autenticación (19): registro, contraseña encriptada, imagen servida, duplicados, cada regla de la contraseña,
  mensajes por campo, imagen faltante, inválida o pesada, login por usuario y por correo, 401 y 404. Publicaciones
  (23): sesión, validaciones, alta con y sin imagen, orden por fecha y por "Me gusta", paginación, filtro por usuario,
  parámetros inválidos, dar y quitar "Me gusta" (409 y 404), `meGustaMio` según quién pide, baja lógica con permisos
  (403, 204 del autor y del administrador) y comentarios. Jest corre con `--experimental-vm-modules` porque el driver
  de MongoDB carga el módulo `os` con `import()` dinámico.

**Frontend**

- **Componentes standalone y signals**, sin zone.js, como recomienda Angular 21. La sesión es un `signal` en
  `AuthService`: el header, Publicaciones y Mi perfil la leen y se actualizan solos al ingresar o salir.
- **Lazy loading en todas las rutas**, con `title` propio y una ruta comodín `**` para la página 404.
- **Servicios con `HttpClient` y observables**: `AuthService` devuelve observables y guarda la sesión con `tap`. Los
  componentes se suscriben y usan `finalize` para habilitar de nuevo el botón.
- **Formularios reactivos** con `NonNullableFormBuilder` y validadores propios en `shared/validators.ts`: contraseña
  segura (informa cada regla que falta), contraseñas iguales (validador de grupo), nombre de usuario, correo o nombre
  de usuario para el login, fecha de nacimiento e imagen (tipo y tamaño). El componente `app-error-campo` muestra el
  primer error de cada campo con un texto claro, y el error 409 del servidor se marca en el campo con `setErrors`.
- **El registro viaja como `FormData`** porque incluye la imagen. "Repetir contraseña" no se envía. La vista previa
  usa `URL.createObjectURL` y se libera al cambiar de imagen o salir de la pantalla.
- **Modal propio sobre `<dialog>`**: trae el foco, el fondo bloqueado y el cierre con Esc. `ModalService` abre el
  modal desde cualquier componente y devuelve una promesa con la respuesta, lo que sirve tanto para avisos como para
  confirmaciones ("¿Querés cerrar tu sesión?"). Con varios mensajes los muestra en lista.
- **Errores HTTP traducidos** en `core/utils/errores.ts`: sin conexión, errores de validación (la lista del back),
  credenciales y errores del servidor.
- **Interceptor de sesión** (`sesionInterceptor`): agrega `X-Usuario-Id` a los pedidos a la API cuando hay sesión. En
  el sprint 3 va a agregar el token.
- **Cada publicación es un componente** (`TarjetaPublicacion`): recibe la publicación con `input()`, avisa con
  `output()` cuando se elimina y muestra contenido extra con `<ng-content>` (en Mi perfil, los comentarios). El estado
  del "Me gusta" es un `linkedSignal`: arranca con lo que trae la publicación y se actualiza con cada respuesta.
- **Publicaciones con la página y el orden en la URL** (`?pagina=2&orden=meGusta`): se leen de
  `ActivatedRoute.queryParamMap` y cada cambio dispara la carga con `switchMap`, que descarta la respuesta anterior si
  el usuario cambia de página antes de que llegue. Mientras carga, la página anterior queda atenuada.
- **Componente de paginación** propio (`app-paginacion`): Anterior, números con saltos ("…") y Siguiente.
- **Mi perfil** pide las últimas 3 publicaciones y, en paralelo con `forkJoin`, los comentarios de cada una.
- **Fechas en castellano** con el locale `es-AR`. La fecha de nacimiento se guarda sin hora (medianoche UTC) y se
  muestra en UTC para que no cambie el día.
- **Accesibilidad**: cada campo tiene su `<label>` y el mensaje de error queda fuera de él, para que no forme parte del
  nombre del campo. Hay foco visible, y el input de archivo está oculto pero sigue siendo accesible a través del botón.
- **Diseño**: estilos generales con variables de color en `styles.css` (fondo gris claro, tarjetas blancas y un verde
  azulado como color principal), sin librerías de componentes. Se adapta al ancho del celular sin scroll horizontal.
- **Favicon propio** en SVG (globo de diálogo) con su versión ICO de 16, 32 y 48 px.

---

## 4. Historial de actualizaciones

| Fecha | Versión | Cambios |
|---|---|---|
| 27/10/2026 | 0.2.0 | Sprint 2. Backend: controller de publicaciones (alta con imagen opcional, listado paginado con orden por fecha o "Me gusta" y filtro por usuario, baja lógica solo del autor o un administrador, dar y quitar "Me gusta"), listado de comentarios, `SesionGuard` con el header `X-Usuario-Id` como identidad provisoria y 23 pruebas e2e nuevas. Frontend: formulario para publicar, componente de publicación, selector de orden, paginación de a 5, "Me gusta", eliminar con confirmación, últimas 3 publicaciones con sus comentarios en Mi perfil, interceptor de sesión y spinner de carga. El correo del registro ahora exige un dominio completo, igual que el backend. |
| 24/10/2026 | 0.1.2 | La documentación se divide en tres archivos: `README.md` con lo esencial, `FUNCIONAL.md` con las reglas, los requerimientos por sprint y los criterios adoptados, y `TECNICO.md` con la instalación, la arquitectura y las decisiones. |
| 24/10/2026 | 0.1.1 | Deploy: backend en Render con la base en MongoDB Atlas y frontend en Vercel, publicados automáticamente con cada push a `main`. El frontend de producción apunta a la API de Render, y la API solo acepta pedidos desde el dominio de Vercel (CORS). |
| 24/10/2026 | 0.1.0 | Sprint 1. Proyectos `frontend` (Angular 21) y `backend` (NestJS 11 + MongoDB). Backend: módulos Autenticación, Usuarios, Publicaciones e Imágenes; registro con imagen de perfil, contraseña con bcrypt, login por correo o nombre de usuario, validaciones con mensajes en castellano, status HTTP correctos, comando para cambiar el perfil y pruebas e2e. Frontend: pantallas de registro, login, publicaciones, mi perfil y 404, header con navegación, modal propio, validaciones en los formularios, favicon propio y diseño adaptable a celular. |
