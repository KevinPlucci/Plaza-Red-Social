import { HttpErrorResponse } from '@angular/common/http';

/** Cuerpo de error de la API de Nest: message puede ser un texto o la lista de errores de validación. */
interface ErrorApi {
  message?: string | string[];
  campo?: string;
}

/** Convierte cualquier error de una petición en mensajes para mostrar al usuario. */
export function mensajesDeError(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse)) return ['Ocurrió un error inesperado.'];
  if (error.status === 0) {
    return [
      'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo en unos segundos.',
    ];
  }
  const { message } = (error.error ?? {}) as ErrorApi;
  if (Array.isArray(message) && message.length) return message;
  if (typeof message === 'string' && error.status < 500) return [message];
  return ['Ocurrió un error en el servidor. Intentá de nuevo en unos minutos.'];
}

/** Campo del formulario al que se refiere el error (la API lo indica en los 409 de datos repetidos). */
export function campoDelError(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  return (error.error as ErrorApi | null)?.campo ?? null;
}
