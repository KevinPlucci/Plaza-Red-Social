import type { Perfil } from '../usuarios/schemas/usuario.schema';

/** Cada token vence a los 15 minutos de emitido. */
export const DURACION_TOKEN_SEGUNDOS = 15 * 60;

/** Lo que viaja dentro del token: la identidad del usuario y su rol. */
export interface DatosToken {
  sub: string;
  nombreUsuario: string;
  perfil: Perfil;
}
