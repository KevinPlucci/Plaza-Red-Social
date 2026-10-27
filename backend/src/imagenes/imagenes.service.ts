import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { esIdValido } from '../comun/ids';
import { Imagen } from './schemas/imagen.schema';

@Injectable()
export class ImagenesService {
  constructor(
    @InjectModel(Imagen.name) private readonly imagenModel: Model<Imagen>,
    private readonly config: ConfigService,
  ) {}

  /** Guarda el archivo y devuelve la URL pública desde la que se puede ver. */
  async guardar(archivo: Express.Multer.File): Promise<string> {
    const imagen = await this.imagenModel.create({
      datos: archivo.buffer,
      tipo: archivo.mimetype,
    });
    return `${this.urlPublica()}/imagenes/${imagen.id}`;
  }

  async buscar(id: string) {
    const imagen = esIdValido(id) ? await this.imagenModel.findById(id) : null;
    if (!imagen) throw new NotFoundException('La imagen no existe.');
    return imagen;
  }

  /** Borra la imagen a partir de su URL (se usa si falla el alta del documento que la referencia). */
  async eliminarPorUrl(url: string): Promise<void> {
    const id = url.split('/').pop() ?? '';
    if (esIdValido(id)) await this.imagenModel.deleteOne({ _id: id });
  }

  private urlPublica(): string {
    const url =
      this.config.get<string>('URL_PUBLICA') ??
      `http://localhost:${process.env.PORT ?? 3000}`;
    return url.replace(/\/+$/, '');
  }
}
