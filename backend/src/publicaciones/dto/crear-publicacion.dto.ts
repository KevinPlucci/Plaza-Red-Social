import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '../../comun/transformaciones';

/** Campos de texto de una publicación nueva (llegan como multipart/form-data junto con la imagen opcional). */
export class CrearPublicacionDto {
  @MaxLength(100, { message: 'El título no puede superar los 100 caracteres.' })
  @IsNotEmpty({ message: 'El título es obligatorio.' })
  @IsString({ message: 'El título es obligatorio.' })
  @Transform(recortar)
  titulo: string;

  @MaxLength(1000, {
    message: 'El mensaje no puede superar los 1000 caracteres.',
  })
  @IsNotEmpty({ message: 'El mensaje es obligatorio.' })
  @IsString({ message: 'El mensaje es obligatorio.' })
  @Transform(recortar)
  mensaje: string;
}
