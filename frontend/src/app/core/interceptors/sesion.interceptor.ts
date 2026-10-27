import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Agrega el id del usuario logueado a cada pedido a la API, para que el backend sepa quién publica,
 * da "Me gusta" o elimina. Es provisorio: en el sprint 3 se reemplaza por el token JWT.
 */
export const sesionInterceptor: HttpInterceptorFn = (pedido, siguiente) => {
  const usuario = inject(AuthService).usuario();
  if (!usuario || !pedido.url.startsWith(environment.apiUrl)) return siguiente(pedido);
  return siguiente(pedido.clone({ setHeaders: { 'X-Usuario-Id': usuario.id } }));
};
