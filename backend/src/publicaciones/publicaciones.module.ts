import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ComentariosController } from './comentarios.controller';
import { ComentariosService } from './comentarios.service';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';
import { Comentario, ComentarioSchema } from './schemas/comentario.schema';
import { Publicacion, PublicacionSchema } from './schemas/publicacion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
      { name: Comentario.name, schema: ComentarioSchema },
    ]),
    // UsuariosModule lo necesita SesionGuard para identificar al usuario del pedido.
    UsuariosModule,
    ImagenesModule,
  ],
  controllers: [PublicacionesController, ComentariosController],
  providers: [PublicacionesService, ComentariosService],
})
export class PublicacionesModule {}
