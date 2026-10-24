import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { campoDelError, mensajesDeError } from '../../core/utils/errores';
import { ErrorCampo } from '../../shared/components/error-campo';
import {
  contrasenaSegura,
  contrasenasIguales,
  fechaNacimientoValida,
  imagenValida,
  nombreUsuarioValido,
  TIPOS_IMAGEN,
} from '../../shared/validators';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, ErrorCampo],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly tiposImagen = TIPOS_IMAGEN.join(',');
  protected readonly hoy = new Date().toISOString().slice(0, 10);
  protected readonly enviando = signal(false);
  protected readonly vistaPrevia = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      nombreUsuario: ['', [Validators.required, nombreUsuarioValido]],
      contrasena: ['', [Validators.required, contrasenaSegura]],
      repetirContrasena: ['', Validators.required],
      fechaNacimiento: ['', [Validators.required, fechaNacimientoValida]],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      imagenPerfil: this.fb.control<File | null>(null, [Validators.required, imagenValida]),
    },
    { validators: contrasenasIguales },
  );
  protected readonly campos = this.form.controls;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  protected elegirImagen(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.campos.imagenPerfil.setValue(archivo);
    this.campos.imagenPerfil.markAsTouched();
    this.liberarVistaPrevia();
    this.vistaPrevia.set(
      archivo && this.campos.imagenPerfil.valid ? URL.createObjectURL(archivo) : null,
    );
  }

  protected registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Va como multipart/form-data porque incluye la imagen. "Repetir contraseña" solo se valida acá.
    const { repetirContrasena: _, imagenPerfil, ...datos } = this.form.getRawValue();
    const formulario = new FormData();
    for (const [campo, valor] of Object.entries(datos)) formulario.append(campo, valor);
    formulario.append('imagenPerfil', imagenPerfil!);

    this.enviando.set(true);
    this.auth
      .registrar(formulario)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: async (usuario) => {
          await this.modal.abrir({
            tipo: 'exito',
            titulo: `¡Te damos la bienvenida, ${usuario.nombre}!`,
            mensaje: `Tu cuenta @${usuario.nombreUsuario} se creó correctamente.`,
            textoAceptar: 'Ver publicaciones',
          });
          await this.router.navigateByUrl('/publicaciones');
        },
        error: (error: unknown) => {
          const mensajes = mensajesDeError(error);
          const campo = campoDelError(error);
          // Correo o nombre de usuario repetido: además del modal, se marca el campo.
          if (campo === 'correo' || campo === 'nombreUsuario') {
            this.campos[campo].setErrors({ servidor: mensajes[0] });
          }
          void this.modal.abrir({
            tipo: 'error',
            titulo: 'No pudimos crear tu cuenta',
            mensaje: mensajes,
          });
        },
      });
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
  }
}
