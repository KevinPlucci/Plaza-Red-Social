import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { DURACION_TOKEN_SEGUNDOS } from './token';

@Module({
  imports: [
    UsuariosModule,
    ImagenesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRETO'),
        signOptions: { expiresIn: DURACION_TOKEN_SEGUNDOS },
      }),
    }),
  ],
  controllers: [AutenticacionController],
  providers: [AutenticacionService],
  // SesionGuard necesita JwtService y UsuariosService en cada módulo que lo usa.
  exports: [JwtModule, UsuariosModule],
})
export class AutenticacionModule {}
