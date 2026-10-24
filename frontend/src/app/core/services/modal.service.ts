import { Injectable, signal } from '@angular/core';

export type TipoModal = 'info' | 'exito' | 'error';

export interface OpcionesModal {
  titulo: string;
  /** Un texto o una lista de mensajes (por ejemplo, los errores de validación de la API). */
  mensaje: string | string[];
  tipo?: TipoModal;
  textoAceptar?: string;
  /** Si se indica, el modal muestra también un botón para cancelar. */
  textoCancelar?: string;
}

interface ModalAbierto extends OpcionesModal {
  responder: (aceptado: boolean) => void;
}

/** Reemplaza a alert() y confirm(): el componente Modal muestra lo que se abre desde acá. */
@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly abierto = signal<ModalAbierto | null>(null);

  /** Resuelve true si se presiona el botón principal y false si se cancela o se cierra. */
  abrir(opciones: OpcionesModal): Promise<boolean> {
    this.cerrar(false);
    return new Promise((responder) => this.abierto.set({ tipo: 'info', ...opciones, responder }));
  }

  confirmar(opciones: OpcionesModal): Promise<boolean> {
    return this.abrir({ textoCancelar: 'Cancelar', ...opciones });
  }

  cerrar(aceptado: boolean): void {
    const modal = this.abierto();
    if (!modal) return;
    this.abierto.set(null);
    modal.responder(aceptado);
  }
}
