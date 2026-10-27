import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Publicacion } from '../../core/models/publicacion';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';

/** Una publicación: autor, contenido, "Me gusta" y, si es propia, el botón para eliminarla. */
@Component({
  selector: 'app-tarjeta-publicacion',
  imports: [DatePipe],
  template: `
    @let pub = publicacion();
    <article class="tarjeta">
      <header>
        <img class="avatar" [src]="pub.usuario.imagenPerfil" alt="" />
        <div class="autor">
          <strong>{{ pub.usuario.nombre }} {{ pub.usuario.apellido }}</strong>
          <span class="texto-suave">
            {{ '@' + pub.usuario.nombreUsuario }} ·
            <time [attr.datetime]="pub.createdAt">{{
              pub.createdAt | date: 'd MMM y, HH:mm'
            }}</time>
          </span>
        </div>
        @if (esMia()) {
          <button
            type="button"
            class="eliminar"
            title="Eliminar publicación"
            aria-label="Eliminar publicación"
            [disabled]="ocupado()"
            (click)="eliminar()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
              />
            </svg>
          </button>
        }
      </header>

      <h2>{{ pub.titulo }}</h2>
      <p class="mensaje">{{ pub.mensaje }}</p>
      @if (pub.imagen) {
        <img
          class="imagen"
          [src]="pub.imagen"
          [alt]="'Imagen de la publicación ' + pub.titulo"
          loading="lazy"
        />
      }

      <footer>
        <button
          type="button"
          class="me-gusta"
          [class.activo]="meGusta().meGustaMio"
          [attr.aria-pressed]="meGusta().meGustaMio"
          [disabled]="ocupado()"
          (click)="alternarMeGusta()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          </svg>
          {{ meGusta().cantidadMeGusta }} Me gusta
        </button>
      </footer>
      <ng-content />
    </article>
  `,
  styles: `
    article {
      padding: 20px 24px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .autor {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.35;
    }
    .autor span {
      font-size: 0.88rem;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 1.15rem;
      overflow-wrap: anywhere;
    }
    .mensaje {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    .imagen {
      width: 100%;
      max-height: 460px;
      margin-top: 14px;
      object-fit: contain;
      background: var(--color-fondo);
      border: 1px solid var(--color-borde);
      border-radius: 8px;
    }
    footer {
      display: flex;
      align-items: center;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--color-borde);
    }
    button {
      font: inherit;
      cursor: pointer;
      background: none;
      border: 0;
    }
    button:disabled {
      cursor: progress;
      opacity: 0.6;
    }
    svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .me-gusta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-weight: 600;
      color: var(--color-texto-suave);
      border: 1px solid var(--color-borde);
      border-radius: 999px;
    }
    .me-gusta:hover:not(:disabled) {
      color: var(--color-primario);
      border-color: var(--color-primario);
    }
    .me-gusta.activo {
      color: #fff;
      background: var(--color-primario);
      border-color: var(--color-primario);
    }
    /* Sin esta regla, el :hover de arriba pintaría el texto del mismo color que el fondo. */
    .me-gusta.activo:hover:not(:disabled) {
      color: #fff;
      background: var(--color-primario-oscuro);
      border-color: var(--color-primario-oscuro);
    }
    .me-gusta.activo svg {
      fill: currentColor;
    }
    .eliminar {
      margin-left: auto;
      padding: 6px;
      color: var(--color-texto-suave);
      border-radius: 8px;
    }
    .eliminar:hover:not(:disabled) {
      color: var(--color-error);
      background: var(--color-error-suave);
    }
  `,
})
export class TarjetaPublicacion {
  readonly publicacion = input.required<Publicacion>();
  /** Avisa el id de la publicación después de eliminarla, para que la pantalla actualice el listado. */
  readonly eliminada = output<string>();

  private readonly auth = inject(AuthService);
  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly ocupado = signal(false);
  protected readonly esMia = computed(
    () => this.auth.usuario()?.id === this.publicacion().usuario.id,
  );
  /** Arranca con lo que trae la publicación y se actualiza con cada respuesta de la API. */
  protected readonly meGusta = linkedSignal(() => ({
    cantidadMeGusta: this.publicacion().cantidadMeGusta,
    meGustaMio: this.publicacion().meGustaMio,
  }));

  protected async alternarMeGusta(): Promise<void> {
    if (!this.auth.haySesion()) {
      const ingresar = await this.modal.confirmar({
        titulo: 'Ingresá para dar "Me gusta"',
        mensaje: 'Necesitás una cuenta para reaccionar a las publicaciones.',
        textoAceptar: 'Ingresar',
      });
      if (ingresar) await this.router.navigateByUrl('/login');
      return;
    }

    const id = this.publicacion().id;
    const pedido = this.meGusta().meGustaMio
      ? this.servicio.quitarMeGusta(id)
      : this.servicio.darMeGusta(id);
    this.ocupado.set(true);
    pedido.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: (estado) => this.meGusta.set(estado),
      error: (error: unknown) =>
        void this.modal.abrir({
          tipo: 'error',
          titulo: 'No se pudo actualizar el "Me gusta"',
          mensaje: mensajesDeError(error),
        }),
    });
  }

  protected async eliminar(): Promise<void> {
    const { id, titulo } = this.publicacion();
    const confirmado = await this.modal.confirmar({
      titulo: 'Eliminar publicación',
      mensaje: `¿Querés eliminar "${titulo}"? Va a dejar de verse en Plaza.`,
      textoAceptar: 'Eliminar',
    });
    if (!confirmado) return;

    this.ocupado.set(true);
    this.servicio
      .eliminar(id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: () => this.eliminada.emit(id),
        error: (error: unknown) =>
          void this.modal.abrir({
            tipo: 'error',
            titulo: 'No se pudo eliminar la publicación',
            mensaje: mensajesDeError(error),
          }),
      });
  }
}
