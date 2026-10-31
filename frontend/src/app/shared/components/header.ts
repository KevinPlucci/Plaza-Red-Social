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
        <a [routerLink]="auth.haySesion() ? '/publicaciones' : '/login'" class="marca">
          <img src="favicon.svg" alt="" width="32" height="32" />
          <span>Vestuario</span>
        </a>
        <nav aria-label="Principal">
          @if (auth.usuario(); as usuario) {
            <a routerLink="/publicaciones" routerLinkActive="activo">Publicaciones</a>
            <a routerLink="/mi-perfil" routerLinkActive="activo">Mi perfil</a>
            <a routerLink="/mi-perfil" class="usuario" title="Ver mi perfil">
              <img class="avatar" [src]="usuario.imagenPerfil" alt="" />
              <span>{{ '@' + usuario.nombreUsuario }}</span>
            </a>
            <button type="button" class="btn btn-claro" (click)="cerrarSesion()">
              Cerrar sesión
            </button>
          } @else {
            <a routerLink="/login" routerLinkActive="activo">Ingresar</a>
            <a routerLink="/registro" class="btn btn-claro">Registrarse</a>
          }
        </nav>
      </div>
    </header>
  `,
  styles: `
    /* Verde oscuro con franjas, como el césped de una cancha recién cortada. */
    header {
      color: #fff;
      background: repeating-linear-gradient(
        90deg,
        var(--color-primario-oscuro) 0 48px,
        var(--color-cesped) 48px 96px
      );
      border-bottom: 3px solid #fff;
      box-shadow: 0 1px 0 var(--color-borde);
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
      font-weight: 800;
      letter-spacing: 0.02em;
      color: #fff;
      text-decoration: none;
    }
    .marca img {
      border-radius: 7px;
      box-shadow: 0 0 0 2px rgb(255 255 255 / 70%);
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
      color: rgb(255 255 255 / 82%);
      text-decoration: none;
    }
    nav > a:not(.btn):hover,
    nav > a.activo {
      color: #fff;
    }
    nav > a.activo {
      box-shadow: inset 0 -2px 0 #fff;
    }
    nav > a.usuario {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #fff;
    }
    .usuario .avatar {
      width: 32px;
      height: 32px;
      box-shadow: 0 0 0 2px #fff;
    }
    .btn-claro {
      color: var(--color-primario-oscuro);
      background: #fff;
    }
    .btn-claro:hover {
      background: var(--color-primario-suave);
    }
    a:focus-visible,
    .btn:focus-visible {
      outline-color: rgb(255 255 255 / 70%);
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
