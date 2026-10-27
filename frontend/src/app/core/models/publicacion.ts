/** Datos públicos del autor de una publicación o un comentario. */
export interface Autor {
  id: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  imagenPerfil: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagen: string | null;
  usuario: Autor;
  cantidadMeGusta: number;
  /** true si el usuario logueado ya le dio "Me gusta". */
  meGustaMio: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comentario {
  id: string;
  mensaje: string;
  modificado: boolean;
  usuario: Autor;
  createdAt: string;
  updatedAt: string;
}

export type OrdenPublicaciones = 'fecha' | 'meGusta';

export interface ListadoPublicaciones {
  publicaciones: Publicacion[];
  total: number;
  offset: number;
  limit: number;
}

export interface ListadoComentarios {
  comentarios: Comentario[];
  total: number;
  offset: number;
  limit: number;
}

export interface EstadoMeGusta {
  cantidadMeGusta: number;
  meGustaMio: boolean;
}
