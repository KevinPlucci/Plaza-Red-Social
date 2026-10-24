import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { ImagenesService } from './imagenes.service';

@Controller('imagenes')
export class ImagenesController {
  constructor(private readonly imagenes: ImagenesService) {}

  @Get(':id')
  // Una imagen guardada no cambia nunca, así que el navegador la puede cachear sin volver a pedirla.
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async obtener(@Param('id') id: string): Promise<StreamableFile> {
    const imagen = await this.imagenes.buscar(id);
    return new StreamableFile(imagen.datos, { type: imagen.tipo });
  }
}
