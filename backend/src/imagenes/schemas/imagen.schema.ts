import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Archivo de imagen guardado en la base. El resto de los documentos solo guarda la URL
 * desde la que se sirve (GET /imagenes/:id).
 */
@Schema({ collection: 'imagenes', timestamps: true })
export class Imagen {
  @Prop({ type: Buffer, required: true })
  datos: Buffer;

  /** Tipo MIME detectado a partir del contenido del archivo. */
  @Prop({ required: true })
  tipo: string;
}

export const ImagenSchema = SchemaFactory.createForClass(Imagen);
