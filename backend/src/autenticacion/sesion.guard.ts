import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { UsuariosService } from '../usuarios/usuarios.service';

/**
 * Header con el id del usuario que hace el pedido. Es provisorio: en el sprint 3 la identidad
 * pasa a salir del token JWT y este guard se reemplaza sin tocar los controllers.
 */
export const ENCABEZADO_USUARIO = 'x-usuario-id';

const SESION_OPCIONAL = 'sesionOpcional';

/** La ruta funciona sin sesión; si el pedido trae una válida, igual se carga el usuario. */
export const SesionOpcional = () => SetMetadata(SESION_OPCIONAL, true);

export type PedidoConUsuario = Request & { usuario?: UsuarioDocument };

/** Identifica al usuario del pedido y lo deja en request.usuario. Sin un usuario válido responde 401. */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const pedido = contexto.switchToHttp().getRequest<PedidoConUsuario>();
    const id = pedido.header(ENCABEZADO_USUARIO);
    const usuario = id ? await this.usuarios.buscarPorId(id) : null;
    if (usuario) {
      pedido.usuario = usuario;
      return true;
    }

    const opcional = this.reflector.getAllAndOverride<boolean>(
      SESION_OPCIONAL,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (opcional) return true;
    throw new UnauthorizedException(
      'Tenés que iniciar sesión para hacer esto.',
    );
  }
}
