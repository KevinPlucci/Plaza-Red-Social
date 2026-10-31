import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { UsuariosService } from '../usuarios/usuarios.service';
import type { DatosToken } from './token';

export type PedidoConUsuario = Request & {
  usuario?: UsuarioDocument;
  token?: DatosToken;
};

/** Token del header "Authorization: Bearer <token>". */
const BEARER = /^Bearer (\S+)$/i;

/**
 * Identifica al usuario del pedido a partir del token JWT y lo deja en request.usuario (y el
 * payload en request.token). Sin token, con uno vencido o adulterado, o si la cuenta ya no
 * existe, responde 401.
 */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly usuarios: UsuariosService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const pedido = contexto.switchToHttp().getRequest<PedidoConUsuario>();
    const token = BEARER.exec(pedido.header('authorization') ?? '')?.[1];
    if (!token) {
      throw new UnauthorizedException(
        'Tenés que iniciar sesión para hacer esto.',
      );
    }

    // verifyAsync rechaza tanto la firma inválida como el token vencido.
    const datos = await this.jwt
      .verifyAsync<DatosToken>(token)
      .catch(() => null);
    const usuario = datos ? await this.usuarios.buscarPorId(datos.sub) : null;
    if (!datos || !usuario) {
      throw new UnauthorizedException(
        'Tu sesión venció o no es válida. Ingresá de nuevo.',
      );
    }
    pedido.usuario = usuario;
    pedido.token = datos;
    return true;
  }
}
