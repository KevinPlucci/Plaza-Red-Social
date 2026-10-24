# Plaza · TP 2 Programación IV

Red social donde los usuarios se registran, publican, reaccionan con "Me gusta" y comentan.
El proyecto está dividido en dos: un **frontend en Angular** y un **backend en NestJS** con **MongoDB**.

| | |
|---|---|
| **Frontend** | _pendiente de deploy_ (Vercel) |
| **Backend** | _pendiente de deploy_ (Render) |
| **Estado** | Sprint 1 terminado |

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (componentes standalone, signals, formularios reactivos, sin zone.js) |
| Backend | NestJS 11 con Mongoose, class-validator y bcrypt |
| Base de datos | MongoDB (Atlas en producción) |
| Hosting | Vercel (front) y Render (back) |

## Estructura

```
tp2-red-social/
├── frontend/            Aplicación Angular
│   ├── public/          favicon propio (SVG e ICO)
│   └── src/app/
│       ├── core/        modelos, servicios (sesión y modales) y manejo de errores
│       ├── shared/      header, modal, mensajes de error de campos y validadores
│       └── pages/       login, registro, publicaciones, mi-perfil y página 404
├── backend/             API NestJS
│   ├── src/
│   │   ├── autenticacion/   rutas de registro y login
│   │   ├── usuarios/        esquema y servicio de usuarios
│   │   ├── publicaciones/   esquema de publicaciones
│   │   ├── imagenes/        guardado y entrega de imágenes
│   │   └── scripts/         cambio de perfil por consola
│   └── test/            pruebas e2e de la API
└── render.yaml          configuración del deploy del backend
```

## Cómo levantarlo

Hace falta Node 22 o superior y un MongoDB (local o Atlas).

**Backend** (puerto 3000):

```bash
cd backend
cp .env.example .env     # completar MONGODB_URI
npm install
npm run start:dev
```

**Frontend** (puerto 4200, ya apunta a `http://localhost:3000`):

```bash
cd frontend
npm install
npm start
```

| Comando | Dónde | Qué hace |
|---|---|---|
| `npm run start:dev` | backend | API con recarga automática |
| `npm test` | backend | Pruebas e2e de la API (levanta un MongoDB en memoria, no usa la base real) |
| `npm run perfil -- <correo o usuario> administrador` | backend | Cambia el perfil de una cuenta (`usuario` o `administrador`) |
| `npm start` | frontend | Servidor de desarrollo |
| `npm run build` | frontend | Build de producción en `dist/frontend/browser` |

### Variables de entorno del backend

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | Cadena de conexión de MongoDB |
| `URL_PUBLICA` | URL pública del backend. Con ella se arman las URL de las imágenes |
| `CORS_ORIGEN` | Orígenes del front que pueden usar la API, separados por coma |

## API

| Método | Ruta | Respuestas |
|---|---|---|
| `POST` | `/autenticacion/registro` | **201** usuario creado · **400** datos inválidos o imagen faltante · **409** correo o nombre de usuario en uso |
| `POST` | `/autenticacion/login` | **200** datos del usuario · **400** faltan datos · **401** credenciales incorrectas |
| `GET` | `/imagenes/:id` | **200** la imagen · **404** no existe |

- El **registro** recibe `multipart/form-data` con `nombre`, `apellido`, `correo`, `nombreUsuario`, `contrasena`,
  `fechaNacimiento` (AAAA-MM-DD), `descripcion` y el archivo `imagenPerfil`.
- El **login** recibe JSON `{ "usuario": "<correo o nombre de usuario>", "contrasena": "..." }`.
- Los errores siguen el formato de Nest: `{ statusCode, message, error }`. En los 400 de validación `message` es la
  lista de errores (uno por campo). En los 409 se agrega `campo` para que el front marque el dato repetido.
- Ninguna respuesta incluye la contraseña.

## Decisiones técnicas

- **Contraseñas con bcrypt.** Al registrarse se guarda solo el hash. En el login, `bcrypt.compare` encripta la
  contraseña recibida con la misma sal del hash guardado y compara el resultado. El campo tiene `select: false` en
  el esquema, así que nunca sale de la base salvo en el login.
- **Login con correo o nombre de usuario.** Los dos son únicos (índice único en MongoDB) y se guardan en
  minúsculas, así que `Ana`, `ana` y `ANA` son la misma cuenta. El nombre de usuario admite letras, números, punto y
  guion bajo (3 a 20 caracteres), por eso un texto con `@` siempre es un correo.
- **Imágenes guardadas en MongoDB.** Cada archivo va a la colección `imagenes` y el usuario guarda solo la URL
  (`/imagenes/:id`), que el backend sirve con caché larga. Se eligió así porque el disco de Render se borra en cada
  reinicio y de esta forma no hace falta otro servicio. Se aceptan JPG, PNG, GIF y WEBP de hasta 2 MB, y el tipo se
  detecta por el contenido del archivo, no por la extensión. Si el alta del usuario falla, la imagen se borra.
