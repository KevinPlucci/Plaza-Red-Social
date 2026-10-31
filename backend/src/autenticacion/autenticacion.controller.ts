import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagenPipe, LIMITE_SUBIDA } from '../imagenes/imagen.pipe';
import type { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { AutenticacionService } from './autenticacion.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { SesionGuard } from './sesion.guard';
import type { DatosToken } from './token';
import { TokenActual, UsuarioActual } from './usuario-actual.decorator';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly autenticacion: AutenticacionService) {}

  /** 201 con { token, usuario } · 400 datos inválidos · 409 correo o nombre de usuario en uso. */
  @Post('registro')
  @UseInterceptors(
    FileInterceptor('imagenPerfil', { limits: { fileSize: LIMITE_SUBIDA } }),
  )
  registrar(
    @Body() datos: RegistroDto,
    @UploadedFile(new ImagenPipe('La imagen de perfil es obligatoria.'))
    imagen: Express.Multer.File,
  ) {
    return this.autenticacion.registrar(datos, imagen);
  }

  /** 200 con { token, usuario } · 400 faltan datos · 401 credenciales incorrectas. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() credenciales: LoginDto) {
    return this.autenticacion.iniciarSesion(credenciales);
  }

  /** 200 con los datos del usuario del token · 401 token faltante, inválido o vencido. */
  @Post('autorizar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SesionGuard)
  autorizar(@UsuarioActual() usuario: UsuarioDocument) {
    return usuario;
  }

  /** 200 con { token } (mismo payload, 15 minutos más) · 401 token faltante, inválido o vencido. */
  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SesionGuard)
  refrescar(@TokenActual() datos: DatosToken) {
    return this.autenticacion.refrescar(datos);
  }
}
