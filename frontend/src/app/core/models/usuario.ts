export type Perfil = 'usuario' | 'administrador';

export type Posicion = 'arquero' | 'defensor' | 'mediocampista' | 'delantero';

/** Texto de cada posición, en el orden en que se ofrecen en el registro. */
export const NOMBRES_POSICION: Record<Posicion, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  mediocampista: 'Mediocampista',
  delantero: 'Delantero',
};

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
  posicion: Posicion;
  club?: string;
  perfil: Perfil;
  createdAt: string;
  updatedAt: string;
}

/** Respuesta del registro y del login: el token JWT y los datos del usuario. */
export interface Sesion {
  token: string;
  usuario: Usuario;
}
