import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Publicacion } from '../../core/models/publicacion';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';
import { ErrorCampo } from '../../shared/components/error-campo';
import { imagenValida, TIPOS_IMAGEN } from '../../shared/validators';

/** Formulario para publicar: título, mensaje e imagen opcional. */
@Component({
  selector: 'app-nueva-publicacion',
  imports: [ReactiveFormsModule, ErrorCampo],
  template: `
    <section class="tarjeta">
      <h2>Nueva publicación</h2>
      <form [formGroup]="form" (ngSubmit)="publicar()" novalidate>
        <div class="campo">
          <label>
            <span>Título</span>
            <input type="text" formControlName="titulo" maxlength="100" />
          </label>
          <app-error-campo [control]="form.controls.titulo" />
        </div>
        <div class="campo">
          <label>
            <span>Mensaje</span>
            <textarea
              formControlName="mensaje"
              rows="3"
              maxlength="1000"
              placeholder="Contá cómo te fue en el partido, un gol o una jugada."
            ></textarea>
          </label>
          <small class="ayuda contador">{{ form.controls.mensaje.value.length }}/1000</small>
          <app-error-campo [control]="form.controls.mensaje" />
        </div>

        @if (vistaPrevia(); as url) {
          <div class="vista-previa">
            <img [src]="url" alt="Vista previa de la imagen" />
            <button type="button" class="btn btn-secundario" (click)="quitarImagen()">
              Quitar imagen
            </button>
          </div>
        }
        <app-error-campo [control]="form.controls.imagen" />

        <div class="acciones-form">
          <label class="btn btn-secundario">
            {{ form.controls.imagen.value ? 'Cambiar imagen' : 'Agregar imagen (opcional)' }}
            <input
              #archivo
              type="file"
              class="oculto"
              [accept]="tiposImagen"
              (change)="elegirImagen($event)"
            />
          </label>
          <button type="submit" class="btn btn-primario" [disabled]="enviando()">
            {{ enviando() ? 'Publicando...' : 'Publicar' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    h2 {
      margin-bottom: 16px;
      font-size: 1.15rem;
    }
    .contador {
      text-align: right;
    }
    .vista-previa {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 12px;
    }
    .vista-previa img {
      max-width: 220px;
      max-height: 160px;
      object-fit: contain;
      border: 1px solid var(--color-borde);
      border-radius: 8px;
    }
    .acciones-form {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
    }
    .oculto {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    label.btn:has(.oculto:focus-visible) {
      outline: 3px solid var(--color-foco);
      outline-offset: 2px;
    }
  `,
})
export class NuevaPublicacion {
  readonly publicada = output<Publicacion>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);
  private readonly archivo = viewChild.required<ElementRef<HTMLInputElement>>('archivo');

  protected readonly tiposImagen = TIPOS_IMAGEN.join(',');
  protected readonly enviando = signal(false);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(100)]],
    mensaje: ['', [Validators.required, Validators.maxLength(1000)]],
    imagen: this.fb.control<File | null>(null, imagenValida),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  protected elegirImagen(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.form.controls.imagen.setValue(archivo);
    this.form.controls.imagen.markAsTouched();
    this.liberarVistaPrevia();
    this.vistaPrevia.set(
      archivo && this.form.controls.imagen.valid ? URL.createObjectURL(archivo) : null,
    );
  }

  protected quitarImagen(): void {
    this.form.controls.imagen.setValue(null);
    this.archivo().nativeElement.value = '';
    this.liberarVistaPrevia();
  }

  protected publicar(): void {
    // Un título o mensaje con solo espacios cuenta como vacío.
    const { titulo, mensaje, imagen } = this.form.getRawValue();
    this.form.patchValue({ titulo: titulo.trim(), mensaje: mensaje.trim() });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datos = new FormData();
    datos.append('titulo', titulo.trim());
    datos.append('mensaje', mensaje.trim());
    if (imagen) datos.append('imagen', imagen);

    this.enviando.set(true);
    this.servicio
      .crear(datos)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (publicacion) => {
          this.form.reset();
          this.quitarImagen();
          this.publicada.emit(publicacion);
        },
        error: (error: unknown) =>
          void this.modal.abrir({
            tipo: 'error',
            titulo: 'No se pudo publicar',
            mensaje: mensajesDeError(error),
          }),
      });
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
