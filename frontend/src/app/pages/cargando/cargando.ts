import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { mensajesDeError } from '../../core/utils/errores';

/** Si el servidor tarda más que esto, se avisa que puede estar despertándose (Render, plan gratuito). */
const DEMORA_MS = 4000;

/**
 * Pantalla de carga: valida el token guardado con la API (autorizar) y sigue a la dirección pedida
 * o, si no hay sesión válida, al login. Un 401 lo resuelve el interceptor, que vuelve al login.
 */
@Component({
  selector: 'app-cargando',
  template: `
    <section class="tarjeta vacio ancho-chico" aria-live="polite">
      @if (error(); as mensajes) {
        <h1>No pudimos validar tu sesión</h1>
        @for (mensaje of mensajes; track $index) {
          <p class="texto-suave">{{ mensaje }}</p>
        }
        <div class="acciones">
          <button type="button" class="btn btn-secundario" (click)="salir()">Ir a ingresar</button>
          <button type="button" class="btn btn-primario" (click)="validar()">Reintentar</button>
        </div>
      } @else {
        <span class="spinner" aria-hidden="true"></span>
        <h1>Entrando al vestuario...</h1>
        <p class="texto-suave">Estamos validando tu sesión.</p>
        @if (demora()) {
          <p class="texto-suave">El servidor puede tardar hasta un minuto en despertarse.</p>
        }
      }
    </section>
  `,
  styles: `
    h1 {
      margin-top: 16px;
      font-size: 1.3rem;
    }
  `,
})
export class Cargando {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly destino = inject(ActivatedRoute).snapshot.queryParamMap.get('destino');

  protected readonly error = signal<string[] | null>(null);
  protected readonly demora = signal(false);

  constructor() {
    this.validar();
  }

  protected validar(): void {
    if (!this.auth.haySesion()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.error.set(null);
    this.demora.set(false);
    const aviso = setTimeout(() => this.demora.set(true), DEMORA_MS);
    this.auth
      .autorizar()
      .pipe(
        finalize(() => clearTimeout(aviso)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(this.destinoSeguro()),
        error: (error: unknown) => this.error.set(mensajesDeError(error)),
      });
  }

  protected salir(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }

  /** Solo direcciones de la propia aplicación (nada de "//otro-sitio") y nunca esta misma pantalla. */
  private destinoSeguro(): string {
    const destino = this.destino ?? '';
    const valido =
      destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/cargando');
    return valido ? destino : '/publicaciones';
  }
}
