import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Comentario } from '../../core/models/publicacion';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';
import { ErrorCampo } from './error-campo';

export const LARGO_COMENTARIO = 500;

/** Un comentario: autor, fecha, marca de editado y, si es propio, la edición en el lugar. */
@Component({
  selector: 'app-comentario',
  imports: [DatePipe, ReactiveFormsModule, ErrorCampo],
  template: `
    @let c = datos();
    <article class="comentario">
      <img class="avatar" [src]="c.usuario.imagenPerfil" alt="" />
      <div class="cuerpo">
        <p class="autor">
          <strong>{{ c.usuario.nombre }} {{ c.usuario.apellido }}</strong>
          <span class="texto-suave">
            <time [attr.datetime]="c.createdAt">{{ c.createdAt | date: 'd MMM y, HH:mm' }}</time>
            @if (c.modificado) {
              · editado
            }
          </span>
          @if (esMio() && !editando()) {
            <button type="button" class="editar" (click)="editar()">Editar</button>
          }
        </p>
        @if (editando()) {
          <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
            <div class="campo">
              <label>
                <span class="oculto">Editar comentario</span>
                <textarea formControlName="mensaje" rows="2" [maxlength]="largo"></textarea>
              </label>
              <app-error-campo [control]="form.controls.mensaje" />
            </div>
            <div class="botones">
              <button type="button" class="btn btn-secundario" (click)="cancelar()">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primario" [disabled]="guardando()">
                {{ guardando() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        } @else {
          <p class="texto">{{ c.mensaje }}</p>
        }
      </div>
    </article>
  `,
  styles: `
    .comentario {
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: var(--color-fondo);
      border-radius: 8px;
    }
    .avatar {
      width: 32px;
      height: 32px;
    }
    .cuerpo {
      flex: 1;
      min-width: 0;
    }
    p {
      margin: 0;
    }
    .autor {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0 8px;
      font-size: 0.9rem;
    }
    .texto {
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
    .editar {
      margin-left: auto;
      padding: 0;
      font: inherit;
      font-weight: 600;
      color: var(--color-primario);
      cursor: pointer;
      background: none;
      border: 0;
    }
    .editar:hover {
      text-decoration: underline;
    }
    form {
      margin-top: 6px;
    }
    .campo {
      margin-bottom: 8px;
    }
    .botones {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .oculto {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  `,
})
export class ComentarioItem {
  readonly comentario = input.required<Comentario>();
  /** Id de la publicación a la que pertenece (la API lo pide para editar). */
  readonly publicacion = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);

  protected readonly largo = LARGO_COMENTARIO;
  /** Arranca con el comentario recibido y se reemplaza por lo que devuelve la API al editarlo. */
  protected readonly datos = linkedSignal(() => this.comentario());
  protected readonly esMio = computed(() => this.auth.usuario()?.id === this.datos().usuario.id);
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    mensaje: ['', [Validators.required, Validators.maxLength(LARGO_COMENTARIO)]],
  });

  protected editar(): void {
    this.form.reset({ mensaje: this.datos().mensaje });
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.editando.set(false);
  }

  protected guardar(): void {
    // Un comentario con solo espacios cuenta como vacío.
    const mensaje = this.form.controls.mensaje.value.trim();
    this.form.controls.mensaje.setValue(mensaje);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.servicio
      .editarComentario(this.publicacion(), this.datos().id, mensaje)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (editado) => {
          this.datos.set(editado);
          this.editando.set(false);
        },
        error: (error: unknown) =>
          void this.modal.abrir({
            tipo: 'error',
            titulo: 'No se pudo editar el comentario',
            mensaje: mensajesDeError(error),
          }),
      });
  }
}
