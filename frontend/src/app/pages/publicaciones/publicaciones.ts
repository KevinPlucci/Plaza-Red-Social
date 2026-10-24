import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-publicaciones',
  imports: [RouterLink],
  templateUrl: './publicaciones.html',
})
export class Publicaciones {
  protected readonly auth = inject(AuthService);
}
