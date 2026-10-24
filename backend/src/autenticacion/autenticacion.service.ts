import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ImagenesService } from '../imagenes/imagenes.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';

const RONDAS_BCRYPT = 10;

const MENSAJES_DUPLICADO = {
  correo: 'El correo ya está registrado.',
  nombreUsuario: 'El nombre de usuario ya está en uso.',
};
type CampoUnico = keyof typeof MENSAJES_DUPLICADO;

/** 409 con el campo repetido, para que el front lo marque en el formulario. */
function duplicado(campo: CampoUnico): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    message: MENSAJES_DUPLICADO[campo],
    campo,
  });
}

/** Error de índice único de MongoDB (si dos registros iguales llegan casi al mismo tiempo). */
function campoDuplicado(error: unknown): CampoUnico | null {
  const { code, keyPattern } = (error ?? {}) as {
    code?: number;
    keyPattern?: Record<string, unknown>;
  };
  if (code !== 11000) return null;
  return keyPattern && 'nombreUsuario' in keyPattern
    ? 'nombreUsuario'
    : 'correo';
}

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly imagenes: ImagenesService,
  ) {}

  async registrar(datos: RegistroDto, imagen: Express.Multer.File) {
    if (await this.usuarios.existeCorreo(datos.correo))
      throw duplicado('correo');
    if (await this.usuarios.existeNombreUsuario(datos.nombreUsuario))
      throw duplicado('nombreUsuario');

    const contrasena = await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT);
    const imagenPerfil = await this.imagenes.guardar(imagen);
    try {
      // El perfil no se toma del formulario: toda cuenta nueva arranca como "usuario".
      return await this.usuarios.crear({ ...datos, contrasena, imagenPerfil });
    } catch (error) {
      await this.imagenes.eliminarPorUrl(imagenPerfil);
      const campo = campoDuplicado(error);
      throw campo ? duplicado(campo) : error;
    }
  }

  async iniciarSesion({ usuario, contrasena }: LoginDto) {
    const encontrado = await this.usuarios.buscarConContrasena(usuario);
    // compare() encripta la contraseña recibida con la misma sal del hash guardado y compara el resultado.
    const coincide =
      encontrado !== null &&
      (await bcrypt.compare(contrasena, encontrado.contrasena));
    if (!coincide)
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    return encontrado;
  }
}
