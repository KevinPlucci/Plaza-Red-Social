import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';
import { Publicacion } from '../../core/models/publicacion';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';
import { TarjetaPublicacion } from '../../shared/components/tarjeta-publicacion';
import { Comentarios } from './comentarios';

/** Página de una publicación: la publicación en grande y todos sus comentarios. */
@Component({
  selector: 'app-pagina-publicacion',
  imports: [RouterLink, TarjetaPublicacion, Comentarios],
  template: `
    <div class="ancho-mediano">
      <a routerLink="/publicaciones" class="volver">← Volver a publicaciones</a>

      @if (noExiste()) {
        <section class="tarjeta vacio">
          <h1>La publicación no existe</h1>
          <p class="texto-suave">Puede que la hayan eliminado o que la dirección esté mal.</p>
          <a routerLink="/publicaciones" class="btn btn-primario">Ir a publicaciones</a>
        </section>
      } @else if (error(); as mensajes) {
        <section class="tarjeta vacio">
          <h1>No se pudo cargar la publicación</h1>
          @for (mensaje of mensajes; track $index) {
            <p class="texto-suave">{{ mensaje }}</p>
          }
          <button type="button" class="btn btn-primario" (click)="recargar()">Reintentar</button>
        </section>
      } @else if (publicacion(); as pub) {
        <div class="detalle">
          <app-tarjeta-publicacion
            [publicacion]="pub"
            [detalle]="true"
            (eliminada)="alEliminar()"
          />
          <app-comentarios [publicacion]="pub.id" />
        </div>
      } @else {
        <div class="estado">
          <span class="spinner" aria-hidden="true"></span>
          <p class="texto-suave">Cargando publicación...</p>
        </div>
      }
    </div>
  `,
  styles: `
    .volver {
      display: inline-block;
      margin-bottom: 16px;
      font-weight: 600;
      text-decoration: none;
    }
    .volver:hover {
      text-decoration: underline;
    }
    .detalle {
      display: grid;
      gap: 16px;
    }
    .estado {
      display: grid;
      justify-items: center;
      gap: 10px;
      padding: 40px 0;
    }
  `,
})
export class PaginaPublicacion {
  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);
  private readonly recargar$ = new BehaviorSubject<void>(undefined);

  protected readonly publicacion = signal<Publicacion | null>(null);
  protected readonly noExiste = signal(false);
  protected readonly error = signal<string[] | null>(null);

  constructor() {
    combineLatest([inject(ActivatedRoute).paramMap, this.recargar$])
      .pipe(
        map(([params]) => params.get('id') ?? ''),
        tap(() => {
          this.publicacion.set(null);
          this.noExiste.set(false);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.servicio.obtener(id).pipe(
            catchError((error: unknown) => {
              const noExiste = error instanceof HttpErrorResponse && error.status === 404;
              if (noExiste) this.noExiste.set(true);
              else this.error.set(mensajesDeError(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((publicacion) => this.publicacion.set(publicacion));
  }

  protected recargar(): void {
    this.recargar$.next();
  }

  protected async alEliminar(): Promise<void> {
    await this.router.navigateByUrl('/publicaciones');
    void this.modal.abrir({
      tipo: 'exito',
      titulo: 'Publicación eliminada',
      mensaje: 'Ya no se ve en el vestuario.',
    });
  }
}
