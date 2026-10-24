import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { recortar } from './registro.dto';

export class LoginDto {
  /** Correo o nombre de usuario: los dos son únicos, así que cualquiera identifica a la cuenta. */
  @IsNotEmpty({ message: 'Ingresá tu correo o nombre de usuario.' })
  @IsString({ message: 'Ingresá tu correo o nombre de usuario.' })
  @Transform(recortar)
  usuario: string;

  @IsNotEmpty({ message: 'Ingresá tu contraseña.' })
  @IsString({ message: 'Ingresá tu contraseña.' })
  contrasena: string;
}
