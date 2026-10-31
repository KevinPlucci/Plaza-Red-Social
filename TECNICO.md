# Vestuario · Documento técnico

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
   cp .env.example .env     # completar MONGODB_URI y JWT_SECRETO
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
| `JWT_SECRETO` | Clave con la que se firman y verifican los tokens. Sin ella la API no arranca | Un texto largo y aleatorio |
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
   `npm ci --include=dev && npm run build`, `npm run start:prod`), genera solo `JWT_SECRETO` y pide `MONGODB_URI`,
   `URL_PUBLICA` (la URL que asigna Render) y `CORS_ORIGEN` (la URL de Vercel, con `https://` y sin `/` final).
   En un servicio creado antes del sprint 3, `JWT_SECRETO` hay que agregarlo en *Environment* (o sincronizar el
   Blueprint) antes de publicar esta versión.
3. **Vercel:** *Add New → Project*, elegir *Import single project* en la carpeta `frontend`. Toma
   `frontend/vercel.json` (build, carpeta de salida y redirección de todas las rutas a `index.html`). Antes, poner la
   URL de Render en `frontend/src/environments/environment.ts`.

En el plan gratuito, Render apaga el servicio tras 15 minutos sin uso: el primer pedido después de eso tarda cerca de
un minuto. La pantalla de carga lo avisa si la validación del token demora.

---

## 2. Arquitectura

### Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21: componentes standalone, signals, formularios reactivos, lazy loading, guards funcionales, sin zone.js |
| Backend | NestJS 11 sobre Express, Mongoose, class-validator / class-transformer, bcryptjs, multer, `@nestjs/jwt` |
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
        app.routes.ts         rutas (todas con lazy loading) y sus guards
        core/
          models/             interfaces (Usuario, Sesion, Publicacion, Comentario, listados) y nombres de posiciones
          services/           AuthService, PublicacionesService, ModalService y VencimientoSesion
          guards/             sesionGuard (pantallas con sesión) e invitadoGuard (ingresar y registrarse)
          interceptors/       sesion.interceptor.ts: agrega el token y resuelve los 401
          utils/errores.ts    traduce los errores HTTP a mensajes
        shared/
          components/         header, modal, error-campo, tarjeta-publicacion, comentario y paginacion
          validators.ts       validadores propios y textos de cada error
        pages/                cargando, login, registro, publicaciones (+ nueva-publicacion),
                              publicacion (+ comentarios), mi-perfil, no-encontrada
  backend/
    .env.example
    src/
      main.ts                 arranque y CORS
      app.module.ts           configuración, conexión a MongoDB y ValidationPipe global
      comun/                  utilidades compartidas (recortar textos, validar ids)
      autenticacion/          controller (registro, login, autorizar, refrescar), service, DTO, token.ts,
                              SesionGuard, @UsuarioActual y @TokenActual
      usuarios/               esquema Usuario (con posición y club) y UsuariosService
      publicaciones/          controllers de publicaciones y comentarios, services, DTO, esquemas y vistas
      imagenes/               esquema Imagen, guardado, GET /imagenes/:id y validación del archivo
      scripts/                cambiar-perfil.ts
    test/                     pruebas e2e (autenticación y publicaciones)
