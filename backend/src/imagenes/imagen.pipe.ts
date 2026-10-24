import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;
/** Tope de multer: corta la subida de archivos enormes antes de cargarlos completos en memoria. */
export const LIMITE_SUBIDA = 10 * 1024 * 1024;

/** Primeros bytes de cada formato aceptado. Se mira el contenido porque el tipo que manda el navegador se puede falsear. */
const FIRMAS: { tipo: string; coincide: (b: Buffer) => boolean }[] = [
  {
    tipo: 'image/jpeg',
    coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    tipo: 'image/png',
    coincide: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    tipo: 'image/gif',
    coincide: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
  },
  {
    tipo: 'image/webp',
    coincide: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/**
 * Valida el archivo subido con FileInterceptor: que sea JPG, PNG, GIF o WEBP y no supere los 2 MB.
 * Si es obligatorio y no llegó, responde 400 con el mensaje indicado.
 */
@Injectable()
export class ImagenPipe implements PipeTransform<
  Express.Multer.File | undefined
> {
  constructor(private readonly mensajeSiFalta?: string) {}

  transform(
    archivo: Express.Multer.File | undefined,
  ): Express.Multer.File | undefined {
    if (!archivo) {
      if (this.mensajeSiFalta)
        throw new BadRequestException(this.mensajeSiFalta);
      return undefined;
    }
    if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
      throw new BadRequestException('La imagen no puede superar los 2 MB.');
    }
    const formato = FIRMAS.find((firma) => firma.coincide(archivo.buffer));
    if (!formato) {
      throw new BadRequestException(
        'El archivo tiene que ser una imagen JPG, PNG, GIF o WEBP.',
      );
    }
    return { ...archivo, mimetype: formato.tipo };
  }
}
