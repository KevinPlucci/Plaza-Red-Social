import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, EMPTY, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Agrega el token a cada pedido a la API. Si la API responde 401 a un pedido que llevaba token,
 * la sesión venció o no es válida: se cierra, se vuelve al login y el error no sigue hacia la
 * pantalla (así no aparece además un modal de "no se pudo...").
 */
export const sesionInterceptor: HttpInterceptorFn = (pedido, siguiente) => {
  const auth = inject(AuthService);
  const token = auth.token();
  if (!token || !pedido.url.startsWith(environment.apiUrl)) return siguiente(pedido);

  return siguiente(pedido.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        void auth.expulsar();
        return EMPTY;
      }
      return throwError(() => error);
    }),
  );
};
