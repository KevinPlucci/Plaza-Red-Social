import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxDate,
  MaxLength,
  MinDate,
  MinLength,
} from 'class-validator';

export const recortar = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;
const recortarYMinusculas = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Datos del formulario de registro (llegan como multipart/form-data junto con la imagen).
 * Con stopAtFirstError se informa un solo error por campo: class-validator ejecuta los
 * decoradores de abajo hacia arriba, por eso el de "obligatorio" va al final.
 */
export class RegistroDto {
  @MaxLength(50, { message: 'El nombre no puede superar los 50 caracteres.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @IsString({ message: 'El nombre es obligatorio.' })
  @Transform(recortar)
  nombre: string;

  @MaxLength(50, { message: 'El apellido no puede superar los 50 caracteres.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  @IsString({ message: 'El apellido es obligatorio.' })
  @Transform(recortar)
  apellido: string;

  @MaxLength(100, { message: 'El correo no puede superar los 100 caracteres.' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  @IsString({ message: 'El correo es obligatorio.' })
  @Transform(recortarYMinusculas)
  correo: string;

  @Matches(/^[a-z0-9._]{3,20}$/, {
    message:
      'El nombre de usuario debe tener entre 3 y 20 caracteres: letras, números, punto o guion bajo.',
  })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @IsString({ message: 'El nombre de usuario es obligatorio.' })
  @Transform(recortarYMinusculas)
  nombreUsuario: string;

  @Matches(/\d/, { message: 'La contraseña debe tener al menos un número.' })
  @Matches(/[A-Z]/, {
    message: 'La contraseña debe tener al menos una mayúscula.',
  })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña es obligatoria.' })
  contrasena: string;

  @MinDate(new Date('1900-01-01'), {
    message: 'La fecha de nacimiento no es válida.',
  })
  @MaxDate(() => new Date(), {
    message: 'La fecha de nacimiento no puede ser futura.',
  })
  @IsDate({ message: 'La fecha de nacimiento no es válida.' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria.' })
  @Type(() => Date)
  fechaNacimiento: Date;

  @MaxLength(200, {
    message: 'La descripción no puede superar los 200 caracteres.',
  })
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @IsString({ message: 'La descripción es obligatoria.' })
  @Transform(recortar)
  descripcion: string;
}
