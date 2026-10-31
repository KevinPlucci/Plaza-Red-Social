import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PedidoConUsuario } from './sesion.guard';

/** Usuario que hace el pedido, cargado por SesionGuard. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<PedidoConUsuario>().usuario ?? null,
);

/** Payload del token del pedido, ya verificado por SesionGuard. */
export const TokenActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<PedidoConUsuario>().token ?? null,
);
