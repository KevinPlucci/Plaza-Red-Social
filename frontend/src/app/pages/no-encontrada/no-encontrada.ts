import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrada',
  imports: [RouterLink],
  template: `
    <section class="tarjeta vacio ancho-mediano">
      <h1>Página no encontrada</h1>
      <p class="texto-suave">La dirección que buscás no existe o cambió de lugar.</p>
      <a routerLink="/publicaciones" class="btn btn-primario">Ir a publicaciones</a>
    </section>
  `,
})
export class NoEncontrada {}
