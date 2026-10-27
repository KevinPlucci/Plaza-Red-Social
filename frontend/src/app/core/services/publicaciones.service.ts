import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoMeGusta,
  ListadoComentarios,
  ListadoPublicaciones,
  OrdenPublicaciones,
  Publicacion,
} from '../models/publicacion';

export interface FiltroPublicaciones {
  orden?: OrdenPublicaciones;
  /** Solo las de este usuario (id). */
  usuario?: string;
  offset?: number;
  limit?: number;
}

/** Arma los query params omitiendo los que no se indicaron. */
function parametros(valores: object): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== undefined) params = params.set(clave, String(valor));
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/publicaciones`;

  listar(filtro: FiltroPublicaciones): Observable<ListadoPublicaciones> {
    return this.http.get<ListadoPublicaciones>(this.url, { params: parametros(filtro) });
  }

  /** Recibe un FormData porque puede incluir una imagen (multipart/form-data). */
  crear(datos: FormData): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.url, datos);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  darMeGusta(id: string): Observable<EstadoMeGusta> {
    return this.http.post<EstadoMeGusta>(`${this.url}/${id}/me-gusta`, null);
  }

  quitarMeGusta(id: string): Observable<EstadoMeGusta> {
    return this.http.delete<EstadoMeGusta>(`${this.url}/${id}/me-gusta`);
  }

  comentarios(id: string, paginacion: { offset?: number; limit?: number } = {}) {
    return this.http.get<ListadoComentarios>(`${this.url}/${id}/comentarios`, {
      params: parametros(paginacion),
    });
  }
}
