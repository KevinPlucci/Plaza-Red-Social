# Plaza · TP 2 Programación IV

Red social donde los usuarios se registran, publican, reaccionan con "Me gusta" y comentan.
Hecha con **Angular 21** en el frontend y **NestJS 11** con **MongoDB** en el backend.

| | |
|---|---|
| **Frontend** | <https://plaza-red-social.vercel.app> |
| **Backend** | <https://red-social-api-95af.onrender.com> |
| **Repositorio** | <https://github.com/KevinPlucci/Plaza-Red-Social> |
| **Estado** | Sprints 1 y 2 terminados |

## Documentación

| Documento | Qué contiene |
|---|---|
| [FUNCIONAL.md](FUNCIONAL.md) | Qué hace la app: perfiles, pantallas, registro e ingreso, reglas, requerimientos por sprint y criterios adoptados |
| [TECNICO.md](TECNICO.md) | Cómo está hecha: instalación, deploy, arquitectura, API, modelo de datos, decisiones técnicas e historial de versiones |

## Qué hace

- Registro con nombre, apellido, correo, nombre de usuario, contraseña, fecha de nacimiento, descripción breve e
  imagen de perfil, con validaciones y mensajes en cada campo.
- Ingreso con el correo o con el nombre de usuario.
- Publicaciones con título, mensaje e imagen opcional.
- Listado paginado, ordenado por fecha o por cantidad de "Me gusta".
- Dar y quitar "Me gusta", y eliminar las publicaciones propias (baja lógica).
- Perfil propio con la foto, todos los datos de la cuenta y las últimas 3 publicaciones con sus comentarios.
- Perfiles "usuario" (por defecto) y "administrador".
- Avisos y confirmaciones en modales, sin `alert()`.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (standalone, signals, formularios reactivos, sin zone.js) |
| Backend | NestJS 11 con Mongoose, class-validator y bcrypt |
| Base de datos | MongoDB (Atlas en producción) |
| Hosting | Vercel (frontend) y Render (backend) |

## Arranque rápido

```bash
cd backend && cp .env.example .env && npm install && npm run start:dev   # http://localhost:3000
cd frontend && npm install && npm start                                  # http://localhost:4200
```

En `backend/.env` hay que poner la cadena de conexión de MongoDB (`MONGODB_URI`).
Las variables, los comandos y el deploy están en [TECNICO.md](TECNICO.md#1-cómo-levantar-el-proyecto).

| Comando | Dónde | Qué hace |
|---|---|---|
| `npm run start:dev` | backend | API con recarga automática en el puerto 3000 |
| `npm test` | backend | Pruebas e2e de la API |
| `npm start` | frontend | Servidor de desarrollo en el puerto 4200 |
| `npm run build` | frontend | Build de producción en `dist/frontend/browser` |
