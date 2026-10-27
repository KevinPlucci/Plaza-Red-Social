import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024;
const NOMBRE_USUARIO = /^[a-zA-Z0-9._]{3,20}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Al menos 8 caracteres, una mayúscula y un número. Informa cada regla que no se cumple. */
export const contrasenaSegura: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '');
  if (!valor) return null;
  const errores: ValidationErrors = {};
  if (valor.length < 8) errores['contrasenaCorta'] = true;
  if (!/[A-Z]/.test(valor)) errores['sinMayuscula'] = true;
  if (!/\d/.test(valor)) errores['sinNumero'] = true;
  return Object.keys(errores).length ? errores : null;
};

/** Grupo con los controles "contrasena" y "repetirContrasena". */
export const contrasenasIguales: ValidatorFn = (
  grupo: AbstractControl,
): ValidationErrors | null => {
  const contrasena = grupo.get('contrasena')?.value;
  const repetida = grupo.get('repetirContrasena')?.value;
  return !repetida || contrasena === repetida ? null : { contrasenasDistintas: true };
};

export const nombreUsuarioValido: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  return !valor || NOMBRE_USUARIO.test(valor) ? null : { nombreUsuario: true };
};

/** Correo con dominio completo (usuario@dominio.algo), igual que exige el backend. */
export const correoValido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  return !valor || CORREO.test(valor) ? null : { email: true };
};

/** Para el login: si tiene @ se valida como correo, si no como nombre de usuario. */
export const correoONombreUsuario: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (!valor) return null;
  if (valor.includes('@')) return CORREO.test(valor) ? null : { email: true };
  return NOMBRE_USUARIO.test(valor) ? null : { nombreUsuario: true };
};

/** Fecha "AAAA-MM-DD" (input type="date"): que exista, no sea futura y sea posterior a 1900. */
export const fechaNacimientoValida: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '');
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime()) || fecha.getFullYear() < 1900) return { fechaInvalida: true };
  return fecha > new Date() ? { fechaFutura: true } : null;
};

/** Control con un File: JPG, PNG, GIF o WEBP de hasta 2 MB. */
export const imagenValida: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const archivo = control.value as File | null;
  if (!archivo) return null;
  if (!TIPOS_IMAGEN.includes(archivo.type)) return { tipoImagen: true };
  return archivo.size > TAMANO_MAXIMO_IMAGEN ? { imagenGrande: true } : null;
};

/** Texto de cada error de validación, en el orden en que conviene mostrarlos. */
const MENSAJES: Record<string, (detalle: unknown) => string> = {
  servidor: (mensaje) => String(mensaje),
  required: () => 'Este campo es obligatorio.',
  email: () => 'Ingresá un correo válido.',
  nombreUsuario: () => 'Usá entre 3 y 20 caracteres: letras, números, punto o guion bajo.',
  maxlength: (detalle) =>
    `No puede superar los ${(detalle as { requiredLength: number }).requiredLength} caracteres.`,
  contrasenaCorta: () => 'Debe tener al menos 8 caracteres.',
  sinMayuscula: () => 'Debe tener al menos una letra mayúscula.',
  sinNumero: () => 'Debe tener al menos un número.',
  fechaInvalida: () => 'Ingresá una fecha válida.',
  fechaFutura: () => 'La fecha no puede ser futura.',
  tipoImagen: () => 'Elegí una imagen JPG, PNG, GIF o WEBP.',
  imagenGrande: () => 'La imagen no puede superar los 2 MB.',
};

export function mensajeDeError(errores: ValidationErrors | null): string | null {
  if (!errores) return null;
  const clave = Object.keys(MENSAJES).find((nombre) => nombre in errores);
  return clave ? MENSAJES[clave](errores[clave]) : 'El valor ingresado no es válido.';
}
