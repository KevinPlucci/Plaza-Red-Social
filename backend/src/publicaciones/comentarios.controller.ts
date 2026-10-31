import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SesionGuard } from '../autenticacion/sesion.guard';
import { UsuarioActual } from '../autenticacion/usuario-actual.decorator';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { ComentariosService } from './comentarios.service';
import { ComentarioDto } from './dto/comentario.dto';
import { PaginacionDto } from './dto/paginacion.dto';

/** Comentarios de una publicación: listar, agregar y editar los propios. Todo con sesión. */
@Controller('publicaciones/:id/comentarios')
@UseGuards(SesionGuard)
export class ComentariosController {
  constructor(private readonly comentarios: ComentariosService) {}

  /** 200 con { comentarios, total, offset, limit }, los más recientes primero · 400 parámetros inválidos · 401 · 404 la publicación no existe. */
  @Get()
  listar(@Param('id') id: string, @Query() paginacion: PaginacionDto) {
    return this.comentarios.listar(id, paginacion);
  }

  /** 201 con el comentario · 400 mensaje vacío o largo · 401 sin sesión · 404 la publicación no existe. */
  @Post()
  crear(
    @Param('id') id: string,
    @Body() datos: ComentarioDto,
    @UsuarioActual() autor: UsuarioDocument,
  ) {
    return this.comentarios.crear(id, autor, datos);
  }

  /** 200 con el comentario y modificado: true · 400 · 401 · 403 no es el autor · 404 no existe. */
  @Put(':idComentario')
  editar(
    @Param('id') id: string,
    @Param('idComentario') idComentario: string,
    @Body() datos: ComentarioDto,
    @UsuarioActual() autor: UsuarioDocument,
  ) {
    return this.comentarios.editar(id, idComentario, autor, datos);
  }
}
