import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VencimientoSesion } from './core/services/vencimiento-sesion.service';
import { Header } from './shared/components/header';
import { Modal } from './shared/components/modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Modal],
  template: `
    <app-header />
    <main class="contenedor principal">
      <router-outlet />
    </main>
    <app-modal />
  `,
})
export class App {
  constructor() {
    // Se crea al arrancar para que vigile el vencimiento del token durante toda la visita.
    inject(VencimientoSesion);
  }
}