- **Perfil.** Toda cuenta nueva es `usuario`: el registro ignora un `perfil` enviado en el formulario. Para pasar una
  cuenta a `administrador` está el comando `npm run perfil`. Más adelante lo va a hacer un administrador desde el
  dashboard.
- **Validación en los dos lados.** El front valida para avisar en el momento, y el back valida igual porque es el que
  decide. Los mensajes están en castellano y el back devuelve un solo error por campo.
- **Status HTTP.** 201 al crear, 200 en el login (no crea nada), 400 datos inválidos, 401 credenciales incorrectas,
  404 recurso inexistente y 409 dato repetido.
- **Modales en lugar de `alert()`.** Un único componente `Modal` (sobre `<dialog>`, se cierra con Esc o clic afuera) y
  un `ModalService` que devuelve una promesa con la respuesta. Se usa para resultados del servidor y confirmaciones.
  Los errores de cada campo se muestran debajo del campo.
- **Sesión.** En este sprint el login devuelve los datos del usuario y el front los guarda en `localStorage` para
  mostrar el perfil. Los tokens JWT llegan en el sprint 3, como pide la consigna.
- **Navegación sin restricciones.** Como pide el sprint 1, todas las pantallas son accesibles. *Mi perfil* sin sesión
  muestra un aviso con accesos a ingresar o registrarse.

## Deploy

1. **MongoDB Atlas:** crear un cluster gratuito, un usuario de base de datos y permitir el acceso desde cualquier IP
   (`0.0.0.0/0`, porque Render no tiene IP fija). Copiar la cadena de conexión agregando el nombre de la base
   (`.../red-social?...`).
2. **Render (backend):** *New → Blueprint* con este repositorio (usa `render.yaml`) y cargar `MONGODB_URI`,
   `URL_PUBLICA` (la URL que asigna Render) y `CORS_ORIGEN` (la URL de Vercel). En el plan gratuito el servicio se
   duerme tras 15 minutos sin uso y el primer pedido tarda cerca de un minuto.
3. **Vercel (frontend):** importar el repositorio con *Root Directory* `frontend` (usa `frontend/vercel.json`). Antes,
   poner la URL de Render en `frontend/src/environments/environment.ts`.

## Requerimientos

Consigna del TP 2 (segundo parcial). Se corrige por sprints de una semana.

### Generales

- [x] Frontend en Angular
- [x] Servidor en NestJS
- [x] Base de datos MongoDB
- [ ] Login y registro contra el servidor propio con JWT (registro y login hechos; JWT en el sprint 3)
- [x] Respuestas con status correctos (nunca 200 en errores ni 400 en respuestas correctas)
- [x] Diseño trabajado y uniforme, sin `alert()`: modales
- [ ] Publicaciones con título, mensaje e imagen opcional, "Me gusta" y comentarios
- [ ] Ver y editar el perfil propio (ver: hecho)
- [ ] Solo se accede a la aplicación con sesión iniciada (sprint 3)

### Sprint 1

**Front**

- [x] Proyecto Angular
- [x] Pantallas: Registro, Login, Publicaciones y Mi perfil
- [ ] Deploy en hosting
- [x] Navegación entre componentes, sin límites de acceso
- [x] Favicon propio
- [x] Login: formulario con validaciones y mensajes
- [x] Login por correo o nombre de usuario, únicos en la base
- [x] Contraseña de al menos 8 caracteres, una mayúscula y un número
- [x] Registro: formulario con validaciones y mensajes
- [x] Registro: nombre, apellido, correo, nombre de usuario, contraseña, repetir contraseña, fecha de nacimiento y descripción breve
- [x] Registro: campo de tipo file para la imagen de perfil
- [x] Atributo perfil: "usuario" por defecto, modificable a "administrador"

**Back**

- [x] Proyecto NestJS
- [x] Módulos Publicaciones, Autenticación y Usuarios
- [x] `POST` registro: recibe y valida los datos y guarda el usuario
- [x] Contraseña encriptada
- [x] Imagen de perfil guardada y su URL en la base
- [x] `POST` login: recibe usuario o correo y contraseña sin encriptar
- [x] El login encripta la contraseña recibida para compararla
- [x] El login devuelve todos los datos del usuario

### Sprint 2

**Front**

- [ ] Publicaciones: listado ordenado por fecha por defecto
- [ ] Cambiar el orden a cantidad de "Me gusta"
- [ ] Cantidad limitada de publicaciones con paginación
- [ ] Cada publicación es un componente
- [ ] Dar y quitar "Me gusta"
- [ ] Eliminar mis publicaciones
- [ ] Mi perfil: todos los datos y la foto de perfil
- [ ] Mi perfil: mis últimas 3 publicaciones con sus comentarios

**Back**

