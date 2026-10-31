import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '../../comun/transformaciones';

/** Cuerpo de POST y PUT de comentarios: solo el mensaje (el autor sale del token y la fecha la pone la base). */
export class ComentarioDto {
  @MaxLength(500, {
    message: 'El comentario no puede superar los 500 caracteres.',
  })
  @IsNotEmpty({ message: 'El comentario no puede estar vacío.' })
  @IsString({ message: 'El comentario no puede estar vacío.' })
  @Transform(recortar)
  mensaje: string;
}
