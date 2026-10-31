import { effect, inject, Injectable } from '@angular/core';
import { mensajesDeError } from '../utils/errores';
import { AuthService } from './auth.service';
import { ModalService } from './modal.service';

/** El aviso aparece 5 minutos antes de que venza el token, o sea, a los 10 de sesión. */
const AVISO_ANTES_MS = 5 * 60 * 1000;

/**
 * Vigila el vencimiento del token: avisa cuando quedan 5 minutos y ofrece extender la sesión
 * (refrescar el token). Si no se extiende, al vencer cierra la sesión y vuelve al login.
 */
@Injectable({ providedIn: 'root' })
export class VencimientoSesion {
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);

  constructor() {
    // Cada token nuevo (login, registro o refresco) reprograma los dos temporizadores.
    effect((onCleanup) => {
      const vence = this.auth.vencimiento();
      if (!vence) return;
      const faltan = vence - Date.now();
      const aviso = setTimeout(() => void this.avisar(vence), faltan - AVISO_ANTES_MS);
      const fin = setTimeout(() => void this.auth.expulsar(), faltan);
      onCleanup(() => {
        clearTimeout(aviso);
        clearTimeout(fin);
      });
    });
  }

  private async avisar(vence: number): Promise<void> {
    const minutos = Math.max(1, Math.round((vence - Date.now()) / 60_000));
    const extender = await this.modal.confirmar({
      titulo: 'Tu sesión está por vencer',
      mensaje: `Quedan ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} de sesión. ¿Querés extenderla 15 minutos más?`,
      textoAceptar: 'Extender sesión',
      textoCancelar: 'Ahora no',
    });
    // Si mientras tanto se cerró la sesión o ya cambió el token, no hay nada que extender.
    if (!extender || this.auth.vencimiento() !== vence) return;

    this.auth.refrescar().subscribe({
      next: () =>
        void this.modal.abrir({
          tipo: 'exito',
          titulo: 'Sesión extendida',
          mensaje: 'Tenés 15 minutos más.',
        }),
      error: (error: unknown) =>
        void this.modal.abrir({
          tipo: 'error',
          titulo: 'No se pudo extender la sesión',
          mensaje: mensajesDeError(error),
        }),
    });
  }
}
