import { Component, computed, input, output } from '@angular/core';

/** Botones Anterior / números de página / Siguiente. Las páginas se cuentan desde 1. */
@Component({
  selector: 'app-paginacion',
  template: `
    @if (totalPaginas() > 1) {
      <nav aria-label="Páginas">
        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="pagina() === 1"
          (click)="cambiar.emit(pagina() - 1)"
        >
          Anterior
        </button>
        <ol>
          @for (numero of numeros(); track $index) {
            <li>
              @if (numero === null) {
                <span class="salto">…</span>
              } @else {
                <button
                  type="button"
                  class="numero"
                  [class.actual]="numero === pagina()"
                  [attr.aria-current]="numero === pagina() ? 'page' : null"
                  (click)="cambiar.emit(numero)"
                >
                  {{ numero }}
                </button>
              }
            </li>
          }
        </ol>
        <button
          type="button"
          class="btn btn-secundario"
          [disabled]="pagina() === totalPaginas()"
          (click)="cambiar.emit(pagina() + 1)"
        >
          Siguiente
        </button>
      </nav>
    }
  `,
  styles: `
    nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
    }
    ol {
      display: flex;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .numero {
      min-width: 38px;
      height: 38px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: var(--color-texto);
      background: var(--color-superficie);
      border: 1px solid var(--color-borde);
      border-radius: 8px;
    }
    .numero:hover {
      border-color: var(--color-primario);
    }
    .numero.actual {
      color: #fff;
      background: var(--color-primario);
      border-color: var(--color-primario);
    }
    .salto {
      display: inline-block;
      min-width: 24px;
      text-align: center;
      color: var(--color-texto-suave);
    }
  `,
})
export class Paginacion {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly cambiar = output<number>();

  /** Primera, última y las vecinas de la actual; null marca un salto ("…"). */
  protected readonly numeros = computed(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const visibles = [...new Set([1, actual - 1, actual, actual + 1, total])]
      .filter((n) => n >= 1 && n <= total)
      .sort((a, b) => a - b);
    const resultado: (number | null)[] = [];
    for (const n of visibles) {
      const anterior = resultado.at(-1);
      if (typeof anterior === 'number' && n - anterior > 1) resultado.push(null);
      resultado.push(n);
    }
    return resultado;
  });
}
