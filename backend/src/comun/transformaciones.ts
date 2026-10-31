import { TransformFnParams } from 'class-transformer';

/** Quita los espacios de los extremos de un texto (para usar con @Transform). */
export const recortar = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Igual que recortar, pero un texto vacío pasa a undefined para que @IsOptional lo saltee. */
export const textoOpcional = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** Igual que recortar y además pasa a minúsculas (correo y nombre de usuario). */
export const recortarYMinusculas = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
