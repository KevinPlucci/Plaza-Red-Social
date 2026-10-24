import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImagenesController } from './imagenes.controller';
import { ImagenesService } from './imagenes.service';
import { Imagen, ImagenSchema } from './schemas/imagen.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Imagen.name, schema: ImagenSchema }]),
  ],
  controllers: [ImagenesController],
  providers: [ImagenesService],
  exports: [ImagenesService],
})
export class ImagenesModule {}
