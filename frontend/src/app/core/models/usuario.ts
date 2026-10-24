export type Perfil = 'usuario' | 'administrador';

/** Datos del usuario tal como los devuelve la API (nunca incluye la contraseña). */
export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenPerfil: string;
  perfil: Perfil;
  createdAt: string;
  updatedAt: string;
}
