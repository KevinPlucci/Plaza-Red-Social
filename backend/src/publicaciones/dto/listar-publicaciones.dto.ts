import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PaginacionDto } from './paginacion.dto';

export const ORDENES = ['fecha', 'meGusta'] as const;
export type Orden = (typeof ORDENES)[number];

/** GET /publicaciones?orden=&usuario=&offset=&limit= */
export class ListarPublicacionesDto extends PaginacionDto {
  @IsIn(ORDENES, { message: 'orden tiene que ser "fecha" o "meGusta".' })
  @IsOptional()
  orden: Orden = 'fecha';

  /** Solo las publicaciones de este usuario (id). */
  @IsMongoId({ message: 'usuario tiene que ser un id válido.' })
  @IsOptional()
  usuario?: string;
}