- [ ] Alta, listado y baja lógica de publicaciones
- [ ] `POST` publicación de un usuario con título, descripción e imagen opcional guardada
- [ ] `DELETE` baja lógica, solo del autor o de un administrador
- [ ] `GET` listado con orden por fecha o "Me gusta", filtro por usuario y `offset`/`limit`
- [ ] `POST` "Me gusta" (uno por usuario y publicación)
- [ ] `DELETE` quitar el "Me gusta" propio

### Sprint 3

**Front**

- [ ] Página publicación: publicación en grande con sus comentarios
- [ ] Escribir comentarios
- [ ] Comentarios ordenados, carga limitada y botón "cargar más" sin perder los anteriores
- [ ] Editar los comentarios propios, que quedan marcados como editados
- [ ] Login y registro guardan el token en el navegador
- [ ] Pantalla de carga con spinner que valida el token con `autorizar` y redirige a publicaciones o al login
- [ ] A los 10 minutos de sesión, modal que avisa que quedan 5 y ofrece extenderla (refrescar el token)
- [ ] Un 401 redirige al login

**Back**

- [ ] Comentarios: listar, agregar y modificar
- [ ] `POST` comentario con usuario y fecha
- [ ] `PUT` modifica el mensaje y marca `modificado: true`
- [ ] `GET` comentarios de una publicación, paginados, más recientes primero
- [ ] Login y registro generan un JWT con la identidad del usuario y su rol
- [ ] El token se devuelve en la respuesta o por cookies
- [ ] El token vence a los 15 minutos
- [ ] `POST` autorizar: 401 si el token no es válido; si es válido, devuelve los datos del usuario
- [ ] `POST` refrescar: devuelve un token nuevo con el mismo payload y 15 minutos más

### Sprint 4

**Front**

- [ ] El administrador puede dar de baja cualquier publicación (y sus comentarios dejan de estar disponibles)
- [ ] Dashboard de usuarios, solo para administradores
- [ ] Listado de usuarios
- [ ] Alta de usuarios con los datos del registro y radio buttons para elegir "usuario" o "administrador"
- [ ] Alta y baja lógica de usuarios; un usuario deshabilitado no puede ingresar y se le avisa en el login
- [ ] Formulario de registro de nuevos usuarios
- [ ] Dashboard de estadísticas con gráficos de distintos tipos y lapso de tiempo elegible:
  - [ ] Publicaciones por usuario
  - [ ] Comentarios realizados
  - [ ] Comentarios por publicación
- [ ] PWA
- [ ] 3 pipes propios
- [ ] 3 directivas propias

**Back**

- [ ] Usuarios: listar, dar de alta y hacer bajas y altas lógicas, validando que el token sea de un administrador
- [ ] `GET` listado de usuarios
- [ ] `POST` alta de usuario con perfil elegible
- [ ] `DELETE` deshabilitar usuario (al intentar ingresar se le avisa que no está autorizado)
- [ ] `POST` rehabilitar usuario
- [ ] Estadísticas: rutas `GET` para los gráficos, solo para administradores

### Sprint 5 (recuperatorio)

- [ ] Ver el perfil de otro usuario al tocar su nombre o foto, con sus datos y sus últimas 3 publicaciones
- [ ] En ese perfil se mantienen las acciones del administrador (baja lógica de publicaciones)
- [ ] Scroll infinito en lugar de la paginación tradicional
- [ ] Estadísticas: ingresos por usuario, visitas a mi perfil (de otros usuarios) y "Me gusta" por día
- [ ] Back: la lógica necesaria para lo anterior

### Sprint 6 (final)

- [ ] Guardar una publicación o quitarla de guardados, indicando si está guardada
- [ ] Pantalla de guardados
- [ ] Botón compartir: elegir un usuario al que compartirle la publicación
- [ ] Pantalla de compartidos, con quién compartió cada publicación
- [ ] Ordenar por cantidad de veces guardada y compartida
- [ ] Back: `POST` guardar, `POST` quitar de guardados, `POST` compartir, `GET` compartidos conmigo y los nuevos ordenamientos

## Historial de cambios

### 0.1.0 · 2026-10-24 · Sprint 1

- Proyectos `frontend` (Angular 21) y `backend` (NestJS 11 + MongoDB).
- Backend: módulos Autenticación, Usuarios, Publicaciones e Imágenes. Registro con imagen de perfil, contraseña con
  bcrypt, login por correo o nombre de usuario, validaciones con mensajes en castellano y status HTTP correctos.
  Comando para cambiar el perfil de una cuenta. Pruebas e2e de la API.
- Frontend: pantallas de registro, login, publicaciones, mi perfil y 404, header con navegación, modal propio,
  validaciones en los formularios, favicon propio y diseño adaptable a celular.
- Configuración de deploy para Render (`render.yaml`) y Vercel (`frontend/vercel.json`).
