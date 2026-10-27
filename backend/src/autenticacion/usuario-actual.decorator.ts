import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PedidoConUsuario } from './sesion.guard';

/** Usuario que hace el pedido, cargado por SesionGuard (null en rutas con sesión opcional). */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<PedidoConUsuario>().usuario ?? null,
);
