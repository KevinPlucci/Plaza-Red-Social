import { Controller, Get, Param, Query } from '@nestjs/common';
import { ComentariosService } from './comentarios.service';
import { PaginacionDto } from './dto/paginacion.dto';

/** Comentarios de una publicación. En el sprint 2 solo se listan; el alta y la edición llegan en el sprint 3. */
@Controller('publicaciones/:id/comentarios')
export class ComentariosController {
  constructor(private readonly comentarios: ComentariosService) {}

  /** 200 con { comentarios, total, offset, limit } · 400 parámetros inválidos · 404 la publicación no existe. */
  @Get()
  listar(@Param('id') id: string, @Query() paginacion: PaginacionDto) {
    return this.comentarios.listar(id, paginacion);
  }
}
