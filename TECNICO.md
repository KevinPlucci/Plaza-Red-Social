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
          models/             interfaces (Usuario)
          services/           AuthService (registro, login, sesión) y ModalService
          utils/errores.ts    traduce los errores HTTP a mensajes
        shared/
          components/         header, modal y error-campo
          validators.ts       validadores propios y textos de cada error
        pages/                login, registro, publicaciones, mi-perfil, no-encontrada
  backend/
    .env.example
    src/
      main.ts                 arranque y CORS
      app.module.ts           configuración, conexión a MongoDB y ValidationPipe global
      autenticacion/          controller (registro y login), service y DTO
      usuarios/               esquema Usuario y UsuariosService
      publicaciones/          esquema Publicacion (las rutas llegan en el sprint 2)
      imagenes/               esquema Imagen, guardado, GET /imagenes/:id y validación del archivo
      scripts/                cambiar-perfil.ts
    test/                     pruebas e2e
```

### Rutas del frontend

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Redirige a `/publicaciones` | Todos |
| `/publicaciones` | Publicaciones | Todos |
| `/mi-perfil` | Datos del usuario o aviso si no hay sesión | Todos |
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

Los errores siguen el formato de Nest, `{ statusCode, message, error }`. En los 400 de validación `message` es la lista
de errores, uno por campo. En los 409 se agrega `campo` (`correo` o `nombreUsuario`) para que el front marque el
dato repetido. El usuario se devuelve con `id` (en lugar de `_id`) y nunca con la contraseña.

### Modelo de datos

```mermaid
erDiagram
  usuarios ||--o{ publicaciones : "publica"
  usuarios }o--o{ publicaciones : "da me gusta"
  usuarios ||--|| imagenes : "foto de perfil (por URL)"
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
```

La colección `publicaciones` ya tiene su esquema, pero se empieza a usar en el sprint 2.

### Cómo viajan las peticiones

```text
Registro y login:
  Registro / Login -> AuthService -> HttpClient -> API
  API: ValidationPipe (DTO) + ImagenPipe (archivo) -> AutenticacionController -> AutenticacionService
       -> UsuariosService / ImagenesService -> Mongoose -> MongoDB

Respuesta:
  AuthService guarda el usuario (signal + localStorage) -> header, Publicaciones y Mi perfil se actualizan solos

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
  (archivos). `PublicacionesModule` ya registra su esquema.
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
- **Pruebas e2e** con Supertest contra un MongoDB en memoria (mongodb-memory-server), sin tocar la base real. Cubren
  registro, contraseña encriptada, imagen servida, duplicados, cada regla de la contraseña, mensajes por campo, imagen
  faltante, inválida o pesada, login por usuario y por correo, 401 y 404. Jest corre con `--experimental-vm-modules`
  porque el driver de MongoDB carga el módulo `os` con `import()` dinámico.

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
| 24/10/2026 | 0.1.2 | La documentación se divide en tres archivos: `README.md` con lo esencial, `FUNCIONAL.md` con las reglas, los requerimientos por sprint y los criterios adoptados, y `TECNICO.md` con la instalación, la arquitectura y las decisiones. |
| 24/10/2026 | 0.1.1 | Deploy: backend en Render con la base en MongoDB Atlas y frontend en Vercel, publicados automáticamente con cada push a `main`. El frontend de producción apunta a la API de Render, y la API solo acepta pedidos desde el dominio de Vercel (CORS). |
| 24/10/2026 | 0.1.0 | Sprint 1. Proyectos `frontend` (Angular 21) y `backend` (NestJS 11 + MongoDB). Backend: módulos Autenticación, Usuarios, Publicaciones e Imágenes; registro con imagen de perfil, contraseña con bcrypt, login por correo o nombre de usuario, validaciones con mensajes en castellano, status HTTP correctos, comando para cambiar el perfil y pruebas e2e. Frontend: pantallas de registro, login, publicaciones, mi perfil y 404, header con navegación, modal propio, validaciones en los formularios, favicon propio y diseño adaptable a celular. |
