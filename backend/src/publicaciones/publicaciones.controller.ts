import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SesionGuard } from '../autenticacion/sesion.guard';
import { UsuarioActual } from '../autenticacion/usuario-actual.decorator';
import { ImagenPipe, LIMITE_SUBIDA } from '../imagenes/imagen.pipe';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import { PublicacionesService } from './publicaciones.service';

@Controller('publicaciones')
@UseGuards(SesionGuard)
export class PublicacionesController {
  constructor(private readonly publicaciones: PublicacionesService) {}

  /** 200 con { publicaciones, total, offset, limit } · 400 parámetros inválidos · 401 sin sesión. */
  @Get()
  listar(
    @Query() filtro: ListarPublicacionesDto,
    @UsuarioActual() lector: UsuarioDocument,
  ) {
    return this.publicaciones.listar(filtro, lector._id);
  }

  /** 200 con la publicación · 401 sin sesión · 404 no existe o fue eliminada. */
  @Get(':id')
  obtener(@Param('id') id: string, @UsuarioActual() lector: UsuarioDocument) {
    return this.publicaciones.buscarVista(id, lector._id);
  }

  /** 201 con la publicación creada · 400 datos o imagen inválidos · 401 sin sesión. */
  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: LIMITE_SUBIDA } }),
  )
  crear(
    @Body() datos: CrearPublicacionDto,
    @UploadedFile(new ImagenPipe()) imagen: Express.Multer.File | undefined,
    @UsuarioActual() autor: UsuarioDocument,
  ) {
    return this.publicaciones.crear(autor, datos, imagen);
  }

  /** 204 · 401 sin sesión · 403 no es el autor ni un administrador · 404 no existe. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string, @UsuarioActual() usuario: UsuarioDocument) {
    return this.publicaciones.eliminar(id, usuario);
  }

  /** 201 con { cantidadMeGusta, meGustaMio } · 401 · 404 no existe · 409 ya había dado "Me gusta". */
  @Post(':id/me-gusta')
  darMeGusta(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioDocument,
  ) {
    return this.publicaciones.darMeGusta(id, usuario);
  }

  /** 200 con { cantidadMeGusta, meGustaMio } · 401 · 404 no existe o no había dado "Me gusta". */
  @Delete(':id/me-gusta')
  quitarMeGusta(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioDocument,
  ) {
    return this.publicaciones.quitarMeGusta(id, usuario);
  }
}
