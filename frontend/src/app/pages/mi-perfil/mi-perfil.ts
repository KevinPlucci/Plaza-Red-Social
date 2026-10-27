import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ListadoComentarios, Publicacion } from '../../core/models/publicacion';
import { AuthService } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';
import { TarjetaPublicacion } from '../../shared/components/tarjeta-publicacion';

const ULTIMAS = 3;
const COMENTARIOS_POR_PUBLICACION = 3;

interface PublicacionConComentarios {
  publicacion: Publicacion;
  comentarios: ListadoComentarios;
}

@Component({
  selector: 'app-mi-perfil',
  imports: [DatePipe, RouterLink, TarjetaPublicacion],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfil {
  protected readonly auth = inject(AuthService);
  private readonly servicio = inject(PublicacionesService);
  private readonly recargar$ = new BehaviorSubject<void>(undefined);

  protected readonly ultimas = signal<PublicacionConComentarios[] | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string[] | null>(null);

  constructor() {
    // Se recargan al cambiar de usuario (ingresar o salir) o al eliminar una publicación.
    combineLatest([toObservable(this.auth.usuario), this.recargar$])
      .pipe(
        map(([usuario]) => usuario),
        tap((usuario) => {
          this.cargando.set(usuario !== null);
          this.error.set(null);
          if (!usuario) this.ultimas.set(null);
        }),
        switchMap((usuario) =>
          usuario
            ? this.cargarUltimas(usuario.id).pipe(
                catchError((error: unknown) => {
                  this.error.set(mensajesDeError(error));
                  return of(null);
                }),
              )
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((ultimas) => {
        this.cargando.set(false);
        if (ultimas) this.ultimas.set(ultimas);
      });
  }

  protected recargar(): void {
    this.recargar$.next();
  }

  /** Mis últimas 3 publicaciones y, de cada una, sus comentarios más recientes. */
  private cargarUltimas(idUsuario: string): Observable<PublicacionConComentarios[]> {
    return this.servicio
      .listar({ usuario: idUsuario, limit: ULTIMAS })
      .pipe(
        switchMap(({ publicaciones }) =>
          publicaciones.length
            ? forkJoin(
                publicaciones.map((publicacion) =>
                  this.servicio
                    .comentarios(publicacion.id, { limit: COMENTARIOS_POR_PUBLICACION })
                    .pipe(map((comentarios) => ({ publicacion, comentarios }))),
                ),
              )
            : of([]),
        ),
      );
  }
}
