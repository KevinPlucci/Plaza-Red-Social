import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginacionDto } from './dto/paginacion.dto';
import { PublicacionesService } from './publicaciones.service';
import { Comentario } from './schemas/comentario.schema';
import { DATOS_AUTOR, UNIR_AUTOR, VistaComentario } from './vistas';

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
      ]),
      this.comentarioModel.countDocuments(filtro),
    ]);
    return { comentarios, total, offset, limit };
  }
}
