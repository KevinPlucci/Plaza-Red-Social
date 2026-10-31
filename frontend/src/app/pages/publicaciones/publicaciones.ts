import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';
import { ListadoPublicaciones, OrdenPublicaciones } from '../../core/models/publicacion';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { mensajesDeError } from '../../core/utils/errores';
import { Paginacion } from '../../shared/components/paginacion';
import { TarjetaPublicacion } from '../../shared/components/tarjeta-publicacion';
import { NuevaPublicacion } from './nueva-publicacion';

const POR_PAGINA = 5;

/** Página y orden salen de la URL (?pagina=2&orden=meGusta), así se conservan al recargar o volver. */
function leerParametros(params: ParamMap): { pagina: number; orden: OrdenPublicaciones } {
  const pagina = Number(params.get('pagina'));
  return {
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
    orden: params.get('orden') === 'meGusta' ? 'meGusta' : 'fecha',
  };
}

@Component({
  selector: 'app-publicaciones',
  imports: [NuevaPublicacion, TarjetaPublicacion, Paginacion],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.css',
})
export class Publicaciones {
  protected readonly auth = inject(AuthService);
  private readonly servicio = inject(PublicacionesService);
  private readonly modal = inject(ModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recargar$ = new BehaviorSubject<void>(undefined);

  protected readonly pagina = signal(1);
  protected readonly orden = signal<OrdenPublicaciones>('fecha');
  protected readonly listado = signal<ListadoPublicaciones | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string[] | null>(null);

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil((this.listado()?.total ?? 0) / POR_PAGINA)),
  );
  /** "Mostrando 6–10 de 12" */
  protected readonly rango = computed(() => {
    const listado = this.listado();
    if (!listado?.total) return null;
    return {
      desde: listado.offset + 1,
      hasta: listado.offset + listado.publicaciones.length,
      total: listado.total,
    };
  });

  constructor() {
    combineLatest([this.route.queryParamMap, this.recargar$])
      .pipe(
        map(([params]) => leerParametros(params)),
        tap(({ pagina, orden }) => {
          this.pagina.set(pagina);
          this.orden.set(orden);
          this.cargando.set(true);
          this.error.set(null);
        }),
        // switchMap descarta la respuesta anterior si el usuario cambia de página antes de que llegue.
        switchMap(({ pagina, orden }) =>
          this.servicio
            .listar({ orden, offset: (pagina - 1) * POR_PAGINA, limit: POR_PAGINA })
            .pipe(
              catchError((error: unknown) => {
                this.error.set(mensajesDeError(error));
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((listado) => {
        this.cargando.set(false);
        if (!listado) return;
        // Si se eliminó lo último de la última página, se pasa a la anterior que tenga publicaciones.
        if (!listado.publicaciones.length && listado.total > 0) {
          this.irA({ pagina: Math.ceil(listado.total / POR_PAGINA) });
          return;
        }
        this.listado.set(listado);
      });
  }

  protected cambiarOrden(orden: OrdenPublicaciones): void {
    if (orden !== this.orden()) this.irA({ pagina: 1, orden });
  }

  protected cambiarPagina(pagina: number): void {
    this.irA({ pagina });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected recargar(): void {
    this.recargar$.next();
  }

  protected async alPublicar(): Promise<void> {
    // La publicación nueva es la más reciente: se muestra la primera página ordenada por fecha.
    if (this.pagina() === 1 && this.orden() === 'fecha') this.recargar();
    else this.irA({ pagina: 1, orden: 'fecha' });
    await this.modal.abrir({
      tipo: 'exito',
      titulo: 'Publicación creada',
      mensaje: 'Tu publicación ya se puede ver en el vestuario.',
    });
  }

  private irA(cambios: { pagina?: number; orden?: OrdenPublicaciones }): void {
    const pagina = cambios.pagina ?? this.pagina();
    const orden = cambios.orden ?? this.orden();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        pagina: pagina > 1 ? pagina : null,
        orden: orden === 'meGusta' ? 'meGusta' : null,
      },
    });
  }
}
