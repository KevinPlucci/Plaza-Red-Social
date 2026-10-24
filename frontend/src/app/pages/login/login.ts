import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { mensajesDeError } from '../../core/utils/errores';
import { ErrorCampo } from '../../shared/components/error-campo';
import { contrasenaSegura, correoONombreUsuario } from '../../shared/validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, ErrorCampo],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    usuario: ['', [Validators.required, correoONombreUsuario]],
    contrasena: ['', [Validators.required, contrasenaSegura]],
  });

  protected ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { usuario, contrasena } = this.form.getRawValue();
    this.enviando.set(true);
    this.auth
      .iniciarSesion(usuario.trim(), contrasena)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/publicaciones'),
        error: (error: unknown) =>
          void this.modal.abrir({
            tipo: 'error',
            titulo: 'No pudimos iniciar sesión',
            mensaje: mensajesDeError(error),
          }),
      });
  }
}
