import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header>
      <div class="contenedor barra">
        <a routerLink="/publicaciones" class="marca">
          <img src="favicon.svg" alt="" width="32" height="32" />
          <span>Plaza</span>
        </a>
        <nav aria-label="Principal">
          <a routerLink="/publicaciones" routerLinkActive="activo">Publicaciones</a>
          <a routerLink="/mi-perfil" routerLinkActive="activo">Mi perfil</a>
          @if (auth.usuario(); as usuario) {
            <a routerLink="/mi-perfil" class="usuario" title="Ver mi perfil">
              <img class="avatar" [src]="usuario.imagenPerfil" alt="" />
              <span>{{ '@' + usuario.nombreUsuario }}</span>
            </a>
            <button type="button" class="btn btn-secundario" (click)="cerrarSesion()">
              Cerrar sesión
            </button>
          } @else {
            <a routerLink="/login" routerLinkActive="activo">Ingresar</a>
            <a routerLink="/registro" class="btn btn-primario">Registrarse</a>
          }
        </nav>
      </div>
    </header>
  `,
  styles: `
    header {
      background: var(--color-superficie);
      border-bottom: 1px solid var(--color-borde);
    }
    .barra {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 24px;
      min-height: 64px;
      padding-block: 10px;
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--color-texto);
      text-decoration: none;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 20px;
    }
    nav > a:not(.btn) {
      padding: 4px 0;
      font-weight: 500;
      color: var(--color-texto-suave);
      text-decoration: none;
    }
    nav > a:not(.btn):hover,
    nav > a.activo {
      color: var(--color-primario);
    }
    nav > a.activo {
      box-shadow: inset 0 -2px 0 var(--color-primario);
    }
    nav > a.usuario {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--color-texto);
    }
    .usuario .avatar {
      width: 32px;
      height: 32px;
    }
  `,
})
export class Header {
  protected readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  protected async cerrarSesion(): Promise<void> {
    const confirmado = await this.modal.confirmar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Querés cerrar tu sesión?',
      textoAceptar: 'Cerrar sesión',
    });
    if (!confirmado) return;
    this.auth.cerrarSesion();
    await this.router.navigateByUrl('/login');
  }
}
