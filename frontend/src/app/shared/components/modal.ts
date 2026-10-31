import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ModalService } from '../../core/services/modal.service';

/** Modal único de la aplicación, sobre el elemento nativo <dialog> (bloquea el fondo y se cierra con Esc). */
@Component({
  selector: 'app-modal',
  template: `
    <dialog
      #dialogo
      [class]="'modal-' + (modal()?.tipo ?? 'info')"
      aria-labelledby="modal-titulo"
      (close)="alCerrarse()"
      (click)="cerrarSiEsFondo($event)"
    >
      @if (modal(); as m) {
        <div class="contenido">
          <div class="cabecera">
            <span class="icono" aria-hidden="true">
              @switch (m.tipo) {
                @case ('exito') {
                  <svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>
                }
                @case ('error') {
                  <svg viewBox="0 0 24 24"><path d="M12 7v6M12 16.5v.5" /></svg>
                }
                @default {
                  <svg viewBox="0 0 24 24"><path d="M12 11v6M12 7.5v.5" /></svg>
                }
              }
            </span>
            <h2 id="modal-titulo">{{ m.titulo }}</h2>
          </div>
          @let lineas = comoLista(m.mensaje);
          @if (lineas.length > 1) {
            <ul>
              @for (linea of lineas; track $index) {
                <li>{{ linea }}</li>
              }
            </ul>
          } @else {
            <p>{{ lineas[0] }}</p>
          }
          <div class="botones">
            @if (m.textoCancelar) {
              <button type="button" class="btn btn-secundario" (click)="servicio.cerrar(false)">
                {{ m.textoCancelar }}
              </button>
            }
            <button
              type="button"
              class="btn btn-primario"
              (click)="servicio.cerrar(true)"
              autofocus
            >
              {{ m.textoAceptar ?? 'Aceptar' }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(440px, calc(100% - 32px));
      padding: 0;
      color: var(--color-texto);
      background: var(--color-superficie);
      border: 0;
      border-top: 4px solid var(--color-primario);
      border-radius: var(--radio);
      box-shadow: 0 12px 40px rgb(16 24 40 / 20%);
    }
    dialog::backdrop {
      background: rgb(16 24 40 / 45%);
    }
    dialog.modal-error {
      border-top-color: var(--color-error);
    }
    .contenido {
      padding: 24px;
    }
    .cabecera {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0;
      font-size: 1.15rem;
    }
    .icono {
      display: grid;
      flex: none;
      place-items: center;
      width: 34px;
      height: 34px;
      color: var(--color-primario);
      background: var(--color-primario-suave);
      border-radius: 50%;
    }
    .modal-error .icono {
      color: var(--color-error);
      background: var(--color-error-suave);
    }
    .modal-exito .icono {
      color: var(--color-exito);
      background: var(--color-exito-suave);
    }
    .icono svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    p {
      margin: 0;
      color: var(--color-texto-suave);
    }
    ul {
      margin: 0;
      padding-left: 20px;
      color: var(--color-texto-suave);
    }
    li + li {
      margin-top: 4px;
    }
    .botones {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
    }
  `,
})
export class Modal {
  protected readonly servicio = inject(ModalService);
  protected readonly modal = this.servicio.abierto;
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  /** true entre un close() hecho desde acá y el evento "close" que dispara el navegador. */
  private cierrePropio = false;

  constructor() {
    // Abre o cierra el <dialog> según lo que indique el servicio.
    effect(() => {
      const dialogo = this.dialogo().nativeElement;
      const hayModal = this.modal() !== null;
      if (hayModal && !dialogo.open) dialogo.showModal();
      if (!hayModal && dialogo.open) {
        this.cierrePropio = true;
        dialogo.close();
      }
    });
  }

  /**
   * El evento "close" llega un instante después del cierre. Si lo provocó el effect, se ignora:
   * para entonces puede haberse abierto otro modal, que no hay que cerrar. Si no (Esc), se cancela.
   */
  protected alCerrarse(): void {
    if (this.cierrePropio) {
      this.cierrePropio = false;
      return;
    }
    this.servicio.cerrar(false);
  }

  /** Un solo mensaje se muestra como párrafo; varios, como lista. */
  protected comoLista(mensaje: string | string[]): string[] {
    return Array.isArray(mensaje) ? mensaje : [mensaje];
  }

  /** El contenido ocupa todo el <dialog>, así que un clic que llega al propio <dialog> fue sobre el fondo oscuro. */
  protected cerrarSiEsFondo(evento: MouseEvent): void {
    if (evento.target === this.dialogo().nativeElement) this.servicio.cerrar(false);
  }
}