```

### Rutas del frontend

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Redirige a `/publicaciones` | — |
| `/cargando` | Pantalla de carga: valida el token y sigue a `?destino=` (por defecto `/publicaciones`) | Con una sesión guardada; si no hay, lleva a `/login` |
| `/publicaciones` | Publicaciones. Acepta `?pagina=2&orden=meGusta` | Con sesión (`sesionGuard`) |
| `/publicaciones/:id` | Una publicación en grande con sus comentarios | Con sesión (`sesionGuard`) |
| `/mi-perfil` | Datos del usuario y sus últimas 3 publicaciones | Con sesión (`sesionGuard`) |
| `/login` | Ingreso | Sin sesión (`invitadoGuard`) |
| `/registro` | Alta de cuenta | Sin sesión (`invitadoGuard`) |
| Cualquier otra | Página 404 | Todos |

`sesionGuard` manda a `/login` si no hay sesión y, la primera vez en cada visita, a `/cargando?destino=<ruta pedida>`
para que el token se valide antes de mostrar la pantalla. Cada ruta define su `title`, que se ve en la pestaña del
navegador (por ejemplo, "Mi perfil · Vestuario").

### API

| Método | Ruta | Cuerpo | Respuestas |
|---|---|---|---|
| `POST` | `/autenticacion/registro` | `multipart/form-data`: `nombre`, `apellido`, `correo`, `nombreUsuario`, `contrasena`, `fechaNacimiento` (AAAA-MM-DD), `posicion` (`arquero`, `defensor`, `mediocampista` o `delantero`), `club` (opcional), `descripcion` y el archivo `imagenPerfil` | **201** `{ token, usuario }` · **400** datos inválidos o imagen faltante · **409** correo o nombre de usuario en uso |
| `POST` | `/autenticacion/login` | JSON `{ "usuario": "<correo o nombre de usuario>", "contrasena": "..." }` | **200** `{ token, usuario }` · **400** faltan datos · **401** credenciales incorrectas |
| `POST` | `/autenticacion/autorizar` | — (token en el header) | **200** datos del usuario · **401** token faltante, inválido o vencido |
| `POST` | `/autenticacion/refrescar` | — (token en el header) | **200** `{ token }` con el mismo payload y 15 minutos más · **401** token faltante, inválido o vencido |
| `GET` | `/imagenes/:id` | — | **200** la imagen · **404** no existe |
| `GET` | `/publicaciones` | Query: `orden` (`fecha` o `meGusta`, por defecto `fecha`), `usuario` (id), `offset` (por defecto 0), `limit` (1 a 50, por defecto 10) | **200** `{ publicaciones, total, offset, limit }` · **400** parámetros inválidos · **401** sin sesión |
| `GET` | `/publicaciones/:id` | — | **200** la publicación · **401** · **404** no existe o fue eliminada |
| `POST` | `/publicaciones` | `multipart/form-data`: `titulo`, `mensaje` y el archivo opcional `imagen` | **201** la publicación · **400** datos o imagen inválidos · **401** sin sesión |
| `DELETE` | `/publicaciones/:id` | — | **204** eliminada (baja lógica) · **401** sin sesión · **403** no es el autor ni un administrador · **404** no existe |
| `POST` | `/publicaciones/:id/me-gusta` | — | **201** `{ cantidadMeGusta, meGustaMio }` · **401** · **404** no existe · **409** ya había dado "Me gusta" |
| `DELETE` | `/publicaciones/:id/me-gusta` | — | **200** `{ cantidadMeGusta, meGustaMio }` · **401** · **404** no existe o no había dado "Me gusta" |
| `GET` | `/publicaciones/:id/comentarios` | Query: `offset`, `limit` | **200** `{ comentarios, total, offset, limit }`, los más recientes primero · **401** · **404** la publicación no existe |
| `POST` | `/publicaciones/:id/comentarios` | JSON `{ "mensaje": "..." }` (hasta 500 caracteres) | **201** el comentario con su autor y fecha · **400** mensaje vacío o largo · **401** · **404** la publicación no existe |
| `PUT` | `/publicaciones/:id/comentarios/:idComentario` | JSON `{ "mensaje": "..." }` | **200** el comentario con `modificado: true` · **400** · **401** · **403** no es el autor · **404** no existe o es de otra publicación |

Los errores siguen el formato de Nest, `{ statusCode, message, error }`. En los 400 de validación `message` es la lista
de errores, uno por campo. En los 409 del registro se agrega `campo` (`correo` o `nombreUsuario`) para que el front
marque el dato repetido. El usuario se devuelve con `id` (en lugar de `_id`) y nunca con la contraseña.

**Sesión.** Registro y login devuelven un JWT firmado con `JWT_SECRETO` (HS256) que vence a los 15 minutos. Su
payload es `{ sub, nombreUsuario, perfil }` (el id, el nombre de usuario y el rol) más `iat` y `exp`. Todas las rutas
de publicaciones y comentarios, `autorizar` y `refrescar` piden el header `Authorization: Bearer <token>`: sin él
responden 401 con "Tenés que iniciar sesión para hacer esto."; con un token vencido, adulterado o de una cuenta que ya
no existe, 401 con "Tu sesión venció o no es válida. Ingresá de nuevo.". Solo `GET /imagenes/:id` queda público,
porque las imágenes se cargan con `<img>`, que no manda headers.

Cada publicación se responde así (el autor viaja sin correo ni contraseña, y nunca la lista de quién dio "Me gusta"):

```json
{
  "id": "6adf…",
  "titulo": "Doblete en el clásico",
  "mensaje": "Ganamos 2 a 1 con dos goles de tiro libre.",
  "imagen": "https://red-social-api-95af.onrender.com/imagenes/6adf…",
  "usuario": { "id": "6adf…", "nombre": "Lucía", "apellido": "Fernández", "nombreUsuario": "luciafernandez", "imagenPerfil": "https://…", "posicion": "delantero" },
  "cantidadMeGusta": 3,
  "meGustaMio": true,
  "cantidadComentarios": 5,
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
    string posicion "arquero, defensor, mediocampista o delantero"
    string club "opcional"
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
    date createdAt "fecha del comentario"
    date updatedAt
  }
