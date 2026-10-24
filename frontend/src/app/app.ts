import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
export class App {}
