import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { esIdValido } from '../comun/ids';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { ComentarioDto } from './dto/comentario.dto';
import { PaginacionDto } from './dto/paginacion.dto';
import { PublicacionesService } from './publicaciones.service';
import { Comentario } from './schemas/comentario.schema';
import { DATOS_AUTOR, UNIR_AUTOR, VistaComentario } from './vistas';

/** Forma en que se responde cada comentario: con su autor y sin datos internos. */
const VISTA_COMENTARIO: PipelineStage[] = [
  ...UNIR_AUTOR,
  {
    $project: {
      _id: 0,
      id: { $toString: '$_id' },
      mensaje: 1,
      modificado: 1,
      usuario: DATOS_AUTOR,
      createdAt: 1,
      updatedAt: 1,
    },
  },
];

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(Comentario.name)
    private readonly comentarioModel: Model<Comentario>,
    private readonly publicaciones: PublicacionesService,
  ) {}

  /** Comentarios de una publicación activa, los más recientes primero. */
  async listar(idPublicacion: string, { offset, limit }: PaginacionDto) {
    const publicacion = await this.publicaciones.buscarActiva(idPublicacion);
    const filtro = { publicacion: publicacion._id };
    const [comentarios, total] = await Promise.all([
      this.comentarioModel.aggregate<VistaComentario>([
        { $match: filtro },
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: offset },
        { $limit: limit },
        ...VISTA_COMENTARIO,
      ]),
      this.comentarioModel.countDocuments(filtro),
    ]);
    return { comentarios, total, offset, limit };
  }

  /** Comentario nuevo del usuario en una publicación activa. La fecha la agregan los timestamps. */
  async crear(
    idPublicacion: string,
    autor: UsuarioDocument,
    { mensaje }: ComentarioDto,
  ): Promise<VistaComentario> {
    const publicacion = await this.publicaciones.buscarActiva(idPublicacion);
    const comentario = await this.comentarioModel.create({
      publicacion: publicacion._id,
      usuario: autor._id,
      mensaje,
    });
    return this.obtener(comentario._id);
  }

  /** Cambia el mensaje de un comentario propio y lo marca como modificado. */
  async editar(
    idPublicacion: string,
    idComentario: string,
    autor: UsuarioDocument,
    { mensaje }: ComentarioDto,
  ): Promise<VistaComentario> {
    const publicacion = await this.publicaciones.buscarActiva(idPublicacion);
    // Tiene que ser un comentario de esta publicación: si no, para esta ruta no existe.
    const comentario = esIdValido(idComentario)
      ? await this.comentarioModel.findOne({
          _id: idComentario,
          publicacion: publicacion._id,
        })
      : null;
    if (!comentario) throw new NotFoundException('El comentario no existe.');
    if (!comentario.usuario.equals(autor._id)) {
      throw new ForbiddenException(
        'Solo podés editar tus propios comentarios.',
      );
    }
    comentario.mensaje = mensaje;
    comentario.modificado = true;
    await comentario.save();
    return this.obtener(comentario._id);
  }

  private async obtener(id: Types.ObjectId): Promise<VistaComentario> {
    const [vista] = await this.comentarioModel.aggregate<VistaComentario>([
      { $match: { _id: id } },
      ...VISTA_COMENTARIO,
    ]);
    return vista;
  }
}