```

`publicaciones` tiene un índice por `activa` y `createdAt` (el listado siempre filtra las activas y por defecto
ordena por fecha) y `comentarios` uno por `publicacion`, que usan tanto el listado de comentarios como el conteo de
`cantidadComentarios`.

### Cómo viajan las peticiones

```text
Registro y login:
  Registro / Login -> AuthService -> HttpClient -> API
  API: ValidationPipe (DTO) + ImagenPipe (archivo) -> AutenticacionController -> AutenticacionService
       -> UsuariosService / ImagenesService -> Mongoose -> MongoDB; JwtService firma el token

Respuesta:
  AuthService guarda { token, usuario } (signal + localStorage) -> header, pantallas y VencimientoSesion se actualizan

Abrir o recargar la aplicación:
  sesionGuard -> /cargando -> AuthService.autorizar() -> API: SesionGuard -> 200 (sigue a destino) o 401 (login)

Publicaciones, comentarios, "Me gusta" y eliminar:
  Pantalla / componente -> PublicacionesService -> sesionInterceptor (agrega Authorization: Bearer) -> API
  API: SesionGuard (verifica el token y carga el usuario, o 401) -> ValidationPipe / ImagenPipe -> controller
       -> service -> agregación de Mongoose ($lookup del autor, $size de "Me gusta", conteo de comentarios) -> MongoDB
  Si responde 401: sesionInterceptor -> AuthService.expulsar() -> /login con el aviso "Tu sesión venció"

Vencimiento:
  VencimientoSesion lee el exp del token -> a los 10 minutos, modal "¿Querés extenderla?"
       -> AuthService.refrescar() (token nuevo) o, al vencer, AuthService.expulsar()

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
  material y de las guías de deploy. Por lo mismo se usa `@nestjs/jwt` 11.
- **Módulos por dominio**: `AutenticacionModule` usa a `UsuariosModule` (datos de las cuentas) y a `ImagenesModule`
  (archivos), registra `JwtModule` y exporta `JwtModule` y `UsuariosModule`, que es lo que necesita `SesionGuard`.
  `PublicacionesModule` tiene dos controllers (publicaciones y comentarios) y usa a `AutenticacionModule` e
  `ImagenesModule`.
- **JWT con `@nestjs/jwt`**: la clave sale de `JWT_SECRETO` (con `getOrThrow`, así la API no arranca sin ella) y la
  duración, de `DURACION_TOKEN_SEGUNDOS` (15 minutos) en `autenticacion/token.ts`. Registro y login responden
  `{ token, usuario }`. El token viaja en el cuerpo y no en una cookie: el front y la API están en dominios distintos
  (Vercel y Render) y así no hace falta configurar cookies entre sitios ni protección CSRF.
