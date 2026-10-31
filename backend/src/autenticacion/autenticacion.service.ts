import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ImagenesService } from '../imagenes/imagenes.service';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { DatosToken } from './token';

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
    private readonly jwt: JwtService,
  ) {}

  async registrar(datos: RegistroDto, imagen: Express.Multer.File) {
    if (await this.usuarios.existeCorreo(datos.correo))
      throw duplicado('correo');
    if (await this.usuarios.existeNombreUsuario(datos.nombreUsuario))
      throw duplicado('nombreUsuario');

    const contrasena = await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT);
    const imagenPerfil = await this.imagenes.guardar(imagen);
    let usuario: UsuarioDocument;
    try {
      // El perfil no se toma del formulario: toda cuenta nueva arranca como "usuario".
      usuario = await this.usuarios.crear({
        ...datos,
        contrasena,
        imagenPerfil,
      });
    } catch (error) {
      await this.imagenes.eliminarPorUrl(imagenPerfil);
      const campo = campoDuplicado(error);
      throw campo ? duplicado(campo) : error;
    }
    return this.iniciarSesionDe(usuario);
  }

  async iniciarSesion({ usuario, contrasena }: LoginDto) {
    const encontrado = await this.usuarios.buscarConContrasena(usuario);
    // compare() encripta la contraseña recibida con la misma sal del hash guardado y compara el resultado.
    const coincide =
      encontrado !== null &&
      (await bcrypt.compare(contrasena, encontrado.contrasena));
    if (!coincide)
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    return this.iniciarSesionDe(encontrado);
  }

  /** Token nuevo con el mismo payload que el actual y 15 minutos más de vida. */
  refrescar({ sub, nombreUsuario, perfil }: DatosToken) {
    return { token: this.firmar({ sub, nombreUsuario, perfil }) };
  }

  /** Respuesta del registro y del login: el token y todos los datos del usuario. */
  private iniciarSesionDe(usuario: UsuarioDocument) {
    const token = this.firmar({
      sub: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    });
    return { token, usuario };
  }

  private firmar(datos: DatosToken): string {
    return this.jwt.sign(datos);
  }
}
