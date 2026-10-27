import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { esIdValido } from '../comun/ids';
import { ImagenesService } from '../imagenes/imagenes.service';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import { Publicacion } from './schemas/publicacion.schema';
import { DATOS_AUTOR, UNIR_AUTOR, VistaPublicacion } from './vistas';

const NO_EXISTE = 'La publicación no existe.';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<Publicacion>,
    private readonly imagenes: ImagenesService,
  ) {}

  async crear(
    autor: UsuarioDocument,
    datos: CrearPublicacionDto,
    imagen?: Express.Multer.File,
  ): Promise<VistaPublicacion> {
    const urlImagen = imagen ? await this.imagenes.guardar(imagen) : undefined;
    let publicacion;
    try {
      publicacion = await this.publicacionModel.create({
        ...datos,
        imagen: urlImagen,
        usuario: autor._id,
      });
    } catch (error) {
      if (urlImagen) await this.imagenes.eliminarPorUrl(urlImagen);
      throw error;
    }
    return this.obtener(publicacion._id, autor._id);
  }

  /** Página de publicaciones activas, ordenadas por fecha o por cantidad de "Me gusta". */
  async listar(
    { orden, usuario, offset, limit }: ListarPublicacionesDto,
    lector?: Types.ObjectId,
  ) {
    const filtro = {
      activa: true,
      ...(usuario ? { usuario: new Types.ObjectId(usuario) } : {}),
    };
    // A igual cantidad de "Me gusta" va primero la más nueva; _id desempata publicaciones del mismo instante.
    const criterio: Record<string, 1 | -1> =
      orden === 'meGusta'
        ? { cantidadMeGusta: -1, createdAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

    const [publicaciones, total] = await Promise.all([
      this.publicacionModel.aggregate<VistaPublicacion>([
        { $match: filtro },
        { $addFields: { cantidadMeGusta: { $size: '$meGusta' } } },
        { $sort: criterio },
        { $skip: offset },
        { $limit: limit },
        ...this.etapasVista(lector),
      ]),
      this.publicacionModel.countDocuments(filtro),
    ]);
    return { publicaciones, total, offset, limit };
  }

  /** Publicación activa o 404 (también si el id no tiene formato válido). */
  async buscarActiva(id: string) {
    const publicacion = esIdValido(id)
      ? await this.publicacionModel.findOne({ _id: id, activa: true })
      : null;
    if (!publicacion) throw new NotFoundException(NO_EXISTE);
    return publicacion;
  }

  /** Baja lógica: la publicación queda guardada con activa = false y deja de listarse. */
  async eliminar(id: string, usuario: UsuarioDocument): Promise<void> {
    const publicacion = await this.buscarActiva(id);
    const esAutor = publicacion.usuario.equals(usuario._id);
    if (!esAutor && usuario.perfil !== 'administrador') {
      throw new ForbiddenException(
        'Solo el autor o un administrador pueden eliminar esta publicación.',
      );
    }
    publicacion.activa = false;
    await publicacion.save();
  }

  async darMeGusta(id: string, usuario: UsuarioDocument) {
    const publicacion = await this.buscarActiva(id);
    // La condición del filtro hace la operación atómica: dos pedidos iguales a la vez no suman dos "Me gusta".
    const { modifiedCount } = await this.publicacionModel.updateOne(
      { _id: publicacion._id, meGusta: { $ne: usuario._id } },
      { $push: { meGusta: usuario._id } },
    );
    if (modifiedCount === 0) {
      throw new ConflictException('Ya le diste "Me gusta" a esta publicación.');
    }
    return this.estadoMeGusta(publicacion._id, usuario._id);
  }

  async quitarMeGusta(id: string, usuario: UsuarioDocument) {
    const publicacion = await this.buscarActiva(id);
    const { modifiedCount } = await this.publicacionModel.updateOne(
      { _id: publicacion._id, meGusta: usuario._id },
      { $pull: { meGusta: usuario._id } },
    );
    if (modifiedCount === 0) {
      throw new NotFoundException(
        'No le habías dado "Me gusta" a esta publicación.',
      );
    }
    return this.estadoMeGusta(publicacion._id, usuario._id);
  }

  private async estadoMeGusta(id: Types.ObjectId, usuario: Types.ObjectId) {
    const publicacion = await this.publicacionModel
      .findById(id, { meGusta: 1 })
      .orFail();
    return {
      cantidadMeGusta: publicacion.meGusta.length,
      meGustaMio: publicacion.meGusta.some((otro) => otro.equals(usuario)),
    };
  }

  private async obtener(
    id: Types.ObjectId,
    lector?: Types.ObjectId,
  ): Promise<VistaPublicacion> {
    const [vista] = await this.publicacionModel.aggregate<VistaPublicacion>([
      { $match: { _id: id, activa: true } },
      ...this.etapasVista(lector),
    ]);
    if (!vista) throw new NotFoundException(NO_EXISTE);
    return vista;
  }

  /** Forma en que se responde cada publicación: con su autor, la cantidad de "Me gusta" y si el lector dio uno. */
  private etapasVista(lector?: Types.ObjectId): PipelineStage[] {
    return [
      ...UNIR_AUTOR,
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          titulo: 1,
          mensaje: 1,
          imagen: { $ifNull: ['$imagen', null] },
          usuario: DATOS_AUTOR,
          cantidadMeGusta: { $size: '$meGusta' },
          meGustaMio: lector
            ? { $in: [lector, '$meGusta'] }
            : { $literal: false },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];
  }
}
