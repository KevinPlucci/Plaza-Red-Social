import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagenPipe, LIMITE_SUBIDA } from '../imagenes/imagen.pipe';
import { AutenticacionService } from './autenticacion.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(private readonly autenticacion: AutenticacionService) {}

  /** 201 con el usuario creado · 400 datos inválidos · 409 correo o nombre de usuario en uso. */
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

  /** 200 con los datos del usuario · 400 faltan datos · 401 credenciales incorrectas. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() credenciales: LoginDto) {
    return this.autenticacion.iniciarSesion(credenciales);
  }
}
