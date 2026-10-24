import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { mensajeDeError } from '../validators';

/** Muestra el primer error de un control cuando el usuario ya pasó por el campo. */
@Component({
  selector: 'app-error-campo',
  template: `
    @if (control().touched && control().errors; as errores) {
      <small class="error-texto" role="alert">{{ mensaje(errores) }}</small>
    }
  `,
})
export class ErrorCampo {
  readonly control = input.required<AbstractControl>();
  protected readonly mensaje = mensajeDeError;
}
