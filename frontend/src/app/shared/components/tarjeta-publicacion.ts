import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Publicacion } from '../../core/models/publicacion';
import { NOMBRES_POSICION } from '../../core/models/usuario';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';

/**
 * Una publicación: autor, contenido, "Me gusta", acceso a sus comentarios y, si es propia, el
 * botón para eliminarla. En modo detalle se muestra en grande y sin el enlace a su página.
 */
@Component({
  selector: 'app-tarjeta-publicacion',
  imports: [DatePipe, RouterLink],
  template: `
    @let pub = publicacion();
    <article class="tarjeta" [class.grande]="detalle()">
      <header>
        <img class="avatar" [src]="pub.usuario.imagenPerfil" alt="" />
        <div class="autor">
          <strong>
            {{ pub.usuario.nombre }} {{ pub.usuario.apellido }}
            @if (pub.usuario.posicion; as posicion) {
              <span class="etiqueta">{{ posiciones[posicion] }}</span>
            }
          </strong>
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

      @if (detalle()) {
        <h1>{{ pub.titulo }}</h1>
      } @else {
        <h2>
          <a [routerLink]="['/publicaciones', pub.id]">{{ pub.titulo }}</a>
        </h2>
      }
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
          class="accion"
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
        @if (!detalle()) {
          <a class="accion" [routerLink]="['/publicaciones', pub.id]">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
              />
            </svg>
            {{ pub.cantidadComentarios }}
            {{ pub.cantidadComentarios === 1 ? 'comentario' : 'comentarios' }}
          </a>
        }
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
    .autor .etiqueta {
      margin-left: 4px;
      font-size: 0.75rem;
    }
    h1,
    h2 {
      margin: 0 0 6px;
      font-size: 1.15rem;
      overflow-wrap: anywhere;
    }
    h2 a {
      color: inherit;
      text-decoration: none;
    }
    h2 a:hover {
      color: var(--color-primario);
      text-decoration: underline;
    }
    .grande h1 {
      font-size: 1.5rem;
    }
    .mensaje {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    .grande .mensaje {
      font-size: 1.05rem;
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
    .grande .imagen {
      max-height: 640px;
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
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
    .accion {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      font-weight: 600;
      color: var(--color-texto-suave);
      text-decoration: none;
      border: 1px solid var(--color-borde);
      border-radius: 999px;
    }
    .accion:hover:not(:disabled) {
      color: var(--color-primario);
      border-color: var(--color-primario);
    }
    .accion.activo {
      color: #fff;
      background: var(--color-primario);
      border-color: var(--color-primario);
    }
    /* Sin esta regla, el :hover de arriba pintaría el texto del mismo color que el fondo. */
    .accion.activo:hover:not(:disabled) {
      color: #fff;
      background: var(--color-primario-oscuro);
      border-color: var(--color-primario-oscuro);
    }
    .accion.activo svg {
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
  /** true en la página de la publicación: se ve en grande y sin enlace a sí misma. */
  readonly detalle = input(false);
  /** Avisa el id de la publicación después de eliminarla, para que la pantalla actualice el listado. */
  readonly eliminada = output<string>();

  private readonly auth = inject(AuthService);
  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);

  protected readonly posiciones = NOMBRES_POSICION;
  protected readonly ocupado = signal(false);
  protected readonly esMia = computed(
    () => this.auth.usuario()?.id === this.publicacion().usuario.id,
  );
  /** Arranca con lo que trae la publicación y se actualiza con cada respuesta de la API. */
  protected readonly meGusta = linkedSignal(() => ({
    cantidadMeGusta: this.publicacion().cantidadMeGusta,
    meGustaMio: this.publicacion().meGustaMio,
  }));

  protected alternarMeGusta(): void {
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
      mensaje: `¿Querés eliminar "${titulo}"? Va a dejar de verse en el vestuario.`,
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