- **Un solo guard para la sesión.** `SesionGuard` lee `Authorization: Bearer <token>`, lo verifica con
  `JwtService.verifyAsync` (firma y vencimiento), busca al usuario del `sub` y deja el documento en `request.usuario`
  y el payload en `request.token`. Los decoradores `@UsuarioActual()` y `@TokenActual()` los entregan al controller.
  Reemplazó al header provisorio `X-Usuario-Id` del sprint 2 sin cambiar los controllers ni los services.
- **Permisos según la base, no según el token**: el perfil que decide si alguien puede eliminar una publicación es el
  del documento que carga el guard en cada pedido. El token lleva el rol, como pide la consigna, pero un cambio de
  perfil rige enseguida.
- **`autorizar` y `refrescar`** usan el mismo guard. `autorizar` devuelve el usuario que cargó el guard (datos frescos
  de la base). `refrescar` firma un token nuevo con `sub`, `nombreUsuario` y `perfil` del token recibido: mismo
  payload, nuevo `iat` y `exp`. Con un token vencido el guard ya responde 401, así que no se puede refrescar una sesión
  terminada.
- **Comentarios**: `ComentariosService` crea (el autor sale del token y la fecha de los timestamps) y edita solo si el
  comentario pertenece a esa publicación y al usuario (403 si es de otro, aunque sea administrador; 404 si no existe o
  es de otra publicación). Al editar marca `modificado: true`. Todas las operaciones validan antes que la publicación
  esté activa, así que una publicación eliminada se lleva sus comentarios.
- **Listados con agregaciones de MongoDB**: un solo pedido filtra las activas, calcula la cantidad de "Me gusta"
  (`$size`), ordena, pagina (`$skip` y `$limit`), trae al autor (`$lookup` a `usuarios`), cuenta los comentarios
  (`$lookup` a `comentarios` con `$count`, que usa el índice por publicación) y arma la respuesta (`$project`),
  incluido `meGustaMio` (`$in`) para quien pide. El total sale de `countDocuments` en paralelo. `GET /publicaciones/:id`
  usa las mismas etapas, así una publicación tiene siempre la misma forma.
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
  - `transform: true` convierte la fecha de nacimiento en `Date`, recorta los espacios y pasa la posición a
    minúsculas. Un club vacío se convierte en `undefined` (`textoOpcional`) para que `@IsOptional` lo saltee y no se
    guarde.
  - `stopAtFirstError: true` informa un solo error por campo. class-validator ejecuta los decoradores de abajo hacia
    arriba, por eso en cada propiedad el de "obligatorio" va al final.
- **Contraseñas con bcrypt** (10 rondas). En el login, `bcrypt.compare` encripta la contraseña recibida con la sal del
  hash guardado y compara el resultado. El campo tiene `select: false`: solo se trae explícitamente en el login.
- **Respuestas sin datos sensibles**: el `toJSON` del esquema de usuario cambia `_id` por `id` y borra la
  contraseña, así que ningún controller tiene que acordarse de hacerlo (también cuando el usuario viaja dentro de
  `{ token, usuario }`).
- **Status HTTP**: 201 al crear, 200 en el login, `autorizar` y `refrescar` (`@HttpCode`, porque no crean nada), 400
  datos inválidos, 401 credenciales incorrectas o sesión inválida, 403 sin permiso, 404 recurso inexistente y 409 dato
  repetido. El 409 sale de una verificación previa y también del índice único de MongoDB, por si llegan dos registros
  iguales a la vez.
- **Imágenes guardadas en MongoDB.** El disco de Render se borra en cada reinicio, así que cada archivo va a la
  colección `imagenes` y el usuario guarda solo la URL. `GET /imagenes/:id` la sirve con `Cache-Control` de un año,
  porque una imagen guardada nunca cambia. Si el alta del usuario falla, la imagen se borra.
