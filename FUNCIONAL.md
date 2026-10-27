# Plaza · Documento funcional

Qué hace la aplicación, para quién y con qué reglas.
La parte técnica (instalación, arquitectura y decisiones) está en [TECNICO.md](TECNICO.md).

## Índice

1. [Qué es Plaza](#1-qué-es-plaza)
2. [Perfiles](#2-perfiles)
3. [Pantallas](#3-pantallas)
4. [Cómo se usa](#4-cómo-se-usa)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Requerimientos por sprint](#6-requerimientos-por-sprint)
7. [Criterios adoptados](#7-criterios-adoptados)

---

## 1. Qué es Plaza

Una red social: cada persona crea su cuenta con sus datos y una foto de perfil, publica mensajes con título e imagen
opcional, y reacciona y comenta lo que publican los demás. Los administradores, además, moderan las publicaciones,
gestionan los usuarios y consultan estadísticas de uso.

El trabajo se entrega por sprints de una semana. Hoy están terminados el **sprint 1** (registro con foto de perfil,
ingreso con correo o nombre de usuario y perfil propio) y el **sprint 2**: publicar con imagen opcional, ver las
publicaciones paginadas y ordenadas por fecha o por "Me gusta", dar y quitar "Me gusta", eliminar las propias y ver en
el perfil las últimas tres con sus comentarios.

## 2. Perfiles

| Perfil | Quién es | Qué puede hacer hoy |
|---|---|---|
| Visitante | Entra sin sesión | Recorrer todas las pantallas y leer las publicaciones, registrarse e ingresar. Para publicar o dar "Me gusta" se le pide ingresar |
| Usuario | Toda cuenta nueva | Lo anterior, más publicar, dar y quitar "Me gusta", eliminar sus publicaciones, ver sus datos y sus últimas publicaciones en *Mi perfil* y cerrar sesión |
| Administrador | Cuenta a la que se le cambió el perfil | Lo mismo que un usuario. La API ya le permite eliminar cualquier publicación; los botones para hacerlo desde la pantalla, el dashboard de usuarios y las estadísticas llegan en el sprint 4 |

## 3. Pantallas

| Pantalla | Qué ofrece | Quién entra |
|---|---|---|
| Publicaciones | Formulario para publicar (con sesión), selector de orden ("Más recientes" o "Más 'Me gusta'"), las publicaciones de a 5 con paginación y el rango que se está viendo ("Mostrando 1–5 de 12"). Cada publicación muestra autor, fecha, título, mensaje, imagen, "Me gusta" y, si es propia, el botón para eliminarla | Todos |
| Mi perfil | Foto, nombre y apellido, nombre de usuario, perfil, descripción, correo, fecha de nacimiento y fecha de alta, y las últimas 3 publicaciones propias, cada una con sus comentarios más recientes. Sin sesión, un aviso con accesos a ingresar o registrarse | Todos |
| Crear cuenta | Formulario de registro con imagen de perfil y vista previa | Todos |
| Ingresar | Formulario con correo o nombre de usuario y contraseña | Todos |
| Página no encontrada | Aviso para direcciones que no existen, con un enlace a publicaciones | Todos |

El encabezado está en todas las pantallas: lleva a Publicaciones y a Mi perfil y, según haya sesión o no, muestra la
foto y el nombre de usuario con el botón para cerrar sesión, o los accesos a ingresar y registrarse.

## 4. Cómo se usa

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

**Publicar**

1. Con la sesión iniciada, en Publicaciones se completa el título y el mensaje y, si se quiere, se agrega una imagen
   (se ve una vista previa y se puede quitar).
2. Si falta el título o el mensaje, se marca debajo del campo. Un texto con solo espacios cuenta como vacío.
3. Al publicar, un modal lo confirma y la publicación aparece primera en el listado ordenado por fecha.

**Ver las publicaciones**

- Se muestran de a 5, de la más nueva a la más vieja. El selector cambia el orden a "Más 'Me gusta'".
- Los botones de abajo pasan de página. La página y el orden quedan en la dirección (por ejemplo,
  `/publicaciones?pagina=2&orden=meGusta`), así se conservan al recargar o al volver atrás.

**"Me gusta"**

- El botón muestra cuántos "Me gusta" tiene la publicación y queda resaltado si ya le diste uno. Un clic lo da y otro
  lo quita.
- Sin sesión, el botón abre un modal que invita a ingresar.

**Eliminar**

- Solo las publicaciones propias muestran el botón para eliminar. Antes de borrar, un modal pide confirmación nombrando
  la publicación.
- La publicación deja de verse en el listado y en el perfil, pero queda guardada (baja lógica).

**Mi perfil**

- Debajo de los datos de la cuenta aparecen las últimas 3 publicaciones propias, cada una con sus 3 comentarios más
  recientes y la cantidad total. Desde ahí también se puede dar "Me gusta" y eliminar.

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
| Título de una publicación | Obligatorio, hasta 100 caracteres |
| Mensaje de una publicación | Obligatorio, hasta 1000 caracteres, con contador a la vista |
| Imagen de una publicación | Opcional. JPG, PNG, GIF o WEBP de hasta 2 MB |
| "Me gusta" | Uno por usuario y publicación. Solo se puede quitar si se había dado |
| Eliminar una publicación | Solo el autor o un administrador. Es una baja lógica: deja de mostrarse junto con sus comentarios |
| Listado | Solo publicaciones activas. Por fecha (la más nueva primero) o por cantidad de "Me gusta"; a igual cantidad, la más nueva primero |

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
- [ ] Publicaciones con título, mensaje e imagen opcional, "Me gusta" y comentarios (publicaciones y "Me gusta" hechos; escribir comentarios en el sprint 3)
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

- [x] Publicaciones: listado ordenado por fecha por defecto
- [x] Cambiar el orden a cantidad de "Me gusta"
- [x] Cantidad limitada de publicaciones con paginación (de a 5)
- [x] Cada publicación es un componente (`app-tarjeta-publicacion`)
- [x] Dar y quitar "Me gusta"
- [x] Eliminar mis publicaciones
- [x] Mi perfil: todos los datos y la foto de perfil
- [x] Mi perfil: mis últimas 3 publicaciones con sus comentarios

**Back**

- [x] Alta, listado y baja lógica de publicaciones
- [x] `POST` publicación de un usuario con título, mensaje e imagen opcional guardada
- [x] `DELETE` baja lógica, solo del autor o de un administrador
- [x] `GET` listado con orden por fecha o "Me gusta", filtro por usuario y `offset`/`limit`
- [x] `POST` "Me gusta" (uno por usuario y publicación)
- [x] `DELETE` quitar el "Me gusta" propio

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
| Quién hace cada pedido (sprint 2) | Hasta que llegue el JWT del sprint 3, el front manda el id del usuario logueado en el header `X-Usuario-Id` y la API lo valida contra la base. Es provisorio y se puede falsificar; en el sprint 3 se reemplaza por el token sin cambiar las pantallas ni los controllers. |
| Leer sin sesión | Las publicaciones se pueden leer sin sesión (el sprint 3 cierra el acceso). Publicar, dar "Me gusta" y eliminar piden ingresar. |
| Publicaciones por página | 5, para que la paginación se note con pocas publicaciones. La API acepta hasta 50 por pedido. |
| Orden por "Me gusta" | A igual cantidad de "Me gusta", primero la más nueva. |
| "Me gusta" a una publicación propia | Se permite: la consigna no lo prohíbe. |
| Quitar un "Me gusta" que no se dio | La API responde 404 (ese "Me gusta" no existe). Dar uno repetido responde 409. |
| Eliminar | Pide confirmación. La publicación no se borra de la base (baja lógica) y no hay forma de recuperarla desde la aplicación. |
| Administrador | La API ya le deja eliminar publicaciones ajenas; el botón en pantalla para hacerlo llega en el sprint 4, como pide la consigna. |
| Comentarios en Mi perfil | Se muestran los 3 más recientes de cada publicación y la cantidad total. Escribirlos y editarlos llega en el sprint 3; hasta entonces cada publicación muestra "Todavía no hay comentarios". |
| Nombre de la aplicación | "Plaza", por la plaza como lugar de encuentro. |
