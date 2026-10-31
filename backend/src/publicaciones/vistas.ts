import { PipelineStage } from 'mongoose';
import type { Posicion } from '../usuarios/schemas/usuario.schema';

/** Datos públicos del autor que viajan con cada publicación o comentario (nunca el correo ni la contraseña). */
export interface Autor {
  id: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  imagenPerfil: string;
  posicion: Posicion;
}

export interface VistaPublicacion {
  id: string;
  titulo: string;
  mensaje: string;
  imagen: string | null;
  usuario: Autor;
  cantidadMeGusta: number;
  /** true si quien hace el pedido ya le dio "Me gusta". */
  meGustaMio: boolean;
  cantidadComentarios: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VistaComentario {
  id: string;
  mensaje: string;
  modificado: boolean;
  usuario: Autor;
  createdAt: Date;
  updatedAt: Date;
}

/** Etapas de agregación que traen al autor (colección usuarios) en el campo "autor". */
export const UNIR_AUTOR: PipelineStage[] = [
  {
    $lookup: {
      from: 'usuarios',
      localField: 'usuario',
      foreignField: '_id',
      as: 'autor',
    },
  },
  { $unwind: '$autor' },
];

/** Proyección del autor para usar dentro de un $project, después de UNIR_AUTOR. */
export const DATOS_AUTOR = {
  id: { $toString: '$autor._id' },
  nombre: '$autor.nombre',
  apellido: '$autor.apellido',
  nombreUsuario: '$autor.nombreUsuario',
  imagenPerfil: '$autor.imagenPerfil',
  posicion: '$autor.posicion',
};
