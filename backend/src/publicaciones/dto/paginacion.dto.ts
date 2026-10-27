import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Parámetros ?offset=&limit= de los listados. Sin ellos se devuelven los primeros 10. */
export class PaginacionDto {
  @Min(0, { message: 'offset no puede ser negativo.' })
  @IsInt({ message: 'offset tiene que ser un número entero.' })
  @Type(() => Number)
  @IsOptional()
  offset: number = 0;

  @Max(50, { message: 'limit no puede ser mayor que 50.' })
  @Min(1, { message: 'limit tiene que ser al menos 1.' })
  @IsInt({ message: 'limit tiene que ser un número entero.' })
  @Type(() => Number)
  @IsOptional()
  limit: number = 10;
}
