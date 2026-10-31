import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Comentario } from '../../core/models/publicacion';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';
import { ComentarioItem, LARGO_COMENTARIO } from '../../shared/components/comentario';
import { ErrorCampo } from '../../shared/components/error-campo';

/** Comentarios que se piden por vez. */
const POR_CARGA = 5;

/** Comentarios de una publicación: formulario para comentar y lista con "Cargar más". */
@Component({
  selector: 'app-comentarios',
  imports: [ReactiveFormsModule, ErrorCampo, ComentarioItem],
  template: `
    <section class="tarjeta">
      <h2>Comentarios ({{ total() }})</h2>

      <form [formGroup]="form" (ngSubmit)="comentar()" novalidate>
        <div class="campo">
          <label>
            <span>Tu comentario</span>
            <textarea
              formControlName="mensaje"
              rows="2"
              [maxlength]="largo"
              placeholder="¿Qué te pareció la jugada?"
            ></textarea>
          </label>
          <small class="ayuda contador">{{ form.controls.mensaje.value.length }}/{{ largo }}</small>
          <app-error-campo [control]="form.controls.mensaje" />
        </div>
        <div class="enviar">
          <button type="submit" class="btn btn-primario" [disabled]="enviando()">
            {{ enviando() ? 'Comentando...' : 'Comentar' }}
          </button>
        </div>
      </form>

      @if (comentarios().length) {
        <ol class="lista">
          @for (comentario of comentarios(); track comentario.id) {
            <li><app-comentario [comentario]="comentario" [publicacion]="publicacion()" /></li>
          }
        </ol>
      } @else if (!cargando() && !error()) {
        <p class="texto-suave vacio-lista">Todavía no hay comentarios. ¡Hacé el primero!</p>
      }

      <div class="pie" aria-live="polite">
        @if (cargando()) {
          <span class="spinner" aria-hidden="true"></span>
          <span class="texto-suave">Cargando comentarios...</span>
        } @else if (error(); as mensajes) {
          <span class="error-texto">{{ mensajes[0] }}</span>
          <button type="button" class="btn btn-secundario" (click)="cargarMas()">Reintentar</button>
        } @else if (quedan() > 0) {
          <button type="button" class="btn btn-secundario" (click)="cargarMas()">
            Cargar más ({{ quedan() }})
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    h2 {
      font-size: 1.15rem;
    }
    .contador {
      text-align: right;
    }
    .enviar {
      display: flex;
      justify-content: flex-end;
    }
    .lista {
      display: grid;
      gap: 8px;
      margin: 20px 0 0;
      padding: 0;
      list-style: none;
    }
    .vacio-lista {
      margin: 20px 0 0;
    }
    .pie {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 16px;
    }
    .pie:empty {
      display: none;
    }
    .pie .spinner {
      width: 22px;
      height: 22px;
    }
  `,
})
export class Comentarios implements OnInit {
  /** Id de la publicación. */
  readonly publicacion = input.required<string>();

  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);

  protected readonly largo = LARGO_COMENTARIO;
  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string[] | null>(null);
  protected readonly quedan = computed(() => Math.max(0, this.total() - this.comentarios().length));
  protected readonly form = inject(NonNullableFormBuilder).group({
    mensaje: ['', [Validators.required, Validators.maxLength(LARGO_COMENTARIO)]],
  });

  ngOnInit(): void {
    this.cargarMas();
  }

  /** Trae los siguientes comentarios (más viejos) y los agrega debajo de los que ya se ven. */
  protected cargarMas(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .comentarios(this.publicacion(), { offset: this.comentarios().length, limit: POR_CARGA })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ comentarios, total }) => {
          // Si alguien comentó mientras tanto, la página puede repetir alguno: se agregan solo los nuevos.
          const vistos = new Set(this.comentarios().map((c) => c.id));
          this.comentarios.update((lista) => [
            ...lista,
            ...comentarios.filter((c) => !vistos.has(c.id)),
          ]);
          this.total.set(total);
        },
        error: (error: unknown) => this.error.set(mensajesDeError(error)),
      });
  }

  protected comentar(): void {
    // Un comentario con solo espacios cuenta como vacío.
    const mensaje = this.form.controls.mensaje.value.trim();
    this.form.controls.mensaje.setValue(mensaje);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.servicio
      .comentar(this.publicacion(), mensaje)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (comentario) => {
          this.form.reset();
          // Es el más reciente: va primero, como lo ordena la API.
          this.comentarios.update((lista) => [comentario, ...lista]);
          this.total.update((total) => total + 1);
        },
        error: (error: unknown) =>
          void this.modal.abrir({
            tipo: 'error',
            titulo: 'No se pudo comentar',
            mensaje: mensajesDeError(error),
          }),
      });
  }
}
