# Plaza · Documento funcional

Qué hace la aplicación, para quién y con qué reglas.
La parte técnica (instalación, arquitectura y decisiones) está en [TECNICO.md](TECNICO.md).

## Índice

1. [Qué es Plaza](#1-qué-es-plaza)
2. [Perfiles](#2-perfiles)
3. [Pantallas](#3-pantallas)
4. [Registro e ingreso](#4-registro-e-ingreso)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Requerimientos por sprint](#6-requerimientos-por-sprint)
7. [Criterios adoptados](#7-criterios-adoptados)

---

## 1. Qué es Plaza

Una red social: cada persona crea su cuenta con sus datos y una foto de perfil, publica mensajes con título e imagen
opcional, y reacciona y comenta lo que publican los demás. Los administradores, además, moderan las publicaciones,
gestionan los usuarios y consultan estadísticas de uso.

El trabajo se entrega por sprints de una semana. Hoy está terminado el **sprint 1**: registro con foto de perfil,
ingreso con correo o nombre de usuario, la pantalla de publicaciones (todavía sin contenido) y el perfil propio.

## 2. Perfiles

| Perfil | Quién es | Qué puede hacer hoy |
|---|---|---|
| Visitante | Entra sin sesión | Recorrer todas las pantallas (el sprint 1 no limita el acceso), registrarse e ingresar |
| Usuario | Toda cuenta nueva | Lo anterior, más ver sus datos en *Mi perfil* y cerrar sesión |
| Administrador | Cuenta a la que se le cambió el perfil | Lo mismo que un usuario. Sus permisos propios (dar de baja publicaciones, dashboard de usuarios y estadísticas) llegan en el sprint 4 |

## 3. Pantallas

| Pantalla | Qué ofrece | Quién entra |
|---|---|---|
| Publicaciones | Saludo al usuario y el listado de publicaciones (vacío hasta el sprint 2). Sin sesión, accesos a ingresar o crear cuenta | Todos |
| Mi perfil | Foto, nombre y apellido, nombre de usuario, perfil, descripción, correo, fecha de nacimiento y fecha de alta. Sin sesión, un aviso con accesos a ingresar o registrarse | Todos |
| Crear cuenta | Formulario de registro con imagen de perfil y vista previa | Todos |
| Ingresar | Formulario con correo o nombre de usuario y contraseña | Todos |
| Página no encontrada | Aviso para direcciones que no existen, con un enlace a publicaciones | Todos |

El encabezado está en todas las pantallas: lleva a Publicaciones y a Mi perfil y, según haya sesión o no, muestra la
foto y el nombre de usuario con el botón para cerrar sesión, o los accesos a ingresar y registrarse.

## 4. Registro e ingreso

**Registro**

1. La persona completa el formulario y elige su imagen de perfil, que se ve en un círculo antes de enviar.
2. Cada campo avisa su error apenas se sale de él, y al tocar *Crear cuenta* se marcan todos los que falten.
3. Si el correo o el nombre de usuario ya existen, un modal lo explica y el campo queda marcado en rojo.
4. Si todo está bien, se crea la cuenta con perfil "usuario", la sesión queda iniciada y un modal da la bienvenida.
   Desde ahí se pasa a Publicaciones.

**Ingreso**

1. Se escribe el correo o el nombre de usuario (da igual mayúsculas o minúsculas) y la contraseña.
2. Si las credenciales no coinciden, un modal avisa "Usuario o contraseña incorrectos." sin decir cuál de los dos
   falló.
3. Si coinciden, se entra a Publicaciones con la sesión iniciada. La sesión se mantiene al recargar la página.

**Cierre de sesión:** el botón del encabezado pide confirmación en un modal y después lleva a Ingresar.

## 5. Reglas de negocio

| Dato | Regla |
|---|---|
| Nombre y apellido | Obligatorios, hasta 50 caracteres cada uno |
| Correo | Obligatorio, con formato válido, único en la base. Se guarda en minúsculas |
| Nombre de usuario | Obligatorio, único, de 3 a 20 caracteres: letras, números, punto o guion bajo. Se guarda en minúsculas |
| Contraseña | Al menos 8 caracteres, una mayúscula y un número. Se pide dos veces y las dos tienen que coincidir |
| Fecha de nacimiento | Obligatoria, no puede ser futura ni anterior a 1900 |
| Descripción breve | Obligatoria, hasta 200 caracteres, con un contador a la vista |
| Imagen de perfil | Obligatoria. JPG, PNG, GIF o WEBP de hasta 2 MB |
| Perfil | Toda cuenta nueva es "usuario". No se puede elegir al registrarse |

Otras reglas:

- Los mensajes de la aplicación se muestran en modales, nunca con `alert()` del navegador.
- Las validaciones se hacen en la pantalla, para avisar en el momento, y se repiten en el servidor, que es el que
  decide.
- Ninguna respuesta del servidor incluye la contraseña, que se guarda encriptada.

## 6. Requerimientos por sprint

Referencias: `[x]` implementado · `[ ]` pendiente.

### Generales

- [x] Frontend en Angular
- [x] Servidor en NestJS
- [x] Base de datos MongoDB
- [ ] Login y registro contra el servidor propio con JWT (registro y login hechos; JWT en el sprint 3)
- [x] Respuestas con status correctos (nunca 200 en errores ni 400 en respuestas correctas)
- [x] Diseño trabajado y uniforme, sin `alert()`: modales
- [x] Navegación entre pantallas e información clara al mostrar mensajes o realizar acciones
- [ ] Publicaciones con título, mensaje e imagen opcional, "Me gusta" y comentarios
- [ ] Ver y editar el perfil propio (ver: hecho)
- [ ] Solo se accede a la aplicación con sesión iniciada (sprint 3)

### Sprint 1

**Front**

- [x] Proyecto Angular
- [x] Pantallas: Registro, Login, Publicaciones y Mi perfil
- [x] Deploy en hosting (<https://plaza-red-social.vercel.app>)
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

---

## 7. Criterios adoptados

Puntos que la consigna no define y cómo se resolvieron:

| Tema | Criterio |
|---|---|
| Correo o nombre de usuario para ingresar | Se aceptan los dos en el mismo campo. Los dos son únicos, así que cualquiera identifica a la cuenta. Como el nombre de usuario no admite `@`, un texto con `@` siempre es un correo. |
| Mayúsculas | Correo y nombre de usuario se guardan en minúsculas: `Ana`, `ana` y `ANA` son la misma cuenta. La contraseña sí distingue mayúsculas. |
| Campos obligatorios | Todos los del registro, incluidas la imagen de perfil y la descripción breve: la consigna los lista sin marcar ninguno como opcional (a diferencia de la imagen de las publicaciones, que dice "opcional"). |
| Imagen de perfil | JPG, PNG, GIF o WEBP de hasta 2 MB. El formato se comprueba por el contenido del archivo, no por su extensión. |
| Fecha de nacimiento | Sin edad mínima: la consigna no la pide. Solo se rechazan fechas futuras o anteriores a 1900. |
| Repetir contraseña | Se compara en la pantalla. Al servidor viaja una sola vez. |
| Cambio de perfil | No se elige al registrarse: si el formulario manda un perfil, se ignora. Por ahora se cambia con un comando del backend (`npm run perfil`). Desde el sprint 4 lo hace un administrador en el dashboard. |
| Después de registrarse | La sesión queda iniciada, sin pedir que ingrese de nuevo. |
| Acceso a las pantallas | El sprint 1 pide navegación sin límites: todas las pantallas se pueden abrir sin sesión. *Mi perfil* sin sesión muestra un aviso en lugar de datos vacíos. |
| Sesión | En el sprint 1 el login devuelve los datos del usuario y la sesión se guarda en el navegador hasta que se cierra. Los tokens JWT con vencimiento llegan en el sprint 3. |
| Error al ingresar | El mensaje no dice si falló el usuario o la contraseña, para no revelar qué cuentas existen. |
| Nombre de la aplicación | "Plaza", por la plaza como lugar de encuentro. |
