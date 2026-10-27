import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema';

@Schema({ collection: 'publicaciones', timestamps: true })
export class Publicacion {
  @Prop({ required: true, trim: true })
  titulo: string;

  @Prop({ required: true, trim: true })
  mensaje: string;

  /** URL de la imagen, si la publicación tiene. */
  @Prop()
  imagen?: string;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  usuario: Types.ObjectId;

  /** Usuarios que dieron "Me gusta" (uno por usuario). */
  @Prop({ type: [{ type: Types.ObjectId, ref: Usuario.name }], default: [] })
  meGusta: Types.ObjectId[];

  /** Baja lógica: false cuando se elimina. */
  @Prop({ default: true })
  activa: boolean;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
// El listado siempre filtra las activas y, por defecto, ordena por fecha.
PublicacionSchema.index({ activa: 1, createdAt: -1 });
