import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario';

const CLAVE_SESION = 'plaza.usuario';

function leerSesionGuardada(): Usuario | null {
  try {
    const guardado = localStorage.getItem(CLAVE_SESION);
    return guardado ? (JSON.parse(guardado) as Usuario) : null;
  } catch {
    return null;
  }
}

/** Registro, login y datos del usuario que inició sesión. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/autenticacion`;

  private readonly usuarioActual = signal<Usuario | null>(leerSesionGuardada());
  readonly usuario = this.usuarioActual.asReadonly();
  readonly haySesion = computed(() => this.usuarioActual() !== null);

  /** Recibe un FormData porque viaja junto con la imagen de perfil (multipart/form-data). */
  registrar(datos: FormData): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.url}/registro`, datos)
      .pipe(tap((usuario) => this.guardarSesion(usuario)));
  }

  /** "usuario" puede ser el correo o el nombre de usuario. */
  iniciarSesion(usuario: string, contrasena: string): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.url}/login`, { usuario, contrasena })
      .pipe(tap((datos) => this.guardarSesion(datos)));
  }

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_SESION);
    this.usuarioActual.set(null);
  }

  private guardarSesion(usuario: Usuario): void {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
    this.usuarioActual.set(usuario);
  }
}