- **Validación del archivo con un pipe propio (`ImagenPipe`)**: reconoce JPG, PNG, GIF y WEBP por sus primeros bytes,
  porque el tipo que manda el navegador se puede falsear, y guarda el tipo detectado. Rechaza los archivos de más de
  2 MB con un mensaje en castellano. multer tiene además un tope de 10 MB para no cargar en memoria archivos enormes.
- **Configuración con `@nestjs/config`** y CORS limitado a los orígenes de `CORS_ORIGEN`.
- **Pruebas e2e** con Supertest contra un MongoDB en memoria (mongodb-memory-server), sin tocar la base real: 66 en
  total. Autenticación (30): registro con posición y club (y sin club), token con identidad, rol y 15 minutos,
  contraseña encriptada, imagen servida, duplicados, cada regla de la contraseña, posición inválida, mensajes por
  campo, imagen faltante, inválida o pesada, login por usuario y por correo, `autorizar` (válido, sin token,
  adulterado, firmado con otra clave, vencido, cuenta inexistente) y `refrescar` (mismo payload y 15 minutos más,
  vencido, sin token). Publicaciones (36): sesión obligatoria en todas las rutas, validaciones, alta con y sin imagen,
  orden por fecha y por "Me gusta", paginación, filtro por usuario, cantidad de comentarios, parámetros inválidos,
  `GET` de una publicación, dar y quitar "Me gusta" (409 y 404), `meGustaMio` según quién pide, baja lógica con
  permisos (403, 204 del autor y del administrador), y comentarios: listar paginado, crear (400, 401, 404), editar
  (marca de editado, 403 aunque sea administrador, 404 de otra publicación) y nada de eso en una publicación
  eliminada. Los tokens viejos o vencidos se fabrican firmando con un `iat` en el pasado. Jest corre con
  `--experimental-vm-modules` porque el driver de MongoDB carga el módulo `os` con `import()` dinámico.

**Frontend**

- **Componentes standalone y signals**, sin zone.js, como recomienda Angular 21. La sesión (`{ token, usuario }`) es
  un `signal` en `AuthService`; `usuario`, `token`, `haySesion` y `vencimiento` (el `exp` del token, leído de su
  payload) son `computed`, y el header y las pantallas se actualizan solos al ingresar, refrescar o salir.
- **Lazy loading en todas las rutas**, con `title` propio y una ruta comodín `**` para la página 404.
- **Guards funcionales** (`core/guards/sesion.guards.ts`): `sesionGuard` protege las pantallas de la aplicación y,
  mientras el token no fue confirmado por el servidor en la visita (`sesionConfirmada`), manda a la pantalla de carga
  con la ruta pedida en `?destino=`. `invitadoGuard` saca de *Ingresar* y *Crear cuenta* a quien ya tiene sesión.
- **Pantalla de carga** (`pages/cargando`): llama a `autorizar`; si responde bien, sigue a `destino` (solo rutas
  internas, nunca `//otro-sitio` ni la propia pantalla); si el servidor no contesta, muestra el error con *Reintentar*
  en lugar de cerrar la sesión, y a los 4 segundos avisa que Render puede estar despertándose. El 401 lo resuelve el
  interceptor.
- **Interceptor de sesión** (`sesionInterceptor`): agrega `Authorization: Bearer <token>` a los pedidos a la API.
  Si un pedido que llevaba token recibe 401, llama a `AuthService.expulsar()` (cierra la sesión, va a `/login` y
  avisa) y corta el error con `EMPTY`, para que la pantalla no muestre además su propio modal de error. El 401 del
  login (credenciales incorrectas) no pasa por ahí, porque ese pedido no lleva token.
- **Aviso de vencimiento** (`VencimientoSesion`): un `effect` sobre `vencimiento` programa dos temporizadores por
  token, el aviso 5 minutos antes (a los 10 de sesión) y el cierre al vencer, y los reprograma cada vez que cambia el
  token. El aviso dice cuántos minutos quedan, y *Extender sesión* llama a `refrescar`. Si mientras el modal está
  abierto la sesión se cierra o el token cambia, la respuesta se ignora. El servicio se crea al arrancar, desde `App`.
- **Servicios con `HttpClient` y observables**: `AuthService` devuelve observables y guarda la sesión con `map` y
  `tap`. Los componentes se suscriben y usan `finalize` para habilitar de nuevo el botón.
- **Formularios reactivos** con `NonNullableFormBuilder` y validadores propios en `shared/validators.ts`: contraseña
  segura (informa cada regla que falta), contraseñas iguales (validador de grupo), nombre de usuario, correo o nombre
  de usuario para el login, fecha de nacimiento e imagen (tipo y tamaño). El componente `app-error-campo` muestra el
  primer error de cada campo con un texto claro, y el error 409 del servidor se marca en el campo con `setErrors`.
  La posición es un `<select>` obligatorio y el club, un campo opcional de hasta 50 caracteres.
- **El registro viaja como `FormData`** porque incluye la imagen. "Repetir contraseña" no se envía. La vista previa
  usa `URL.createObjectURL` y se libera al cambiar de imagen o salir de la pantalla.
- **Modal propio sobre `<dialog>`**: trae el foco, el fondo bloqueado y el cierre con Esc. `ModalService` abre el
  modal desde cualquier componente y devuelve una promesa con la respuesta, lo que sirve tanto para avisos como para
  confirmaciones ("¿Querés cerrar tu sesión?"). Con varios mensajes los muestra en lista. El evento `close` del
  `<dialog>` llega un instante después de cerrarlo; si el cierre lo hizo el propio componente, se ignora, porque para
  entonces ya puede estar abierto el modal siguiente (por ejemplo, "Sesión extendida" justo después de "¿Querés
  extenderla?").
- **Errores HTTP traducidos** en `core/utils/errores.ts`: sin conexión, errores de validación (la lista del back),
  credenciales y errores del servidor.
- **Cada publicación es un componente** (`TarjetaPublicacion`): recibe la publicación con `input()`, avisa con
  `output()` cuando se elimina y muestra contenido extra con `<ng-content>` (en Mi perfil, los comentarios). El estado
  del "Me gusta" es un `linkedSignal`: arranca con lo que trae la publicación y se actualiza con cada respuesta. Con
  `detalle` se muestra en grande, sin el enlace a su propia página ni el contador de comentarios.
- **Página de la publicación** (`pages/publicacion`): lee el id de la ruta, pide la publicación y distingue el 404
  ("La publicación no existe") de los demás errores (con *Reintentar*). Si se elimina desde ahí, vuelve al listado.
- **Comentarios** (`app-comentarios`): pide de a 5 con `offset` igual a la cantidad que ya se ve y agrega los nuevos
  debajo, descartando por id los que ya estaban (si alguien comentó mientras tanto, el `offset` se corre y la página
  puede repetir alguno). Un comentario propio nuevo se agrega primero y suma 1 al total, así el `offset` sigue
  coincidiendo con el orden del servidor.
- **Cada comentario es un componente** (`app-comentario`), que se usa en la página de la publicación y en Mi perfil.
  Si es propio, se edita en el lugar. Como la tarjeta, guarda su estado en un `linkedSignal` que se reemplaza por lo
  que devuelve la API al editar, así la lista que lo contiene no tiene que actualizarse.
- **Publicaciones con la página y el orden en la URL** (`?pagina=2&orden=meGusta`): se leen de
  `ActivatedRoute.queryParamMap` y cada cambio dispara la carga con `switchMap`, que descarta la respuesta anterior si
  el usuario cambia de página antes de que llegue. Mientras carga, la página anterior queda atenuada.
- **Componente de paginación** propio (`app-paginacion`): Anterior, números con saltos ("…") y Siguiente.
- **Mi perfil** pide las últimas 3 publicaciones y, en paralelo con `forkJoin`, los comentarios de cada una.
- **Fechas en castellano** con el locale `es-AR`. La fecha de nacimiento se guarda sin hora (medianoche UTC) y se
  muestra en UTC para que no cambie el día.
- **Accesibilidad**: cada campo tiene su `<label>` y el mensaje de error queda fuera de él, para que no forme parte del
  nombre del campo. Hay foco visible, el input de archivo está oculto pero sigue siendo accesible a través del botón,
  y la pantalla de carga y el pie de los comentarios anuncian sus cambios con `aria-live`.
- **Diseño**: estilos generales con variables de color en `styles.css` (fondo gris claro, tarjetas blancas y el verde
  del césped como color principal), sin librerías de componentes. El encabezado tiene franjas verdes como una cancha
  recién cortada. Se adapta al ancho del celular sin scroll horizontal.
- **Favicon propio** en SVG (una pelota de fútbol sobre fondo verde) con su versión ICO de 16, 32 y 48 px.

---

## 4. Historial de actualizaciones

| Fecha | Versión | Cambios |
|---|---|---|
| 31/10/2026 | 0.3.0 | Temática de jugadores de fútbol: la aplicación pasa a llamarse Vestuario, el registro suma la posición (obligatoria) y el club (opcional), la posición se ve junto al autor, y hay nuevos colores, encabezado con franjas de césped y favicon con una pelota. Sprint 3. Backend: JWT de 15 minutos con `@nestjs/jwt` (registro y login devuelven `{ token, usuario }`), `SesionGuard` con el token en lugar de `X-Usuario-Id`, `POST /autenticacion/autorizar` y `POST /autenticacion/refrescar`, todas las rutas de publicaciones con sesión, `GET /publicaciones/:id`, `cantidadComentarios` en cada publicación, alta y edición de comentarios, variable `JWT_SECRETO` y 24 pruebas e2e nuevas (66 en total). Frontend: token en `localStorage`, guards de sesión e invitado, pantalla de carga que valida el token, interceptor que agrega el token y vuelve al login con un 401, aviso a los 10 minutos para extender la sesión, página de cada publicación con comentarios (escribir, cargar más de a 5 y editar los propios) y componente de comentario reutilizado en Mi perfil. Se corrige el modal, que podía cerrar el modal siguiente si se abría enseguida. |
| 27/10/2026 | 0.2.0 | Sprint 2. Backend: controller de publicaciones (alta con imagen opcional, listado paginado con orden por fecha o "Me gusta" y filtro por usuario, baja lógica solo del autor o un administrador, dar y quitar "Me gusta"), listado de comentarios, `SesionGuard` con el header `X-Usuario-Id` como identidad provisoria y 23 pruebas e2e nuevas. Frontend: formulario para publicar, componente de publicación, selector de orden, paginación de a 5, "Me gusta", eliminar con confirmación, últimas 3 publicaciones con sus comentarios en Mi perfil, interceptor de sesión y spinner de carga. El correo del registro ahora exige un dominio completo, igual que el backend. |
| 24/10/2026 | 0.1.2 | La documentación se divide en tres archivos: `README.md` con lo esencial, `FUNCIONAL.md` con las reglas, los requerimientos por sprint y los criterios adoptados, y `TECNICO.md` con la instalación, la arquitectura y las decisiones. |
| 24/10/2026 | 0.1.1 | Deploy: backend en Render con la base en MongoDB Atlas y frontend en Vercel, publicados automáticamente con cada push a `main`. El frontend de producción apunta a la API de Render, y la API solo acepta pedidos desde el dominio de Vercel (CORS). |
| 24/10/2026 | 0.1.0 | Sprint 1. Proyectos `frontend` (Angular 21) y `backend` (NestJS 11 + MongoDB). Backend: módulos Autenticación, Usuarios, Publicaciones e Imágenes; registro con imagen de perfil, contraseña con bcrypt, login por correo o nombre de usuario, validaciones con mensajes en castellano, status HTTP correctos, comando para cambiar el perfil y pruebas e2e. Frontend: pantallas de registro, login, publicaciones, mi perfil y 404, header con navegación, modal propio, validaciones en los formularios, favicon propio y diseño adaptable a celular. |
